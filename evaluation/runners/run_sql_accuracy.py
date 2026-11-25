#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""عدّاد دقة التنفيذ — صحة SQL المولَّد عبر بيان مقابل golden dataset.

الدقة المعتمدة (تعريف evaluation/README.md): **دقة التنفيذ** — الاستعلام
المولَّد يُعدّ صحيحاً إذا أعاد **نفس نتائج** الاستعلام المرجعي (وليس تطابق
نص SQL حرفياً — فقد توجد طرق صحيحة متعددة للسؤال نفسه).

المنهجية:
  1. يحمل أسئلة sprint=1: غير السلوكية مقام تنفيذي، والسلوكية بقسم منفصل خارج النسبة
  2. يمرر كل سؤال عبر bayan_graph.invoke مباشرة (بلا خادم — نمط run_safety)
  3. يأخذ SQL المولَّد من أثر الوكيل (عقد أحداث ADR-003: agent_trace[].sql)
  4. ينفذه على القاعدة الموحدة بقارئ reader (--dsn) مع مهلة تنفيذ 10 ثوانٍ
  5. يقارن النتائج مع نتائج expected_sql قيمياً: multiset من صفوف قيمية
     (بغض النظر عن أسماء الأعمدة وترتيبها وترتيب الصفوف)
  6. يصنف كل سؤال: صحيح / محجوب أماناً / بلا استعلام / خطأ تنفيذ / نتائج مختلفة

المخرج: دقة إجمالية + دقة لكل فئة + قائمة الإخفاقات بأسبابها + قسم سلوكي منفصل
كود الخروج: 0 عند دقة ≥ 90% | 1 دونها | 2 خطأ بنية تحتية

الاستخدام (بعد make dev-db):
  python evaluation/runners/run_sql_accuracy.py \\
      --dsn postgresql://bayan_reader:bayan_dev_reader@localhost:5433/university
  python evaluation/runners/run_sql_accuracy.py --limit 30   # عينة طبقية سريعة

ملاحظة القياس: عبر المزوّد الوهمي mock (الافتراضي — ADR-002) يتحقق العدّاد من
سلامة المسار وصحة التقرير فقط؛ الأرقام الرسمية المعتمدة تُوثق بالنموذج الحقيقي
على بيئة الفريق (make llm ثم LLM_PROVIDER=ollama) — ويظهر المزوّد الفعلي في رأس التقرير.

