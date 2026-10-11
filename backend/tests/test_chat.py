"""اختبارات سلسلة المحادثة — الهيكل الأساسي للمخطط.

تضمن أن: المخطط يُبنى ويُشغَّل، التوجيه يعمل، والأثر يُعاد كاملاً.
(في السبرنتات القادمة تُضاف اختبارات توليد SQL الفعلية وRAG)
"""


def test_chat_answers_arabic_question(client):
    response = client.post(
        "/api/v1/chat",
        json={"question": "كم عدد الطلاب في كل كلية؟"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["question"] == "كم عدد الطلاب في كل كلية؟"
    assert body["answer"]
    assert body["conversation_id"]


def test_chat_returns_agent_trace(client):
    body = client.post(
        "/api/v1/chat",
        json={"question": "ما هي رسوم برنامج علوم الحاسوب؟"},
    ).json()
    agents = [entry["agent"] for entry in body["agent_trace"]]
    assert "supervisor" in agents
    assert body["route"] == "sql_agent"


def test_chat_rejects_empty_question(client):
    response = client.post("/api/v1/chat", json={"question": "ه"})
    assert response.status_code == 422


def test_chat_preserves_conversation_id(client):
    body = client.post(
        "/api/v1/chat",
        json={"question": "كم عدد أعضاء هيئة التدريس؟", "conversation_id": "fixed-id-123"},
    ).json()
    assert body["conversation_id"] == "fixed-id-123"
