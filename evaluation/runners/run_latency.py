#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""عدّاد زمن الاستجابة — p50/p95/متوسط/أقصى لأسئلة sprint=1 عبر المخطط كاملاً.

يقيس الزمن الكلي لكل سؤال (سؤال ← final/error) عبر bayan_graph.invoke مباشرة
بلا خادم (نفس نمط run_safety)، ويعرض إضافة إحصائية مساندة: توزيع زمن كل
وكيل من أثر التنفيذ (agent_trace[].duration_ms) لعزل مصادر البطء.

كود الخروج: 0 عند p95 ≤ 3 ثوانٍ | 1 فوقها | 2 خطأ بنية تحتية

⚠ ملاحظة القياس الرسمي: عبر المزوّد الوهمي mock (الافتراضي — ADR-002) يتحقق
العدّاد من سلامة المسار وصحة التقرير فقط — **زمن السقالة لا النموذج**.
الأرقام المعتمدة تُوثق بالنموذج الحقيقي على بيئة الفريق (make llm ثم
LLM_PROVIDER=ollama) — ويظهر المزوّد الفعلي في رأس التقرير.

الاستخدام (بعد make dev-db — يتصل بما توفره إعدادات المخطط للقاعدة):
  python evaluation/runners/run_latency.py
  python evaluation/runners/run_latency.py --limit 10   # عينة طبقية سريعة

