"""نقطة نهاية البث — تدفق أحداث الوكلاء مباشرة إلى العميل (SSE).

تستخدم نفس عقد الأحداث الدستوري (app/core/events.py):
  meta → agent_end (لكل عقدة تكتمل) → final
وأي فشل يتحول إلى حدث error واضح بدل قطع صامت للاتصال.

هذه النقطة هي المرجع الذي تستهلكه واجهة الاختبار الموحدة (/dev/playground)
وستستهلكه واجهة Next.js لاحقاً — عقد واحد، مستهلكان.
"""

import uuid
from collections.abc import Iterator

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.agents.graph import bayan_graph
from app.api.v1.endpoints.chat import ChatRequest
from app.core.config import get_settings
from app.core.events import AgentEndPayload, ErrorPayload, FinalPayload, MetaPayload, sse_event
from app.core.logging import logger

router = APIRouter()

# ميزانية خطوات لكل طلب — تمنع دوران المخطط اللانهائي
_RECURSION_LIMIT = 10


def _node_payload(node_name: str, node_state: dict) -> AgentEndPayload:
    """تحويل حالة عقدة مكتملة إلى حمولة حدث agent_end وفق العقد."""
    trace = node_state.get("agent_trace") or []
    entry = next((t for t in trace if t.get("agent") == node_name), trace[-1] if trace else {})
    return AgentEndPayload(
        agent=node_name,
        status=entry.get("status", "done"),
        note=entry.get("note", ""),
        sql=entry.get("sql"),
        rows_count=entry.get("rows_count"),
    )


@router.post("/chat/stream")
def chat_stream(request: ChatRequest) -> StreamingResponse:
    """بث إجابة السؤال عبر المخطط — أحداث SSE حسب العقدة المكتملة."""
    settings = get_settings()
    conversation_id = request.conversation_id or str(uuid.uuid4())
    logger.info("بث وارد [%s]: %s", conversation_id[:8], request.question)

    def event_stream() -> Iterator[str]:
        # 1) الحدث الأول دائماً: meta — هوية الطلب والمزوّد الحالي
        is_mock = settings.llm_provider == "mock"
        yield sse_event(
            "meta",
            MetaPayload(
                conversation_id=conversation_id,
                provider=settings.llm_provider,
                model="mock-deterministic" if is_mock else settings.llm_model,
                mode="mock" if is_mock else "real",
            ),
        )

        route = "sql_agent"
        answer = ""
        agents: list[str] = []

        try:
            # 2) بث تحديثات المخطط — كل تحديث = عقدة اكتملت
            for update in bayan_graph.stream(
                {
                    "question": request.question,
                    "conversation_id": conversation_id,
                    "agent_trace": [],
                },
                config={"recursion_limit": _RECURSION_LIMIT},
            ):
                for node_name, node_state in (update or {}).items():
                    if not isinstance(node_state, dict):
                        continue
                    agents.append(node_name)
                    route = node_state.get("route", route) or route
                    answer = node_state.get("answer", "") or answer
                    yield sse_event("agent_end", _node_payload(node_name, node_state))

            # 3) الحدث الختامي: الإجابة النهائية
            yield sse_event(
                "final",
                FinalPayload(
                    conversation_id=conversation_id,
                    answer=answer,
                    route=route,
                    agents=agents,
                ),
            )
        except Exception as exc:  # noqa: BLE001 — أي فشل يصل المستخدم بوضوح
            logger.exception("فشل بث المحادثة [%s]", conversation_id[:8])
            yield sse_event("error", ErrorPayload(code="graph_execution", message=str(exc)))

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # يمنع البروكسيات من تجميع البث
        },
    )
