"""بناء مخطط LangGraph — سلسلة وكلاء بيان الكاملة.

الهيكل (وفق الوثيقة):

    START → supervisor → (توجيه شرطي)
                          ├── sql_agent     → END
                          ├── rag_agent     → END
                          ├── analyst_agent → END
                          └── reporter_agent→ END

لاحقاً (Sprint 3) تتحول الحواف إلى تدفقات مركّبة:
    sql_agent → analyst_agent → reporter_agent → END
"""

from langgraph.graph import END, START, StateGraph

from app.agents.analyst_agent import analyst_agent_node
from app.agents.rag_agent import rag_agent_node
from app.agents.reporter_agent import reporter_agent_node
from app.agents.sql_agent import sql_agent_node
from app.agents.state import AgentState
from app.agents.supervisor import route_from_supervisor, supervisor_node


def build_graph():
    """إنشاء مخطط الحالة الكامل وتجميعه (compile)."""
    graph = StateGraph(AgentState)

    # العقد — الوكلاء الخمسة
    graph.add_node("supervisor", supervisor_node)
    graph.add_node("sql_agent", sql_agent_node)
    graph.add_node("rag_agent", rag_agent_node)
    graph.add_node("analyst_agent", analyst_agent_node)
    graph.add_node("reporter_agent", reporter_agent_node)

    # الحواف: الدخول إلى الـ Supervisor دائماً
    graph.add_edge(START, "supervisor")

    # التوجيه الشرطي وفق قرار الـ Supervisor
    graph.add_conditional_edges(
        "supervisor",
        route_from_supervisor,
        {
            "sql_agent": "sql_agent",
            "rag_agent": "rag_agent",
            "analyst_agent": "analyst_agent",
            "reporter_agent": "reporter_agent",
        },
    )

    # TODO(Sprint 3): sql_agent → analyst_agent → reporter_agent → END
    graph.add_edge("sql_agent", END)
    graph.add_edge("rag_agent", END)
    graph.add_edge("analyst_agent", END)
    graph.add_edge("reporter_agent", END)

    return graph.compile()


# المخطط الجاهز للاستخدام — تستورده نقطة نهاية المحادثة
bayan_graph = build_graph()
