"""جسر المعرفة الدلالية المعتمد: ربط مخرجات المراحل 0–8 بمحرك pgvector و Catalog v2 الرسمي."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any, Dict, List, Optional

from app.agents.sql_catalog import CatalogEntry
from app.services.onboarding.catalog import CatalogBuildOptions, SemanticCatalogV2Provider
from app.services.onboarding.connectors import build_discovery_report_from_catalog
from app.services.onboarding.indexing import (
    IndexingSummary,
    OfficialEmbeddingService,
    SemanticEntryBuilder,
    SemanticIndexer,
    SemanticIndexRepository,
    SemanticSearchResult,
    SemanticSearchService,
)

from .models import ApprovalRequiredError, ValidationError, sha256_hash


@dataclass(frozen=True)
class SemanticPublishResult:
    """مخرج النشر المعتمد من مسار التهيئة إلى الفهرس الدلالي و Catalog v2."""

    tenant_id: str
    source_ids: tuple[str, ...]
    indexing_summaries: tuple[Dict[str, Any], ...]
    catalog_views: tuple[CatalogEntry, ...]
    approved_objects_count: int
    rejected_excluded_count: int
    approved_relationships_count: int
    semantic_revision: str


def build_approved_semantics_map(org: Dict[str, Any]) -> Dict[str, Dict[str, Any]]:
    """تجميع الكائنات والمفاهيم المعتمدة في خريطة متوافقة مع SemanticEntryBuilder."""
    domains_by_id = {d.get("id"): d for d in (org.get("domains") or []) if d.get("id")}
    approved_domain_ids = {
        d.get("id") for d in (org.get("domains") or []) if d.get("status") == "approved"
    }
    concepts = list(org.get("concepts") or [])
    concept_by_ref = {c.get("physical_ref"): c for c in concepts if c.get("physical_ref")}
    approved_semantics: Dict[str, Dict[str, Any]] = {}

    for tbl in org.get("physical_catalog") or []:
        tref = tbl.get("object_ref")
        qname = (
            tbl.get("schema_qualified_name")
            or f"{tbl.get('schema', 'public')}.{tbl.get('name', '')}"
        )
        if not tref:
            continue
        concept = concept_by_ref.get(tref)
        domain = domains_by_id.get(concept.get("domain_id")) if concept else None

        # أي مفهوم مرفوض أو مصعد أو غير معتمد بعد التفعيل يُستثنى أو يُصنف blacklist في الكتالوج
        if concept is not None and concept.get("status") in {"rejected", "escalated"}:
            approved_semantics[qname] = {"classification": "blacklist"}
            continue
        if concept is not None and concept.get("status") != "approved":
            continue
        if domain is not None and domain.get("id") not in approved_domain_ids:
            continue

        classification = (concept or {}).get("classification") or tbl.get("classification") or None
        col_concepts = [
            c
            for c in concepts
            if c.get("table_ref") == tref
            and c.get("source_type") == "column"
            and c.get("status") == "approved"
        ]
        synonyms = list((concept or {}).get("synonyms") or []) + list(
            (concept or {}).get("synonyms_en") or []
        )
        concept_terms = [
            (concept or {}).get("name_ar") or "",
            (domain or {}).get("name_ar") or "",
            *(c.get("name_ar") or "" for c in col_concepts),
        ]
        approved_semantics[qname] = {
            "label_ar": (concept or {}).get("name_ar") or tbl.get("label_ar") or tbl.get("name"),
            "description_ar": (concept or {}).get("description")
            or tbl.get("description_ar")
            or tbl.get("name"),
            "synonyms": [str(s).strip() for s in synonyms if str(s).strip()],
            "concepts": [str(t).strip() for t in concept_terms if str(t).strip()],
            **({"classification": str(classification).lower()} if classification else {}),
        }
    return approved_semantics


def build_stage_manifest(org: Dict[str, Any]) -> Dict[str, Any]:
    """بناء بيان حالة موثق للمراحل 0–8 بأرقام إصدار حتمية."""
    domains = org.get("domains") or []
    concepts = org.get("concepts") or []
    rels = org.get("relationships") or []
    sources = org.get("data_sources") or []
    changes = org.get("schema_changes") or []
    discovery = org.get("discovery") or {}
    monitoring = org.get("monitoring") or {}

    stages = [
        {
            "stage_id": 0,
            "key": "intake",
            "approved": bool(org.get("intake", {}).get("approved")),
            "records": 1,
            "version": sha256_hash(org.get("intake") or {})[:12],
        },
        {
            "stage_id": 1,
            "key": "connection",
            "approved": bool(sources) and all(s.get("status") == "connected" for s in sources),
            "records": len(sources),
            "version": sha256_hash([s.get("id") for s in sources])[:12],
        },
        {
            "stage_id": 2,
            "key": "discovery",
            "approved": discovery.get("status") == "completed",
            "records": len(org.get("physical_catalog") or []),
            "version": str(discovery.get("catalog_fingerprint") or "none")[:12],
        },
        {
            "stage_id": 3,
            "key": "domains",
            "approved": bool(domains) and all(d.get("status") == "approved" for d in domains),
            "records": len(domains),
            "version": sha256_hash([d for d in domains if d.get("status") == "approved"])[:12],
        },
        {
            "stage_id": 4,
            "key": "concepts",
            "approved": bool(concepts) and all(c.get("status") == "approved" for c in concepts),
            "records": len(concepts),
            "version": sha256_hash([c for c in concepts if c.get("status") == "approved"])[:12],
        },
        {
            "stage_id": 5,
            "key": "relationships",
            "approved": all(r.get("status") in {"approved", "rejected"} for r in rels),
            "records": len(rels),
            "version": sha256_hash([r for r in rels if r.get("status") == "approved"])[:12],
        },
        {
            "stage_id": 6,
            "key": "activation",
            "approved": org.get("status") == "active",
            "records": 1 if org.get("activation", {}).get("activated_at") else 0,
            "version": sha256_hash(org.get("activation") or {})[:12],
        },
        {
            "stage_id": 7,
            "key": "monitoring",
            "approved": bool(monitoring.get("last_checked_at")),
            "records": int(monitoring.get("current_tables") or 0),
            "version": str(monitoring.get("current_fingerprint") or "none")[:12],
        },
        {
            "stage_id": 8,
            "key": "schema",
            "approved": all(ch.get("status") != "pending" for ch in changes),
            "records": len(changes),
            "version": sha256_hash(changes)[:12],
        },
    ]
    return {
        "manifest_version": "bayan-onboarding-stages-v1",
        "organization_id": org["id"],
        "tenant_id": org.get("tenant_id") or org["id"],
        "stages": stages,
    }


class SemanticKnowledgeBridge:
    """الربط الرسمي بين المراحل المعتمدة ومحرك pgvector و Catalog v2."""

    def __init__(
        self,
        *,
        repository: SemanticIndexRepository,
        embedder: Optional[OfficialEmbeddingService] = None,
        builder: Optional[SemanticEntryBuilder] = None,
    ):
        self.repository = repository
        self.embedder = embedder or OfficialEmbeddingService()
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

    def publish_approved_organization(
        self,
        org: Dict[str, Any],
        *,
        allowed_classifications: Optional[tuple[str, ...]] = None,
    ) -> SemanticPublishResult:
        """فهرسة المعرفة الدلالية المعتمدة فقط لكل مصدر وإنتاج مدخلات Catalog v2 الرسمية."""
        if org.get("status") != "active":
            raise ApprovalRequiredError(
                "لا يمكن النشر إلى الفهرس الدلالي قبل اعتماد وتفعيل المؤسسة في المرحلة 6.",
                code="organization_not_active",
            )
        tenant_id = str(org.get("tenant_id") or org["id"]).strip()
        catalog = list(org.get("physical_catalog") or [])
        if not catalog:
            raise ValidationError("لا يوجد كتالوج فيزيائي مكتشف للنشر.")

        approved_semantics = build_approved_semantics_map(org)
        rejected_count = sum(
            1 for v in approved_semantics.values() if v.get("classification") == "blacklist"
        )
        approved_rels = [
            r for r in (org.get("relationships") or []) if r.get("status") == "approved"
        ]

        sources_by_id = {s["id"]: s for s in (org.get("data_sources") or []) if s.get("id")}
        grouped: Dict[str, List[Dict[str, Any]]] = {}
        for item in catalog:
            sid = str(item.get("source_id") or next(iter(sources_by_id), "source"))
            grouped.setdefault(sid, []).append(item)

        summaries: List[Dict[str, Any]] = []
        for sid, items in sorted(grouped.items()):
            source_meta = sources_by_id.get(sid) or {"id": sid, "name": sid, "database": sid}
            report = build_discovery_report_from_catalog(
                source=source_meta,
                catalog_tables=items,
            )
            summary: IndexingSummary = self.indexer.index_report(
                report,
                tenant_id=tenant_id,
                source_id=sid,
                approved_semantics=approved_semantics,
            )
            summaries.append(asdict(summary))

        catalog_provider = SemanticCatalogV2Provider(
            repository=self.repository,
            options=CatalogBuildOptions(
                tenant_id=tenant_id,
                allowed_classifications=allowed_classifications,
            ),
        )
        catalog_views = tuple(catalog_provider.get_catalog())
        semantic_rev = sha256_hash(
            {
                "approved_semantics": approved_semantics,
                "approved_relationships": [r.get("id") for r in approved_rels],
            }
        )[:16]

        return SemanticPublishResult(
            tenant_id=tenant_id,
            source_ids=tuple(sorted(grouped.keys())),
            indexing_summaries=tuple(summaries),
            catalog_views=catalog_views,
            approved_objects_count=sum(
                1 for v in approved_semantics.values() if v.get("classification") != "blacklist"
            ),
            rejected_excluded_count=rejected_count,
            approved_relationships_count=len(approved_rels),
            semantic_revision=semantic_rev,
        )

    def get_official_catalog(
        self,
        *,
        tenant_id: str,
        source_id: Optional[str] = None,
        allowed_views: Optional[List[str]] = None,
        allowed_classifications: Optional[tuple[str, ...]] = None,
    ) -> List[CatalogEntry]:
        provider = SemanticCatalogV2Provider(
            repository=self.repository,
            options=CatalogBuildOptions(
                tenant_id=tenant_id,
                source_id=source_id,
                allowed_classifications=allowed_classifications,
            ),
        )
        return provider.get_catalog(allowed_views=allowed_views)

    def search(
        self,
        query: str,
        *,
        tenant_id: str,
        allowed_views: Optional[List[str]] = None,
        allowed_classifications: Optional[List[str]] = None,
        limit: int = 10,
    ) -> List[SemanticSearchResult]:
        return self.search_service.search(
            query,
            tenant_id=tenant_id,
            allowed_views=allowed_views,
            allowed_classifications=allowed_classifications,
            limit=limit,
        )
