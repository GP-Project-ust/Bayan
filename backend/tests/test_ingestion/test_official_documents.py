"""تحقق تكاملي من اللوائح الخمس الرسمية في database/documents_demo.

هذه الاختبارات تقرأ الملفات الحقيقية وتثبت العقد المقبول في Issue #7:
خمسة مستندات، خمسة وستون مقطعاً، حمولة كاملة، إعادة تشغيل بلا ازدواج،
وعزل مستأجرين وتصنيفات مثبت على Qdrant داخل الذاكرة.
"""

from collections import Counter
from pathlib import Path

import pytest

from app.services.ingestion.chunker import ArabicDocumentChunker
from app.services.ingestion.loader import TxtDocumentLoader
from app.services.ingestion.tenant_scope import TenantScope
from tests.test_ingestion.conftest import CountingEmbeddings, make_pipeline

REPO_ROOT = Path(__file__).resolve().parents[3]
DOCUMENTS_DIR = REPO_ROOT / "database" / "documents_demo"
EXPECTED_CHUNKS = {
    "01_admission_registration.txt": 14,
    "02_fees.txt": 14,
    "03_exams_grades.txt": 12,
    "04_student_affairs.txt": 12,
    "05_graduate_studies.txt": 13,
}
REQUIRED_PAYLOAD_FIELDS = {
    "tenant",
    "document",
    "version",
    "section",
    "classification",
    "text",
    "source_file",
    "tenant_id",
    "document_id",
    "version_id",
    "chunk_id",
    "page_number",
    "security_level",
    "title",
    "document_type",
    "document_status",
    "version_no",
    "chunk_no",
    "content",
    "article_id",
    "start_offset",
    "end_offset",
    "source_reference",
    "file_hash",
    "content_hash",
    "embedding_text_hash",
    "document_identity_sha256",
    "version_identity_sha256",
    "chunk_identity_sha256",
    "point_identity_sha256",
    "chunking_fingerprint",
    "embedding_fingerprint",
    "embedding_provider",
    "embedding_model",
    "embedding_dimensions",
    "indexing_key",
    "indexing_status",
}


def _official_files() -> list[Path]:
    files = sorted(DOCUMENTS_DIR.glob("*.txt"))
    assert [path.name for path in files] == sorted(EXPECTED_CHUNKS), (
        "اللوائح الرسمية الخمس غير موجودة كما هو مطلوب في Issue #7"
    )
    return files


