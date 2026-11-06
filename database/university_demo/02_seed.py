#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""بيان — تعبئة القاعدة التجريبية الموحدة ببيانات جامعية اصطناعية عربية.

سكربت مستقل تماماً (بلا أي استيراد من تطبيق بيان) يستخدم psycopg3 فقط،
ويعبّئ جداول المخطط المعرّفة في 01_schema.sql ببيانات يمنية اصطناعية واقعية:
طلاب، هيئة تدريس، برامج، دفعات، مقررات، ورسوم بحالات سداد متنوعة.

الخصائص:
  * حتمي (deterministic): البذرة الثابتة 42 تنتج نفس البيانات في كل تشغيل.
  * قابل لإعادة التشغيل: TRUNCATE ... RESTART IDENTITY CASCADE قبل الإدخال.
  * بيانات واقعية: أسماء عربية يمنية، مدن يمنية، مبالغ بالريال اليمني.

الاستخدام:
    python database/university_demo/02_seed.py
    python database/university_demo/02_seed.py --students 300
    python database/university_demo/02_seed.py --dsn postgresql://odoo:odoo@localhost:5433/university

ترتيب التشغيل الموصى به (أو ببساطة: make dev-db):
    01_schema.sql  ←  02_seed.py  ←  03_views_and_reader.sql
