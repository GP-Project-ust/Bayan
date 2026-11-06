"""وكيل المُعِدّ — يجمع مخرجات الوكلاء في إجابة عربية نهائية غنية.

المسؤولية (وفق الوثيقة) — يُبنى في Sprint 3:
  1. تجميع كل ما أنتجه الوكلاء السابقون (نتائج، تحليل، مصادر RAG)
  2. صياغة إجابة عربية سليمة ومنسّقة: نص تمهيدي + جدول + رسم + مصادر
  3. توحيد الأرقام والتواريخ بالتنسيق العربي الصحيح
  4. توليد تقرير قابل للتصدير (PDF / Excel) عند الطلب

الوضع الحالي (Sprint 0): علبة موثّقة — تُملأ في Sprint 3.
"""

from app.agents.state import AgentState

REPORTER_AGENT_NAME = "reporter_agent"


def reporter_agent_node(state: AgentState) -> dict:
    """عقدة المُعِدّ — تجميع الإجابة النهائية (قيد الإنشاء)."""
    # TODO(Sprint 3):
    #   1) gather(sql=state.get("query_results"), rag=state.get("rag_context"), ...)
    #   2) final = llm.compose_arabic_answer(...)
    #   3) attach_export_links(...)
    return {
        "answer": "وكيل المُعِدّ هيكل فقط — تجميع الإجابات النهائية يُبنى في Sprint 3.",
        "agent_trace": [
            {
                "agent": REPORTER_AGENT_NAME,
                "note": "هيكل فقط: تجميع الإجابات يُبنى في Sprint 3",
            }
        ],
    }
