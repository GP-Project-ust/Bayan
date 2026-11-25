"""نماذج غلاف Catalog v2 الداخلية المولدة من الفهرس الدلالي (خلف العقد المجمد)."""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class CatalogBuildOptions:
    """خيارات إسقاط المشاهد المصرح بها نحو أنواع العقد الرسمي."""

    tenant_id: str
    source_id: str | None = None
    preferred_view_order: tuple[str, ...] = (
        "v_student_profile",
        "v_fees_summary",
        "v_program_stats",
        "v_student_financial_status",
        "v_program_financial_summary",
    )
    source_label: str = "semantic_v2"


@dataclass(frozen=True)
class CatalogBuildSummary:
    """ملخص تشخيصي غير مدمّر للكتالوج (لا يغيّر نوع الإرجاع لـ ``get_catalog``)."""

    tenant_id: str
    source_id: str | None
    views_count: int
    view_names: tuple[str, ...]
    source_label: str = "semantic_v2"
    excluded_tables_count: int = 0
    notes: tuple[str, ...] = field(default_factory=tuple)
