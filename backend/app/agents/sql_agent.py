"""وكيل SQL — يحوّل السؤال العربي إلى استعلام آمن فوق Smart Views.

Sprint 1 — التوليد الحقيقي عبر LLM + تحقق AST + إصلاح ذاتي:
  1. مطابقة مفاهيم أولية من الكتالوج لتحديد المشاهد المرشحة.
  2. توليد SQL عبر get_llm("sql") حصراً (ADR-002).
  3. تحقق AST عبر sqlglot: SELECT/CTE فقط، مصادر الكتالوج فقط، LIMIT إجباري.
  4. إصلاح ذاتي: حتى 3 محاولات كلية مع تغذية راجعة بالخطأ.
  5. تنفيذ فعلي عبر دور bayan_reader (قراءة فقط، مهلة 5 ثوانٍ).

الملفات المحظورة (ADR-004): state.py, events.py, graph.py, supervisor.py,
  api/v1/router.py, schemas/chat.py, llm/provider.py, llm/mock.py, sql_catalog.py
"""

import re
import time
from typing import Any

import psycopg
import sqlglot
import sqlglot.expressions as exp

from app.agents.sql_catalog import CatalogEntry, get_catalog
from app.agents.state import AgentState
from app.core.config import get_settings
from app.llm.prompts.sql_generation import (
    PROMPT_VERSION,
    build_repair_message,
    build_sql_messages,
)
from app.llm.provider import get_llm

SQL_AGENT_NAME = "sql_agent"

# مهلات الاتصال والتنفيذ (ثوانٍ)
CONNECT_TIMEOUT = 3
QUERY_TIMEOUT = 5  # ثوانٍ — يُحوَّل إلى ميلي ثانية عند الإرسال لـ PostgreSQL
MAX_ATTEMPTS = 3   # الحد الأقصى الكلي للمحاولات (ليس إعادات بعد الأولى)


# ---------------------------------------------------------------------------
# مطابقة المفاهيم الأولية — تحديد المشاهد المرشحة قبل استدعاء النموذج
# ---------------------------------------------------------------------------

def _select_candidate_views(question: str, catalog: list[CatalogEntry]) -> list[CatalogEntry]:
    """اختيار المشاهد المرشحة بمطابقة مفاهيم الكتالوج مع كلمات السؤال.

    خوارزمية بسيطة وفعّالة:
      - إذا طابق السؤال مفاهيم مشهد → أضفه للمرشحين.
      - إذا لم يطابق شيئاً → أرجع كل الكتالوج (النموذج يختار).
    """
    question_lower = question.lower()
    candidates: list[CatalogEntry] = []

    for entry in catalog:
        for concept in entry.concepts:
            if concept in question_lower or concept in question:
                candidates.append(entry)
                break

    # إذا لم تُطابق أي مفاهيم → أرجع الكتالوج كاملاً
    return candidates if candidates else catalog


# ---------------------------------------------------------------------------
# تحقق AST عبر sqlglot — الحاجز الأمني الحقيقي (يستبدل guard_sql النصي)
# ---------------------------------------------------------------------------

# أنواع العبارات المحظورة بشكل قاطع
_FORBIDDEN_STATEMENT_TYPES = (
    exp.Insert,
    exp.Update,
    exp.Delete,
    exp.Create,
    exp.Drop,
    exp.Alter,
    exp.Grant,
    exp.Revoke,
    exp.Command,  # COPY, TRUNCATE, ...
)

# دوال SQL الخطرة (تنفيذ أوامر نظام، كتابة ملفات، ...)
_FORBIDDEN_FUNCTIONS = {
    "pg_read_file", "pg_write_file", "pg_read_binary_file",
    "pg_ls_dir", "pg_stat_file", "lo_import", "lo_export",
    "copy",
}


