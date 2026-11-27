"""اختبارات صفحة ونقاط فحص الفهرسة (/dev/indexer) — ضد Qdrant داخل الذاكرة."""

import pytest
from qdrant_client import QdrantClient

from app.api.v1.endpoints import dev_indexer
from app.core.config import get_settings

TENANT_A = "جامعة العلوم والتكنولوجيا"
TENANT_B = "جامعة صنعاء"


@pytest.fixture()
def memory_qdrant(client, monkeypatch, tmp_path):
    """حقن عميل Qdrant داخل الذاكرة بدل خدمة الشبكة — بلا أي اتصال خارجي.

    عميل واحد مشترك لكل الاختبار (لا عميل جديد لكل نداء — وإلا ضاعت المجموعة).
    """
    shared = QdrantClient(":memory:")
    monkeypatch.setattr(dev_indexer, "get_qdrant_client", lambda: shared)
    monkeypatch.setattr(dev_indexer, "_STATE_DB", tmp_path / "indexer-state.sqlite3")
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
    assert second["skipped_files"] == 5
    assert second["embedded_chunks"] == 0
    assert second["upserted_chunks"] == 0
    status = memory_qdrant.get("/dev/indexer/status").json()
    assert status["points_count"] == first["chunks"]  # تحديث لا ازدواج


def test_search_returns_hits_with_full_payload(memory_qdrant):
    client_post(memory_qdrant, "/dev/indexer/ingest")
    response = memory_qdrant.post(
        "/dev/indexer/search",
        json={"query": "غرامة التأخير في السداد", "tenant": TENANT_A, "top_k": 5},
    )
    assert response.status_code == 200
    hits = response.json()["hits"]
    assert len(hits) > 0
    for hit in hits:
        payload = hit["payload"]
        for key in (
            "document",
            "version",
            "classification",
            "tenant",
            "section",
            "text",
            "tenant_id",
            "document_id",
            "version_id",
            "chunk_id",
            "page_number",
            "security_level",
            "point_identity_sha256",
        ):
            assert key in payload, f"حقل مفقود من الحمولة: {key}"
        assert payload["page_number"] is None  # لا نختلق صفحات لملفات TXT
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
    response = memory_qdrant.post("/dev/indexer/search", json={"query": "أي شيء", "top_k": 3})
    assert response.status_code == 409
    assert "فهرسة" in response.json()["detail"]


def test_search_without_tenant_context_fails_closed(memory_qdrant):
    client_post(memory_qdrant, "/dev/indexer/ingest")
    response = memory_qdrant.post(
        "/dev/indexer/search",
        json={"query": "شروط القبول", "top_k": 3},
    )
    assert response.status_code == 422
    assert "المؤسسة" in response.json()["detail"]


def test_search_validates_top_k(memory_qdrant):
    response = memory_qdrant.post("/dev/indexer/search", json={"query": "سؤال", "top_k": 99})
    assert response.status_code == 422


def test_search_rejects_whitespace_only_query(memory_qdrant):
    response = memory_qdrant.post(
        "/dev/indexer/search",
        json={"query": "   ", "tenant": TENANT_A},
    )
    assert response.status_code == 422


def test_search_rejects_blank_or_invisible_tenant(memory_qdrant):
    client_post(memory_qdrant, "/dev/indexer/ingest")
    for tenant in ("   ", f"{TENANT_A}\u200b", f"{TENANT_A}\u202e"):
        response = memory_qdrant.post(
            "/dev/indexer/search",
            json={"query": "شروط القبول", "tenant": tenant},
        )
        assert response.status_code == 422, tenant


def test_search_qdrant_failure_is_sanitized_503(memory_qdrant, monkeypatch):
    client_post(memory_qdrant, "/dev/indexer/ingest")

    def boom(*_args, **_kwargs):
        raise RuntimeError("secret internal qdrant detail")

    monkeypatch.setattr(QdrantClient, "query_points", boom)
    response = memory_qdrant.post(
        "/dev/indexer/search",
        json={"query": "شروط القبول", "tenant": TENANT_A},
    )
    assert response.status_code == 503
    assert "secret internal" not in response.text


def test_search_collection_probe_failure_is_sanitized_503(memory_qdrant, monkeypatch):
    def boom(*_args, **_kwargs):
        raise RuntimeError("secret collection probe detail")

    monkeypatch.setattr(QdrantClient, "collection_exists", boom)
    response = memory_qdrant.post(
        "/dev/indexer/search",
        json={"query": "شروط القبول", "tenant": TENANT_A},
    )
    assert response.status_code == 503
    assert "secret collection" not in response.text


def test_search_embedding_failure_returns_503(memory_qdrant, monkeypatch):
    client_post(memory_qdrant, "/dev/indexer/ingest")

    def boom(_texts):
        raise RuntimeError("secret embedding detail")

    monkeypatch.setattr("app.services.ingestion.embedder.get_embeddings", boom)
    response = memory_qdrant.post(
        "/dev/indexer/search",
        json={"query": "شروط القبول", "tenant": TENANT_A},
    )
    assert response.status_code == 503
    assert "secret embedding" not in response.text
    assert "التضمين" in response.json()["detail"]


def test_ingest_missing_documents_directory_is_sanitized(memory_qdrant, monkeypatch, tmp_path):
    missing = tmp_path / "secret-server-directory"
    monkeypatch.setattr(dev_indexer, "_DOCUMENTS_DIR", missing)
    response = memory_qdrant.post("/dev/indexer/ingest")
    assert response.status_code == 500
    assert "secret-server-directory" not in response.text
    assert str(missing) not in response.text


def test_ingest_collection_distance_mismatch_returns_409(memory_qdrant):
    from qdrant_client.http import models as qmodels

    settings = get_settings()
    shared = dev_indexer.get_qdrant_client()
    shared.create_collection(
        "bayan_policies",
        vectors_config=qmodels.VectorParams(
            size=settings.embedding_dimensions,
            distance=qmodels.Distance.DOT,
        ),
    )
    response = memory_qdrant.post("/dev/indexer/ingest")
    assert response.status_code == 409
    assert "غير متوافق" in response.json()["detail"]


def test_ingest_embedding_failure_returns_503(memory_qdrant, monkeypatch):
    def boom(_texts):
        raise RuntimeError("secret ingest embedding detail")

    monkeypatch.setattr("app.services.ingestion.embedder.get_embeddings", boom)
    response = memory_qdrant.post("/dev/indexer/ingest")
    assert response.status_code == 503
    assert "secret ingest embedding" not in response.text
    assert "التضمين" in response.json()["detail"]


def test_ingest_qdrant_client_failure_returns_503(memory_qdrant, monkeypatch):
    def boom():
        raise RuntimeError("secret qdrant client detail")

    monkeypatch.setattr(dev_indexer, "get_qdrant_client", boom)
    response = memory_qdrant.post("/dev/indexer/ingest")
    assert response.status_code == 503
    assert "secret qdrant client" not in response.text


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
