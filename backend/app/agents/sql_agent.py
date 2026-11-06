"""وكيل SQL — يحوّل السؤال العربي إلى استعلام آمن فوق Smart Views.

المسؤولية الكاملة (وفق الوثيقة) — تُبنى في Sprint 1:
  مطابقة المفاهيم عبر فهرس المشاهد، توليد SQL بالـ LLM، تحقق AST،
  إصلاح ذاتي حتى 3 محاولات. ملاحظة للحارس الحالي: يرفض CTE (WITH ...)
  عمداً — يعالج مع الانتقال لتحقق AST الكامل عبر sqlglot في Sprint 1.

الوضع الحالي (Sprint 0) — شريحة رأسية حقيقية تعمل من الطرف للطرف:
  1. مطابقة مفاهيم أولية: قاموس قوالب حتمي (سؤال ← استعلام فوق المشاهد)
  2. حارس أمان بسيط: SELECT فقط + حد صفوف إجباري (يستبدل بتحقق AST في Sprint 1)
  3. تنفيذ فعلي عبر دور القراءة فقط bayan_reader (مهلة اتصال وتنفيذ)
  4. عند غياب القاعدة: رسالة إرشادية واضحة بدل الانهيار — حتى يعمل
     كل عضو على السلسلة قبل تجهيز القاعدة (make dev-db)
"""

import re
import time

import psycopg

from app.agents.state import AgentState
from app.core.config import get_settings

SQL_AGENT_NAME = "sql_agent"

# مهلات الاتصال والتنفيذ (ثوانٍ) — بيئة التطوير المحلية
CONNECT_TIMEOUT = 3
QUERY_TIMEOUT = 5
MAX_ROWS = 50  # سقف الصفوف المعادة للواجهة في هذا الطور

# ---------------------------------------------------------------------------
# قاموس القوالب الآمنة — مطابقة مفاهيم أولية حتمية (تستبدل بتوليد LLM + فهرس المفاهيم في Sprint 1)
# كل الاستعلامات فوق طبقة Smart Views فقط — لا وصول مباشر للجداول الخام
# ---------------------------------------------------------------------------
_SAFE_TEMPLATES: list[tuple[re.Pattern[str], str, str]] = [
    (
        re.compile(r"متأخر|المتأخرات|عليهم رسوم|رسوم متأخرة|مديون"),
        "v_fees_summary",
        """SELECT roll_number, student_name, program_name,
                  total_amount, total_paid, outstanding
           FROM v_fees_summary
           WHERE outstanding > 0
           ORDER BY outstanding DESC
           LIMIT {limit};""",
        "الطلاب الذين عليهم رسوم متأخرة (الأعلى ديناً أولاً)",
    ),
    (
        re.compile(r"كل برنامج|كل كلية|برامج|توزيع الطلاب|احصائي|إحصائي"),
        "v_program_stats",
        """SELECT program_name, batch_name,
                  student_count, male_count, female_count
           FROM v_program_stats
           ORDER BY student_count DESC
           LIMIT {limit};""",
        "عدد الطلاب في كل برنامج ودفعة",
    ),
    (
        re.compile(r"عدد الطلاب|كم طالب|كم عدد"),
        "v_program_stats",
        """SELECT program_name, SUM(student_count) AS student_count
           FROM v_program_stats
           GROUP BY program_name
           ORDER BY student_count DESC
           LIMIT {limit};""",
        "إجمالي الطلاب في كل برنامج",
    ),
]

# القالب الافتراضي عند عدم مطابقة أي نمط — آمن ومفيد دوماً
_DEFAULT_SQL = (
    "SELECT program_name, SUM(student_count) AS student_count "
    "FROM v_program_stats GROUP BY program_name "
    "ORDER BY student_count DESC LIMIT {limit};"
)

# كلمات ممنوعة — حارس أولي صارم (يستبدل بتحقق AST كامل عبر sqlglot في Sprint 1)
_FORBIDDEN = re.compile(
    r"\b(DROP|DELETE|UPDATE|INSERT|GRANT|REVOKE|ALTER|TRUNCATE|CREATE|COPY)\b",
    re.IGNORECASE,
)


