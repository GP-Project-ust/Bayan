"""نماذج المجال الداخلية لخط تحميل المستندات وفهرستها."""

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

SUPPORTED_SECURITY_LEVELS = frozenset({"عام", "داخلي", "سري"})
PUBLIC_SECURITY_LEVELS = frozenset({"عام"})


@dataclass(frozen=True, slots=True)
class DocumentMetadata:
    """بيانات وصفية موحدة مستخرجة من رأس المستند."""

    tenant_id: str
    title: str
    version_no: str
    security_level: str
    document_type: str = "policy"
    status: str = "active"


@dataclass(frozen=True, slots=True)
class LoadedDocument:
    """مستند TXT محقق مع الاحتفاظ بالنص والبايتات الأصلية."""

    path: Path
    source_root: Path
    source_reference: str
    raw_bytes: bytes
    source_text: str
    body_text: str
    body_start_offset: int
    file_hash: str
    document_id: str
    version_id: str
    metadata: DocumentMetadata


@dataclass(frozen=True, slots=True)
class DocumentChunk:
    """مقطع قابل للاستشهاد بمواضعه في النص الأصلي."""

    chunk_id: str
    chunk_no: int
    content: str
    normalized_content: str
    content_hash: str
    embedding_text_hash: str
    section: str
    article_id: str | None
    start_offset: int
    end_offset: int
    source_reference: str
    page_number: int | None = None


@dataclass(frozen=True, slots=True)
class StoredChunk:
    """مرجع مقطع محفوظ في المستودع العلائقي المؤقت."""

    chunk_id: str
    chunk_no: int
    content: str
    normalized_content: str
    content_hash: str
    embedding_text_hash: str
    section: str
    article_id: str | None
    start_offset: int
    end_offset: int
    source_reference: str
    page_number: int | None
    qdrant_point_id: str
    point_identity_sha256: str


@dataclass(frozen=True, slots=True)
class DocumentState:
    """الحالة المرجعية الحالية مع حقول كيانات الفصل الرابع الثلاثة."""

    document_id: str
    tenant_id: str
    title: str
    document_type: str
    security_level: str
    status: str
    source_path: str
    source_directory: str
    source_reference: str
    version_id: str
    version_no: str
    file_hash: str
    chunking_fingerprint: str
    embedding_fingerprint: str
    indexing_key: str
    indexed_at: str
    chunks: tuple[StoredChunk, ...] = field(default_factory=tuple)


@dataclass(frozen=True, slots=True)
class IndexedPoint:
    """نقطة مكتملة جاهزة للرفع إلى Qdrant."""

    point_id: str
    point_identity_sha256: str
    vector: list[float]
    payload: dict[str, Any]


@dataclass(frozen=True, slots=True)
class SearchHit:
    """نتيجة بحث مستأجرية آمنة."""

    point_id: str
    score: float
    payload: dict[str, Any]


@dataclass(slots=True)
class IngestionStats:
    """عدادات تشغيل متراكمة مع إبقاء عقد files/chunks القديم."""

    files: int = 0
    chunks: int = 0
    indexed_files: int = 0
    skipped_files: int = 0
    retired_files: int = 0
    embedded_chunks: int = 0
    reused_embeddings: int = 0
    upserted_chunks: int = 0
    retired_chunks: int = 0

    def merge(self, other: "IngestionStats") -> None:
        """دمج عدادات نتيجة فرعية في نتيجة المزامنة."""

        for name in self.__dataclass_fields__:
            setattr(self, name, getattr(self, name) + getattr(other, name))

    def as_dict(self) -> dict[str, int]:
        """صيغة JSON مستقرة لنقطة التطوير والتوثيق."""

        return {name: getattr(self, name) for name in self.__dataclass_fields__}