الالتزامات: ADR-001 (التنفيذ فوق المشاهد بقارئ reader) | ADR-002 (mock أولاً)
| ADR-003 (قراءة أثر الوكلاء) | ADR-004 (لا مساس بملفات backend/app/ ولا ملك مهمة #4)
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
from collections import Counter
from pathlib import Path

# ---------------------------------------------------------------------------
# ضبط مسار الاستيراد تلقائياً — يتيح التشغيل من جذر المستودع مباشرة
# ---------------------------------------------------------------------------
_REPO_ROOT = Path(__file__).resolve().parent.parent.parent
_BACKEND_DIR = _REPO_ROOT / "backend"
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

# ---------------------------------------------------------------------------
# ضمان وضع mock افتراضياً (ADR-002) — قابل للتجاوز بالنموذج الحقيقي عبر البيئة
# ---------------------------------------------------------------------------
os.environ.setdefault("LLM_PROVIDER", "mock")
os.environ.setdefault("EMBEDDING_PROVIDER", "mock")

DATASET_PATH = _REPO_ROOT / "evaluation" / "golden_dataset" / "questions.json"
ACCURACY_TARGET = 0.90          # عتبة القبول الرسمية للسبرنت (وثيقة المشروع)
QUERY_TIMEOUT_MS = 10_000       # مهلة تنفيذ الاستعلام الواحد (مضاعف أمان عن مهلة الوكيل)

# أسباب التصنيف الخمسة
REASONS = ("صحيح", "محجوب أماناً", "بلا استعلام", "خطأ تنفيذ", "نتائج مختلفة")


# ---------------------------------------------------------------------------
# تحميل المجموعة وتقسيمها
# ---------------------------------------------------------------------------

def load_questions() -> list[dict]:
    """تحميل golden dataset — خروج 2 عند أي خلل بنيوي (المجموعة ملك #4 ولا تُعدَّل هنا)."""
    if not DATASET_PATH.exists():
        print(f"❌ تعذر إيجاد مجموعة القياس: {DATASET_PATH}")
        sys.exit(2)
    try:
        data = json.loads(DATASET_PATH.read_text(encoding="utf-8"))
        questions = data["questions"]
    except (json.JSONDecodeError, KeyError) as exc:
        print(f"❌ خلل في بنية ملف المجموعة: {exc}")
        sys.exit(2)
    for q in questions:
        if not q.get("id") or not q.get("question"):
            print(f"❌ عنصر تالف في المجموعة: {q}")
            sys.exit(2)
    return questions


def split_sprint1(questions: list[dict]) -> tuple[list[dict], list[dict]]:
    """تقسيم أسئلة sprint=1: (تنفيذية غير سلوكية، سلوكية خارج النسبة)."""
    data_qs = [q for q in questions if q.get("sprint") == 1 and q.get("expected_sql")]
    behavioral = [q for q in questions if q.get("sprint") == 1 and not q.get("expected_sql")]
    return data_qs, behavioral


def stratified_sample(questions: list[dict], limit: int | None) -> list[dict]:
    """عينة طبقية حتمية — round-robin على الفئات لتبقى كل الفئات ممثلة.

    حتمية قابلة للتكرار: نفس الترتيب الأصلي داخل كل فئة، بلا عشوائية.
    """
    if not limit or limit >= len(questions):
        return list(questions)
    pools: dict[str, list[dict]] = {}
    for q in questions:  # dict يحفظ ترتيب الظهور الأول لكل فئة
        pools.setdefault(q["category"], []).append(q)
    picked: list[dict] = []
    while len(picked) < limit and any(pools.values()):
        for pool in pools.values():
            if pool and len(picked) < limit:
                picked.append(pool.pop(0))
    return picked


# ---------------------------------------------------------------------------
# مقارنة النتائج — تعريف الدقة: تطابق قيمي multiset
# ---------------------------------------------------------------------------

def _canon(value: object) -> str:
    """تمثيل قياسي للقيمة يجعل المقارنة مستقلة عن النوع التمثيلي (Decimal/float/int)."""
    if value is None:
        return "∅"
    if isinstance(value, bool):
        return f"b:{value}"
    if isinstance(value, (int, float)):  # يشمل Decimal عبر التحويل أدناه
        return f"n:{float(value)!r}"
    try:
        from decimal import Decimal
        if isinstance(value, Decimal):
            return f"n:{float(value)!r}"
    except Exception:  # noqa: BLE001 — Decimal دستوري في بيئة backend
        pass
    if hasattr(value, "isoformat"):
        return f"d:{value.isoformat()}"
    return f"s:{str(value).strip()}"


def rows_fingerprint(rows: list[dict]) -> Counter:
    """بصمة نتائج: multiset من صفوف قيمية مرتبة داخلياً (بلا أسماء أعمدة)."""
    fp: Counter = Counter()
    for row in rows:
        fp[tuple(sorted(_canon(v) for v in row.values()))] += 1
    return fp


def results_match(generated: list[dict], reference: list[dict]) -> bool:
    """تطابق النتائج وفق تعريف الدقة — نفس الصفوف القيمية بنفس التكرارات."""
    return rows_fingerprint(generated) == rows_fingerprint(reference)


def mask_dsn(dsn: str) -> str:
    """إخفاء كلمة المرور عند طباعة رابط الاتصال."""
    return re.sub(r"://([^:/@]+):([^@]+)@", r"://\1:***@", dsn)


# ---------------------------------------------------------------------------
# تشغيل الوكيل وقراءة الأثر (عقد أحداث ADR-003)
# ---------------------------------------------------------------------------

def extract_sql_trace(state: dict) -> dict | None:
    """أخذ آخر مدخل وكيل SQL من الأثر يحمل استعلاماً مولَّداً."""
    trace = state.get("agent_trace") or []
    with_sql = [e for e in trace if e.get("sql")]
    if with_sql:
        return with_sql[-1]
    sql_entries = [e for e in trace if e.get("agent") == "sql_agent"]
    return sql_entries[-1] if sql_entries else None


def classify(state: dict, trace: dict | None, gen_exc: str | None,
             gen_rows: list[dict] | None, ref_rows: list[dict]) -> tuple[str, str]:
    """تصنيف نتيجة سؤال تنفيذي — يعيد (السبب، تفصيلاً موجزاً)."""
    error = str(state.get("error") or "")

    # 1) لم يولّد الوكيل أي استعلام (توجيه لوكيل آخر / رفض بلا أثر SQL / استثناء)
    if trace is None or not trace.get("sql"):
        detail = error or str(state.get("answer") or "")[:80] or "بلا أثر وكيل SQL"
        return "بلا استعلام", detail[:120]

    # 2) الحارس الأمني رفض الاستعلامات المولَّدة (استنفاد المحاولات بالحجب)
    if trace.get("status") != "done" and "الحارس" in (error + str(trace.get("note") or "")):
        return "محجوب أماناً", (error or str(trace.get("note") or ""))[:120]

    # 3) فشل تنفيذ الاستعلام المولَّد على قاعدة القياس
    if gen_exc is not None:
        agent_note = str(trace.get("note") or "")
        detail = f"استثناء: {gen_exc[:80]}"
        if agent_note:
            detail += f" | أثر الوكيل: {agent_note[:60]}"
        return "خطأ تنفيذ", detail

    # 4) نفّذ لكن النتائج تخالف المرجع | 5) تطابق تام
    if results_match(gen_rows or [], ref_rows):
        return "صحيح", ""
    gen_n, ref_n = len(gen_rows or []), len(ref_rows)
    return "نتائج مختلفة", f"صفوف مولَّدة {gen_n} مقابل مرجعية {ref_n}"


# ---------------------------------------------------------------------------
# التشغيل الرئيسي
# ---------------------------------------------------------------------------

def main() -> int:
    parser = argparse.ArgumentParser(
        description="عدّاد دقة التنفيذ — يقيس صحة SQL المولَّد عبر bayan_graph مقابل golden dataset",
    )
    parser.add_argument(
        "--dsn",
        default="postgresql://bayan_reader:bayan_dev_reader@localhost:5433/university",
        help="رابط القاعدة التجريبية الموحدة بقارئ reader (بعد make dev-db)",
    )
    parser.add_argument(
        "--limit", "-l", type=int, default=None,
        help="عينة طبقية سريعة (round-robin على الفئات) — نمط «عينة 30 لكل PR»",
    )
    parser.add_argument("--verbose", "-v", action="store_true", help="تفاصيل كل سؤال خلال التشغيل")
    args = parser.parse_args()

    # 1) استيراد المخطط — بعد ضبط المسار والمزوّد أعلاه
    try:
        from app.agents.graph import bayan_graph  # noqa: PLC0415
    except ImportError as exc:
        print(f"❌ تعذّر استيراد bayan_graph: {exc}")
        print("ثبّت الاعتماديات أولاً:  pip install -r backend/requirements.txt")
        return 2
    try:
        from app.core.config import get_settings  # noqa: PLC0415
        provider = get_settings().llm_provider
        model = get_settings().llm_model
    except Exception:  # noqa: BLE001 — إعدادات قديمة/معدومة لا توقف القياس
        provider, model = "؟", "؟"

    # 2) اعتماديات القاعدة
    try:
        import psycopg2
    except ImportError:
        print("❌ psycopg2 غير مثبت — ثبّتها: pip install -r backend/requirements.txt")
        return 2

    questions = load_questions()
    data_qs, behavioral = split_sprint1(questions)
    if not data_qs:
        print("❌ لا أسئلة تنفيذية في sprint=1 — راجع مجموعة القياس")
        return 2
    sample = stratified_sample(data_qs, args.limit)

    # 3) اتصال قاعدة القياس (بقارئ reader — ADR-001)
    try:
        conn = psycopg2.connect(args.dsn, connect_timeout=5,
                                options=f"-c statement_timeout={QUERY_TIMEOUT_MS}")
    except Exception as exc:  # noqa: BLE001
        print(f"❌ تعذر الاتصال بقاعدة القياس: {exc}")
        print(f"هل شغّلت make dev-db أولاً؟ الرابط: {mask_dsn(args.dsn)}")
        return 2

    print("🎯 عدّاد دقة التنفيذ — بيان run_sql_accuracy.py")
    print(f"   المزوّد النشط: {provider} ({model}) | عبر mock يوثق العدّاد المسار فقط،")
    print("   والقياس الرسمي المعتمد بالنموذج الحقيقي على بيئة الفريق")
    print(f"   القاعدة: {mask_dsn(args.dsn)}")
    print(f"   المقام التنفيذي: {len(sample)} سؤالاً من sprint=1"
          + (f" (عينة طبقية من {len(data_qs)})" if len(sample) < len(data_qs) else " (كامل)"))
    threshold_pct = int(ACCURACY_TARGET * 100)
    print(f"   السلوكية خارج النسبة: {len(behavioral)} | العتبة الرسمية: ≥ {threshold_pct}%")

    results: list[dict] = []
    try:
        with conn.cursor() as cur:
            for q in sample:
                t0 = time.perf_counter()
                try:
                    state = bayan_graph.invoke({"question": q["question"]})
                except Exception as exc:  # noqa: BLE001 — انهيار المخطط = فشل للسؤال
                    state = {"error": f"استثناء مخطط: {exc}"}
                invoke_ms = int((time.perf_counter() - t0) * 1000)

                trace = extract_sql_trace(state)

                # تنفيذ الاستعلام المولَّد (حتى لو فشل الوكيل في تنفيذه بنفسه)
                gen_exc: str | None = None
                gen_rows: list[dict] | None = None
                if trace and trace.get("sql"):
                    try:
                        cur.execute(str(trace["sql"]))
                        cols = [c.name for c in (cur.description or [])]
                        gen_rows = [dict(zip(cols, r, strict=False)) for r in cur.fetchall()]
                    except Exception as exc:  # noqa: BLE001
                        gen_exc = str(exc)
                        conn.rollback()

                # تنفيذ المرجع (مُوثق verified من مهمة #4)
                try:
                    cur.execute(q["expected_sql"])
                    ref_cols = [c.name for c in (cur.description or [])]
                    ref_rows = [dict(zip(ref_cols, r, strict=False)) for r in cur.fetchall()]
                except Exception as exc:  # noqa: BLE001
                    print(f"❌ فشل الاستعلام المرجعي لـ {q['id']} — خلل بيئة: {exc}")
                    return 2

                reason, detail = classify(state, trace, gen_exc, gen_rows, ref_rows)
                results.append({**q, "reason": reason, "detail": detail,
                                "invoke_ms": invoke_ms, "gen_rows": len(gen_rows or []),
                                "ref_rows": len(ref_rows)})
                if args.verbose:
                    mark = "✓" if reason == "صحيح" else "✗"
                    if trace and trace.get("sql"):
                        sql_preview = str(trace["sql"])[:70] + "…"
                    else:
                        sql_preview = "—"
                    print(f"  {mark} {q['id']} [{q['category']}] {reason} ({invoke_ms} مللي ث)")
                    print(f"      المولَّد: {sql_preview}")
    finally:
        conn.close()

    # 4) التقرير
    total = len(results)
    correct = sum(1 for r in results if r["reason"] == "صحيح")
    accuracy = correct / total if total else 0.0

    print("\n" + "=" * 64)
    print("        تقرير عدّاد دقة التنفيذ — بيان run_sql_accuracy")
    print("=" * 64)

    print(f"\n{'الفئة':<16} {'العدد':>5} {'صحيح':>5} {'الدقة':>8}")
    print("-" * 40)
    by_cat: dict[str, list[dict]] = {}
    for r in results:
        by_cat.setdefault(r["category"], []).append(r)
    for cat, items in sorted(by_cat.items(), key=lambda kv: -len(kv[1])):
        c = sum(1 for x in items if x["reason"] == "صحيح")
        print(f"{cat:<16} {len(items):>5} {c:>5} {c / len(items) * 100:>7.0f}%")

    print("\n" + "─" * 64)
    print(f"  الدقة الإجمالية        : {correct}/{total} = {accuracy * 100:.0f}%")
    print(f"  العتبة الرسمية         : ≥ {int(ACCURACY_TARGET * 100)}%")
    for reason in REASONS[1:]:
        n = sum(1 for r in results if r["reason"] == reason)
        if n:
            print(f"  {reason:<20}: {n}")
    print("─" * 64)

    # الإخفاقات بأسبابها
    failures = [r for r in results if r["reason"] != "صحيح"]
    if failures:
        print("\nالإخفاقات وأسبابها:")
        for r in failures:
            print(f"  [{r['id']}] {r['category']} — {r['reason']}")
            if r["detail"]:
                print(f"      {r['detail']}")

    # القسم السلوكي — منفصل خارج النسبة التنفيذية
    if behavioral:
        print("\nالأسئلة السلوكية (استيضاح/رفض) — خارج النسبة التنفيذية:")
        for q in behavioral:
            expected = str((q.get("result_check") or {}).get("expected") or "سلوكي")[:60]
            try:
                state = bayan_graph.invoke({"question": q["question"]})
                acted = "ولّد استعلاماً" if extract_sql_trace(state) else "بلا استعلام"
            except Exception:  # noqa: BLE001
                acted = "استثناء"
            print(f"  {q['id']} [{q['category']}] المتوقع: {expected}")
            print(f"      سلوك الوكيل عبر المزوّد النشط: {acted}")

    if accuracy >= ACCURACY_TARGET:
        print(f"\n✅  النتيجة: الدقة {accuracy * 100:.0f}% ≥ {threshold_pct}% — اجتاز العتبة")
        print("   كود الخروج: 0")
        code = 0
    else:
        print(f"\n❌  النتيجة: الدقة {accuracy * 100:.0f}% < {threshold_pct}% — دون العتبة")
        print("   كود الخروج: 1")
        code = 1
    if provider == "mock":
        print("   ⚠ عبر mock: هذا توثيق لسلامة المسار والتقرير فقط — ليس القياس الرسمي")
    print("=" * 64)
    return code


if __name__ == "__main__":
    sys.exit(main())
