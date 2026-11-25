"""اختبارات نقطة فحص الصحة — يجب أن تنجح حتى دون بنية تحتية مرفوعة.

الفلسفة: فشل مكوّن يجعل الحالة "degraded" وليس خطأ 500 —
حتى يصل الفريق دائماً إلى التشخيص بدل انهيار الخدمة.
"""


def test_health_returns_200(client):
    response = client.get("/api/v1/health")
    assert response.status_code == 200


def test_health_reports_critical_components(client):
    body = client.get("/api/v1/health").json()
    assert body["status"] in ("ok", "degraded")
    # المكوّنان الحرجان يُفحصان دائماً (قاعدة المنصة + قاعدة الجامعة)
    for component in ("database", "university_database"):
        assert component in body["components"]
        assert body["components"][component] in ("up", "down")


def test_health_checks_optional_components_only_when_enabled(client):
    """المزوّدات المساندة لا تُفحص تحت mock — وإلا لبدت بيئة النشر degraded دائماً."""
    body = client.get("/api/v1/health").json()
    assert "qdrant" not in body["components"]
    assert "ollama" not in body["components"]
    # redis يُفحص فقط عند ضبط رابطه (الافتراضي في الاختبارات مضبوط)
    assert body["components"].get("redis") in ("up", "down")


def test_health_exposes_version(client):
    body = client.get("/api/v1/health").json()
    assert body["version"]
