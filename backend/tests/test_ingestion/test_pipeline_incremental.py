"""اختبارات Qdrant المحلية والتزايدية ودورة الحياة والتعافي."""

import pytest
from qdrant_client.http import models as qmodels

from app.services.ingestion.exceptions import (
    CollectionConfigurationError,
    InvalidDocumentPathError,
    QdrantOperationError,
    RepositoryError,
    TenantScopeError,
)
from app.services.ingestion.repository import SQLiteIngestionRepository
from app.services.ingestion.tenant_scope import TenantScope
from tests.test_ingestion.conftest import (
    TEST_DIMENSIONS,
    CountingEmbeddings,
    make_pipeline,
    write_policy,
)

TENANT = "Tenant A"
BODY = "المادة 1: قاعدة ثابتة.\nالمادة 2: قاعدة قابلة للتعديل."


def test_first_run_complete_payload_and_repeated_run_skips(
    tmp_path,
    memory_client,
    memory_repository,
):
    path = write_policy(tmp_path, tenant=TENANT, body=BODY)
    embeddings = CountingEmbeddings()
    pipeline = make_pipeline(memory_client, memory_repository, embedding_function=embeddings)

    first = pipeline.sync_directory(tmp_path)
    second = pipeline.sync_directory(tmp_path)

    assert first.files == first.indexed_files == 1
    assert first.chunks == first.embedded_chunks == first.upserted_chunks == 2
    assert second.skipped_files == 1
    assert second.embedded_chunks == second.upserted_chunks == 0
    assert embeddings.text_count == 2
    assert pipeline.index.count(TenantScope.public_only(TENANT)) == 2

    records, _ = memory_client.scroll(
        pipeline.index.collection_name,
        limit=10,
        with_payload=True,
    )
    assert len(records) == 2
    required = {
        "tenant",
        "document",
        "version",
        "section",
        "classification",
        "tenant_id",
        "document_id",
        "version_id",
        "chunk_id",
        "page_number",
        "security_level",
        "text",
        "content_hash",
        "source_reference",
        "embedding_fingerprint",
        "point_identity_sha256",
        "indexing_status",
    }
    for record in records:
        assert required <= (record.payload or {}).keys()
        assert record.payload["tenant_id"] == TENANT
        assert record.payload["page_number"] is None
        assert record.payload["indexing_status"] == "ready"
        assert len(record.payload["point_identity_sha256"]) == 64
    assert path.read_text(encoding="utf-8").endswith(BODY)


def test_modified_document_embeds_only_changed_chunk_and_retires_old(
    tmp_path,
    memory_client,
    memory_repository,
):
    path = write_policy(tmp_path, tenant=TENANT, body=BODY)
    embeddings = CountingEmbeddings()
    pipeline = make_pipeline(memory_client, memory_repository, embedding_function=embeddings)
    pipeline.sync_directory(tmp_path)
    old_state = memory_repository.get(
        TENANT,
        pipeline.loader.load(path, source_root=tmp_path).document_id,
    )
    assert old_state is not None

    changed_body = "المادة 1: قاعدة ثابتة.\nالمادة 2: قاعدة معدلة فعلياً."
    write_policy(tmp_path, tenant=TENANT, body=changed_body)
    result = pipeline.sync_directory(tmp_path)
    new_document = pipeline.loader.load(path, source_root=tmp_path)
    new_state = memory_repository.get(TENANT, new_document.document_id)

    assert result.embedded_chunks == 1
    assert result.reused_embeddings == 1
    assert result.retired_chunks == 2
    assert new_state is not None and old_state.version_id != new_state.version_id
    assert pipeline.index.count(TenantScope.public_only(TENANT)) == 2


def test_new_declared_version_preserves_identity_and_reuses_vectors(
    tmp_path,
    memory_client,
    memory_repository,
):
    path = write_policy(tmp_path, tenant=TENANT, body=BODY, version="1.0")
    embeddings = CountingEmbeddings()
    pipeline = make_pipeline(memory_client, memory_repository, embedding_function=embeddings)
    pipeline.sync_directory(tmp_path)
    document_id = pipeline.loader.load(path, source_root=tmp_path).document_id
    first = memory_repository.get(TENANT, document_id)

    write_policy(tmp_path, tenant=TENANT, body=BODY, version="2.0")
    result = pipeline.sync_directory(tmp_path)
    second = memory_repository.get(TENANT, document_id)

    assert first is not None and second is not None
    assert first.document_id == second.document_id
    assert first.version_id != second.version_id
    assert result.embedded_chunks == 0
    assert result.reused_embeddings == 2
    assert result.retired_chunks == 2


