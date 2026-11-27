"""تركيبات اختبارات الفهرسة المعزولة عن الشبكة."""

from collections.abc import Callable
from pathlib import Path

import pytest
from qdrant_client import QdrantClient

from app.core.qdrant import _mock_vector
from app.services.ingestion.chunker import ArabicDocumentChunker, ChunkingConfig
from app.services.ingestion.embedder import EmbeddingConfig, OfficialEmbeddingService
from app.services.ingestion.indexer import QdrantDocumentIndex
from app.services.ingestion.loader import TxtDocumentLoader
from app.services.ingestion.pipeline import DocumentIngestionPipeline
from app.services.ingestion.repository import InMemoryIngestionRepository

TEST_DIMENSIONS = 16


def write_policy(
    root: Path,
    *,
    name: str = "policy.txt",
    tenant: str = "Tenant A",
    title: str = "لائحة الاختبار",
    version: str = "1.0",
    classification: str = "عام",
    body: str = "المادة 1: نص عربي للاختبار.",
) -> Path:
    """كتابة fixture TXT بالعقد الرسمي دون BOM."""

    root.mkdir(parents=True, exist_ok=True)
    path = root / name
    path.write_text(
        "\n".join(
            [
                f"المستند: {title}",
                f"الإصدار: {version}",
                f"التصنيف: {classification}",
                f"المستأجر: {tenant}",
                "",
                body,
            ]
        ),
        encoding="utf-8",
    )
    return path


class CountingEmbeddings:
    """مضمن mock حتمي يسجل الدفعات والنصوص لأدلة التزايدية."""

    def __init__(self, dimensions: int = TEST_DIMENSIONS) -> None:
        self.dimensions = dimensions
        self.calls: list[list[str]] = []

    @property
    def text_count(self) -> int:
        return sum(len(batch) for batch in self.calls)

    def __call__(self, texts: list[str]) -> list[list[float]]:
        self.calls.append(list(texts))
        return [_mock_vector(text, self.dimensions) for text in texts]


def make_pipeline(
    client: QdrantClient,
    repository: object,
    *,
    embedding_function: Callable[[list[str]], list[list[float]]] | None = None,
    model: str = "bge-m3",
    chunk_size: int = 256,
    overlap: int = 32,
) -> DocumentIngestionPipeline:
    """بناء خط صغير الأبعاد يحافظ على نفس العقود الرسمية."""

    function = embedding_function or CountingEmbeddings()
    embedder = OfficialEmbeddingService(
        config=EmbeddingConfig(
            provider="mock",
            model=model,
            dimensions=TEST_DIMENSIONS,
            batch_size=2,
            max_retries=0,
        ),
        embedding_function=function,
    )
    return DocumentIngestionPipeline(
        loader=TxtDocumentLoader(max_file_size_bytes=64 * 1024),
        chunker=ArabicDocumentChunker(ChunkingConfig(chunk_size=chunk_size, overlap=overlap)),
        embedder=embedder,
        index=QdrantDocumentIndex(
            client,
            dimensions=TEST_DIMENSIONS,
            upsert_batch_size=3,
            max_retries=0,
        ),
        repository=repository,
    )


@pytest.fixture()
def memory_client() -> QdrantClient:
    return QdrantClient(":memory:")


@pytest.fixture()
def memory_repository() -> InMemoryIngestionRepository:
    return InMemoryIngestionRepository()
