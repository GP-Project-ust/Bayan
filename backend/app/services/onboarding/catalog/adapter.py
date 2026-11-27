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
        if not str(options.tenant_id or "").strip():
            raise ValueError("tenant_id إلزامي لمزود Catalog v2.")
        self._repository = repository
        self._options = options

    def get_catalog(self, allowed_views: list[str] | None = None) -> list[CatalogEntry]:
        """نفس التوقيع وضمانات العقد المجمد لـ ``app.agents.sql_catalog.get_catalog``.

        - يعرض المشاهد (``entry_type == 'view'``) حصراً؛ لا يعرض الجداول الفيزيائية أبداً.
        - يتقاطع دائماً مع ``options.allowed_views_scope`` و``options.allowed_classifications``.
        - ``allowed_views is None`` يعيد كل المشاهد النشطة المخوّلة بترتيب ثابت.
        - ``allowed_views == []`` يعيد قائمة فارغة.
        - الأسماء غير المعروفة تُتجاهل بصمت دون رفع خطأ.
        """
        scope = self._options.allowed_views_scope
        if allowed_views is not None and len(allowed_views) == 0:
            return []
        if scope is not None and len(scope) == 0:
            return []

        if scope is not None and allowed_views is not None:
            scope_set = set(scope)
            effective_views: list[str] | None = [v for v in allowed_views if v in scope_set]
            if not effective_views:
                return []
        elif scope is not None:
            effective_views = list(scope)
        else:
            effective_views = list(allowed_views) if allowed_views is not None else None

        active_views = self._repository.list_active_views(
            tenant_id=self._options.tenant_id,
            source_id=self._options.source_id,
            allowed_views=effective_views,
            allowed_classifications=self._options.allowed_classifications,
        )
        allowed_cls_set = (
            {
                str(c).strip().lower()
                for c in self._options.allowed_classifications
                if str(c).strip() and str(c).strip().lower() != "blacklist"
            }
            if self._options.allowed_classifications is not None
            else None
        )
        safe_views = [
            item
            for item in active_views
            if item.tenant_id == self._options.tenant_id
            and (self._options.source_id is None or item.source_id == self._options.source_id)
            and item.entry_type == "view"
            and item.classification.lower() != "blacklist"
            and (allowed_cls_set is None or item.classification.lower() in allowed_cls_set)
        ]
        entries = [
            semantic_entry_to_catalog_entry(
                item,
                source_label=self._options.source_label,
            )
            for item in safe_views
        ]
        ordered = sort_catalog_entries(
            entries,
            preferred_order=self._options.preferred_view_order or LEGACY_VIEW_ORDER,
        )
        if effective_views is None:
            return ordered
        allowed_set = set(effective_views)
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
