"""اختبارات مصنع Qdrant والتضمين (ADR-005) — mock حتمي وبنية المجموعة."""

import math

import pytest
from qdrant_client import QdrantClient

from app.core.config import get_settings
from app.core.qdrant import (
    QDRANT_POLICIES_COLLECTION,
    _mock_vector,
    ensure_collection,
    get_embeddings,
)


def test_mock_vector_is_deterministic():
    """نفس النص ← نفس المتجه حرفيًا (شرط الفهرسة القابلة للتكرار)."""
    assert _mock_vector("كم عدد الطلاب؟", 64) == _mock_vector("كم عدد الطلاب؟", 64)


def test_mock_vector_differs_by_text():
    assert _mock_vector("رسوم متأخرة", 64) != _mock_vector("عدد الطلاب", 64)


def test_mock_vector_dimensions_and_norm():
    dims = get_settings().embedding_dimensions
    vector = _mock_vector("نص اختباري", dims)
    assert len(vector) == dims
    assert math.isclose(sum(v * v for v in vector), 1.0, rel_tol=1e-5)


def test_get_embeddings_mock_batch_shape_and_determinism():
    texts = ["المادة الأولى", "المادة الثانية", "المادة الثالثة"]
    first = get_embeddings(texts)
    second = get_embeddings(texts)
    assert len(first) == 3
    assert all(len(v) == get_settings().embedding_dimensions for v in first)
    assert first == second  # حتمية كاملة عبر الدفعات


def test_get_embeddings_rejects_unknown_provider(monkeypatch):
    monkeypatch.setattr(get_settings(), "embedding_provider", "nope")
    with pytest.raises(ValueError, match="مزوّد تضمين غير مدعوم"):
        get_embeddings(["نص"])


def test_ensure_collection_creates_once():
    client = QdrantClient(":memory:")
    assert ensure_collection(client, "bayan_test_collection", dimensions=32) is True
    assert ensure_collection(client, "bayan_test_collection", dimensions=32) is False
    assert client.collection_exists("bayan_test_collection")


def test_ensure_collection_default_name_is_policies():
    client = QdrantClient(":memory:")
    ensure_collection(client, dimensions=32)
    assert client.collection_exists(QDRANT_POLICIES_COLLECTION)
