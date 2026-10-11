"""نقطة نهاية المحادثة — البوابة الرئيسية للمستخدم إلى وكلاء بيان.

تستقبل السؤال العربي، تمرّره عبر مخطط LangGraph (Supervisor يوجّه للوكلاء)،
وتعيد الإجابة مع أثر التنفيذ (أي وكيل شارك وبأي ترتيب).

الوضع الحالي (Sprint 0): الهيكل الأساسي فقط — الوكلاء عُلب موثّقة تُملأ
وفق الخطة (docs/04_execution_plan.md):
  Sprint 1: وكيل SQL (Smart Views + توليد + تحقق + تنفيذ آمن)
  Sprint 2: وكيل RAG (Qdrant)
  Sprint 3: توجيه Supervisor الحقيقي + المحلل + المُعدّ
"""

import uuid

from fastapi import APIRouter

from app.agents.graph import bayan_graph
from app.core.logging import logger
from app.schemas.chat import ChatRequest, ChatResponse

router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest) -> ChatResponse:
    """معالجة سؤال عربي عبر سلسلة الوكلاء وإرجاع الإجابة."""
    conversation_id = request.conversation_id or str(uuid.uuid4())
    logger.info("سؤال وارد [%s]: %s", conversation_id[:8], request.question)

    state = bayan_graph.invoke(
        {
            "question": request.question,
            "conversation_id": conversation_id,
            "agent_trace": [],
        }
    )

    return ChatResponse(
        conversation_id=conversation_id,
        question=request.question,
        answer=state.get("answer", ""),
        route=state.get("route", ""),
        agent_trace=state.get("agent_trace", []),
    )