def test_chunking_configuration_change_reindexes_without_reembedding_same_chunks(
    tmp_path,
    memory_client,
    memory_repository,
):
    write_policy(tmp_path, tenant=TENANT, body=BODY)
    first_embeddings = CountingEmbeddings()
    first_pipeline = make_pipeline(
        memory_client,
        memory_repository,
        embedding_function=first_embeddings,
        chunk_size=256,
        overlap=32,
    )
    first_pipeline.sync_directory(tmp_path)

    second_embeddings = CountingEmbeddings()
    second_pipeline = make_pipeline(
        memory_client,
        memory_repository,
        embedding_function=second_embeddings,
        chunk_size=300,
        overlap=40,
    )
    result = second_pipeline.sync_directory(tmp_path)
    assert result.indexed_files == 1
    assert result.embedded_chunks == 0
    assert result.reused_embeddings == 2
    assert second_embeddings.text_count == 0
    assert second_pipeline.index.count(TenantScope.public_only(TENANT)) == 2


def test_embedding_configuration_change_forces_fresh_embeddings(
    tmp_path,
    memory_client,
    memory_repository,
):
    write_policy(tmp_path, tenant=TENANT, body=BODY)
    first = make_pipeline(memory_client, memory_repository, model="bge-m3")
    first.sync_directory(tmp_path)

    second_embeddings = CountingEmbeddings()
    second = make_pipeline(
        memory_client,
        memory_repository,
        model="bge-m3-new",
        embedding_function=second_embeddings,
    )
    result = second.sync_directory(tmp_path)
    assert result.embedded_chunks == 2
    assert result.reused_embeddings == 0
    assert result.retired_chunks == 2
    assert second.index.count(TenantScope.public_only(TENANT)) == 2


def test_sqlite_repository_survives_pipeline_restart(tmp_path, memory_client):
    documents = tmp_path / "documents"
    state_path = tmp_path / "state.sqlite3"
    write_policy(documents, tenant=TENANT, body=BODY)
    first_embeddings = CountingEmbeddings()
    first = make_pipeline(
        memory_client,
        SQLiteIngestionRepository(state_path),
        embedding_function=first_embeddings,
    )
    first.sync_directory(documents)

    second_embeddings = CountingEmbeddings()
    second = make_pipeline(
        memory_client,
        SQLiteIngestionRepository(state_path),
        embedding_function=second_embeddings,
    )
    result = second.sync_directory(documents)
    assert result.skipped_files == 1
    assert second_embeddings.text_count == 0


def test_removed_document_requires_explicit_scope_and_is_withdrawn(
    tmp_path,
    memory_client,
    memory_repository,
):
    first_path = write_policy(tmp_path, name="first.txt", tenant=TENANT, body=BODY)
    second_path = write_policy(
        tmp_path,
        name="second.txt",
        tenant=TENANT,
        body="المادة 1: مستند ثان.",
    )
    pipeline = make_pipeline(memory_client, memory_repository)
    pipeline.sync_directory(tmp_path)
    removed_id = pipeline.loader.load(second_path, source_root=tmp_path).document_id
    assert pipeline.index.count(TenantScope.public_only(TENANT)) == 3

    second_path.unlink()
    result = pipeline.sync_directory(
        tmp_path,
        retire_missing=True,
        authorized_tenants=frozenset({TENANT}),
    )
    removed_state = memory_repository.get(TENANT, removed_id)
    assert result.retired_files == 1
    assert result.retired_chunks == 1
    assert removed_state is not None and removed_state.status == "withdrawn"
    assert pipeline.index.count(TenantScope.public_only(TENANT)) == 2
    assert first_path.exists()


def test_explicit_empty_scope_can_withdraw_all_documents(
    tmp_path,
    memory_client,
    memory_repository,
):
    path = write_policy(tmp_path, tenant=TENANT, body=BODY)
    pipeline = make_pipeline(memory_client, memory_repository)
    pipeline.sync_directory(tmp_path)
    path.unlink()

    result = pipeline.sync_directory(
        tmp_path,
        retire_missing=True,
        authorized_tenants=frozenset({TENANT}),
    )
    assert result.files == 0
    assert result.retired_files == 1
    assert result.retired_chunks == 2
    assert pipeline.index.count(TenantScope.public_only(TENANT)) == 0


