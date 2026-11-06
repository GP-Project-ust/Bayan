"""اختبارات عقد أحداث SSE — العقد الدستوري بين الخلفية والواجهات."""

import json

import pytest

from app.core.events import (
    AgentEndPayload,
    ErrorPayload,
    FinalPayload,
    MetaPayload,
    sse_event,
)


def test_sse_meta_event_format():
    frame = sse_event("meta", MetaPayload(
        conversation_id="c-1", provider="mock", model="mock-deterministic", mode="mock"
    ))
    assert frame.startswith("event: meta\ndata: ")
    assert frame.endswith("\n\n")
    payload = json.loads(frame.split("data: ", 1)[1].strip())
    assert payload["provider"] == "mock"
    assert payload["mode"] == "mock"


def test_sse_agent_end_event_includes_sql_fields():
    frame = sse_event("agent_end", AgentEndPayload(
        agent="sql_agent", status="done", note="تنفيذ قراءة فقط",
        sql="SELECT 1", rows_count=5,
    ))
    payload = json.loads(frame.split("data: ", 1)[1].strip())
    assert payload["agent"] == "sql_agent"
    assert payload["sql"] == "SELECT 1"
    assert payload["rows_count"] == 5


def test_sse_final_and_error_events():
    final = sse_event("final", FinalPayload(
        conversation_id="c-2", answer="إجابة", route="sql_agent", agents=["supervisor", "sql_agent"]
    ))
    error = sse_event("error", ErrorPayload(code="graph_execution", message="فشل"))
    assert "event: final" in final
    assert "event: error" in error


def test_sse_rejects_unknown_event_type():
    """العقد مغلق: نوع حدث غير معتمد يرفض فورًا لا يمر بصمت."""
    with pytest.raises(ValueError, match="غير معتمد"):
        sse_event("agent_start", {"agent": "x"})  # محجوز — غير مفعل بعد


def test_payloads_reject_missing_required_fields():
    import pydantic

    with pytest.raises(pydantic.ValidationError):
        MetaPayload()  # conversation_id إلزامي
