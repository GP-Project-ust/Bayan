"""اختبارات SHA-256 ومصنع التضمين الرسمي والتحقق من الأبعاد."""

import uuid

import pytest

from app.core.qdrant import get_embeddings
from app.services.ingestion.embedder import EmbeddingConfig, OfficialEmbeddingService
from app.services.ingestion.exceptions import EmbeddingError, VectorDimensionError
from app.services.ingestion.identity import (
    chunk_identity,
    document_identity,
    point_identity,
    sha256_bytes,
    sha256_text,
    version_identity,
)
from app.services.ingestion.loader import TxtDocumentLoader
from tests.test_ingestion.conftest import write_policy


def test_sha256_fingerprints_are_stable_and_domain_separated():
    assert sha256_bytes(b"abc") == sha256_bytes(b"abc")
    assert sha256_text("abc") == sha256_bytes(b"abc")
    doc = document_identity("Tenant A", "policy.txt")
    version = version_identity(doc, "1", sha256_bytes(b"abc"))
    chunk = chunk_identity(version, "config", 0, 10, 20, sha256_text("abc"))
    assert len({doc, version, chunk}) == 3
    assert all(len(value) == 64 for value in (doc, version, chunk))


def test_point_uuid_is_deterministic_and_retains_complete_sha():
    first_sha, first_id = point_identity("chunk", "embedding")
    second_sha, second_id = point_identity("chunk", "embedding")
    assert (first_sha, first_id) == (second_sha, second_id)
    assert len(first_sha) == 64
    assert str(uuid.UUID(first_id)) == first_id
    assert uuid.UUID(first_id).version == 5


def test_same_source_content_differs_by_tenant_and_document(tmp_path):
    root_a = tmp_path / "a"
    root_b = tmp_path / "b"
    path_a = write_policy(root_a, tenant="Tenant A", name="one.txt")
    path_b = write_policy(root_b, tenant="Tenant B", name="one.txt")
    loader = TxtDocumentLoader()
    doc_a = loader.load(path_a, source_root=root_a)
    doc_b = loader.load(path_b, source_root=root_b)
    assert doc_a.body_text == doc_b.body_text
    assert doc_a.document_id != doc_b.document_id
    assert doc_a.version_id != doc_b.version_id

    second_a = write_policy(root_a, tenant="Tenant A", name="two.txt")
    doc_second = loader.load(second_a, source_root=root_a)
    assert doc_a.document_id != doc_second.document_id


def test_official_mock_factory_is_deterministic_and_arabic_compatible():
    texts = ["سياسة القبول", "Mixed Arabic-English policy"]
    assert get_embeddings(texts) == get_embeddings(texts)


def test_embedding_service_batches_and_preserves_order():
    calls: list[list[str]] = []

    def fake(texts: list[str]) -> list[list[float]]:
        calls.append(texts)
        return [[float(int(text[-1]))] * 4 for text in texts]

    service = OfficialEmbeddingService(
        EmbeddingConfig("mock", "test", 4, batch_size=2, max_retries=0),
        fake,
    )
    vectors = service.embed(["t1", "t2", "t3", "t4", "t5"])
    assert [len(batch) for batch in calls] == [2, 2, 1]
    assert [vector[0] for vector in vectors] == [1.0, 2.0, 3.0, 4.0, 5.0]


def test_embedding_service_rejects_wrong_count_dimension_and_nan():
    config = EmbeddingConfig("mock", "test", 3, max_retries=0)
    with pytest.raises(EmbeddingError, match="عدداً غير مطابق"):
        OfficialEmbeddingService(config, lambda _texts: []).embed(["text"])
    with pytest.raises(VectorDimensionError):
        OfficialEmbeddingService(config, lambda _texts: [[1.0, 2.0]]).embed(["text"])
    with pytest.raises(EmbeddingError, match="غير منتهية"):
        OfficialEmbeddingService(
            config,
            lambda _texts: [[1.0, float("nan"), 2.0]],
        ).embed(["text"])


def test_embedding_errors_are_wrapped_without_document_content():
    secret = "confidential policy text"

    def fail(_texts: list[str]) -> list[list[float]]:
        raise RuntimeError(secret)

    service = OfficialEmbeddingService(
        EmbeddingConfig("mock", "test", 3, max_retries=1),
        fail,
    )
    with pytest.raises(EmbeddingError) as captured:
        service.embed([secret])
    assert secret not in str(captured.value)


def test_embedding_fingerprint_tracks_model_and_dimensions():
    base = EmbeddingConfig("mock", "bge-m3", 16)
    assert base.fingerprint == EmbeddingConfig("mock", "bge-m3", 16).fingerprint
    assert base.fingerprint != EmbeddingConfig("mock", "other", 16).fingerprint
    assert base.fingerprint != EmbeddingConfig("mock", "bge-m3", 32).fingerprint
