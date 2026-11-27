"""اختبار سلبي فعلي لعزل المؤسسات والتصنيف على Qdrant المحلي."""

import pytest

from app.services.ingestion.exceptions import (
    DocumentNotFoundError,
    TenantIsolationError,
    TenantScopeError,
)
from app.services.ingestion.tenant_scope import TenantScope, validate_tenant_id
from tests.test_ingestion.conftest import make_pipeline, write_policy

TENANT_A = "Tenant A"
TENANT_B = "Tenant B"
SHARED_CONTENT = "المادة 1: المحتوى المؤسسي المتطابق لا يجوز أن يعبر حدود المؤسسة."


def _index_two_tenants(tmp_path, memory_client, memory_repository):
    write_policy(
        tmp_path,
        name="tenant-a.txt",
        tenant=TENANT_A,
        title="سياسة مشتركة",
        body=SHARED_CONTENT,
    )
    write_policy(
        tmp_path,
        name="tenant-b.txt",
        tenant=TENANT_B,
        title="سياسة مشتركة",
        body=SHARED_CONTENT,
    )
    pipeline = make_pipeline(memory_client, memory_repository)
    pipeline.sync_directory(tmp_path)
    return pipeline


def test_actual_search_filter_isolates_identical_content_both_directions(
    tmp_path,
    memory_client,
    memory_repository,
):
    pipeline = _index_two_tenants(tmp_path, memory_client, memory_repository)

    hits_a = pipeline.search(
        TenantScope.public_only(TENANT_A),
        "المحتوى المؤسسي المتطابق",
        top_k=10,
    )
    hits_b = pipeline.search(
        TenantScope.public_only(TENANT_B),
        "المحتوى المؤسسي المتطابق",
        top_k=10,
    )

    assert hits_a and hits_b
    assert {hit.payload["tenant_id"] for hit in hits_a} == {TENANT_A}
    assert {hit.payload["tenant_id"] for hit in hits_b} == {TENANT_B}
    assert hits_a[0].payload["document_id"] != hits_b[0].payload["document_id"]
    assert hits_a[0].payload["chunk_id"] != hits_b[0].payload["chunk_id"]


def test_cross_tenant_direct_read_update_and_delete_are_noops(
    tmp_path,
    memory_client,
    memory_repository,
):
    pipeline = _index_two_tenants(tmp_path, memory_client, memory_repository)
    scope_a = TenantScope.public_only(TENANT_A)
    scope_b = TenantScope.public_only(TENANT_B)
    hit_b = pipeline.search(scope_b, "المحتوى المؤسسي", top_k=1)[0]
    point_b = hit_b.point_id

    assert pipeline.index.get_points(scope_a, [point_b]) == []
    assert pipeline.index.update_points_payload(scope_a, [point_b], {"marker": "hacked"}) == 0
    assert pipeline.index.delete_points(scope_a, [point_b]) == 0

    remaining_b = pipeline.index.get_points(scope_b, [point_b])
    assert len(remaining_b) == 1
    assert "marker" not in remaining_b[0]["payload"]
    assert pipeline.index.count(scope_b) == 1


def test_cross_tenant_withdrawal_cannot_discover_or_remove_document(
    tmp_path,
    memory_client,
    memory_repository,
):
    pipeline = _index_two_tenants(tmp_path, memory_client, memory_repository)
    scope_a = TenantScope.public_only(TENANT_A)
    scope_b = TenantScope.public_only(TENANT_B)
    hit_b = pipeline.search(scope_b, "المحتوى", top_k=1)[0]

    with pytest.raises(DocumentNotFoundError):
        pipeline.withdraw(scope_a, hit_b.payload["document_id"])
    assert pipeline.index.count(scope_b) == 1


def test_search_and_statistics_without_scope_fail_closed(
    tmp_path,
    memory_client,
    memory_repository,
):
    pipeline = _index_two_tenants(tmp_path, memory_client, memory_repository)
    vector = pipeline.embedder.embed(["سؤال"])[0]
    with pytest.raises(TenantIsolationError):
        pipeline.index.search(None, vector)  # type: ignore[arg-type]
    with pytest.raises(TenantIsolationError):
        pipeline.index.count(None)  # type: ignore[arg-type]
    with pytest.raises(TenantIsolationError):
        pipeline.search(None, "سؤال")  # type: ignore[arg-type]
    with pytest.raises(TenantScopeError):
        TenantScope.public_only("")


