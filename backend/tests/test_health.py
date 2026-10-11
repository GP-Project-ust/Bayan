"""اختبارات نقطة فحص الصحة — يجب أن تنجح حتى دون بنية تحتية مرفوعة.

الفلسفة: فشل مكوّن يجعل الحالة "degraded" وليس خطأ 500 —
حتى يصل الفريق دائماً إلى التشخيص بدل انهيار الخدمة.
"""


def test_health_returns_200(client):
    response = client.get("/api/v1/health")
    assert response.status_code == 200


def test_health_reports_all_components(client):
    body = client.get("/api/v1/health").json()
    assert body["status"] in ("ok", "degraded")
    for component in ("database", "redis", "qdrant", "ollama"):
        assert component in body["components"]
        assert body["components"][component] in ("up", "down")


def test_health_exposes_version(client):
    body = client.get("/api/v1/health").json()
    assert body["version"]
