#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""العدّاد الأول لمنهجية التقييم — التحقق من مجموعة golden dataset.

الوظيفة (وفق evaluation/README.md):
  1. فحص سلامة المجموعة: بنية كل سؤال، فئاته، ولا استعلام كتابة مطلقًا.
  2. بلا اتصال بقاعدة: إحصاء المجموعة (python runners/verify_dataset.py --stats).
  3. مع اتصال بقاعدة العرض (make dev-db ثم هذا السكربت): تنفيذ كل
     expected_sql وطباعة عدد صفوفه ومدته — لتثبيت النتائج المتوقعة في
     result_check للأسئلة ذات status=seed.

مثال:
  python evaluation/runners/verify_dataset.py --stats
  python evaluation/runners/verify_dataset.py \
      --dsn postgresql://bayan_reader:bayan_dev_reader@localhost:5433/university
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

DATASET_PATH = Path(__file__).resolve().parent.parent / "golden_dataset" / "questions.json"

# أنماط الكتابة المحرمة في الاستعلامات المرجعية — القاعدة للقراءة فقط (ADR-001)
FORBIDDEN_PATTERN = re.compile(
    r"\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|CREATE|GRANT|REVOKE|COPY)\b",
    re.IGNORECASE,
)

CATEGORIES = {
    "simple_count", "aggregation", "filter", "join",
    "comparison", "trend", "clarification", "safety", "rag_policy", "multi_step",
}


def load_dataset() -> dict:
    with open(DATASET_PATH, encoding="utf-8") as f:
        return json.load(f)


def check_structure(questions: list[dict]) -> list[str]:
    """فحص بنيوي سريع — يعيد قائمة الملاحظات."""
    issues = []
    seen_ids = set()
    for q in questions:
        qid = q.get("id", "؟؟؟")
        if qid in seen_ids:
            issues.append(f"{qid}: معرّف مكرر")
        seen_ids.add(qid)
        if q.get("category") not in CATEGORIES:
            issues.append(f"{qid}: فئة غير معروفة «{q.get('category')}»")
        if not q.get("question"):
            issues.append(f"{qid}: سؤال فارغ")
        sql = q.get("expected_sql")
        if sql is None:
            rc = q.get("result_check", {})
            if rc.get("type") != "behavior":
                issues.append(f"{qid}: بلا expected_sql وليس سلوكيًا (result_check.type=behavior)")
        else:
            if FORBIDDEN_PATTERN.search(sql):
                issues.append(f"{qid}: استعلام مرجعي يحوي نمط كتابة محرم — القاعدة للقراءة فقط")
            if ";" in sql.rstrip(";"):
                issues.append(f"{qid}: أكثر من استعلام في حقل واحد")
        if q.get("status") not in {"seed", "verified"}:
            issues.append(f"{qid}: status غير معروف «{q.get('status')}»")
    return issues


def cmd_stats(questions: list[dict]) -> int:
    """إحصاء المجموعة دون اتصال بأي قاعدة."""
    issues = check_structure(questions)
    print(f"مجموعة golden dataset — {len(questions)} سؤالًا")
    by_cat: dict[str, int] = {}
    by_sprint: dict[str, int] = {}
    for q in questions:
        by_cat[q["category"]] = by_cat.get(q["category"], 0) + 1
        by_sprint[q.get("sprint", "؟")] = by_sprint.get(q.get("sprint", "؟"), 0) + 1
    print("\nحسب الفئة:")
    for cat, n in sorted(by_cat.items(), key=lambda kv: -kv[1]):
        print(f"  {cat:<16} {n}")
    print("\nحسب السبرنت:")
    for sprint, n in sorted(by_sprint.items()):
        print(f"  Sprint {sprint}          {n}")
    pending = sum(1 for q in questions if q.get("status") == "seed" and q.get("expected_sql"))
    print(f"\nأسئلة بانتظار تثبيت النتيجة المتوقعة (status=seed): {pending}")
    if issues:
        print("\nملاحظات بنيوية:")
        for i in issues:
            print(f"  ! {i}")
        return 1
    print("\nالبنية سليمة — لا ملاحظات.")
    return 0


def cmd_verify(questions: list[dict], dsn: str) -> int:
    """تنفيذ الاستعلامات المرجعية على قاعدة العرض وطباعة النتائج للتثبيت."""
    try:
        import psycopg2  # noqa: F401 — متاح ضمن اعتماديات backend
    except ImportError:
        print("psycopg2 غير مثبت — شغّل داخل بيئة backend (pip install -r backend/requirements.txt)")
        return 1

    import psycopg2 as pg

    issues = check_structure(questions)
    if issues:
        print("فحص البنية كشف ملاحظات — عالجها قبل التحقق:")
        for i in issues:
            print(f"  ! {i}")
        return 1

    failures = 0
    print(f"{'المعرّف':<8} {'الصفوف':>6} {'المدة (مللي ث)':>12}  الفئة")
    print("-" * 60)
    try:
        conn = pg.connect(dsn, connect_timeout=5)
    except Exception as exc:  # noqa: BLE001 — رسالة واضحة أفضل من تتبع
        print(f"تعذر الاتصال بالقاعدة: {exc}")
        print("هل شغّلت make dev-db أصلًا؟ القارئ: bayan_reader/bayan_dev_reader على المنفذ 5433")
        return 1

    try:
        with conn.cursor() as cur:
            for q in questions:
                sql = q.get("expected_sql")
                if not sql:
                    print(f"{q['id']:<8} {'—':>6} {'—':>12}  سلوكي ({q['category']})")
                    continue
                try:
                    cur.execute(sql)
                    rows = cur.fetchall()
                    print(f"{q['id']:<8} {len(rows):>6} {'—':>12}  {q['category']}")
                except Exception as exc:  # noqa: BLE001
                    failures += 1
                    print(f"{q['id']:<8} {'خطأ':>6} {'—':>12}  {q['category']} — {exc}")
    finally:
        conn.close()

    print("-" * 60)
    if failures:
        print(f"فشل {failures} استعلام مرجعي — راجع الأسئلة أعلاه (الأعمدة أمشاهد القاعدة).")
        return 1
    print("كل الاستعلامات المرجعية نفذت بنجاح.")
    print("الخطوة التالية: انقل عدد الصفوف إلى result_check واجعل status=verified عبر PR.")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="التحقق من مجموعة golden dataset")
    parser.add_argument(
        "--dsn",
        default="postgresql://bayan_reader:bayan_dev_reader@localhost:5433/university",
        help="سلسلة اتصال قاعدة العرض (الافتراضية: قارئ make dev-db المحلي)",
    )
    parser.add_argument(
        "--stats",
        action="store_true",
        help="إحصاء المجموعة فقط دون اتصال بقاعدة",
    )
    args = parser.parse_args()

    data = load_dataset()
    questions = data.get("questions", [])
    if args.stats:
        return cmd_stats(questions)
    return cmd_verify(questions, args.dsn)


if __name__ == "__main__":
    sys.exit(main())
