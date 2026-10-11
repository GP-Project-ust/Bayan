"""وكيل SQL — يحوّل السؤال العربي إلى استعلام آمن فوق Smart Views.

المسؤولية (وفق الوثيقة) — يُبنى في Sprint 1:
  1. مطابقة المفاهيم: ربط مصطلحات المستخدم ("المتخرجين"، "الرسوم المتأخرة")
     بالجداول والأعمدة عبر فهرس المشاهد (schema catalog)
  2. توليد SQL بالـ LLM فوق طبقة Smart Views المبسّطة فقط —
     لا وصول مباشر لجداول Odoo الخام (هذا جوهر ابتكار المشروع)
  3. تحقق AST قبل التنفيذ: SELECT فقط — يُرفض DROP/UPDATE/DELETE/GRANT
  4. تنفيذ للقراءة فقط عبر مستخدم bayan_reader مع مهلة زمنية وحد للصفوف
  5. إصلاح ذاتي: عند فشل التنفيذ يُعاد توليد الاستعلام برسالة الخطأ (حتى 3 محاولات)

الوضع الحالي (Sprint 0): عبة موثّقة — تُملأ في Sprint 1.
"""

from app.agents.state import AgentState

SQL_AGENT_NAME = "sql_agent"


def sql_agent_node(state: AgentState) -> dict:
    """عقدة وكيل SQL — توليد استعلام آمن وتنفيذه (قيد الإنشاء)."""
    # TODO(Sprint 1):
    #   1) concept_matcher.match(state["question"])
    #   2) llm.generate_sql(question, smart_views_catalog)
    #   3) ast_validator.ensure_select_only(sql)
    #   4) odoo_reader.execute(sql, timeout=5, limit=1000)
    #   5) self_repair_loop(...)
    return {
        "sql_query": "",
        "query_results": [],
        "answer": (
            "الهيكل الأساسي لوكيل SQL جاهز — توليد الاستعلامات وتنفيذها "
            "يُنفَّذ في Sprint 1 وفق خطة التنفيذ (docs/04_execution_plan.md)."
        ),
        "agent_trace": [
            {
                "agent": SQL_AGENT_NAME,
                "note": "هيكل فقط: التوليد والتنفيذ الآمن يُبنى في Sprint 1",
            }
        ],
    }