"""

from __future__ import annotations

import argparse
import os
import random
import sys
from datetime import date
from urllib.parse import quote as url_quote

try:
    import psycopg
except ImportError:  # pragma: no cover
    sys.exit(
        "خطأ: مكتبة psycopg (psycopg3) غير مثبتة.\n"
        'ثبّتها أولاً:  uv pip install "psycopg[binary]"   أو   pip install "psycopg[binary]"'
    )

# ثابت العشوائية — 42 افتراضياً: نفس القيمة = نفس البيانات في كل تشغيل
RANDOM_SEED = 42

# ---------------------------------------------------------------------------
# قوائم الأسماء العربية اليمنية (مستوحاة من أرشيف المشروع — قوائم الأسماء فقط)
# ---------------------------------------------------------------------------
FIRST_NAMES_MALE = [
    "أحمد", "محمد", "عبدالله", "عبدالرحمن", "علي", "حسن", "حسين", "صالح",
    "طارق", "فارس", "وليد", "سامي", "ياسر", "عمار", "هيثم", "مراد",
    "أنس", "بلال", "زيد", "حمزة", "إبراهيم", "إسماعيل", "يوسف", "عمر",
    "خالد", "ماهر", "نبيل", "عصام", "جمال", "أكرم",
]
FIRST_NAMES_FEMALE = [
    "فاطمة", "مريم", "أمل", "هدى", "سارة", "نور", "رنا", "سلمى",
    "دعاء", "أروى", "هند", "غادة", "لمى", "ريم", "آية", "سمية",
    "إيمان", "هبة", "شيماء", "أسماء", "خديجة", "عائشة", "زينب", "رقية",
    "نجاة", "سعاد", "ابتسام", "نجوى", "رحمة", "ياسمين",
]
FAMILY_NAMES = [
    "العريقي", "الحكيمي", "الشميري", "الحداد", "المقطري", "العزي", "الصلوي",
    "الجنيد", "بامطرف", "باجبير", "باعشن", "الكامل", "الشعبي", "الأهدل",
    "الزبيري", "الريمي", "العمراني", "الأغبري", "المخلافي", "الشرعبي",
    "الذبحاني", "الرداعي", "الصبري", "الحيمي", "الوصابي", "القدسي",
    "المطري", "الهمداني", "الحبيشي", "السقاف", "الجابري", "الآنسي",
    "الوزير", "الشامي", "النهمي", "الدبعي",
]

# المدن اليمنية مع أوزان تقريبية بحسب الكثافة السكانية
CITIES = [
    "صنعاء", "عدن", "تعز", "الحديدة", "إب", "المكلا", "سيئون", "ذمار",
    "عمران", "لحج", "الضالع", "البيضاء", "مأرب", "المحويت", "صعدة", "تريم",
]
CITY_WEIGHTS = [28, 20, 18, 12, 6, 4, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1]

GENDERS = ["ذكر", "أنثى"]
GENDER_WEIGHTS = [52, 48]

PHONE_PREFIXES = ["77", "73", "71", "78", "70"]  # بادئات الجوال اليمني

# ---------------------------------------------------------------------------
# البيانات المرجعية: الأقسام والبرامج والدفعات والمقررات
# ---------------------------------------------------------------------------
# (الرمز، اسم القسم) — قسم لكل برنامج
DEPARTMENTS = [
    ("CS", "قسم علوم الحاسوب"),
    ("IT", "قسم تقنية المعلومات"),
    ("BUS", "قسم إدارة الأعمال"),
    ("ACC", "قسم المحاسبة"),
    ("CE", "قسم الهندسة المدنية"),
    ("LAW", "قسم القانون"),
]

# (الرمز، اسم البرنامج، الرسوم السنوية بالريال اليمني، وزن الشعبية)
# — في OpenEduCat البرنامج الأكاديمي هو op_course
COURSES = [
    ("CS", "علوم الحاسوب", 900_000, 22),
    ("IT", "تقنية المعلومات", 850_000, 18),
    ("BUS", "إدارة الأعمال", 700_000, 16),
    ("ACC", "المحاسبة", 720_000, 14),
    ("CE", "الهندسة المدنية", 950_000, 15),
    ("LAW", "القانون", 650_000, 15),
]

BATCH_YEARS = [2021, 2022, 2023, 2024, 2025]
BATCH_WEIGHTS = [19, 20, 21, 21, 19]

# مقررات لكل برنامج: (الرمز، الاسم)
SUBJECTS = {
    "CS": [
        ("CS101", "مقدمة في البرمجة"),
        ("CS201", "تراكيب البيانات والخوارزميات"),
        ("CS301", "قواعد البيانات"),
        ("CS401", "الذكاء الاصطناعي"),
    ],
    "IT": [
        ("IT101", "أساسيات تقنية المعلومات"),
        ("IT201", "شبكات الحاسوب"),
        ("IT301", "أمن المعلومات"),
        ("IT401", "تحليل وتصميم النظم"),
    ],
    "BUS": [
        ("BUS101", "مبادئ الإدارة"),
        ("BUS201", "السلوك التنظيمي"),
        ("BUS301", "إدارة الموارد البشرية"),
        ("BUS401", "ريادة الأعمال"),
    ],
    "ACC": [
        ("ACC101", "مبادئ المحاسبة"),
        ("ACC201", "المحاسبة المالية"),
        ("ACC301", "محاسبة التكاليف"),
        ("ACC401", "المراجعة"),
    ],
    "CE": [
        ("CE101", "الرسم الهندسي"),
        ("CE201", "ميكانيكا المواد"),
        ("CE301", "تصميم المنشآت الخرسانية"),
        ("CE401", "هندسة الطرق"),
    ],
    "LAW": [
        ("LAW101", "مدخل إلى علم القانون"),
        ("LAW201", "القانون المدني"),
        ("LAW301", "القانون الجنائي"),
        ("LAW401", "القانون التجاري"),
    ],
}

# توزيع حالات سداد الرسوم: مسدد / جزئي / متأخر
FEE_STATE_FULL = 0.60   # 60% من السطور مسددة بالكامل
FEE_STATE_PARTIAL = 0.85  # حتى 85%: مسددة جزئياً — وما بعدها متأخرة
PARTIAL_RATIOS = [0.25, 0.5, 0.75]

# الجداول التي تُدخل بمعرّفات صريحة — يلزم ضبط تسلسلها بعد الإدخال
IDENTITY_TABLES = (
    "op_department", "res_partner", "op_course", "op_batch",
    "op_student", "op_faculty", "op_subject",
)

# تنظيف كامل قبل الإدخال — يضمن قابلية إعادة التشغيل (idempotent)
TRUNCATE_SQL = """
TRUNCATE TABLE op_student_course_rel, op_student_fees_details, op_student,
              op_faculty, op_subject, op_batch, op_course, op_department,
              res_partner
