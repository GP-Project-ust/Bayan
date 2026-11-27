"""اختبارات التحميل والتطبيع والتقطيع العربي الحتمي."""

import codecs
from pathlib import Path

import pytest

from app.services.ingestion.chunker import ArabicDocumentChunker, ChunkingConfig
from app.services.ingestion.exceptions import (
    DocumentEncodingError,
    DocumentMetadataError,
    DocumentTooLargeError,
    EmptyDocumentError,
    InvalidDocumentPathError,
    UnsupportedDocumentTypeError,
)
from app.services.ingestion.loader import TxtDocumentLoader
from app.services.ingestion.normalizer import normalize_for_embedding
from tests.test_ingestion.conftest import write_policy


def test_loads_utf8_arabic_and_mixed_text(tmp_path):
    path = write_policy(
        tmp_path,
        body="المادة 1: سياسة القبول Admission Policy لعام 2026.",
    )
    loaded = TxtDocumentLoader().load(path, source_root=tmp_path)
    assert "Admission Policy" in loaded.body_text
    assert loaded.metadata.title == "لائحة الاختبار"
    assert loaded.metadata.tenant_id == "Tenant A"
    assert len(loaded.file_hash) == 64
    assert loaded.raw_bytes == path.read_bytes()


def test_loads_optional_utf8_bom(tmp_path):
    path = write_policy(tmp_path)
    original = path.read_bytes()
    path.write_bytes(codecs.BOM_UTF8 + original)
    loaded = TxtDocumentLoader().load(path, source_root=tmp_path)
    assert loaded.source_text.startswith("المستند:")
    assert loaded.raw_bytes.startswith(codecs.BOM_UTF8)


@pytest.mark.parametrize("content", [b"", "   \n\n".encode()])
def test_rejects_empty_content(tmp_path, content):
    path = tmp_path / "empty.txt"
    path.write_bytes(content)
    with pytest.raises(EmptyDocumentError):
        TxtDocumentLoader().load(path, source_root=tmp_path)


def test_rejects_header_without_body(tmp_path):
    path = write_policy(tmp_path, body="   ")
    with pytest.raises(EmptyDocumentError):
        TxtDocumentLoader().load(path, source_root=tmp_path)


def test_rejects_invalid_utf8(tmp_path):
    path = tmp_path / "invalid.txt"
    path.write_bytes(b"\xff\xfe\x00\x80")
    with pytest.raises(DocumentEncodingError):
        TxtDocumentLoader().load(path, source_root=tmp_path)


def test_rejects_unsupported_extension(tmp_path):
    path = tmp_path / "policy.pdf"
    path.write_text("not a pdf", encoding="utf-8")
    with pytest.raises(UnsupportedDocumentTypeError):
        TxtDocumentLoader().load(path, source_root=tmp_path)


def test_rejects_missing_file(tmp_path):
    with pytest.raises(InvalidDocumentPathError):
        TxtDocumentLoader().load("missing.txt", source_root=tmp_path)


def test_blocks_path_traversal(tmp_path):
    root = tmp_path / "allowed"
    root.mkdir()
    outside = write_policy(tmp_path / "outside")
    with pytest.raises(InvalidDocumentPathError):
        TxtDocumentLoader().load(outside, source_root=root)
    with pytest.raises(InvalidDocumentPathError):
        TxtDocumentLoader().load(Path("..") / "outside" / outside.name, source_root=root)


def test_enforces_file_size_before_decode(tmp_path):
    path = write_policy(tmp_path, body="س" * 100)
    with pytest.raises(DocumentTooLargeError):
        TxtDocumentLoader(max_file_size_bytes=20).load(path, source_root=tmp_path)


def test_rejects_missing_or_unknown_metadata(tmp_path):
    missing = tmp_path / "missing.txt"
    missing.write_text("المستند: أ\nالإصدار: 1\n\nالمادة 1: نص", encoding="utf-8")
    with pytest.raises(DocumentMetadataError):
        TxtDocumentLoader().load(missing, source_root=tmp_path)

    unknown = write_policy(tmp_path, name="unknown.txt", classification="فائق السرية")
    with pytest.raises(DocumentMetadataError):
        TxtDocumentLoader().load(unknown, source_root=tmp_path)