الالتزامات: ADR-002 (mock أولاً — قابل للتجاوز بالبيئة) | ADR-003 (قراءة أثر
الوكلاء) | ADR-004 (لا مساس بملفات backend/app/ ولا ملك مهمة #4)
"""

from __future__ import annotations

import argparse
import json
import math
import os
import sys
import time
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
LATENCY_TARGET_S = 3.0   # عتبة القبول الرسمية: p95 ≤ 3 ثوانٍ (وثيقة المشروع)


# ---------------------------------------------------------------------------
# تحميل المجموعة وأخذ العينة
# ---------------------------------------------------------------------------

def load_questions() -> list[dict]:
    """تحميل golden dataset — خروج 2 عند أي خلل بنيوي (المجموعة ملك #4)."""
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


def stratified_sample(questions: list[dict], limit: int | None) -> list[dict]:
    """عينة طبقية حتمية — round-robin على الفئات لتبقى كل الفئات ممثلة."""
    if not limit or limit >= len(questions):
        return list(questions)
    pools: dict[str, list[dict]] = {}
    for q in questions:
        pools.setdefault(q["category"], []).append(q)
    picked: list[dict] = []
    while len(picked) < limit and any(pools.values()):
        for pool in pools.values():
            if pool and len(picked) < limit:
                picked.append(pool.pop(0))
    return picked


def percentile(sorted_values: list[float], p: float) -> float:
    """المئين بطريقة nearest-rank (حتمية قابلة للتكرار بين الأجهزة)."""
    if not sorted_values:
        return 0.0
    rank = max(1, math.ceil(p / 100 * len(sorted_values)))
    return sorted_values[min(rank, len(sorted_values)) - 1]


# ---------------------------------------------------------------------------
# التشغيل الرئيسي
# ---------------------------------------------------------------------------

def main() -> int:
    parser = argparse.ArgumentParser(
        description="عدّاد زمن الاستجابة — p50/p95/متوسط/أقصى عبر bayan_graph (بلا خادم)",
    )
    parser.add_argument(
        "--limit", "-l", type=int, default=None,
        help="عينة طبقية سريعة (round-robin على الفئات)",
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
        settings = get_settings()
        provider, model = settings.llm_provider, settings.llm_model
    except Exception:  # noqa: BLE001 — إعدادات قديمة لا توقف القياس
        settings, provider, model = None, "؟", "؟"

    # 2) فحص مسبق لقاعدة الوكيل — بلا قاعدة يعكس القياس مسار الفشل السريع لا الأداء
    agent_db = getattr(settings, "odoo_database_url", "") if settings else ""
    if agent_db:
        try:
            import psycopg
            psycopg.connect(agent_db, connect_timeout=3).close()
        except Exception as exc:  # noqa: BLE001
            print(f"❌ قاعدة الوكيل غير متاحة ({agent_db}): {exc}")
            print("القياس بلا قاعدة يقيس مسار الفشل السريع — شغّل make dev-db أولاً")
            return 2
    else:
        print("⚠ تعذر فحص قاعدة الوكيل مسبقاً (إعدادات قديمة) — يتابع العدّاد")

    # 3) أسئلة sprint=1 كاملة — بيانات وسلوكية (كلها تمر عبر المخطط)
    questions = load_questions()
    sprint1 = [q for q in questions if q.get("sprint") == 1]
    if not sprint1:
        print("❌ لا أسئلة في sprint=1 — راجع مجموعة القياس")
        return 2
    sample = stratified_sample(sprint1, args.limit)

    print("⏱️  عدّاد زمن الاستجابة — بيان run_latency.py")
    print(f"   المزوّد النشط: {provider} ({model})")
    print("   عبر mock: زمن السقالة فقط لا النموذج — القياس الرسمي بالنموذج الحقيقي")
    print(f"   الأسئلة: {len(sample)} من sprint=1 (بيانات + سلوكية)"
          + (f" — عينة طبقية من {len(sprint1)}" if len(sample) < len(sprint1) else " — كاملة"))
    print(f"   العتبة الرسمية: p95 ≤ {LATENCY_TARGET_S:.0f} ثوانٍ")

    results: list[dict] = []
    agent_durations: dict[str, list[float]] = {}
    for q in sample:
        t0 = time.perf_counter()
        try:
            state = bayan_graph.invoke({"question": q["question"]})
            errored = bool(state.get("error"))
        except Exception as exc:  # noqa: BLE001 — انهيار المخطط يسجل كحالة خطأ
            state, errored = {"error": str(exc)}, True
        elapsed_ms = (time.perf_counter() - t0) * 1000

        # إحصاء مساند: زمن كل وكيل من الأثر
        for entry in (state.get("agent_trace") or []):
            ms = entry.get("duration_ms")
            if isinstance(ms, (int, float)):
                agent_durations.setdefault(str(entry.get("agent", "؟")), []).append(float(ms))

        status = "error" if errored else "final"
        results.append({"id": q["id"], "category": q["category"], "status": status,
                        "ms": elapsed_ms})
        if args.verbose:
            print(f"  {q['id']} [{q['category']}] {status} — {elapsed_ms:.0f} مللي ث")

    # 4) المجاميع
    times = sorted(r["ms"] for r in results)
    p50 = percentile(times, 50)
    p95 = percentile(times, 95)
    avg = sum(times) / len(times) if times else 0.0
    mx = max(times) if times else 0.0
    errors = sum(1 for r in results if r["status"] == "error")

    print("\n" + "=" * 64)
    print("        تقرير عدّاد زمن الاستجابة — بيان run_latency")
    print("=" * 64)

    print(f"\n{'المعرّف':<8} {'الفئة':<16} {'الحالة':>7} {'المدة (مللي ث)':>14}")
    print("-" * 50)
    for r in results:
        mark = "✗" if r["status"] == "error" else "✓"
        print(f"{r['id']:<8} {r['category']:<16} {mark} {r['status']:>6} {r['ms']:>13.0f}")

    print("\n" + "─" * 64)
    print(f"  الأسئلة                : {len(results)} (أخطاء: {errors})")
    print(f"  p50                    : {p50:.0f} مللي ث ({p50 / 1000:.2f} ث)")
    print(f"  p95                    : {p95:.0f} مللي ث ({p95 / 1000:.2f} ث)")
    print(f"  المتوسط                : {avg:.0f} مللي ث ({avg / 1000:.2f} ث)")
    print(f"  الأقصى                 : {mx:.0f} مللي ث ({mx / 1000:.2f} ث)")
    print("─" * 64)

    # توزيع زمن الوكلاء من الأثر — إحصاء مساند لعزل مصادر البطء
    if agent_durations:
        print("\nمتوسط زمن كل وكيل من الأثر (إحصاء مساند):")
        for agent, durs in sorted(agent_durations.items(), key=lambda kv: -sum(kv[1])):
            avg_ms = sum(durs) / len(durs)
            print(f"  {agent:<16} {len(durs):>3} تشغيلاً | متوسط {avg_ms:>7.0f} مللي ث")

    if errors == len(results) and results:
        print("\n❌ كل الأسئلة انتهت بحالة error — القياس غير سليم، راجع البيئة")
        return 2

    if p95 <= LATENCY_TARGET_S * 1000:
        print(f"\n✅  النتيجة: p95 = {p95 / 1000:.2f} ث ≤ {LATENCY_TARGET_S:.0f} ث — اجتاز العتبة")
        print("   كود الخروج: 0")
        code = 0
    else:
        print(f"\n❌  النتيجة: p95 = {p95 / 1000:.2f} ث > {LATENCY_TARGET_S:.0f} ث — دون العتبة")
        print("   كود الخروج: 1")
        code = 1
    if provider == "mock":
        print("   ⚠ عبر mock: زمن السقالة لا النموذج — ليس القياس الرسمي المعتمد")
    print("=" * 64)
    return code


if __name__ == "__main__":
    sys.exit(main())