def test_security_classification_change_retires_old_classification_generation(
    tmp_path,
    memory_client,
    memory_repository,
):
    write_policy(tmp_path, tenant=TENANT, classification="داخلي", body=BODY)
    pipeline = make_pipeline(memory_client, memory_repository)
    pipeline.sync_directory(tmp_path)

    write_policy(tmp_path, tenant=TENANT, classification="عام", body=BODY)
    result = pipeline.sync_directory(tmp_path)
    assert result.embedded_chunks == 0
    assert result.reused_embeddings == 2
    assert result.retired_chunks == 2
    assert pipeline.index.count(TenantScope.public_only(TENANT)) == 2
    assert pipeline.index.count(TenantScope.trusted_all(TENANT)) == 2


def test_missing_retirement_scope_or_directory_never_deletes_valid_vectors(
    tmp_path,
    memory_client,
    memory_repository,
):
    documents = tmp_path / "documents"
    write_policy(documents, tenant=TENANT, body=BODY)
    pipeline = make_pipeline(memory_client, memory_repository)
    pipeline.sync_directory(documents)
    scope = TenantScope.public_only(TENANT)

    with pytest.raises(TenantScopeError, match="نطاق مؤسسات"):
        pipeline.sync_directory(documents, retire_missing=True)
    with pytest.raises(InvalidDocumentPathError):
        pipeline.sync_directory(
            tmp_path / "unavailable",
            retire_missing=True,
            authorized_tenants=frozenset({TENANT}),
        )
    assert pipeline.index.count(scope) == 2


def test_missing_document_is_not_retired_without_explicit_flag(
    tmp_path,
    memory_client,
    memory_repository,
):
    write_policy(tmp_path, name="one.txt", tenant=TENANT, body=BODY)
    removed = write_policy(
        tmp_path,
        name="two.txt",
        tenant=TENANT,
        body="المادة 1: باقٍ تاريخياً.",
    )
    pipeline = make_pipeline(memory_client, memory_repository)
    pipeline.sync_directory(tmp_path)
    removed.unlink()
    pipeline.sync_directory(tmp_path)
    assert pipeline.index.count(TenantScope.public_only(TENANT)) == 3


@pytest.mark.parametrize(
    ("size", "distance"),
    [
        (8, qmodels.Distance.COSINE),
        (TEST_DIMENSIONS, qmodels.Distance.DOT),
    ],
)
def test_incompatible_collection_is_reported_without_recreation(
    tmp_path,
    memory_client,
    memory_repository,
    size,
    distance,
):
    memory_client.create_collection(
        "bayan_policies",
        vectors_config=qmodels.VectorParams(size=size, distance=distance),
    )
    write_policy(tmp_path, tenant=TENANT)
    pipeline = make_pipeline(memory_client, memory_repository)
    with pytest.raises(CollectionConfigurationError):
        pipeline.sync_directory(tmp_path)
    vectors = memory_client.get_collection("bayan_policies").config.params.vectors
    assert vectors.size == size
    assert vectors.distance == distance


def test_partial_upsert_failure_keeps_previous_ready_generation(
    tmp_path,
    memory_client,
    memory_repository,
    monkeypatch,
):
    body = "\n".join(f"المادة {index}: نص {index}." for index in range(1, 6))
    write_policy(tmp_path, tenant=TENANT, body=body)
    pipeline = make_pipeline(memory_client, memory_repository)
    pipeline.sync_directory(tmp_path)
    scope = TenantScope.public_only(TENANT)
    assert pipeline.index.count(scope) == 5

    changed = body.replace("نص 5", "نص خامس معدل")
    write_policy(tmp_path, tenant=TENANT, body=changed)
    original_upsert = memory_client.upsert
    calls = 0

    def fail_second_batch(*args, **kwargs):
        nonlocal calls
        calls += 1
        if calls == 2:
            raise RuntimeError("simulated interruption")
        return original_upsert(*args, **kwargs)

    monkeypatch.setattr(memory_client, "upsert", fail_second_batch)
    with pytest.raises(QdrantOperationError):
        pipeline.sync_directory(tmp_path)
    assert pipeline.index.count(scope) == 5


