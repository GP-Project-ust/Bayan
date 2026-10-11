"""الـ Supervisor — قائد الوكلاء وموجّههم (الوكيل المحوري في بيان).

المسؤولية (وفق الوثيقة):
  1. يستقبل السؤال العربي (بعد التطبيع) ويحلّل نيّته
  2. يقرر المسار:
       - sql_agent     → أسئلة البيانات والأرقام والإحصاءات
       - rag_agent     → أسئلة اللوائح والسياسات والأنظمة
       - analyst_agent → تحليل الاتجاهات والمقارنات (غالباً بعد sql)
       - reporter_agent→ تجميع إجابة/تقرير نهائي من مخرجات الآخرين
  3. للأسئلة المركّبة: ينسّق تنفيذاً متسلسلاً (مثلاً sql ثم analyst ثم reporter)
  4. للأسئلة الغامضة: يعيد للمستخدم سؤال استيضاح بدل التخمين

الوضع الحالي (Sprint 0): توجيه افتراضي ثابت إلى وكيل SQL —
التوجيه الحقيقي عبر LLM يُبنى في Sprint 3.
"""

from app.agents.state import AgentState

SUPERVISOR_NAME = "supervisor"


def supervisor_node(state: AgentState) -> dict:
    """عقدة الـ Supervisor — تقرر أي وكيل يعالج السؤال."""
    # TODO(Sprint 3): استبدال التوجيه الثابت بقرار LLM:
    #   prompt يحلل نية السؤال ويعيد المسار + الثقة، مع سجل المحادثة كسياق
    return {
        "route": "sql_agent",
        "agent_trace": [
            {
                "agent": SUPERVISOR_NAME,
                "note": "توجيه مبدئي إلى وكيل SQL (توجيه LLM يُفعّل في Sprint 3)",
            }
        ],
    }


def route_from_supervisor(state: AgentState) -> str:
    """دالة التوجيه الشرطي — تُقرأ من قبل LangGraph لاختيار الحافة."""
    return state.get("route", "sql_agent")
