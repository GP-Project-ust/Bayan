"""سجل برومبتات توليد SQL — أول برومبت في سجل بيان.

القاعدة الدستورية:
  - هذا الملف مسجل البرومبتات فقط: أرقام الإصدار + بناء الرسائل.
  - لا يستورد أي SDK نموذج لغوي مباشرة (يستهلكه provider.py حصراً).
  - أمثلة few-shot مكتوبة خارج أسئلة golden_dataset (قاعدة المنع رقم 3).
"""

from app.agents.sql_catalog import CatalogEntry

PROMPT_VERSION = "1.0.0"

# ---------------------------------------------------------------------------
# رسائل النظام والمستخدم — بناء برومبت توليد SQL
# ---------------------------------------------------------------------------

_SYSTEM_TEMPLATE = """\
أنت مساعد قواعد بيانات للمؤسسات التعليمية يُدعى بيان.
مهمتك الوحيدة: تحويل سؤال المستخدم العربي إلى استعلام SQL صحيح.

قواعد صارمة لا استثناء لها:
1. اكتب SELECT فقط — لا INSERT ولا UPDATE ولا DELETE ولا DROP ولا CREATE ولا أي DDL/DML.
2. استعلم فقط من المشاهد المسموح بها المدرجة أدناه — لا جداول خام.
3. أضف LIMIT {max_rows} في نهاية كل استعلام إن لم يطلبه المستخدم صراحة.
4. أرجع SQL فقط بدون أي شرح أو تعليق أو نص إضافي.
5. عبارة SQL واحدة فقط — لا فواصل (;) بين عبارات متعددة.
6. يمكن استخدام WITH (CTE) إذا كان ضرورياً للوضوح.

المشاهد المسموح بها وأعمدتها:
{catalog_schema}

أمثلة:
سؤال: ما هي المدن التي يوجد فيها أكثر من 10 طلاب؟
SQL: SELECT city, COUNT(*) AS student_count
     FROM v_student_profile
     GROUP BY city HAVING COUNT(*) > 10
     ORDER BY student_count DESC LIMIT {max_rows};

سؤال: ما هو متوسط الرسوم المتأخرة لكل برنامج؟
SQL: SELECT program_name, AVG(outstanding) AS avg_outstanding
     FROM v_fees_summary
     GROUP BY program_name
     ORDER BY avg_outstanding DESC LIMIT {max_rows};

سؤال: كم عدد الذكور والإناث في دفعة 2022؟
SQL: SELECT SUM(male_count) AS males, SUM(female_count) AS females
     FROM v_program_stats
     WHERE batch_name = 'دفعة 2022' LIMIT {max_rows};

سؤال: أعطني أسماء الطلاب الذين رقم قيدهم يبدأ بـ YU2023؟
SQL: SELECT student_name, roll_number, program_name
     FROM v_student_profile
     WHERE roll_number LIKE 'YU2023%'
     ORDER BY student_name LIMIT {max_rows};
"""

_USER_TEMPLATE = """\
السؤال: {question}
SQL:"""

_REPAIR_TEMPLATE = """\
الاستعلام السابق فشل في المحاولة {attempt} بالخطأ التالي:
{error}

أعد كتابة الاستعلام بشكل صحيح مع تجنب نفس الخطأ.
تذكر: SELECT فقط، من المشاهد المسموحة حصراً، مع LIMIT.
SQL:"""


def _build_catalog_schema(catalog: list[CatalogEntry]) -> str:
    """تحويل الكتالوج إلى نص مخطط مقروء للبرومبت."""
    lines = []
    for entry in catalog:
        lines.append(f"\nمشهد: {entry.view}")
        lines.append(f"الوصف: {entry.description}")
        lines.append("الأعمدة:")
        for col in entry.columns:
            lines.append(f"  - {col.name} ({col.type}): {col.description}")
    return "\n".join(lines)


def build_sql_messages(
    question: str,
    catalog: list[CatalogEntry],
    max_rows: int = 1000,
) -> list[dict]:
    """بناء رسائل برومبت توليد SQL للمحاولة الأولى.

    الإرجاع: قائمة رسائل بتنسيق LangChain [{"role": ..., "content": ...}]
    """
    schema = _build_catalog_schema(catalog)
    system_msg = _SYSTEM_TEMPLATE.format(
        catalog_schema=schema,
        max_rows=max_rows,
    )
    user_msg = _USER_TEMPLATE.format(question=question)
    return [
        {"role": "system", "content": system_msg},
        {"role": "user", "content": user_msg},
    ]


def build_repair_message(error: str, attempt: int) -> dict:
    """بناء رسالة تغذية راجعة للمحاولة الثانية أو الثالثة.

    تُضاف كرسالة مستخدم إلى نهاية المحادثة السابقة.
    """
    return {
        "role": "user",
        "content": _REPAIR_TEMPLATE.format(error=error, attempt=attempt),
    }