def test_five_official_documents_full_payload_and_idempotent_rerun(
    memory_client,
    memory_repository,
):
    files = _official_files()
    embeddings = CountingEmbeddings()
    pipeline = make_pipeline(
        memory_client,
        memory_repository,
        embedding_function=embeddings,
    )

    first = pipeline.sync_directory(DOCUMENTS_DIR)

    assert first.files == first.indexed_files == 5
    assert first.chunks == first.embedded_chunks == first.upserted_chunks == 65
    assert first.skipped_files == 0
    assert embeddings.text_count == 65

    records, _ = memory_client.scroll(
        pipeline.index.collection_name,
        limit=200,
        with_payload=True,
    )
    assert len(records) == 65
    loaded = {
        path.name: pipeline.loader.load(path, source_root=DOCUMENTS_DIR) for path in files
    }
    documents_by_id = {document.document_id: document for document in loaded.values()}
    chunk_counts: Counter[str] = Counter()
    for record in records:
        payload = record.payload or {}
        assert REQUIRED_PAYLOAD_FIELDS <= payload.keys()
        assert payload["indexing_status"] == "ready"
        assert payload["page_number"] is None
        assert payload["text"] == payload["content"]
        assert payload["tenant"] == payload["tenant_id"]
        assert payload["document"] == payload["title"]
        assert payload["version"] == payload["version_no"]
        assert payload["classification"] == payload["security_level"]
        assert payload["embedding_provider"] == "mock"
        assert payload["embedding_dimensions"] == 16
        for field in (
            "file_hash",
            "content_hash",
            "embedding_text_hash",
            "document_identity_sha256",
            "version_identity_sha256",
            "chunk_identity_sha256",
            "point_identity_sha256",
            "chunking_fingerprint",
            "embedding_fingerprint",
            "indexing_key",
        ):
            assert len(payload[field]) == 64
        assert 0 <= payload["start_offset"] < payload["end_offset"]
        document = documents_by_id[payload["document_id"]]
        assert (
            document.source_text[payload["start_offset"] : payload["end_offset"]]
            == payload["text"]
        )
        chunk_counts[document.source_reference] += 1

    assert dict(chunk_counts) == EXPECTED_CHUNKS

    # عزل المؤسسة والتصنيف مأخوذ من الحالة المرجعية لا من أسماء ملفات.
    states = [
        memory_repository.get(document.metadata.tenant_id, document.document_id)
        for document in loaded.values()
    ]
    assert all(state is not None for state in states)
    tenant_a = loaded["01_admission_registration.txt"].metadata.tenant_id
    tenant_b = loaded["05_graduate_studies.txt"].metadata.tenant_id
    assert tenant_a != tenant_b
    counts = Counter((state.tenant_id, state.security_level) for state in states if state)
    assert counts[(tenant_a, "عام")] == 3
    assert counts[(tenant_a, "داخلي")] == 1
    assert counts[(tenant_b, "عام")] == 1
    chunks_by_tenant = Counter()
    for state in states:
        assert state is not None
        chunks_by_tenant[state.tenant_id] += len(state.chunks)
    assert chunks_by_tenant[tenant_a] == 52
    assert chunks_by_tenant[tenant_b] == 13

    public_a = pipeline.search(
        TenantScope.public_only(tenant_a),
        "الرسوم الدراسية وغرامة التأخير وشروط القبول",
        top_k=20,
    )
    assert public_a
    assert {hit.payload["tenant_id"] for hit in public_a} == {tenant_a}
    assert {hit.payload["security_level"] for hit in public_a} == {"عام"}
    internal_document_id = loaded["04_student_affairs.txt"].document_id
    assert all(hit.payload["document_id"] != internal_document_id for hit in public_a)

    public_b = pipeline.search(
        TenantScope.public_only(tenant_b),
        "شروط القبول والدراسات العليا",
        top_k=20,
    )
    assert public_b
    assert {hit.payload["tenant_id"] for hit in public_b} == {tenant_b}

    embeddings_before_second = embeddings.text_count
    second = pipeline.sync_directory(DOCUMENTS_DIR)
    assert second.files == 5
    assert second.chunks == 65
    assert second.skipped_files == 5
    assert second.indexed_files == 0
    assert second.embedded_chunks == second.upserted_chunks == 0
    assert embeddings.text_count == embeddings_before_second
    assert pipeline.index.count(TenantScope.trusted_all(tenant_a)) == 52
    assert pipeline.index.count(TenantScope.trusted_all(tenant_b)) == 13


def test_official_crlf_sources_have_identical_normalized_chunks(
    official_lf_copies,
):
    loader = TxtDocumentLoader()
    chunker = ArabicDocumentChunker()
    for original_path, lf_path in official_lf_copies:
        original = loader.load(original_path, source_root=DOCUMENTS_DIR)
        converted = loader.load(lf_path, source_root=lf_path.parent)
        original_chunks = chunker.chunk(original)
        converted_chunks = chunker.chunk(converted)
        assert len(original_chunks) == len(converted_chunks)
        assert [chunk.normalized_content for chunk in original_chunks] == [
            chunk.normalized_content for chunk in converted_chunks
        ]
        assert [chunk.section for chunk in original_chunks] == [
            chunk.section for chunk in converted_chunks
        ]
        assert [chunk.article_id for chunk in original_chunks] == [
            chunk.article_id for chunk in converted_chunks
        ]


@pytest.fixture()
def official_lf_copies(tmp_path):
    """كتابة نسخ LF من اللوائح الخمس ومقارنتها بالأصل CRLF."""

    copies = []
    for path in _official_files():
        lf_path = tmp_path / path.name
        lf_path.write_bytes(path.read_bytes().replace(b"\r\n", b"\n"))
        copies.append((path, lf_path))
    return copies
