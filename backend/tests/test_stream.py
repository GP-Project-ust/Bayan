"""اختبارات نقطة البث SSE — تدفق أحداث الوكلاء وفق العقد الدستوري."""

import json


def _parse_sse_frames(text: str) -> list[tuple[str, dict]]:
    """Parser SSE مطابق لما تفعله واجهة الاختبار (نفس المنطق مركزّزاً)."""
    frames = []
    for block in text.split("\n\n"):
        block = block.strip()
        if not block:
            continue
        event, data = None, None
        for line in block.split("\n"):
            if line.startswith("event: "):
                event = line[7:].strip()
            elif line.startswith("data: "):
                data = json.loads(line[6:])
        if event:
            frames.append((event, data or {}))
    return frames


def test_stream_meta_first_and_final_last(client):
    with client.stream("POST", "/api/v1/chat/stream",
                       json={"question": "كم عدد الطلاب في كل برنامج؟"}) as response:
        assert response.status_code == 200
        assert response.headers["content-type"].startswith("text/event-stream")
        text = "".join(response.iter_text())
    frames = _parse_sse_frames(text)

    assert frames[0][0] == "meta"
    assert frames[0][1]["provider"] == "mock"
    assert frames[-1][0] == "final"

    event_names = [e for e, _ in frames]
    assert "agent_end" in event_names
    # العقد: meta أولًا، ثم أحداث الوكلاء، ثم final أخيرًا
    assert event_names.index("meta") == 0
    assert event_names.index("final") == len(event_names) - 1


def test_stream_sql_agent_card_carries_sql_and_rows(client):
    with client.stream("POST", "/api/v1/chat/stream",
                       json={"question": "من الطلاب الذين عليهم رسوم متأخرة؟"}) as response:
        text = "".join(response.iter_text())
    frames = _parse_sse_frames(text)

    sql_cards = [d for e, d in frames if e == "agent_end" and d["agent"] == "sql_agent"]
    assert sql_cards, "يجب أن يشارك وكيل SQL في المسار"
    # بطاقة الوكيل تحمل الاستعلام وعدد الصفوف وفق عقد AgentTraceEntry
    assert sql_cards[0]["sql"] is not None
    assert "rows_count" in sql_cards[0]


def test_stream_rag_route_for_regulation_question(client):
    """سؤال لوائح يوجه للـ RAG — التوجيه القاعدي يعمل عبر البث أيضًا."""
    with client.stream("POST", "/api/v1/chat/stream",
                       json={"question": "ما هي شروط الترقية وفق اللائحة؟"}) as response:
        text = "".join(response.iter_text())
    frames = _parse_sse_frames(text)
    final = [d for e, d in frames if e == "final"][0]
    assert final["route"] == "rag_agent"
    assert "rag_agent" in final["agents"]


def test_stream_rejects_invalid_question(client):
    with client.stream("POST", "/api/v1/chat/stream", json={"question": "ه"}) as response:
        assert response.status_code == 422


def test_stream_preserves_conversation_id(client):
    payload = {"question": "كم عدد الطلاب؟", "conversation_id": "fixed-42"}
    with client.stream("POST", "/api/v1/chat/stream", json=payload) as response:
        text = "".join(response.iter_text())
    frames = _parse_sse_frames(text)
    meta = frames[0][1]
    final = frames[-1][1]
    assert meta["conversation_id"] == "fixed-42"
    assert final["conversation_id"] == "fixed-42"
