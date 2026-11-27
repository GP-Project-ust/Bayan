"""نماذج الفهرس الدلالي المهيكلة (المراحل: الاستخراج -> التضمين -> التخزين -> الاسترجاع)."""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any, Literal

SemanticEntryType = Literal["table", "view", "column", "relationship", "concept"]

_FORBIDDEN_INDEX_KEYS = (
    "sql",
    "sql_query",
    "expected_sql",
    "view_definition",
    "select_sql",
    "password",
    "dsn",
    "conninfo",
    "secret",
)
_SQL_EXECUTABLE_PATTERN = re.compile(
    r"\bCREATE\s+(?:OR\s+REPLACE\s+)?VIEW\b|\bSELECT\b.+\bFROM\b",
    re.IGNORECASE | re.DOTALL,
)


def validate_safe_semantic_payload(
    *,
    searchable_text: str,
    metadata_payload: dict[str, Any],
) -> None:
    """التحقق الصارم من خلو مدخلات الفهرس من قوالب SQL التنفيذية وكلمات المرور."""
    if _SQL_EXECUTABLE_PATTERN.search(searchable_text):
        raise ValueError("يُحظر تخزين عبارات SQL تنفيذية داخل الفهرس الدلالي.")
    lowered_text = searchable_text.lower()
    if "postgresql://" in lowered_text or "password=" in lowered_text:
        raise ValueError("يُحظر تخزين سلاسل اتصال أو كلمات مرور داخل الفهرس الدلالي.")
    for key in metadata_payload:
        lowered_key = str(key).lower()
        if any(bad == lowered_key or bad in lowered_key for bad in _FORBIDDEN_INDEX_KEYS):
            raise ValueError(f"حقل غير مسموح داخل الفهرس الدلالي: {key}")


@dataclass(frozen=True)
class SemanticEntry:
    """وحدة فهرس دلالي واحدة خالية من SQL التنفيذي وسجلات الأعمال والأسرار."""

    entry_id: str
    tenant_id: str
    source_id: str
    schema_name: str
    schema_qualified_name: str
    object_ref: str
    entry_type: SemanticEntryType
    technical_name: str
    label_ar: str
    description_ar: str
    description_source: str
    classification: str
    concepts: tuple[str, ...]
    synonyms: tuple[str, ...]
    searchable_text: str
    metadata_payload: dict[str, Any]
    metadata_fingerprint: str
    content_hash: str
    embedding_config_id: str
    catalog_version: str
    rules_version: str
    indexing_state: Literal["indexed", "retired"] = "indexed"


@dataclass(frozen=True)
class ExistingEntryState:
    """حالة سجل موجود مسبقاً لتحديد التخطي أو التحديث التزايدي."""

    entry_id: str
    content_hash: str
    embedding_config_id: str
    indexing_state: str
    metadata_fingerprint: str


@dataclass(frozen=True)
class IndexedRecord:
    """سجل كامل جاهز للحفظ المعاملاتي مع متجه pgvector."""

    entry: SemanticEntry
    embedding: tuple[float, ...]


@dataclass(frozen=True)
class SemanticSearchResult:
    """نتيجة استرجاع دلالي مفلترة ومقيدة بنطاق المستأجر والمصدر."""

    entry_id: str
    tenant_id: str
    source_id: str
    entry_type: SemanticEntryType
    technical_name: str
    schema_qualified_name: str
    label_ar: str
    description_ar: str
    classification: str
    score: float
    metadata_payload: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class IndexingSummary:
    """ملخص عملية الفهرسة التزايدية لإثبات عدم التكرار والسلامة."""

    tenant_id: str
    source_id: str
    catalog_version: str
    rules_version: str
    embedding_config_id: str
    catalog_fingerprint: str
    structural_fingerprint: str
    inserted: int
    updated: int
    unchanged: int
    retired: int
    embedded_count: int
    reused_vectors: int
    total_active: int
