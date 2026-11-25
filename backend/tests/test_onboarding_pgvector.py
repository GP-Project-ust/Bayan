"""اختبارات الفهرس الدلالي وpgvector ومصنع التضمين الرسمي وعزل المستأجرين."""

from __future__ import annotations

import json
import math
from typing import Any

import pytest

from app.core.config import Settings
from app.core.qdrant import get_embeddings
from app.services.onboarding.discovery import (
    DiscoveryPipeline,
    PostgresConnectionSettings,
)
from app.services.onboarding.indexing import (
    InMemorySemanticRepository,
    OfficialEmbeddingService,
    PgVectorSemanticRepository,
    SemanticEntryBuilder,
    SemanticIndexer,
    SemanticSearchService,
    validate_safe_semantic_payload,
)
from tests.test_onboarding_introspection import (
    InMemoryPostgresConnection,
    _logistics_catalog,
    _official_university_catalog,
)


class _StubPgCursor:
    """مؤشر PostgreSQL تجريبي للتحقق من استعلامات pgvector الحقيقية وصلاحيات المعاملة."""

    def __init__(self, *, vector_installed: bool = True, stored_rows: list[tuple] | None = None):
        self.vector_installed = vector_installed
        self.stored_rows = stored_rows or []
        self.executed: list[tuple[str, tuple[Any, ...]]] = []
        self._last_rows: list[tuple[Any, ...]] = []

    def __enter__(self) -> _StubPgCursor:
        return self

    def __exit__(self, exc_type, exc, tb) -> None:
        return None

    def execute(self, sql: str, params: tuple[Any, ...] = ()) -> None:
        normalized = " ".join(sql.split())
        self.executed.append((normalized, params))
        if "FROM pg_extension WHERE extname = 'vector'" in normalized:
            self._last_rows = [("0.7.4",)] if self.vector_installed else []
        elif (
            "FROM onboarding_semantic_entries" in normalized and "1 - (embedding <=>" in normalized
        ):
            self._last_rows = self.stored_rows
        elif "SELECT entry_id, content_hash" in normalized:
            self._last_rows = []
        else:
            self._last_rows = []

    def fetchone(self) -> tuple[Any, ...] | None:
        return self._last_rows[0] if self._last_rows else None

    def fetchall(self) -> list[tuple[Any, ...]]:
        return list(self._last_rows)


class _StubPgConnection:
    def __init__(self, cursor: _StubPgCursor):
        self.cur = cursor
        self.committed = False
        self.rolled_back = False

    def __enter__(self) -> _StubPgConnection:
        return self

    def __exit__(self, exc_type, exc, tb) -> None:
        return None

    def cursor(self) -> _StubPgCursor:
        return self.cur

    def commit(self) -> None:
        self.committed = True

    def rollback(self) -> None:
        self.rolled_back = True


def test_official_embedding_service_uses_qdrant_factory_and_validates_vectors():
    cfg = Settings(
        embedding_provider="mock",
        embedding_model="bge-m3",
        embedding_dimensions=1024,
    )
    service = OfficialEmbeddingService(app_settings=cfg, batch_size=2)
    texts = ["جدول الطلاب", "ملخص الرسوم", "المستودعات اللوجستية"]
    vectors = service.embed_texts(texts)
    expected = get_embeddings(texts)
    assert len(vectors) == 3
    assert all(len(vec) == 1024 for vec in vectors)
    assert all(all(math.isfinite(x) for x in vec) for vec in vectors)
    assert list(vectors[0]) == pytest.approx(expected[0])

    # رفض الأبعاد غير المطابقة وNaN
    bad_dims = OfficialEmbeddingService(
        app_settings=cfg, embed_fn=lambda b: [[0.1, 0.2] for _ in b]
    )
    with pytest.raises(ValueError, match="طول المتجه"):
        bad_dims.embed_texts(["نص"])

    bad_nan = OfficialEmbeddingService(
        app_settings=cfg,
        embed_fn=lambda b: [[float("nan")] * 1024 for _ in b],
    )
    with pytest.raises(ValueError, match="غير منتهية"):
        bad_nan.embed_texts(["نص"])


def test_semantic_entries_forbid_sql_credentials_and_business_rows():
    with pytest.raises(ValueError, match="SQL"):
        validate_safe_semantic_payload(
            searchable_text="SELECT * FROM op_student;",
            metadata_payload={},
        )
    with pytest.raises(ValueError, match="كلمات مرور"):
        validate_safe_semantic_payload(
            searchable_text="postgresql://user:password=secret@localhost:5432/db",
            metadata_payload={},
        )
    with pytest.raises(ValueError, match="غير مسموح"):
        validate_safe_semantic_payload(
            searchable_text="وصف سليم",
            metadata_payload={"view_definition": "SELECT 1"},
        )

    report = DiscoveryPipeline(
        connect_fn=lambda **_kw: InMemoryPostgresConnection(_official_university_catalog())
    ).run(
        PostgresConnectionSettings(
            database="university",
            password="very-secret-dev-password",
            schemas=("public",),
        )
    )
    entries = SemanticEntryBuilder().build_from_report(
        report,
        tenant_id="tenant-uni",
        source_id="SRC-UNI",
        embedding_config_id="mock:bge-m3:1024:cosine",
    )
    serialized = json.dumps([e.__dict__ for e in entries], ensure_ascii=False, default=str)
    assert "very-secret-dev-password" not in serialized
    assert "SELECT " not in serialized
    assert {"table", "view", "column", "relationship", "concept"}.issubset(
        {e.entry_type for e in entries}
    )


