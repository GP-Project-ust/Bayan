"""وكيل المحلل — يحوّل النتائج الخام إلى رؤى واتجاهات ورسوم.

المسؤولية (وفق الوثيقة) — يُبنى في Sprint 3:
  1. قراءة نتائج SQL (state["query_results"]) واكتشاف نمطها:
     سلسلة زمنية؟ توزيع فئوي؟ مقارنة؟
  2. توليد تحليل عربي: اتجاه عام، قفزات لافتة، مقارنات بين الفترات
  3. اختيار نوع الرسم الأنسب (خطي/شريطي/دائري/مبعثر) وفق شكل البيانات
  4. إخراج مواصفة رسم ECharts متوافقة مع RTL (يستهلكها الـ frontend)

الوضع الحالي (Sprint 0): علبة موثّقة — تُملأ في Sprint 3.
"""

from app.agents.state import AgentState

ANALYST_AGENT_NAME = "analyst_agent"


def analyst_agent_node(state: AgentState) -> dict:
    """عقدة المحلل — تحليل النتائج واقتراح الرسوم (قيد الإنشاء)."""
    # TODO(Sprint 3):
    #   1) pattern = detect_pattern(state["query_results"])
    #   2) insight = llm.analyze(question, results)
    #   3) chart = chart_engine.recommend(pattern, results)
    return {
        "answer": "وكيل المحلل هيكل فقط — التحليل والرسوم تُبنى في Sprint 3.",
        "agent_trace": [
            {
                "agent": ANALYST_AGENT_NAME,
                "note": "هيكل فقط: التحليل والرسوم تُبنى في Sprint 3",
            }
        ],
    }