def test_repository_failure_cleans_staged_points_and_keeps_old_generation(
    tmp_path,
    memory_client,
    memory_repository,
):
    class FailingRepository:
        def __init__(self, delegate):
            self.delegate = delegate
            self.fail = False

        def get(self, tenant_id, document_id):
            return self.delegate.get(tenant_id, document_id)

        def save_indexed(self, state):
            if self.fail:
                raise RepositoryError("simulated persistence failure")
            self.delegate.save_indexed(state)

        def list_by_source_directory(self, source_directory, tenant_ids):
            return self.delegate.list_by_source_directory(source_directory, tenant_ids)

        def mark_withdrawn(self, tenant_id, document_id):
            self.delegate.mark_withdrawn(tenant_id, document_id)

    repository = FailingRepository(memory_repository)
    write_policy(tmp_path, tenant=TENANT, body=BODY)
    pipeline = make_pipeline(memory_client, repository)
    pipeline.sync_directory(tmp_path)
    scope = TenantScope.public_only(TENANT)

    write_policy(tmp_path, tenant=TENANT, body=BODY.replace("للتعديل", "معدلة"))
    repository.fail = True
    with pytest.raises(RepositoryError):
        pipeline.sync_directory(tmp_path)
    assert pipeline.index.count(scope) == 2


def test_interrupted_retirement_is_reconciled_on_retry(
    tmp_path,
    memory_client,
    memory_repository,
    monkeypatch,
):
    write_policy(tmp_path, tenant=TENANT, body=BODY)
    pipeline = make_pipeline(memory_client, memory_repository)
    pipeline.sync_directory(tmp_path)
    write_policy(tmp_path, tenant=TENANT, body=BODY.replace("للتعديل", "معدلة"))
    original_delete = memory_client.delete

    def fail_delete(*_args, **_kwargs):
        raise RuntimeError("simulated delete interruption")

    monkeypatch.setattr(memory_client, "delete", fail_delete)
    with pytest.raises(QdrantOperationError):
        pipeline.sync_directory(tmp_path)
    # الجديد صار المرجع الحالي والقديم لم يُمح؛ لا نجاح زائف أُعيد للمنادي.
    assert pipeline.index.count(TenantScope.public_only(TENANT)) == 4

    monkeypatch.setattr(memory_client, "delete", original_delete)
    recovered = pipeline.sync_directory(tmp_path)
    assert recovered.skipped_files == 1
    assert recovered.retired_chunks == 2
    assert pipeline.index.count(TenantScope.public_only(TENANT)) == 2


def test_search_returns_repository_text_after_qdrant_payload_tampering(
    tmp_path,
    memory_client,
    memory_repository,
):
    write_policy(tmp_path, tenant=TENANT, body=BODY)
    pipeline = make_pipeline(memory_client, memory_repository)
    pipeline.sync_directory(tmp_path)
    scope = TenantScope.public_only(TENANT)
    original = pipeline.search(scope, "قاعدة ثابتة", top_k=1)[0]

    memory_client.set_payload(
        collection_name=pipeline.index.collection_name,
        payload={
            "text": "نص مزيف لم يصدر عن المستودع",
            "content": "نص مزيف لم يصدر عن المستودع",
            "section": "مادة مزيفة",
            "content_hash": "0" * 64,
            "point_identity_sha256": "0" * 64,
            "marker": "keep-extension",
        },
        points=[original.point_id],
    )

    repaired = pipeline.search(scope, "قاعدة ثابتة", top_k=1)[0]
    assert repaired.point_id == original.point_id
    assert repaired.payload["text"] == original.payload["text"]
    assert repaired.payload["content"] == original.payload["content"]
    assert repaired.payload["section"] == original.payload["section"]
    assert repaired.payload["content_hash"] == original.payload["content_hash"]
    assert repaired.payload["point_identity_sha256"] == original.payload["point_identity_sha256"]
    assert repaired.payload["marker"] == "keep-extension"


def test_public_search_skips_stale_public_copy_of_internal_document(
    tmp_path,
    memory_client,
    memory_repository,
):
    write_policy(tmp_path, tenant=TENANT, classification="داخلي", body=BODY)
    pipeline = make_pipeline(memory_client, memory_repository)
    pipeline.sync_directory(tmp_path)
    trusted = TenantScope.trusted_all(TENANT)
    hit = pipeline.search(trusted, "قاعدة ثابتة", top_k=1)[0]

    # محاكاة بقايا Qdrant قديمة تقول إن المقطع عام بينما المستودع يقول داخلي.
    memory_client.set_payload(
        collection_name=pipeline.index.collection_name,
        payload={"security_level": "عام", "classification": "عام"},
        points=[hit.point_id],
    )

    assert pipeline.search(TenantScope.public_only(TENANT), "قاعدة ثابتة", top_k=5) == []
    trusted_hits = pipeline.search(trusted, "قاعدة ثابتة", top_k=5)
    assert trusted_hits
    assert trusted_hits[0].payload["security_level"] == "داخلي"
    assert trusted_hits[0].payload["classification"] == "داخلي"