RESTART IDENTITY CASCADE
"""


# ---------------------------------------------------------------------------
# وسيطات سطر الأوامر و DSN
# ---------------------------------------------------------------------------
def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="تعبئة القاعدة التجريبية الموحدة ببيانات جامعية اصطناعية عربية (حتمية)."
    )
    parser.add_argument(
        "--students", type=int, default=500,
        help="عدد الطلاب المطلوب توليدهم (الافتراضي: 500)",
    )
    parser.add_argument(
        "--faculty", type=int, default=40,
        help="عدد أعضاء هيئة التدريس (الافتراضي: 40)",
    )
    parser.add_argument(
        "--dsn", default=None,
        help="رابط اتصال PostgreSQL. الافتراضي: من متغيرات ODOO_DB_* "
             "أو postgresql://odoo:odoo@localhost:5433/university",
    )
    parser.add_argument(
        "--seed", type=int, default=RANDOM_SEED,
        help="بذرة العشوائية — قيمة ثابتة تعني بيانات متطابقة في كل تشغيل (الافتراضي: 42)",
    )
    args = parser.parse_args()
    if args.students < 1:
        parser.error("--students يجب أن يكون 1 على الأقل")
    if args.faculty < 0:
        parser.error("--faculty لا يمكن أن يكون سالباً")
    return args


def build_default_dsn() -> str:
    """يبني DSN من متغيرات ODOO_DB_* إن اكتملت، وإلا فالافتراضي المحلي."""
    user = os.getenv("ODOO_DB_USER")
    password = os.getenv("ODOO_DB_PASSWORD")
    if user and password:
        host = os.getenv("ODOO_DB_HOST", "localhost")
        port = os.getenv("ODOO_DB_PORT", "5433")
        name = os.getenv("ODOO_DB_NAME", "university")
        # ترميز المكونات — يشمل مسارات socket (مثل /tmp/pgdata) إذا حُددت مضيفاً
        return (
            f"postgresql://{url_quote(user)}:{url_quote(password)}"
            f"@{url_quote(host, safe='')}:{port}/{url_quote(name)}"
        )
    return "postgresql://odoo:odoo@localhost:5433/university"


# ---------------------------------------------------------------------------
# توليد البيانات (كله داخل الذاكرة أولاً — حتمي ومتسق)
# ---------------------------------------------------------------------------
def random_phone() -> str:
    """رقم جوال يمني بصيغة دولية: +9677XXXXXXXX"""
    prefix = random.choice(PHONE_PREFIXES)
    digits = random.randint(1_000_000, 9_999_999)
    return f"+967{prefix}{digits}"


def person_name(gender: str) -> str:
    """اسم عربي كامل: الاسم + اسم الأب + العائلة."""
    first = random.choice(FIRST_NAMES_MALE if gender == "ذكر" else FIRST_NAMES_FEMALE)
    father = random.choice(FIRST_NAMES_MALE)
    family = random.choice(FAMILY_NAMES)
    return f"{first} {father} {family}"


def generate_students(n: int) -> list[dict]:
    """يولّد بيانات الطلاب بأرقام قيد فريدة بصيغة YUxxxxxxx.

    رقم القيد: YU + سنتا سنة القبول + تسلسل خماسي لكل سنة.
    مثال: أول طالب في دفعة 2021 ← YU2100001
    """
    students: list[dict] = []
    year_counters = {year: 0 for year in BATCH_YEARS}
    for _ in range(n):
        gender = random.choices(GENDERS, weights=GENDER_WEIGHTS, k=1)[0]
        course = random.choices(COURSES, weights=[c[3] for c in COURSES], k=1)[0]
        year = random.choices(BATCH_YEARS, weights=BATCH_WEIGHTS, k=1)[0]
        year_counters[year] += 1
        roll_number = f"YU{year % 100:02d}{year_counters[year]:05d}"
        students.append({
            "roll_number": roll_number,
            "gender": gender,
            "course_code": course[0],
            "batch_year": year,
            "name": person_name(gender),
            "email": f"{roll_number.lower()}@yu.edu.ye",
            "phone": random_phone(),
            "city": random.choices(CITIES, weights=CITY_WEIGHTS, k=1)[0],
        })
    return students


def generate_faculty(n: int) -> list[dict]:
    """يولّد أعضاء هيئة التدريس موزعين على الأقسام."""
    faculty: list[dict] = []
    for _ in range(n):
        gender = random.choices(GENDERS, weights=[60, 40], k=1)[0]
        department = random.choice(DEPARTMENTS)
        faculty.append({
            "gender": gender,
            "department_code": department[0],
            "name": f"د. {person_name(gender)}",
            "email": None,  # يُعيَّن لاحقاً بعد ترقيم أعضاء هيئة التدريس
            "phone": random_phone(),
            "city": random.choices(CITIES, weights=CITY_WEIGHTS, k=1)[0],
        })
    return faculty


def generate_fees(students: list[dict], course_fees: dict[str, int]) -> list[tuple]:
    """سطور رسوم لكل فصل دراسي منذ سنة قبول الطالب — بحالات سداد متنوعة.

    كل سطر: (student_id, amount, paid_amount, date, state)
    """
    fees: list[tuple] = []
    for student_id, student in enumerate(students, start=1):
        semester_amount = course_fees[student["course_code"]] // 2
        semester_dates = [
            date(y, 10, 1) for y in range(student["batch_year"], 2025)
        ] + [date(y + 1, 3, 1) for y in range(student["batch_year"], 2025)]
        if student["batch_year"] == 2025:
            semester_dates.append(date(2025, 10, 1))  # فصل خريف 2025 لدفعة 2025
        semester_dates.sort()
        for fee_date in semester_dates:
            r = random.random()
            if r < FEE_STATE_FULL:
                state, paid = "مسدد", semester_amount
            elif r < FEE_STATE_PARTIAL:
                ratio = random.choice(PARTIAL_RATIOS)
                paid = int(round(semester_amount * ratio / 1000.0)) * 1000
                state = "جزئي"
            else:
                state, paid = "متأخر", 0
            fees.append((student_id, semester_amount, paid, fee_date, state))
    return fees


# ---------------------------------------------------------------------------
# الإدخال في القاعدة
# ---------------------------------------------------------------------------
def check_schema(cur: psycopg.Cursor) -> None:
    """يتأكد أن 01_schema.sql طُبّق قبل التعبئة — برسالة عربية واضحة."""
    cur.execute("SELECT to_regclass('public.op_student') IS NOT NULL")
    if not cur.fetchone()[0]:
        sys.exit(
            "خطأ: جدول op_student غير موجود — طبّق المخطط أولاً:\n"
            "  psql -h localhost -p 5433 -U odoo -d university -f 01_schema.sql\n"
            "أو استخدم الأمر الموحد:  make dev-db"
        )


def seed(cur: psycopg.Cursor, students: list[dict], faculty: list[dict]) -> None:
    """يدخل كل البيانات داخل معاملة واحدة — نجاح كامل أو لا شيء."""
    check_schema(cur)
    cur.execute(TRUNCATE_SQL)

    n_students = len(students)

    # 1) الأقسام (معرّفات صريحة 1..6)
    cur.executemany(
        "INSERT INTO op_department (id, name, code) VALUES (%s, %s, %s)",
        [(i, name, code) for i, (code, name) in enumerate(DEPARTMENTS, start=1)],
    )
    dept_id_by_code = {code: i for i, (code, _) in enumerate(DEPARTMENTS, start=1)}

    # 2) البرامج (معرّفات صريحة 1..6)
    cur.executemany(
        "INSERT INTO op_course (id, name, code) VALUES (%s, %s, %s)",
        [(i, name, code) for i, (code, name, _, _) in enumerate(COURSES, start=1)],
    )
    course_id_by_code = {c[0]: i for i, c in enumerate(COURSES, start=1)}
    course_fees = {code: fee for code, _, fee, _ in COURSES}

    # 3) الدفعات: لكل برنامج دفعة في كل سنة (2021..2025) — معرّفات صريحة 1..30
    batch_rows = []
    batch_id_by_key: dict[tuple[str, int], int] = {}
    batch_id = 0
    for code, _, _, _ in COURSES:
        for year in BATCH_YEARS:
            batch_id += 1
            batch_rows.append((batch_id, f"دفعة {year}", course_id_by_code[code]))
            batch_id_by_key[(code, year)] = batch_id
    cur.executemany(
        "INSERT INTO op_batch (id, name, course_id) VALUES (%s, %s, %s)",
        batch_rows,
    )

    # 4) المقررات (معرّفات صريحة 1..24)
    subject_rows = []
    subject_ids_by_course: dict[str, list[int]] = {}
    subject_id = 0
    for code, _, _, _ in COURSES:
        subject_ids_by_course[code] = []
        for subject_code, subject_name in SUBJECTS[code]:
            subject_id += 1
            subject_rows.append(
                (subject_id, subject_code, subject_name, course_id_by_code[code])
            )
            subject_ids_by_course[code].append(subject_id)
    cur.executemany(
        "INSERT INTO op_subject (id, code, name, course_id) VALUES (%s, %s, %s, %s)",
        subject_rows,
    )

    # 5) جهات الاتصال: الطلاب أولاً (1..N) ثم هيئة التدريس (N+1..N+M)
    partner_rows = [(i + 1, s["name"], s["email"], s["phone"], s["city"])
                    for i, s in enumerate(students)]
    for j, member in enumerate(faculty):
        member["email"] = f"faculty.{j + 1:03d}@yu.edu.ye"
        partner_rows.append(
            (n_students + j + 1, member["name"], member["email"],
             member["phone"], member["city"])
        )
    cur.executemany(
        "INSERT INTO res_partner (id, name, email, phone, city) "
        "VALUES (%s, %s, %s, %s, %s)",
        partner_rows,
    )

    # 6) الطلاب (partner_id بنفس ترقيم جهات الاتصال)
    cur.executemany(
        "INSERT INTO op_student (id, roll_number, partner_id, course_id, batch_id, gender) "
        "VALUES (%s, %s, %s, %s, %s, %s)",
        [
            (
                i + 1, s["roll_number"], i + 1,
                course_id_by_code[s["course_code"]],
                batch_id_by_key[(s["course_code"], s["batch_year"])],
                s["gender"],
            )
            for i, s in enumerate(students)
        ],
    )

    # 7) هيئة التدريس
    cur.executemany(
        "INSERT INTO op_faculty (id, partner_id, department_id) VALUES (%s, %s, %s)",
        [
            (j + 1, n_students + j + 1, dept_id_by_code[m["department_code"]])
            for j, m in enumerate(faculty)
        ],
    )

    # 8) سطور الرسوم (المعرّف تلقائي — التسلسل أعيد ضبطه بالـ TRUNCATE)
    fees = generate_fees(students, course_fees)
    cur.executemany(
        "INSERT INTO op_student_fees_details (student_id, amount, paid_amount, date, state) "
        "VALUES (%s, %s, %s, %s, %s)",
        fees,
    )

    # 9) تسجيل الطلاب في مقررات برامجهم (حتى 4 مقررات لكل طالب)
    rel_rows = []
    for i, s in enumerate(students):
        available = subject_ids_by_course[s["course_code"]]
        for subject_id in random.sample(available, k=min(4, len(available))):
            rel_rows.append((i + 1, subject_id))
    cur.executemany(
        "INSERT INTO op_student_course_rel (student_id, subject_id) VALUES (%s, %s)",
        rel_rows,
    )

    # 10) ضبط تسلسلات المعرّفات بعد الإدخال الصريح
    for table in IDENTITY_TABLES:
        cur.execute(
            f"SELECT setval(pg_get_serial_sequence('{table}', 'id'), "
            f"(SELECT MAX(id) FROM {table}))"
        )


def collect_stats(cur: psycopg.Cursor) -> dict:
    """يجمع إحصاءات التحقق من القاعدة نفسها بعد الالتزام."""
    stats: dict = {}
    cur.execute("SELECT COUNT(*) FROM op_student")
    stats["students"] = cur.fetchone()[0]
    cur.execute("SELECT gender, COUNT(*) FROM op_student GROUP BY gender")
    stats["by_gender"] = dict(cur.fetchall())
    cur.execute("SELECT COUNT(*) FROM op_course")
    stats["courses"] = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM op_batch")
    stats["batches"] = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM op_department")
    stats["departments"] = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM op_faculty")
    stats["faculty"] = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM res_partner")
    stats["partners"] = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM op_subject")
    stats["subjects"] = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM op_student_course_rel")
    stats["enrollments"] = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM op_student_fees_details")
    stats["fee_lines"] = cur.fetchone()[0]
    cur.execute("SELECT state, COUNT(*) FROM op_student_fees_details GROUP BY state")
    stats["fees_by_state"] = dict(cur.fetchall())
    cur.execute("SELECT COALESCE(SUM(amount), 0), COALESCE(SUM(paid_amount), 0) "
                "FROM op_student_fees_details")
    total_amount, total_paid = cur.fetchone()
    stats["total_amount"] = int(total_amount)
    stats["total_paid"] = int(total_paid)
    return stats


def print_summary(stats: dict, host: str, port: str, dbname: str) -> None:
    """يطبع ملخصاً عربياً لما تم إدخاله."""
    by_state = " | ".join(
        f"{state}: {count}" for state, count in sorted(stats["fees_by_state"].items())
    )
    by_gender = " | ".join(
        f"{g}: {c}" for g, c in sorted(stats["by_gender"].items())
    )
    print()
    print("✅ اكتملت تعبئة القاعدة التجريبية الموحدة بنجاح")
    print(f"   القاعدة: {host}:{port}/{dbname}")
    print(f"   الطلاب: {stats['students']:,} ({by_gender})")
    print(f"   البرامج: {stats['courses']} | الدفعات: {stats['batches']} | "
          f"الأقسام: {stats['departments']}")
    print(f"   هيئة التدريس: {stats['faculty']} | جهات الاتصال: {stats['partners']:,}")
    print(f"   سطور الرسوم: {stats['fee_lines']:,} ({by_state})")
    print(f"   المقررات: {stats['subjects']} | تسجيلات المقررات: {stats['enrollments']:,}")
    print(f"   إجمالي المستحق: {stats['total_amount']:,} ريال يمني | "
          f"إجمالي المسدد: {stats['total_paid']:,} ريال يمني")
    print()
    print("   الخطوة التالية: طبّق 03_views_and_reader.sql ثم شغّل verify.sh")
    print("   (أو الأمر الموحد الذي يفعل كل ذلك: make dev-db)")


def main() -> None:
    args = parse_args()
    random.seed(args.seed)  # الحتمية: نفس البذرة = نفس البيانات دائماً
    dsn = args.dsn or build_default_dsn()

    print(f"🌱 توليد بيانات اصطناعية حتمية (seed={args.seed}): "
          f"{args.students} طالباً و{args.faculty} عضو هيئة تدريس...")
    students = generate_students(args.students)
    faculty = generate_faculty(args.faculty)

    try:
        conn = psycopg.connect(dsn)
    except psycopg.OperationalError as exc:
        sys.exit(f"❌ تعذر الاتصال بقاعدة البيانات عبر: {dsn}\n   التفاصيل: {exc}")

    try:
        with conn.transaction():
            with conn.cursor() as cur:
                seed(cur, students, faculty)
        # بعد نجاح الالتزام — اجمع الإحصاءات من القاعدة نفسها (مصدر الحقيقة)
        with conn.cursor() as cur:
            stats = collect_stats(cur)
        host, port, dbname = conn.info.host, conn.info.port, conn.info.dbname
    finally:
        conn.close()

    print_summary(stats, host, port, dbname)


if __name__ == "__main__":
    main()
