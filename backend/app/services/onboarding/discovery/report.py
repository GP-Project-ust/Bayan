"""مولد تقرير الاكتشاف العربي الحتمي بصيغتَي JSON وMarkdown."""

from __future__ import annotations

from typing import Any, Iterable, Mapping

from .descriptions import DeterministicArabicDescriber
from .fingerprints import catalog_fingerprint, structural_catalog_fingerprint
from .models import DiscoveryReport
from .normalization import compute_catalog_counts, deduplicate_objects_by_ref


def build_arabic_discovery_report(
    normalized_objects: Iterable[Mapping[str, Any]],
    *,
    source_summary: Mapping[str, Any],
    describer: DeterministicArabicDescriber | None = None,
) -> DiscoveryReport:
    """بناء تقرير عربي حتمي من المخطط المطبّع دون أسرار أو طوابع زمنية."""
    active_describer = describer or DeterministicArabicDescriber()
    objects_list = deduplicate_objects_by_ref(normalized_objects)
    counts = compute_catalog_counts(objects_list)
    fingerprint = catalog_fingerprint(objects_list)
    structural_fp = structural_catalog_fingerprint(objects_list)
    described_objects = tuple(active_describer.describe_object(item) for item in objects_list)
    relationships = active_describer.build_declared_relationships(objects_list)
    schemas = tuple(sorted({obj.schema for obj in described_objects if obj.schema}))

    warnings: list[str] = []
    uncommented = [
        obj.schema_qualified_name
        for obj in described_objects
        if obj.description_source != "database_comment"
    ]
    if uncommented:
        warnings.append(
            f"يوجد {len(uncommented)} كائن(ات) دون COMMENT موثق؛ استُخدم القالب العربي الحتمي."
        )
    views_without_deps = [
        obj.schema_qualified_name
        for obj in described_objects
        if obj.object_type == "view" and not obj.dependencies
    ]
    if views_without_deps:
        warnings.append(f"لم تُسجل اعتماديات جداول صريحة للمشاهد: {', '.join(views_without_deps)}.")

    safe_source = {
        k: v
        for k, v in source_summary.items()
        if "password" not in str(k).lower() and "secret" not in str(k).lower()
    }
    report = DiscoveryReport(
        rules_version=active_describer.rules_version,
        catalog_fingerprint=fingerprint,
        structural_fingerprint=structural_fp,
        source_summary=safe_source,
        schemas=schemas,
        counts=counts,
        objects=described_objects,
        relationships=relationships,
        warnings_ar=tuple(warnings),
    )
    markdown = format_arabic_report_markdown(report)
    return DiscoveryReport(
        rules_version=report.rules_version,
        catalog_fingerprint=report.catalog_fingerprint,
        structural_fingerprint=report.structural_fingerprint,
        source_summary=report.source_summary,
        schemas=report.schemas,
        counts=report.counts,
        objects=report.objects,
        relationships=report.relationships,
        warnings_ar=report.warnings_ar,
        markdown_ar=markdown,
    )


def format_arabic_report_markdown(report: DiscoveryReport) -> str:
    """تنسيق تقرير الاكتشاف العربي الحتمي بصيغة Markdown."""
    src = report.source_summary
    db_name = src.get("database", "—")
    host = src.get("host", "—")
    port = src.get("port", "—")
    username = src.get("username", "—")
    ro = src.get("read_only", True)
    lines = [
        f"# تقرير الاكتشاف العربي الحتمي — `{db_name}`",
        "",
        f"- **المصدر:** `{src.get('source_name', db_name)}` (وضع القراءة فقط: `{ro}`)",
        f"- **الاتصال الآمن:** `{host}:{port}` / قاعدة `{db_name}` / المستخدم `{username}`",
        f"- **المخططات المكتشفة:** {', '.join(f'`{s}`' for s in report.schemas) or '—'}",
        f"- **إصدار القواعد:** `{report.rules_version}`",
        f"- **بصمة المخطط البنيوية (SHA-256):** `{report.structural_fingerprint}`",
        f"- **بصمة الكتالوج الكاملة (SHA-256):** `{report.catalog_fingerprint}`",
        "",
        "## الملخص الرقمي",
        "",
        f"- **الجداول:** {report.counts.tables}",
        f"- **المشاهد:** {report.counts.views}",
        f"- **إجمالي الكائنات:** {report.counts.total_objects}",
        f"- **الأعمدة:** {report.counts.columns}",
        f"- **المفاتيح الأساسية:** {report.counts.primary_keys}",
        f"- **المفاتيح الأجنبية:** {report.counts.foreign_keys}",
        f"- **القيود الفريدة:** {report.counts.unique_constraints}",
        f"- **الفهارس:** {report.counts.indexes}",
        f"- **العلاقات المعلنة:** {len(report.relationships)}",
        "",
        "## الكائنات المكتشفة (الجداول والمشاهد)",
        "",
    ]

    for obj in report.objects:
        kind_ar = "مشهد SQL" if obj.object_type == "view" else "جدول فيزيائي"
        src_ar = (
            "تعليق قاعدة البيانات"
            if obj.description_source == "database_comment"
            else "قالب عربي حتمي"
        )
        row_info = (
            f" | الصفوف التقريبية: {obj.approximate_row_count}"
            if obj.approximate_row_count is not None
            else ""
        )
        lines.extend(
            [
                f"### `{obj.schema_qualified_name}` — {obj.label_ar} ({kind_ar})",
                "",
                f"- **الوصف ({src_ar}):** {obj.description_ar}",
                (
                    f"- **الدور البنيوي:** `{obj.entity_type}` | "
                    f"**الأعمدة:** {len(obj.columns)}{row_info}"
                ),
            ]
        )
        if obj.primary_keys:
            pk_desc = "، ".join(f"`{pk.name}` ({', '.join(pk.columns)})" for pk in obj.primary_keys)
            lines.append(f"- **المفاتيح الأساسية:** {pk_desc}")
        if obj.foreign_keys:
            fk_desc = "، ".join(
                f"`{fk.name}`: ({', '.join(fk.columns)}) → "
                f"`{fk.target_schema}.{fk.target_table}` ({', '.join(fk.target_columns)})"
                for fk in obj.foreign_keys
            )
            lines.append(f"- **المفاتيح الأجنبية:** {fk_desc}")
        if obj.dependencies:
            deps_str = ", ".join(f"`{d}`" for d in obj.dependencies)
            lines.append(f"- **اعتماديات المشهد:** {deps_str}")
        lines.append("")

    lines.append("## العلاقات المعلنة")
    lines.append("")
    if report.relationships:
        for rel in report.relationships:
            src_cols = ", ".join(rel.source_columns)
            tgt_cols = ", ".join(rel.target_columns)
            lines.append(
                f"- **{rel.business_label_ar}:** `{rel.source_table}({src_cols})` → "
                f"`{rel.target_table}({tgt_cols})` (`{rel.constraint_name}`)"
            )
    else:
        lines.append("- لا توجد علاقات مفاتيح أجنبية معلنة.")

    if report.warnings_ar:
        lines.extend(["", "## تنبيهات الجودة", ""])
        for warning in report.warnings_ar:
            lines.append(f"- {warning}")

    return "\n".join(lines) + "\n"