def validate_sql_ast(sql: str, allowed_views: list[str], max_rows: int) -> str:
    """تحقق AST كامل من استعلام SQL وإرجاع نسخة آمنة مضمونة.

    المدخل : sql (نص خام من النموذج)
    المخرج : استعلام آمن مع LIMIT مضمون
    الاستثناء: ValueError برسالة عربية واضحة عند أي انتهاك

    الضمانات:
      ✅ عبارة واحدة فقط
      ✅ الجذر SELECT أو WITH (CTE مقبول)
      ✅ لا DML/DDL/MERGE/COPY/GRANT في أي مكان بما في ذلك داخل CTE
      ✅ لا SELECT INTO
      ✅ كل مصادر البيانات من allowed_views فقط (يتعامل مع CTE aliases)
      ✅ LIMIT مضمون بالحد الأقصى إن غاب
    """
    # 1. تنظيف أولي وإزالة الفواصل الزائدة
    sql = sql.strip()
    # احذف نص SQL: أو ```sql إن أرسله النموذج بتنسيق
    sql = re.sub(r"^```(?:sql)?\s*", "", sql, flags=re.IGNORECASE)
    sql = re.sub(r"\s*```$", "", sql)
    sql = sql.strip().rstrip(";")

    # 2. رفض متعدد العبارات بفاصلة منقوطة
    if ";" in sql:
        raise ValueError("الحارس يرفض: عبارة واحدة فقط مسموحة — لا فواصل (;) بين العبارات")

    # 3. تحليل AST
    try:
        statements = sqlglot.parse(sql, dialect="postgres")
    except sqlglot.errors.ParseError as exc:
        raise ValueError(f"الحارس يرفض: خطأ في صياغة SQL — {exc}") from exc

    if not statements or statements[0] is None:
        raise ValueError("الحارس يرفض: لم يتمكن المحلل من فهم الاستعلام")

    if len(statements) > 1:
        raise ValueError("الحارس يرفض: تم اكتشاف أكثر من عبارة SQL")

    stmt = statements[0]

    # 4. تحقق من نوع العبارة الجذر
    if not isinstance(stmt, (exp.Select, exp.With)):
        raise ValueError(
            f"الحارس يرفض: نوع العبارة غير مسموح ({type(stmt).__name__}) — SELECT فقط"
        )

    # 5. رفض أي DML/DDL في أي مكان (بما في ذلك داخل CTE)
    for forbidden_type in _FORBIDDEN_STATEMENT_TYPES:
        node = stmt.find(forbidden_type)
        if node is not None:
            raise ValueError(
                f"الحارس يرفض: تم اكتشاف عبارة محظورة ({forbidden_type.__name__}) — "
                "النظام للقراءة فقط"
            )

    # 6. رفض SELECT INTO (كتابة إلى جدول)
    for select_node in stmt.find_all(exp.Select):
        if select_node.args.get("into"):
            raise ValueError("الحارس يرفض: SELECT INTO محظور — النظام للقراءة فقط")

    # 7. رفض الدوال الخطرة
    for func_node in stmt.find_all(exp.Anonymous):
        if func_node.name.lower() in _FORBIDDEN_FUNCTIONS:
            raise ValueError(
                f"الحارس يرفض: الدالة '{func_node.name}' محظورة"
            )

    # 8. جمع أسماء CTEs (aliases مقبولة كمصادر)
    cte_names: set[str] = set()
    for cte in stmt.find_all(exp.CTE):
        name = cte.alias_or_name
        if name:
            cte_names.add(name.lower())

    # 9. التحقق من مصادر البيانات (جداول/مشاهد)
    allowed_set = {v.lower() for v in allowed_views}
    for table_node in stmt.find_all(exp.Table):
        table_name = table_node.name.lower() if table_node.name else ""
        if not table_name:
            continue
        # CTE aliases مقبولة
        if table_name in cte_names:
            continue
        # تحقق من القائمة المسموحة
        if table_name not in allowed_set:
            raise ValueError(
                f"الحارس يرفض: المصدر '{table_name}' غير موجود في الكتالوج المسموح. "
                f"المسموح: {sorted(allowed_views)}"
            )

    # 10. ضمان LIMIT — أضفه تلقائياً إن غاب
    # نبحث عن LIMIT في أعلى مستوى SELECT
    top_select = stmt.find(exp.Select)
    if top_select is not None:
        limit_node = top_select.args.get("limit")
        if limit_node is None:
            # أضف LIMIT للاستعلام
            sql = f"{sql} LIMIT {max_rows}"

    return sql


