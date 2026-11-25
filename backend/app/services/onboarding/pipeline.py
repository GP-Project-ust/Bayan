"""سلسلة التهيئة الموحدة لـ Sprint 1 (PR-1 + PR-2): استبطان -> فهرسة pgvector -> Catalog v2."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Callable, Mapping

from app.core.config import Settings, get_settings
from app.services.onboarding.catalog import (
    CatalogBuildOptions,
    SemanticCatalogV2Provider,
)
from app.services.onboarding.discovery import (
    DiscoveryPipeline,
    DiscoveryReport,
    PostgresConnectionSettings,
)
from app.services.onboarding.indexing import (
    IndexingSummary,
    OfficialEmbeddingService,
    PgVectorSemanticRepository,
    SemanticEntryBuilder,
    SemanticIndexer,
    SemanticIndexRepository,
    SemanticSearchResult,
    SemanticSearchService,
)


@dataclass(frozen=True)
class OnboardingRunResult:
    """مخرج التشغيل الكامل لسلسلة التهيئة الحتمية الموحدة."""

    tenant_id: str
    source_id: str
    discovery_report: DiscoveryReport
    indexing_summary: IndexingSummary
    catalog_views: tuple[str, ...]
    execution_report_ar: str


def format_onboarding_execution_report_ar(
    *,
    tenant_id: str,
    report: DiscoveryReport,
    summary: IndexingSummary,
    catalog_views: tuple[str, ...],
) -> str:
    """إنتاج التقرير العربي الموحد للتشغيل الآلي (بلا أسرار أو كلمات مرور)."""
    src = report.source_summary
    views_list = "، ".join(f"`{v}`" for v in catalog_views) or "لا توجد مشاهد مفهرسة"
    lines = [
        f"# تقرير تنفيذ التهيئة الدلالية الموحدة — `{src.get('database', '—')}`",
        "",
        f"- **المستأجر (Tenant):** `{tenant_id}`",
        (
            f"- **المصدر (Source ID):** `{summary.source_id}` "
            f"(قراءة فقط: `{src.get('read_only', True)}`)"
        ),
        (
            f"- **هدف المصدر الآمن:** `{src.get('host', '—')}:{src.get('port', '—')}` / "
            f"قاعدة `{src.get('database', '—')}` / المخططات `{', '.join(report.schemas) or '—'}`"
        ),
        f"- **إصدار القواعد / الكتالوج:** `{summary.rules_version}` / `{summary.catalog_version}`",
        f"- **إعداد التضمين:** `{summary.embedding_config_id}`",
        f"- **بصمة المخطط البنيوية (SHA-256):** `{summary.structural_fingerprint}`",
        f"- **بصمة الكتالوج الكاملة (SHA-256):** `{summary.catalog_fingerprint}`",
        "",
        "## إحصاءات الاستبطان (المرحلة الحتمية)",
        "",
        f"- **الجداول الفيزيائية:** {report.counts.tables}",
        f"- **مشاهد SQL:** {report.counts.views}",
        f"- **إجمالي الكائنات:** {report.counts.total_objects}",
        f"- **الأعمدة:** {report.counts.columns}",
        f"- **المفاتيح الأجنبية والعلاقات المعلنة:** {report.counts.foreign_keys}",
        "",
        "## نتائج الفهرسة التزايدية (pgvector)",
        "",
        f"- **مضاف جديد (inserted):** {summary.inserted}",
        f"- **محدَّث (updated):** {summary.updated}",
        f"- **دون تغيير / معاد استخدام متجهه (unchanged):** {summary.unchanged}",
        f"- **مؤرشف بأمان (retired):** {summary.retired}",
        f"- **نصوص مضمنة فعلياً (embedded):** {summary.embedded_count}",
        f"- **إجمالي السجلات النشطة في الفهرس:** {summary.total_active}",
        "",
        "## مشاهد Catalog v2 الجاهزة خلف العقد المجمد",
        "",
        f"- **المشاهد المتاحة ({len(catalog_views)}):** {views_list}",
        "",
        "## التفاصيل التحليلية للمخطط",
        "",
        report.markdown_ar,
    ]
    return "\n".join(lines).strip() + "\n"


class UnifiedOnboardingPipeline:
    """الخط الموحد الرسمي: استبطان -> توصيف حتمي -> تضمين رسمي -> pgvector -> Catalog v2."""

    def __init__(
        self,
        *,
        app_settings: Settings | None = None,
        repository: SemanticIndexRepository | None = None,
        embedder: OfficialEmbeddingService | None = None,
        source_connect_fn: Callable[..., Any] | None = None,
        builder: SemanticEntryBuilder | None = None,
    ):
        self.app_settings = app_settings or get_settings()
        self.repository = repository or PgVectorSemanticRepository(
            database_url=self.app_settings.database_url,
            dimensions=self.app_settings.embedding_dimensions,
        )
        self.embedder = embedder or OfficialEmbeddingService(app_settings=self.app_settings)
        self.discovery_pipeline = DiscoveryPipeline(connect_fn=source_connect_fn)
        self.builder = builder or SemanticEntryBuilder()
        self.indexer = SemanticIndexer(
            repository=self.repository,
            embedder=self.embedder,
            builder=self.builder,
        )
        self.search_service = SemanticSearchService(
            repository=self.repository,
            embedder=self.embedder,
        )

    def run(
        self,
        *,
        source_settings: PostgresConnectionSettings,
        tenant_id: str,
        approved_semantics: Mapping[str, Mapping[str, Any]] | None = None,
    ) -> OnboardingRunResult:
        if not tenant_id.strip():
            raise ValueError("tenant_id مطلوب لتشغيل خط التهيئة الموحد.")
        report = self.discovery_pipeline.run(source_settings)
        summary = self.indexer.index_report(
            report,
            tenant_id=tenant_id,
            source_id=source_settings.source_id,
            approved_semantics=approved_semantics,
        )
        catalog_provider = self.get_catalog_provider(
            tenant_id=tenant_id,
            source_id=source_settings.source_id,
        )
        catalog_views = tuple(entry.view for entry in catalog_provider.get_catalog())
        report_ar = format_onboarding_execution_report_ar(
            tenant_id=tenant_id,
            report=report,
            summary=summary,
            catalog_views=catalog_views,
        )
        return OnboardingRunResult(
            tenant_id=tenant_id,
            source_id=source_settings.source_id,
            discovery_report=report,
            indexing_summary=summary,
            catalog_views=catalog_views,
            execution_report_ar=report_ar,
        )

    def get_catalog_provider(
        self,
        *,
        tenant_id: str,
        source_id: str | None = None,
    ) -> SemanticCatalogV2Provider:
        return SemanticCatalogV2Provider(
            repository=self.repository,
            options=CatalogBuildOptions(tenant_id=tenant_id, source_id=source_id),
        )

    def search(
        self,
        query: str,
        *,
        tenant_id: str,
        source_ids: list[str] | None = None,
        allowed_views: list[str] | None = None,
        entry_types: list[str] | None = None,
        limit: int = 10,
    ) -> list[SemanticSearchResult]:
        return self.search_service.search(
            query,
            tenant_id=tenant_id,
            source_ids=source_ids,
            allowed_views=allowed_views,
            entry_types=entry_types,
            limit=limit,
        )
