"""اختبارات صفحة ونقاط فحص الفهرسة (/dev/indexer) — ضد Qdrant داخل الذاكرة."""

import pytest
from qdrant_client import QdrantClient

from app.api.v1.endpoints import dev_indexer
from app.core.config import get_settings

TENANT_A = "جامعة العلوم والتكنولوجيا"
TENANT_B = "جامعة صنعاء"


@pytest.fixture()
def memory_qdrant(client, monkeypatch):
    """حقن عميل Qdrant داخل الذاكرة بدل خدمة الشبكة — بلا أي اتصال خارجي.

    عميل واحد مشترك لكل الاختبار (لا عميل جديد لكل نداء — وإلا ضاعت المجموعة).
    """
    shared = QdrantClient(":memory:")
    monkeypatch.setattr(dev_indexer, "get_qdrant_client", lambda: shared)
    return client


def test_indexer_page_served_arabic_rtl(client):
    response = client.get("/dev/indexer")
    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]
    body = response.text
    assert 'dir="rtl"' in body
    assert "بيان" in body
    assert "/dev/indexer/search" in body


def test_indexer_page_is_single_file_offline(client):
    body = client.get("/dev/indexer").text
    assert "fonts.googleapis" not in body
    assert "http://cdn" not in body


def test_indexer_tools_disabled_in_production(client, monkeypatch):
    monkeypatch.setattr(get_settings(), "enable_playground", False)
    assert client.get("/dev/indexer").status_code == 404
    assert client.get("/dev/indexer/status").status_code == 404


def test_status_reports_down_without_service(client, monkeypatch):
    def boom():
        raise RuntimeError("لا يوجد خادم")

    monkeypatch.setattr(dev_indexer, "get_qdrant_client", boom)
    response = client.get("/dev/indexer/status")
    assert response.status_code == 200  # الحالة لا تنهار — تُخبر بوضوح
    body = response.json()
    assert body["qdrant"] == "down"
    assert body["embedding_provider"] == get_settings().embedding_provider


def test_ingest_then_status_counts_chunks(memory_qdrant):
    ingest = client_post(memory_qdrant, "/dev/indexer/ingest")
    assert ingest["files"] == 5
    assert ingest["chunks"] > 0
    status = memory_qdrant.get("/dev/indexer/status").json()
    assert status["qdrant"] == "up"
    assert status["points_count"] == ingest["chunks"]


def test_ingest_is_idempotent(memory_qdrant):
    first = client_post(memory_qdrant, "/dev/indexer/ingest")
    second = client_post(memory_qdrant, "/dev/indexer/ingest")
    assert second["chunks"] == first["chunks"]
    status = memory_qdrant.get("/dev/indexer/status").json()
    assert status["points_count"] == first["chunks"]  # تحديث لا ازدواج


def test_search_returns_hits_with_full_payload(memory_qdrant):
    client_post(memory_qdrant, "/dev/indexer/ingest")
    response = memory_qdrant.post(
        "/dev/indexer/search",
        json={"query": "غرامة التأخير في السداد", "top_k": 5},
    )
    assert response.status_code == 200
    hits = response.json()["hits"]
    assert len(hits) > 0
    for hit in hits:
        payload = hit["payload"]
        for key in ("document", "version", "classification", "tenant", "section", "text"):
            assert key in payload, f"حقل مفقود من الحمولة: {key}"
        assert hit["score"] >= 0


def test_search_tenant_isolation_negative(memory_qdrant):
    """اختبار سلبي: بحث مستأجر لا يعيد مقاطع مستأجر آخر أبدًا."""
    client_post(memory_qdrant, "/dev/indexer/ingest")
    for tenant in (TENANT_A, TENANT_B):
        response = memory_qdrant.post(
            "/dev/indexer/search",
            json={"query": "الرسوم والقبول والاختبارات والتخرج", "tenant": tenant, "top_k": 20},
        )
        assert response.status_code == 200
        hits = response.json()["hits"]
        assert len(hits) > 0, f"لا نتائج للمستأجر {tenant} — الفلترة كسرت البحث كله"
        for hit in hits:
            assert hit["payload"]["tenant"] == tenant, "تسريب مقاطع بين المستأجرين!"


def test_search_before_ingest_guides_user(memory_qdrant):
    response = memory_qdrant.post(
        "/dev/indexer/search", json={"query": "أي شيء", "top_k": 3}
    )
    assert response.status_code == 409
    assert "فهرسة" in response.json()["detail"]


def test_search_validates_top_k(memory_qdrant):
    response = memory_qdrant.post(
        "/dev/indexer/search", json={"query": "سؤال", "top_k": 99}
    )
    assert response.status_code == 422


def client_post(test_client, path):
    response = test_client.post(path)
    assert response.status_code == 200, response.text
    return response.json()


# ---------------------------------------------------------------------------
# الخدمة الحية — يتخطى تلقائيًا إن غابت خدمة Qdrant
# (في CI تعمل الخدمة دائمًا؛ محليًا: make infra)
# ---------------------------------------------------------------------------


def _qdrant_available() -> bool:
    try:
        from qdrant_client import QdrantClient

        return QdrantClient(url=get_settings().qdrant_url, timeout=2).get_collections() is not None
    except Exception:
        return False


@pytest.mark.skipif(
    not _qdrant_available(),
    reason="خدمة Qdrant غير متاحة — شغّل make infra",
)
class TestAgainstLiveQdrantService:
    def test_live_ingest_search_and_tenant_isolation(self, client):
        first = client_post(client, "/dev/indexer/ingest")
        second = client_post(client, "/dev/indexer/ingest")
        assert first["chunks"] == second["chunks"] > 0  # تحديث لا ازدواج

        status = client.get("/dev/indexer/status").json()
        assert status["qdrant"] == "up"
        assert status["points_count"] == first["chunks"]

        response = client.post(
            "/dev/indexer/search",
            json={"query": "شروط القبول وحدود المعدل", "tenant": TENANT_A, "top_k": 10},
        )
        assert response.status_code == 200
        hits = response.json()["hits"]
        assert len(hits) > 0
        assert all(h["payload"]["tenant"] == TENANT_A for h in hits)
