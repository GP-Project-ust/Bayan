"""اختبارات نقطة البث SSE — تدفق أحداث الوكلاء وفق العقد الدستوري."""

import json

import psycopg
import pytest


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


def test_stream_final_table_absent_without_results(client):
    """بلا نتائج استعلام (مسار RAG) — الحدث الختامي بلا جدول (الحقل اختياري)."""
    final = _stream_question(client, "ما هي شروط الترقية وفق اللائحة؟")
    assert final.get("table") is None


# ---------------------------------------------------------------------------
# الجدول مع القاعدة الحية — يتخطى تلقائيًا إن غابت القاعدة
# (في CI تعمل القاعدة دائمًا؛ محليًا: make dev-db)
# ---------------------------------------------------------------------------


def _database_available() -> bool:
    from app.core.config import get_settings

    try:
        with psycopg.connect(get_settings().odoo_database_url, connect_timeout=2):
            return True
    except psycopg.OperationalError:
        return False


def _stream_question(client, question: str) -> dict:
    with client.stream("POST", "/api/v1/chat/stream", json={"question": question}) as response:
        text = "".join(response.iter_text())
    frames = _parse_sse_frames(text)
    return [d for e, d in frames if e == "final"][0]


@pytest.mark.skipif(
    not _database_available(),
    reason="قاعدة الجامعة التجريبية غير متاحة — شغّل make dev-db",
)
def test_stream_final_carries_table_with_live_db(client):
    """مع القاعدة الحية: الحدث الختامي يحمل جدول النتائج (عقد تحديث ADR-003)."""
    final = _stream_question(client, "كم عدد الطلاب في كل برنامج؟")
    table = final["table"]
    assert table is not None
    assert table["columns"][0] == "program_name"
    assert len(table["rows"]) > 0
    assert all(len(row) == len(table["columns"]) for row in table["rows"])
    assert table["truncated"] is False
