"""الـ Supervisor — قائد الوكلاء وموجّههم (الوكيل المحوري في بيان).

المسؤولية (وفق الوثيقة):
  1. يستقبل السؤال العربي ويحلّل نيّته
  2. يقرر المسار: sql_agent / rag_agent / analyst_agent / reporter_agent
  3. للأسئلة المركّبة: ينسّق تنفيذاً متسلسلاً (Sprint 3)
  4. للأسئلة الغامضة: سؤال استيضاح بدل التخمين (Sprint 3)

الوضع الحالي (Sprint 0): توجيه قواعدي حتمي بكلمات مفتاحية —
  سريع ومجاني وقابل للتنبؤ، ويُختبر بلا أي نموذج. يستبدَل بقرار LLM
  حقيقي (مع الثقة والاستيضاح) في Sprint 3 وفق docs/04_execution_plan.md.
"""

import re

from app.agents.state import AgentState

SUPERVISOR_NAME = "supervisor"

# كلمات مفتاحية للتوجيه القاعدي — مرتبة حسب الأولوية (الأدق أولاً)
_RAG_KEYWORDS = re.compile(
    r"لائحة|اللوائح|النظام|الأنظمة|السياسة|السياسات|الشروط|شروط|التعليمات|"
    r"لائحة القبول|لائحة الترقية|المنح|الخصم"
)
ANALYST_KEYWORDS = re.compile(r"قارن|مقارنة|تحليل|حلّل|اتجاه|نسبة|أعلى|أقل|لماذا|السبب")
REPORTER_KEYWORDS = re.compile(r"تقرير|ملخص شامل|اعرض.*جدول|صيغة رسمية")


def decide_route(question: str) -> str:
    """قرار التوجيه القاعدي الحتمي — دالة نقية قابلة للاختبار المستقل."""
    if _RAG_KEYWORDS.search(question):
        return "rag_agent"
    if ANALYST_KEYWORDS.search(question):
        return "analyst_agent"
    if REPORTER_KEYWORDS.search(question):
        return "reporter_agent"
    # الافتراضي: أسئلة البيانات والأرقام — قلب حالة الاستخدام الأولى
    return "sql_agent"


def supervisor_node(state: AgentState) -> dict:
    """عقدة الـ Supervisor — تقرر أي وكيل يعالج السؤال."""
    question = state.get("question", "")
    route = decide_route(question)
    return {
        "route": route,
        "agent_trace": [
            {
                "agent": SUPERVISOR_NAME,
                "note": f"توجيه قاعدي حتمي إلى {route} "
                        "(التوجيه الذكي عبر LLM يُفعَّل في Sprint 3)",
                "status": "done",
            }
        ],
    }


def route_from_supervisor(state: AgentState) -> str:
    """دالة التوجيه الشرطي — تُقرأ من قبل LangGraph لاختيار الحافة."""
    return state.get("route", "sql_agent")