def test_security_classification_filter_is_applied_inside_qdrant(
    tmp_path,
    memory_client,
    memory_repository,
):
    write_policy(
        tmp_path,
        name="public.txt",
        tenant=TENANT_A,
        classification="عام",
        body=SHARED_CONTENT,
    )
    write_policy(
        tmp_path,
        name="internal.txt",
        tenant=TENANT_A,
        classification="داخلي",
        body=SHARED_CONTENT,
    )
    pipeline = make_pipeline(memory_client, memory_repository)
    pipeline.sync_directory(tmp_path)

    public_hits = pipeline.search(
        TenantScope.public_only(TENANT_A),
        "المحتوى المؤسسي",
        top_k=10,
    )
    privileged_hits = pipeline.search(
        TenantScope.trusted_all(TENANT_A),
        "المحتوى المؤسسي",
        top_k=10,
    )
    assert {hit.payload["security_level"] for hit in public_hits} == {"عام"}
    assert {hit.payload["security_level"] for hit in privileged_hits} == {"عام", "داخلي"}


def test_security_fields_cannot_be_changed_through_generic_payload_update(
    tmp_path,
    memory_client,
    memory_repository,
):
    pipeline = _index_two_tenants(tmp_path, memory_client, memory_repository)
    scope = TenantScope.public_only(TENANT_A)
    point_id = pipeline.search(scope, "المحتوى", top_k=1)[0].point_id
    with pytest.raises(TenantIsolationError):
        pipeline.index.update_points_payload(scope, [point_id], {"tenant_id": TENANT_B})
    with pytest.raises(TenantIsolationError):
        pipeline.index.update_points_payload(scope, [point_id], {"security_level": "سري"})


def test_lifecycle_identity_and_text_payload_fields_are_protected(
    tmp_path,
    memory_client,
    memory_repository,
):
    pipeline = _index_two_tenants(tmp_path, memory_client, memory_repository)
    scope = TenantScope.public_only(TENANT_A)
    point_id = pipeline.search(scope, "المحتوى", top_k=1)[0].point_id
    protected_fields = (
        "tenant",
        "document",
        "document_id",
        "version",
        "version_id",
        "section",
        "classification",
        "indexing_status",
        "indexing_key",
        "chunk_id",
        "chunk_no",
        "point_identity_sha256",
        "text",
        "content",
        "content_hash",
        "file_hash",
        "source_reference",
        "start_offset",
        "end_offset",
        "document_status",
        "embedding_fingerprint",
    )
    for field in protected_fields:
        with pytest.raises(TenantIsolationError):
            pipeline.index.update_points_payload(scope, [point_id], {field: "قيمة مزيفة"})
    # الحقول الإضافية غير الحساسة تبقى مسموحة للتوافق.
    assert pipeline.index.update_points_payload(scope, [point_id], {"marker": "ok"}) == 1


@pytest.mark.parametrize(
    "value",
    [
        "Tenant\u200bA",  # zero width space
        "Tenant\u202eA",  # right-to-left override
        "Tenant\nA",  # سطر جديد داخل الهوية
        "Tenant\x00A",  # محرف تحكم
        "\u200f",  # علامة اتجاه وحيدة
    ],
)
def test_tenant_identity_rejects_invisible_or_control_characters(value):
    with pytest.raises(TenantScopeError):
        validate_tenant_id(value)


def test_tenant_identity_normalizes_nfc_and_whitespace():
    assert validate_tenant_id("  مؤسسة   البيان  ") == "مؤسسة البيان"
    assert validate_tenant_id("Cafe\u0301") == "Café"
    assert validate_tenant_id("جامعة\u00a0صنعاء") == "جامعة صنعاء"
    assert validate_tenant_id(" A ") == "A"