def test_failed_classification_downgrade_retirement_is_completed_on_retry(
    tmp_path,
    memory_client,
    memory_repository,
    monkeypatch,
):
    write_policy(tmp_path, tenant=TENANT, classification="داخلي", body=BODY)
    pipeline = make_pipeline(memory_client, memory_repository)
    pipeline.sync_directory(tmp_path)
    trusted = TenantScope.trusted_all(TENANT)
    assert pipeline.index.count(trusted) == 2
    assert pipeline.index.count(TenantScope.public_only(TENANT)) == 0

    write_policy(tmp_path, tenant=TENANT, classification="عام", body=BODY)
    original_delete = memory_client.delete

    def fail_delete(*_args, **_kwargs):
        raise RuntimeError("simulated classification retirement interruption")

    monkeypatch.setattr(memory_client, "delete", fail_delete)
    with pytest.raises(QdrantOperationError):
        pipeline.sync_directory(tmp_path)

    # الجيل الجديد العام مرجعي وآمن، والنسخة الداخلية القديمة بقيت للتقاعد.
    assert pipeline.index.count(trusted) == 4
    public_hits = pipeline.search(TenantScope.public_only(TENANT), "قاعدة ثابتة", top_k=10)
    assert public_hits
    assert {hit.payload["security_level"] for hit in public_hits} == {"عام"}

    monkeypatch.setattr(memory_client, "delete", original_delete)
    recovered = pipeline.sync_directory(tmp_path)
    assert recovered.skipped_files == 1
    assert recovered.retired_chunks == 2
    assert pipeline.index.count(trusted) == 2
    assert pipeline.index.count(TenantScope.public_only(TENANT)) == 2


def test_withdraw_removes_every_classification_residue_of_same_document(
    tmp_path,
    memory_client,
    memory_repository,
):
    path = write_policy(tmp_path, tenant=TENANT, body=BODY)
    pipeline = make_pipeline(memory_client, memory_repository)
    pipeline.sync_directory(tmp_path)
    document = pipeline.loader.load(path, source_root=tmp_path)
    hit = pipeline.search(TenantScope.public_only(TENANT), "قاعدة ثابتة", top_k=1)[0]

    # بقايا تصنيف غير معروف لا يطابق أي سياق بحث، لكنها ما تزال حمولة للمستند.
    memory_client.set_payload(
        collection_name=pipeline.index.collection_name,
        payload={"security_level": "تصنيف-قديم", "classification": "تصنيف-قديم"},
        points=[hit.point_id],
    )

    assert pipeline.withdraw(TenantScope.public_only(TENANT), document.document_id) == 2
    records, _ = memory_client.scroll(pipeline.index.collection_name, limit=10)
    assert records == []
    state = memory_repository.get(TENANT, document.document_id)
    assert state is not None and state.status == "withdrawn"


def test_repeated_retire_missing_does_not_recount_withdrawn_documents(
    tmp_path,
    memory_client,
    memory_repository,
):
    write_policy(tmp_path, name="first.txt", tenant=TENANT, body=BODY)
    removed = write_policy(
        tmp_path,
        name="second.txt",
        tenant=TENANT,
        body="المادة 1: مستند سيُسحب.",
    )
    pipeline = make_pipeline(memory_client, memory_repository)
    pipeline.sync_directory(tmp_path)
    removed.unlink()

    first = pipeline.sync_directory(
        tmp_path,
        retire_missing=True,
        authorized_tenants=frozenset({TENANT}),
    )
    second = pipeline.sync_directory(
        tmp_path,
        retire_missing=True,
        authorized_tenants=frozenset({TENANT}),
    )

    assert first.retired_files == 1
    assert first.retired_chunks == 1
    assert second.retired_files == 0
    assert second.retired_chunks == 0
    assert pipeline.index.count(TenantScope.public_only(TENANT)) == 2