def match_template(question: str) -> tuple[str, str, str]:
    """إرجاع (الاستعلام، المشهد المستهدف، وصف النية) لأول قالب مطابق."""
    for pattern, view, template, intent in _SAFE_TEMPLATES:
        if pattern.search(question):
            return template.format(limit=MAX_ROWS), view, intent
    return (
        _DEFAULT_SQL.format(limit=MAX_ROWS),
        "v_program_stats",
        "إحصائية عامة للبرامج (القالب الافتراضي)",
    )


def guard_sql(sql: str) -> str:
    """حارس الأمان الأولي: SELECT فقط، بلا عبارات خطرة، وبلا فواصل متعددة."""
    stripped = sql.strip().rstrip(";")
    if not stripped.upper().startswith("SELECT"):
        raise ValueError("الحارس يرفض: الاستعلام يجب أن يبدأ بـ SELECT")
    if ";" in stripped:
        raise ValueError("الحارس يرفض: عبارة واحدة فقط مسموحة")
    if _FORBIDDEN.search(stripped):
        raise ValueError("الحارس يرفض: يحتوي عبارة محظورة (كتابة/تعديل)")
    return stripped


def execute_readonly(sql: str) -> tuple[list[dict], float]:
    """تنفيذ الاستعلام عبر دور القراءة فقط — يعيد (الصفوف، المدة بالثواني)."""
    settings = get_settings()
    started = time.perf_counter()
    with psycopg.connect(settings.odoo_database_url, connect_timeout=CONNECT_TIMEOUT) as conn:
        with conn.cursor() as cur:
            cur.execute(f"SET LOCAL statement_timeout = '{QUERY_TIMEOUT * 1000}'")
            cur.execute(sql)
            columns = [col.name for col in cur.description]
            rows = [dict(zip(columns, row, strict=False)) for row in cur.fetchall()]
    return rows, round(time.perf_counter() - started, 3)


def sql_agent_node(state: AgentState) -> dict:
    """عقدة وكيل SQL — مطابقة قالب آمن ثم تنفيذ للقراءة فقط (شريحة Sprint 0)."""
    question = state.get("question", "")
    started = time.perf_counter()

    sql, view, intent = match_template(question)
    try:
        sql = guard_sql(sql)
    except ValueError as exc:
        return {
            "sql_query": sql,
            "query_results": [],
            "answer": "اعتذر — رفض حارس الأمان الاستعلام المولّد.",
            "agent_trace": [{"agent": SQL_AGENT_NAME, "note": str(exc), "status": "failed"}],
        }

    try:
        rows, duration_s = execute_readonly(sql)
        return {
            "sql_query": sql,
            "query_results": rows,
            "answer": (
                f"نفّذت استعلاماً آمناً فوق مشهد {view} ({intent}): "
                f"{len(rows)} صف خلال {duration_s} ثانية."
            ),
            "agent_trace": [
                {
                    "agent": SQL_AGENT_NAME,
                    "note": f"تنفيذ قراءة فقط فوق {view}: {intent}",
                    "status": "done",
                    "sql": sql,
                    "rows_count": len(rows),
                    "duration_ms": int((time.perf_counter() - started) * 1000),
                }
            ],
        }
    except psycopg.OperationalError:
        # أشهر حالة للعضو الجديد: القاعدة غير مهيأة بعد — إرشاد لا انهيار
        return {
            "sql_query": sql,
            "query_results": [],
            "answer": (
                "قاعدة بيانات الجامعة التجريبية غير متاحة بعد. "
                "جهّزها بأمر واحد: make dev-db ثم أعد سؤالك."
            ),
            "agent_trace": [
                {
                    "agent": SQL_AGENT_NAME,
                    "note": "تعذر الاتصال بقاعدة الجامعة (5433) — شغّل make dev-db",
                    "status": "failed",
                    "sql": sql,
                }
            ],
        }
    except psycopg.Error as exc:
        return {
            "sql_query": sql,
            "query_results": [],
            "answer": f"فشل تنفيذ الاستعلام: {exc.diag.message_primary or exc}",
            "agent_trace": [
                {"agent": SQL_AGENT_NAME, "note": f"خطأ SQL: {exc}", "status": "failed", "sql": sql}
            ],
        }