def test_pgvector_repository_sql_contract_and_missing_extension_fail_closed():
    missing_cur = _StubPgCursor(vector_installed=False)
    repo_missing = PgVectorSemanticRepository(
        database_url="postgresql://bayan:bayan@localhost:5432/bayan",
        dimensions=1024,
        connect_fn=lambda _url: _StubPgConnection(missing_cur),
    )
    with pytest.raises(RuntimeError, match="pgvector"):
        repo_missing.ensure_schema()

    cur = _StubPgCursor(vector_installed=True)
    conn = _StubPgConnection(cur)
    repo = PgVectorSemanticRepository(
        database_url="postgresql://bayan:bayan@localhost:5432/bayan",
        dimensions=1024,
        connect_fn=lambda _url: conn,
    )
    repo.ensure_schema()
    assert conn.committed is True
    executed_sql = "\n".join(sql for sql, _ in cur.executed)
    assert "CREATE EXTENSION IF NOT EXISTS vector" in executed_sql
    assert "CREATE TABLE IF NOT EXISTS onboarding_semantic_entries" in executed_sql
    assert "vector(1024)" in executed_sql


def test_cross_tenant_and_cross_source_isolation_in_semantic_search():
    repo = InMemorySemanticRepository(dimensions=1024)
    embedder = OfficialEmbeddingService(app_settings=Settings(embedding_provider="mock"))
    indexer = SemanticIndexer(repository=repo, embedder=embedder)
    search_svc = SemanticSearchService(repository=repo, embedder=embedder)

    uni_report = DiscoveryPipeline(
        connect_fn=lambda **_kw: InMemoryPostgresConnection(_official_university_catalog())
    ).run(
        PostgresConnectionSettings(database="university", source_id="SRC-UNI", schemas=("public",))
    )
    log_report = DiscoveryPipeline(
        connect_fn=lambda **_kw: InMemoryPostgresConnection(_logistics_catalog())
    ).run(
        PostgresConnectionSettings(
            database="logistics_demo",
            source_id="SRC-LOG",
            schemas=("logistics",),
        )
    )

    indexer.index_report(uni_report, tenant_id="tenant-alpha", source_id="SRC-UNI")
    indexer.index_report(log_report, tenant_id="tenant-beta", source_id="SRC-LOG")

    # غياب tenant_id يُرفض فوراً (fail-closed)
    with pytest.raises(ValueError, match="tenant_id"):
        search_svc.search("الطلاب والرسوم", tenant_id="")

    # المستأجر أ لا يرى أي نتائج من المستأجر ب
    hits_alpha = search_svc.search("الشحنات والمستودعات", tenant_id="tenant-alpha", limit=20)
    assert hits_alpha
    assert all(h.tenant_id == "tenant-alpha" for h in hits_alpha)
    assert all(h.source_id == "SRC-UNI" for h in hits_alpha)

    # تصفية allowed_views تحجب المشاهد غير المصرح بها قبل الإرجاع
    view_hits = search_svc.search(
        "الرسوم والإحصاءات",
        tenant_id="tenant-alpha",
        entry_types=["view"],
        allowed_views=["v_student_profile"],
        limit=10,
    )
    assert all(h.technical_name == "v_student_profile" for h in view_hits)

    # تحديث مصدر للمستأجر أ لا يؤرشف سجلات المستأجر ب حتى لو كانت بنفس الأسماء
    indexer.index_report(log_report, tenant_id="tenant-alpha", source_id="SRC-LOG-DUP")
    beta_views = repo.list_active_views(tenant_id="tenant-beta")
    assert {v.technical_name for v in beta_views} == {
        "v_active_shipments_overview",
        "v_warehouse_dispatch_summary",
    }

    # التحقق من أخذ قفل التزامن الاستشاري داخل pgvector.apply_changes وrollback عند الخطأ
    cur = _StubPgCursor(vector_installed=True)
    conn = _StubPgConnection(cur)
    pg_repo = PgVectorSemanticRepository(
        database_url="postgresql://bayan:bayan@localhost:5432/bayan",
        dimensions=1024,
        connect_fn=lambda _url: conn,
    )
    pg_repo.apply_changes(
        tenant_id="tenant-alpha",
        source_id="SRC-UNI",
        upserts=[],
        retire_ids=[],
    )
    executed_sql = "\n".join(sql for sql, _ in cur.executed)
    assert "pg_advisory_xact_lock" in executed_sql
    assert conn.committed is True
