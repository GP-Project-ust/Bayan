"""منسّق الفهرسة التزايدية والحتمية للبيانات الوصفية في pgvector."""

from __future__ import annotations

from typing import Any, Mapping

from app.services.onboarding.discovery.models import DiscoveryReport

from .builder import SemanticEntryBuilder
from .embedder import OfficialEmbeddingService
from .models import IndexedRecord, IndexingSummary, SemanticEntry
from .repository import SemanticIndexRepository


class SemanticIndexer:
    """فهرسة تزايدية idempotent تحافظ على الحالة السليمة عند الأعطال الجزئية."""

    def __init__(
        self,
        *,
        repository: SemanticIndexRepository,
        embedder: OfficialEmbeddingService | None = None,
        builder: SemanticEntryBuilder | None = None,
    ):
        self.repository = repository
        self.embedder = embedder or OfficialEmbeddingService()
        self.builder = builder or SemanticEntryBuilder()

    def index_report(
        self,
        report: DiscoveryReport,
        *,
        tenant_id: str,
        source_id: str,
        approved_semantics: Mapping[str, Mapping[str, Any]] | None = None,
    ) -> IndexingSummary:
        """بناء وتضمين وحفظ الفهرس الدلالي للمصدر بشكل تزايدي آمن."""
        self.repository.ensure_schema()

        config_id = self.embedder.config_id
        entries = self.builder.build_from_report(
            report,
            tenant_id=tenant_id,
            source_id=source_id,
            embedding_config_id=config_id,
            approved_semantics=approved_semantics,
        )
        existing = self.repository.fetch_existing_states(
            tenant_id=tenant_id,
            source_id=source_id,
        )

        inserted = 0
        updated = 0
        unchanged = 0
        to_embed: list[SemanticEntry] = []

        for entry in entries:
            prev = existing.get(entry.entry_id)
            if prev is None:
                inserted += 1
                to_embed.append(entry)
            elif (
                prev.content_hash == entry.content_hash
                and prev.embedding_config_id == config_id
                and prev.indexing_state == "indexed"
            ):
                unchanged += 1
            else:
                updated += 1
                to_embed.append(entry)

        vectors = self.embedder.embed_texts([e.searchable_text for e in to_embed])
        upserts = [
            IndexedRecord(entry=entry, embedding=vec)
            for entry, vec in zip(to_embed, vectors, strict=True)
        ]

        current_ids = {entry.entry_id for entry in entries}
        retire_ids = sorted(
            entry_id
            for entry_id, state in existing.items()
            if state.indexing_state == "indexed" and entry_id not in current_ids
        )

        self.repository.apply_changes(
            tenant_id=tenant_id,
            source_id=source_id,
            upserts=upserts,
            retire_ids=retire_ids,
        )

        return IndexingSummary(
            tenant_id=tenant_id,
            source_id=source_id,
            catalog_version=self.builder.catalog_version,
            rules_version=report.rules_version,
            embedding_config_id=config_id,
            catalog_fingerprint=report.catalog_fingerprint,
            structural_fingerprint=report.structural_fingerprint,
            inserted=inserted,
            updated=updated,
            unchanged=unchanged,
            retired=len(retire_ids),
            embedded_count=len(to_embed),
            reused_vectors=unchanged,
            total_active=len(entries),
        )
