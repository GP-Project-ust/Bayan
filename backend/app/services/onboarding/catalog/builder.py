"""بناء مدخلات العقد الرسمي ``CatalogEntry`` و``CatalogColumn`` من الفهرس الدلالي."""

from __future__ import annotations

from typing import Any, Mapping, Sequence

from app.agents.sql_catalog import CatalogColumn, CatalogEntry
from app.services.onboarding.indexing.models import SemanticEntry

LEGACY_VIEW_ORDER = (
    "v_student_profile",
    "v_fees_summary",
    "v_program_stats",
)


def _normalize_column_type(raw_type: str, ar_type: str | None = None) -> str:
    if ar_type and str(ar_type).strip():
        return str(ar_type).strip()
    dt = str(raw_type or "").lower()
    if any(k in dt for k in ("int", "numeric", "decimal", "real", "double", "float", "money")):
        return "رقم"
    if "bool" in dt:
        return "منطقي"
    if any(k in dt for k in ("date", "time", "interval")):
        return "تاريخ"
    return "نص"


def semantic_entry_to_catalog_entry(
    entry: SemanticEntry,
    *,
    source_label: str = "semantic_v2",
) -> CatalogEntry:
    """إسقاط سجل مشهد دلالي واحد إلى ``CatalogEntry`` المجمد حرفياً."""
    if entry.entry_type != "view":
        raise ValueError("يُمنع تعريض الجداول الفيزيائية أو أي عنصر غير المشاهد عبر كتالوج SQL.")
    if entry.classification == "blacklist":
        raise ValueError("يُمنع إدراج المشاهد المصنفة Blacklist في كتالوج SQL.")

    payload = entry.metadata_payload or {}
    raw_columns: Sequence[Mapping[str, Any]] = payload.get("columns") or ()
    seen_cols: set[str] = set()
    catalog_columns: list[CatalogColumn] = []
    for col in raw_columns:
        col_name = str(col.get("name") or "").strip()
        if not col_name or col_name in seen_cols:
            continue
        seen_cols.add(col_name)
        col_type = _normalize_column_type(
            str(col.get("data_type") or ""),
            col.get("ar_type"),
        )
        col_desc = str(col.get("description_ar") or col.get("label_ar") or col_name).strip()
        catalog_columns.append(
            CatalogColumn(
                name=col_name,
                type=col_type,
                description=col_desc,
            )
        )

    if not catalog_columns:
        raise ValueError(f"المشهد {entry.technical_name} لا يحتوي على أعمدة قابلة للعرض.")

    concepts = tuple(
        c.strip()
        for c in (
            *(entry.concepts or ()),
            *(entry.synonyms or ()),
            entry.label_ar,
            entry.technical_name,
        )
        if str(c).strip()
    )
    concepts = tuple(dict.fromkeys(concepts)) or (entry.technical_name,)

    description = entry.description_ar.strip() or entry.label_ar.strip() or entry.technical_name
    return CatalogEntry(
        view=entry.technical_name,
        description=description,
        columns=tuple(catalog_columns),
        concepts=concepts,
        source=source_label,
    )


def sort_catalog_entries(
    entries: Sequence[CatalogEntry],
    *,
    preferred_order: Sequence[str] = LEGACY_VIEW_ORDER,
) -> list[CatalogEntry]:
    """ترتيب حتمي ثابت: المشاهد المرجعية أولاً بترتيبها ثم بقية المشاهد أبجدياً."""
    rank = {name: idx for idx, name in enumerate(preferred_order)}
    return sorted(
        entries,
        key=lambda e: (rank.get(e.view, len(rank)), e.view),
    )
