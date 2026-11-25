"""حزمة الفهرس الدلالي لطبقة التهيئة فوق pgvector ومصنع التضمين الرسمي."""

from .builder import DEFAULT_CATALOG_VERSION, DEFAULT_SPRINT1_CLASSIFICATION, SemanticEntryBuilder
from .embedder import OfficialEmbeddingService
from .fingerprints import build_embedding_config_id, entry_content_hash, semantic_entry_id
from .indexer import SemanticIndexer
from .models import (
    ExistingEntryState,
    IndexedRecord,
    IndexingSummary,
    SemanticEntry,
    SemanticEntryType,
    SemanticSearchResult,
    validate_safe_semantic_payload,
)
from .repository import (
    InMemorySemanticRepository,
    PgVectorSemanticRepository,
    SemanticIndexRepository,
)
from .search import SemanticSearchService

__all__ = [
    "DEFAULT_CATALOG_VERSION",
    "DEFAULT_SPRINT1_CLASSIFICATION",
    "ExistingEntryState",
    "InMemorySemanticRepository",
    "IndexedRecord",
    "IndexingSummary",
    "OfficialEmbeddingService",
    "PgVectorSemanticRepository",
    "SemanticEntry",
    "SemanticEntryBuilder",
    "SemanticEntryType",
    "SemanticIndexRepository",
    "SemanticIndexer",
    "SemanticSearchResult",
    "SemanticSearchService",
    "build_embedding_config_id",
    "entry_content_hash",
    "semantic_entry_id",
    "validate_safe_semantic_payload",
]