# ---------------------------------------------------------------------------
# تنفيذ SQL — عبر دور بيان القارئ فقط
# ---------------------------------------------------------------------------

def execute_readonly(sql: str) -> tuple[list[dict[str, Any]], float]:
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


# ---------------------------------------------------------------------------
# استخراج SQL من رد النموذج
# ---------------------------------------------------------------------------

def _extract_sql_from_response(content: str) -> str:
    """استخراج نص SQL من رد النموذج اللغوي بشكل دفاعي."""
    if not content:
        return ""
    # إزالة تنسيق markdown إن وجد
    content = re.sub(r"```(?:sql)?\s*", "", content, flags=re.IGNORECASE)
    content = re.sub(r"```", "", content)
    # البحث عن أول SELECT أو WITH
    match = re.search(r"(WITH\s+|SELECT\s+)", content, re.IGNORECASE)
    if match:
        return content[match.start():].strip()
    return content.strip()


# ---------------------------------------------------------------------------
# عقدة وكيل SQL — نقطة الدخول الرئيسية في مخطط LangGraph
# ---------------------------------------------------------------------------

def sql_agent_node(state: AgentState) -> dict:
    """عقدة وكيل SQL — Sprint 1: توليد LLM + تحقق AST + حلقة إصلاح ذاتي (حتى 3 محاولات)."""
    question = state.get("question", "")
    started = time.perf_counter()
    settings = get_settings()
    max_rows = getattr(settings, "sql_max_rows", 1000)

    # 1. قراءة الكتالوج المجمد
    catalog = get_catalog()
    allowed_views = [entry.view for entry in catalog]

    # 2. تحديد المشاهد المرشحة بمطابقة المفاهيم
    candidate_views = _select_candidate_views(question, catalog)

    # 3. بناء الرسائل التأسيسية
    llm = get_llm("sql")
    messages = build_sql_messages(question, candidate_views, max_rows=max_rows)

    last_sql = ""
    last_error = ""

    # حلقة الإصلاح الذاتي — 3 محاولات إجمالية كحد أقصى (FR-14)
    for attempt in range(1, MAX_ATTEMPTS + 1):
        if attempt > 1:
            # إضافة رسالة التغذية الراجعة بالخطأ في المحاولة التالية
            messages.append(build_repair_message(last_error, attempt))

        # أ. استدعاء النموذج اللغوي
        try:
            response = llm.invoke(messages)
            raw_sql = _extract_sql_from_response(
                response.content if hasattr(response, "content") else str(response)
            )
            last_sql = raw_sql
            messages.append({"role": "assistant", "content": raw_sql})
        except Exception as exc:
            last_error = f"خطأ في استدعاء النموذج: {exc}"
            continue

        # ب. تحقق AST — يمنع أي عبارة ضارة أو خارج الكتالوج
        try:
            safe_sql = validate_sql_ast(raw_sql, allowed_views, max_rows)
            last_sql = safe_sql
        except ValueError as exc:
            last_error = str(exc)
            continue

        # ج. تنفيذ الاستعلام مع فحص الاقتصاص الدقيق (Sentinel lookahead)
        try:
            # نتحقق إن كان الاستعلام يحوي LIMIT صريح أصغر من السقف
            has_explicit_smaller_limit = False
            try:
                parsed = sqlglot.parse(safe_sql, dialect="postgres")
                if parsed and parsed[0]:
                    sel = parsed[0].find(exp.Select)
                    if sel and sel.args.get("limit"):
                        limit_val = int(sel.args["limit"].expression.this)
                        if limit_val < max_rows:
                            has_explicit_smaller_limit = True
            except Exception:
                pass

            # إذا لم يكن هناك LIMIT مخصص أصغر، نطلب max_rows + 1 صف لكشف الاقتصاص بيقين
            exec_sql = safe_sql
            if not has_explicit_smaller_limit and f"LIMIT {max_rows}" in safe_sql:
                exec_sql = safe_sql.replace(f"LIMIT {max_rows}", f"LIMIT {max_rows + 1}")

            rows, duration_s = execute_readonly(exec_sql)

            # دقة الاقتصاص: إذا كانت الصفوف الفعلية أكبر من max_rows
            if len(rows) > max_rows:
                rows_truncated = True
                rows = rows[:max_rows]
            else:
                rows_truncated = False

            # بناء ملخص نصي أنيق للبيانات المسترجعة ليظهر مباشرة في واجهة المحادثة
            if rows:
                lines = [f"نفّذت استعلاماً آمناً ({len(rows)} صف خلال {duration_s} ثانية):\n"]
                for i, r in enumerate(rows[:10], start=1):
                    row_str = " | ".join(f"{k}: {v}" for k, v in r.items())
                    lines.append(f"{i}. {row_str}")
                if len(rows) > 10:
                    lines.append(f"\n... و {len(rows) - 10} صفاً إضافياً.")
                answer_text = "\n".join(lines)
            else:
                answer_text = (
                    f"نفّذت استعلاماً آمناً خلال {duration_s} ثانية، "
                    "ولم يتم العثور على صفوف مطابقة."
                )

            # نجاح التنفيذ!
            return {
                "sql_query": safe_sql,
                "query_results": rows,
                "rows_truncated": rows_truncated,
                "answer": answer_text,
                "agent_trace": [{
                    "agent": SQL_AGENT_NAME,
                    "note": (
                        f"تنفيذ قراءة فقط: {len(rows)} صف "
                        f"(المحاولة {attempt} من {MAX_ATTEMPTS})"
                    ),
                    "status": "done",
                    "sql": safe_sql,
                    "rows_count": len(rows),
                    "attempts": attempt,
                    "duration_ms": int((time.perf_counter() - started) * 1000),
                    "prompt_version": PROMPT_VERSION,
                }],
            }
        except psycopg.OperationalError:
            # تعذر الاتصال بالقاعدة — ليس خطأ استعلام، فلا داعي لـ 3 محاولات
            return {
                "sql_query": safe_sql,
                "query_results": [],
                "rows_truncated": False,
                "answer": (
                    "قاعدة بيانات الجامعة التجريبية غير متاحة. "
                    "جهّزها بأمر: make dev-db ثم أعد سؤالك."
                ),
                "error": "db_unavailable",
                "agent_trace": [{
                    "agent": SQL_AGENT_NAME,
                    "note": "تعذر الاتصال بقاعدة الجامعة (5433) — شغّل make dev-db",
                    "status": "failed",
                    "sql": safe_sql,
                    "attempts": attempt,
                    "prompt_version": PROMPT_VERSION,
                    "duration_ms": int((time.perf_counter() - started) * 1000),
                }],
            }
        except psycopg.Error as exc:
            last_error = f"خطأ SQL في التنفيذ: {exc.diag.message_primary or exc}"
            continue

    # استنفاد جميع المحاولات الثلاث (FR-14)
    return {
        "sql_query": last_sql,
        "query_results": [],
        "rows_truncated": False,
        "answer": (
            "اعتذر، لم أتمكن من توليد استعلام صحيح بعد 3 محاولات. "
            "يرجى إعادة صياغة السؤال أو تحديد المعلومات المطلوبة بدقة أكبر."
        ),
        "error": last_error,
        "agent_trace": [{
            "agent": SQL_AGENT_NAME,
            "note": f"استنفاد {MAX_ATTEMPTS} محاولات: {last_error}",
            "status": "failed",
            "sql": last_sql,
            "attempts": MAX_ATTEMPTS,
            "prompt_version": PROMPT_VERSION,
            "duration_ms": int((time.perf_counter() - started) * 1000),
        }],
    }
