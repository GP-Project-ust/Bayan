"""مهايئ Catalog v2 الدلالي خلف العقد الرسمي المجمد ``get_catalog(allowed_views=None)``."""

from __future__ import annotations

from typing import Sequence

from app.agents.sql_catalog import CatalogEntry
from app.services.onboarding.indexing.repository import SemanticIndexRepository

from .builder import LEGACY_VIEW_ORDER, semantic_entry_to_catalog_entry, sort_catalog_entries
from .models import CatalogBuildOptions


class SemanticCatalogV2Provider:
    """مزود Catalog v2 الذي يقرأ المشاهد المعتمدة من pgvector ويرجع أصناف العقد المجمد."""

    def __init__(
        self,
        *,
        repository: SemanticIndexRepository,
        options: CatalogBuildOptions,
    ):
        self._repository = repository
        self._options = options

    def get_catalog(self, allowed_views: list[str] | None = None) -> list[CatalogEntry]:
        """نفس التوقيع وضمانات العقد المجمد لـ ``app.agents.sql_catalog.get_catalog``.

        - يعرض المشاهد (``entry_type == 'view'``) حصراً؛ لا يعرض الجداول الفيزيائية أبداً.
        - ``allowed_views is None`` يعيد كل المشاهد النشطة المخوّلة بترتيب ثابت.
        - ``allowed_views == []`` يعيد قائمة فارغة.
        - الأسماء غير المعروفة تُتجاهل بصمت دون رفع خطأ.
        """
        if allowed_views is not None and len(allowed_views) == 0:
            return []

        active_views = self._repository.list_active_views(
            tenant_id=self._options.tenant_id,
            source_id=self._options.source_id,
            allowed_views=allowed_views,
        )
        entries = [
            semantic_entry_to_catalog_entry(
                item,
                source_label=self._options.source_label,
            )
            for item in active_views
        ]
        ordered = sort_catalog_entries(
            entries,
            preferred_order=self._options.preferred_view_order or LEGACY_VIEW_ORDER,
        )
        if allowed_views is None:
            return ordered
        allowed_set = set(allowed_views)
        return [entry for entry in ordered if entry.view in allowed_set]


def filter_catalog_entries(
    entries: Sequence[CatalogEntry],
    allowed_views: list[str] | None = None,
) -> list[CatalogEntry]:
    """مساعد حتمي لتطبيق فلترة ``allowed_views`` بنفس ضمانات العقد الرسمي."""
    if allowed_views is None:
        return list(entries)
    allowed_set = set(allowed_views)
    return [entry for entry in entries if entry.view in allowed_set]