def test_normalization_is_stable_and_non_destructive():
    source = "المَادَّة  ١:\tحُقوق الطالب\r\n\r\n\r\nSection 2:  Fees"
    first = normalize_for_embedding(source)
    second = normalize_for_embedding(first)
    assert first == second
    assert "المَادَّة ١" in first
    assert "حُقوق" in first
    assert "\n\n" in first
    assert "Section 2" in first


def test_original_text_is_preserved_while_embedding_text_is_normalized(tmp_path):
    body = "المادة 1:  نصٌّ  قانوني\tمختلط."
    path = write_policy(tmp_path, body=body)
    document = TxtDocumentLoader().load(path, source_root=tmp_path)
    chunk = ArabicDocumentChunker().chunk(document)[0]
    assert chunk.content == body
    assert chunk.normalized_content != chunk.content
    assert document.source_text[chunk.start_offset : chunk.end_offset] == chunk.content


def test_chunking_preserves_articles_order_and_source_offsets(tmp_path):
    body = "\n".join(
        [
            "المادة 1: الشرط الأول.",
            "المادة 2: الشرط الثاني.",
            "المادة 3: Third condition بالعربية.",
        ]
    )
    document = TxtDocumentLoader().load(
        write_policy(tmp_path, body=body),
        source_root=tmp_path,
    )
    chunker = ArabicDocumentChunker(ChunkingConfig(chunk_size=128, overlap=16))
    first = chunker.chunk(document)
    second = chunker.chunk(document)
    assert first == second
    assert [chunk.chunk_no for chunk in first] == [0, 1, 2]
    assert [chunk.article_id for chunk in first] == ["المادة 1", "المادة 2", "المادة 3"]
    assert all(chunk.content.strip() for chunk in first)
    for chunk in first:
        assert document.source_text[chunk.start_offset : chunk.end_offset] == chunk.content


def test_long_paragraph_is_split_with_overlap_and_no_empty_chunks(tmp_path):
    sentence = "هذه جملة قانونية طويلة تحفظ المعنى ولا تحذف المصطلحات المهمة. "
    document = TxtDocumentLoader().load(
        write_policy(tmp_path, body="المادة 1: " + sentence * 12),
        source_root=tmp_path,
    )
    chunks = ArabicDocumentChunker(ChunkingConfig(chunk_size=120, overlap=24)).chunk(document)
    assert len(chunks) > 2
    assert all(0 < len(chunk.content) <= 120 for chunk in chunks)
    assert all(chunk.article_id == "المادة 1" for chunk in chunks)
    assert chunks[0].end_offset > chunks[1].start_offset


def test_repeated_identical_articles_have_distinct_position_identities(tmp_path):
    body = "المادة 1: النص نفسه.\nالمادة 2: النص نفسه."
    document = TxtDocumentLoader().load(
        write_policy(tmp_path, body=body),
        source_root=tmp_path,
    )
    chunks = ArabicDocumentChunker().chunk(document)
    assert chunks[0].content_hash != chunks[1].content_hash  # العنوان جزء من الاستشهاد
    assert chunks[0].chunk_id != chunks[1].chunk_id


def test_chunk_configuration_changes_fingerprint():
    first = ChunkingConfig(chunk_size=500, overlap=50)
    second = ChunkingConfig(chunk_size=500, overlap=40)
    assert first.fingerprint != second.fingerprint


def test_crlf_paragraph_gaps_are_split_without_merging(tmp_path):
    """فواصل CRLF يجب أن تفصل الفقرات كما تفعل LF تماماً."""

    body = (
        "الفقرة الأولى: نص أول.\r\n\r\n"
        "الفقرة الثانية: نص ثان.\r\n\r\n"
        "الفقرة الثالثة: نص ثالث."
    )
    path = tmp_path / "crlf.txt"
    path.write_bytes(
        (
            "المستند: لائحة CRLF\r\n"
            "الإصدار: 1.0\r\n"
            "التصنيف: عام\r\n"
            "المستأجر: Tenant A\r\n\r\n"
            f"{body}"
        ).encode("utf-8")
    )
    document = TxtDocumentLoader().load(path, source_root=tmp_path)
    chunks = ArabicDocumentChunker(ChunkingConfig(chunk_size=1200, overlap=120)).chunk(document)
    assert [chunk.content for chunk in chunks] == [
        "الفقرة الأولى: نص أول.",
        "الفقرة الثانية: نص ثان.",
        "الفقرة الثالثة: نص ثالث.",
    ]
    assert all("\r" not in chunk.content for chunk in chunks)
