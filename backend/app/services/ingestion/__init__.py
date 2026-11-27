"""واجهة حزمة فهرسة مستندات BAYAN العامة."""

from app.services.ingestion.chunker import ArabicDocumentChunker, ChunkingConfig
from app.services.ingestion.embedder import EmbeddingConfig, OfficialEmbeddingService
from app.services.ingestion.loader import TxtDocumentLoader
from app.services.ingestion.pipeline import DocumentIngestionPipeline, build_ingestion_pipeline
from app.services.ingestion.repository import (
    IngestionRepository,
    InMemoryIngestionRepository,
    SQLiteIngestionRepository,
)
from app.services.ingestion.tenant_scope import TenantScope

__all__ = [
    "ArabicDocumentChunker",
    "ChunkingConfig",
    "DocumentIngestionPipeline",
    "EmbeddingConfig",
    "InMemoryIngestionRepository",
    "IngestionRepository",
    "OfficialEmbeddingService",
    "SQLiteIngestionRepository",
    "TenantScope",
    "TxtDocumentLoader",
    "build_ingestion_pipeline",
]
