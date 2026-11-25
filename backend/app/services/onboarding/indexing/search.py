"""خدمة البحث الدلالي فوق بيانات المخطط المخزنة (دون توليد أو تنفيذ SQL)."""

from __future__ import annotations

from typing import Sequence

from .embedder import OfficialEmbeddingService
from .models import SemanticSearchResult
from .repository import SemanticIndexRepository


class SemanticSearchService:
    """استرجاع دلالي مقيد بسياق المستأجر ونطاق المصدر والمشاهد المسموحة."""

    def __init__(
        self,
        *,
        repository: SemanticIndexRepository,
        embedder: OfficialEmbeddingService | None = None,
    ):
        self.repository = repository
        self.embedder = embedder or OfficialEmbeddingService()

    def search(
        self,
        query: str,
        *,
        tenant_id: str,
        source_ids: Sequence[str] | None = None,
        allowed_views: Sequence[str] | None = None,
        allowed_classifications: Sequence[str] | None = None,
        entry_types: Sequence[str] | None = None,
        limit: int = 10,
    ) -> list[SemanticSearchResult]:
        if not tenant_id.strip():
            raise ValueError("يُمنع البحث الدلالي دون سياق مستأجر مصرح به (tenant_id).")
        cleaned = " ".join(str(query or "").split())
        if not cleaned:
            raise ValueError("استعلام البحث الدلالي فارغ.")
        bounded_limit = max(1, min(int(limit), 50))
        query_vector = self.embedder.embed_texts([cleaned])[0]
        return self.repository.search(
            query_vector,
            tenant_id=tenant_id,
            source_ids=source_ids,
            allowed_views=allowed_views,
            allowed_classifications=allowed_classifications,
            entry_types=entry_types,
            limit=bounded_limit,
        )
