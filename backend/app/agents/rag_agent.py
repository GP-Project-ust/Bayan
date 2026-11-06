"""وكيل RAG — يسترجع الإجابات من معرفة الجامعة (لوائح، سياسات، أنظمة).

المسؤولية (وفق الوثيقة) — يُبنى في Sprint 2:
  1. تضمين السؤال عربياً والبحث في Qdrant عن أقرب المقاطع المعرفية
     (لوائح القبول والترقية، سياسات الرسوم والخصم، خطط البرامج...)
  2. ترتيب النتائج بالصلة وحقنها كسياق للـ LLM
  3. توليد إجابة موثّقة بالمصدر (اسم اللائح + المادة) — بلا تخمين
  4. عند غياب الجواب في المعرفة: يُقال ذلك صراحة بدل الاختراع

الوضع الحالي (Sprint 0): علبة موثّقة — تُملأ في Sprint 2.
"""

from app.agents.state import AgentState

RAG_AGENT_NAME = "rag_agent"


def rag_agent_node(state: AgentState) -> dict:
    """عقدة وكيل RAG — استرجاع من قاعدة المعرفة (قيد الإنشاء)."""
    # TODO(Sprint 2):
    #   1) embedder.embed(state["question"])
    #   2) qdrant.search(collection="bayan_policies", top_k=5)
    #   3) llm.answer_with_citations(question, contexts)
    return {
        "rag_context": [],
        "answer": (
            "الهيكل الأساسي لوكيل RAG جاهز — الفهرسة والاسترجاع "
            "يُنفَّذان في Sprint 2 وفق خطة التنفيذ."
        ),
        "agent_trace": [
            {
                "agent": RAG_AGENT_NAME,
                "note": "هيكل فقط: الفهرسة والاسترجاع يُبنى في Sprint 2",
            }
        ],
    }
