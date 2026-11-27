"""نقاط نهاية API الرسمية لمسار التهيئة الذكية (المراحل 0–8) والفهرس الدلالي وكتالوج v2."""

from __future__ import annotations

import os
from dataclasses import asdict
from typing import Any, Callable, Dict, List, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Path, Query, Request
from pydantic import BaseModel, ConfigDict, Field

from app.core.config import get_settings
from app.services.onboarding.connectors import ConnectorSecurityError, DataSourceConnectionError
from app.services.onboarding.governance import (
    CATALOG_READ_PERMISSION,
    ONBOARDING_ADMIN_PERMISSION,
    ONBOARDING_RESET_PERMISSION,
    AuthorizationError,
    Principal,
    TenantPermissionAuthorizer,
    enforce_tenant_header,
    get_stage_reset_history,
    get_stage_reset_status,
    reset_stage,
)
from app.services.onboarding.indexing import (
    InMemorySemanticRepository,
    PgVectorSemanticRepository,
    SemanticIndexRepository,
)
from app.services.onboarding.persistence import create_state_repository
from app.services.onboarding.relationships import RelationshipValidationError
from app.services.onboarding.semantics import AIServiceError, OfficialLLMStructuredGateway
from app.services.onboarding.workflow import (
    OnboardingError,
    OnboardingWorkflowService,
    SemanticKnowledgeBridge,
    activate_organization,
    ai_activation_readiness,
    ai_changed_semantics,
    build_stage_manifest,
    decide_schema_change,
    get_activation_readiness,
    monitor_schema,
    start_async_monitoring,
    synchronize_semantic_catalog,
)

OrgId = str
MAX_ACTOR_LEN = 120


class _Req(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class SourceInput(_Req):
    name: str = Field(min_length=2, max_length=120)
    engine: str = Field(default="postgresql", min_length=2, max_length=32)
    host: Optional[str] = Field(default="localhost", max_length=255)
    port: Optional[int] = Field(default=None, ge=0, le=65535)
    database: str = Field(min_length=1, max_length=500)
    schema_name: Optional[str] = Field(default=None, alias="schema", max_length=120)
    username: Optional[str] = Field(default="", max_length=120)
    read_only: bool = True
    ssl_mode: Optional[str] = Field(default=None, max_length=32)


class CreateOrganizationReq(_Req):
    id: Optional[str] = Field(default=None, min_length=3, max_length=64, pattern=r"^[A-Za-z0-9-]+$")
    tenant_id: Optional[str] = Field(default=None, min_length=3, max_length=64)
    name: str = Field(min_length=2, max_length=160)
    sector: str = Field(default="", max_length=120)
    country: str = Field(default="YE", max_length=16)
    owner_name: str = Field(default="", max_length=120)
    owner_email: str = Field(default="", max_length=160)
    goals: str = Field(default="", max_length=1200)
    operator_name: str = Field(default="مشغل التهيئة", min_length=2, max_length=MAX_ACTOR_LEN)
    initial_source: Optional[SourceInput] = None


class ActorReq(_Req):
    operator_name: str = Field(default="مشغل التهيئة", min_length=2, max_length=MAX_ACTOR_LEN)


class TestSourceReq(_Req):
    operator_name: str = Field(default="مشغل التهيئة", min_length=2, max_length=MAX_ACTOR_LEN)
    password: str = Field(default="", max_length=256)


class DiscoveryStartReq(_Req):
    operator_name: str = Field(default="مشغل التهيئة", min_length=2, max_length=MAX_ACTOR_LEN)
    passwords: Dict[str, str] = Field(default_factory=dict)
    generate_ai_proposals: bool = False
    approve_external_ai: bool = False


class AnalyzeAIReq(_Req):
    operator_name: str = Field(default="مشغل التهيئة", min_length=2, max_length=MAX_ACTOR_LEN)
    use_ai: bool = False
    approve_external_ai: bool = False
    regenerate: bool = False


class ReviewDecisionReq(_Req):
    decision: str = Field(min_length=2, max_length=32)
    operator_name: str = Field(default="مشغل التهيئة", min_length=2, max_length=MAX_ACTOR_LEN)
    name_ar: Optional[str] = Field(default=None, max_length=160)
    description: Optional[str] = Field(default=None, max_length=1200)
    synonyms: Optional[List[str]] = None
    synonyms_en: Optional[List[str]] = None
    semantic_type: Optional[str] = Field(default=None, max_length=64)
    classification: Optional[str] = Field(default=None, max_length=32)
    domain_id: Optional[str] = Field(default=None, max_length=64)
    note: str = Field(default="", max_length=1000)


class MoveTableReq(_Req):
    table_ref: str = Field(min_length=3, max_length=600)
    target_domain_id: str = Field(min_length=2, max_length=64)
    operator_name: str = Field(default="مشغل التهيئة", min_length=2, max_length=MAX_ACTOR_LEN)


class MergeDomainsReq(_Req):
    domain_ids: List[str] = Field(min_length=2, max_length=20)
    name_ar: str = Field(min_length=2, max_length=160)
    description: str = Field(default="", max_length=1200)
    operator_name: str = Field(default="مشغل التهيئة", min_length=2, max_length=MAX_ACTOR_LEN)


class ManualRelationshipReq(_Req):
    source_column_refs: List[str] = Field(min_length=1, max_length=12)
    target_column_refs: List[str] = Field(min_length=1, max_length=12)
    cardinality: str = Field(default="many_to_one", max_length=32)
    label: str = Field(min_length=2, max_length=240)
    rationale: str = Field(default="علاقة عمل معتمدة يدوياً.", max_length=1200)
    operator_name: str = Field(default="مشغل التهيئة", min_length=2, max_length=MAX_ACTOR_LEN)


class EditRelationshipReq(_Req):
    label: Optional[str] = Field(default=None, max_length=240)
    rationale: Optional[str] = Field(default=None, max_length=1200)
    cardinality: Optional[str] = Field(default=None, max_length=32)
    operator_name: str = Field(default="مشغل التهيئة", min_length=2, max_length=MAX_ACTOR_LEN)


class StageResetReq(_Req):
    operator_name: str = Field(default="مشغل التهيئة", min_length=2, max_length=MAX_ACTOR_LEN)
    reason: str = Field(default="", max_length=1000)
    confirm: bool = True


class ActivateReq(_Req):
    operator_name: str = Field(default="مشغل التهيئة", min_length=2, max_length=MAX_ACTOR_LEN)
    handover_note: str = Field(default="", max_length=1200)


class MonitorReq(_Req):
    operator_name: str = Field(default="مشغل التهيئة", min_length=2, max_length=MAX_ACTOR_LEN)
    passwords: Dict[str, str] = Field(default_factory=dict)


class SchemaChangeDecisionReq(_Req):
    decision: str = Field(min_length=2, max_length=32)
    operator_name: str = Field(default="مشغل التهيئة", min_length=2, max_length=MAX_ACTOR_LEN)
    note: str = Field(default="", max_length=1000)
    updated_label_ar: Optional[str] = Field(default=None, max_length=160)


def _get_workflow_runtime(
    request: Request,
) -> tuple[OnboardingWorkflowService, SemanticKnowledgeBridge, OfficialLLMStructuredGateway]:
    service = getattr(request.app.state, "onboarding_workflow_service", None)
    bridge = getattr(request.app.state, "onboarding_semantic_bridge", None)
    gateway = getattr(request.app.state, "onboarding_ai_gateway", None)
    if service is not None and bridge is not None and gateway is not None:
        return service, bridge, gateway

    settings = get_settings()
    env_mode = os.getenv("BAYAN_ENV", "development").strip().lower()
    use_pg_index = env_mode == "production" or os.getenv(
        "BAYAN_ONBOARDING_USE_PGVECTOR", ""
    ).strip().lower() in {"1", "true", "yes"}
    index_repo: SemanticIndexRepository
    if use_pg_index:
        index_repo = PgVectorSemanticRepository(
            database_url=settings.database_url,
            dimensions=settings.embedding_dimensions,
        )
    else:
        index_repo = InMemorySemanticRepository()

    gateway = OfficialLLMStructuredGateway()
    bridge = SemanticKnowledgeBridge(repository=index_repo)
    state_backend = (
        "postgres"
        if (env_mode == "production" or os.getenv("BAYAN_ONBOARDING_STATE_BACKEND") == "postgres")
        else os.getenv("BAYAN_ONBOARDING_STATE_BACKEND", "memory")
    )
    repo = create_state_repository(backend=state_backend, database_url=settings.database_url)
    service = OnboardingWorkflowService(repository=repo, ai_gateway=gateway, bridge=bridge)

    request.app.state.onboarding_ai_gateway = gateway
    request.app.state.onboarding_semantic_bridge = bridge
    request.app.state.onboarding_workflow_service = service
    return service, bridge, gateway


def get_onboarding_principal(request: Request) -> Principal:
    """اقرأ هوية سبق أن تحقق منها middleware موثوق؛ لا تقرأها من الطلب."""
    principal = getattr(request.state, "principal", None)
    if not isinstance(principal, Principal):
        raise HTTPException(
            status_code=401,
            detail={"code": "identity_required", "message": "المصادقة مطلوبة."},
        )
    if not all(
        (
            principal.user_id,
            principal.tenant_id,
            principal.membership_id,
            principal.session_id,
        )
    ):
        raise HTTPException(
            status_code=401,
            detail={"code": "identity_required", "message": "هوية أو عضوية الجلسة غير مكتملة."},
        )
    request.state.onboarding_principal = principal
    return principal


def authorize_onboarding_request(
    request: Request,
    principal: Principal = Depends(get_onboarding_principal),
) -> None:
    """فرض صلاحية الخادم وعضوية المستأجر على كل مسارات onboarding."""
    path = request.url.path.rstrip("/")
    if request.method == "GET" and (
        path.endswith("/catalog") or path.endswith("/semantic-search")
    ):
        permissions = (CATALOG_READ_PERMISSION,)
    elif path.endswith("/reset"):
        permissions = (ONBOARDING_ADMIN_PERMISSION, ONBOARDING_RESET_PERMISSION)
    else:
        permissions = (ONBOARDING_ADMIN_PERMISSION,)

    organization_id = request.path_params.get("organization_id")
    if organization_id:
        service, _, _ = _get_workflow_runtime(request)
        try:
            organization = service.get_organization(organization_id)
        except OnboardingError as exc:
            raise HTTPException(
                status_code=exc.status_code,
                detail={"code": exc.code, "message": exc.message},
            ) from exc
        tenant_id = str(organization.get("tenant_id") or organization["id"])
    else:
        tenant_id = principal.tenant_id

    authorizer = TenantPermissionAuthorizer()
    for permission in permissions:
        try:
            authorizer.require(principal, tenant_id, permission)
        except AuthorizationError as exc:
            raise HTTPException(
                status_code=403,
                detail={"code": exc.code, "message": exc.message},
            ) from exc


router = APIRouter(
    prefix="/onboarding",
    tags=["onboarding"],
    dependencies=[Depends(authorize_onboarding_request)],
)


def _request_principal(request: Request) -> Principal:
    principal = getattr(request.state, "onboarding_principal", None)
    if not isinstance(principal, Principal):
        raise HTTPException(status_code=401, detail={"code": "identity_required"})
    return principal


def _exec(fn: Callable[[], Any]) -> Any:
    try:
        return fn()
    except AuthorizationError as exc:
        status = 401 if exc.code in {"identity_required", "tenant_header_required"} else 403
        raise HTTPException(
            status_code=status,
            detail={"code": exc.code, "message": exc.message, "retryable": False},
        ) from exc
    except OnboardingError as exc:
        raise HTTPException(
            status_code=exc.status_code,
            detail={"code": exc.code, "message": exc.message, "retryable": False},
        ) from exc
    except (ConnectorSecurityError, RelationshipValidationError, ValueError) as exc:
        raise HTTPException(
            status_code=422,
            detail={"code": "validation_error", "message": str(exc), "retryable": False},
        ) from exc
    except DataSourceConnectionError as exc:
        raise HTTPException(
            status_code=400 if not exc.retryable else 502,
            detail={"code": exc.code, "message": exc.message, "retryable": exc.retryable},
        ) from exc
    except AIServiceError as exc:
        raise HTTPException(
            status_code=exc.status_code,
            detail={"code": exc.code, "message": exc.message, "retryable": exc.retryable},
        ) from exc
    except KeyError as exc:
        raise HTTPException(
            status_code=404,
            detail={"code": "not_found", "message": str(exc), "retryable": False},
        ) from exc


@router.get("/readiness")
def system_readiness(request: Request) -> Dict[str, Any]:
    _, _, gateway = _get_workflow_runtime(request)
    settings = get_settings()
    return {
        "status": "ready",
        "env": os.getenv("BAYAN_ENV", "development"),
        "ai_gateway": gateway.describe_configuration(),
        "catalog_provider_active": os.getenv("CATALOG_PROVIDER", "legacy"),
        "embedding_provider": settings.embedding_provider,
        "embedding_model": settings.embedding_model,
    }


@router.get("/organizations")
def list_organizations(
    request: Request,
    include_archived: bool = Query(default=False),
) -> List[Dict[str, Any]]:
    service, _, _ = _get_workflow_runtime(request)
    principal = _request_principal(request)
    return _exec(
        lambda: [
            organization
            for organization in service.list_organizations(include_archived=include_archived)
            if organization.get("tenant_id") == principal.tenant_id
        ]
    )


@router.post("/organizations", status_code=201)
def create_organization(request: Request, req: CreateOrganizationReq) -> Dict[str, Any]:
    service, _, _ = _get_workflow_runtime(request)
    principal = _request_principal(request)
    if req.tenant_id and req.tenant_id != principal.tenant_id:
        raise HTTPException(
            status_code=403,
            detail={"code": "tenant_access_denied", "message": "لا تملك عضوية المستأجر المطلوب."},
        )
    payload = req.model_dump(by_alias=True, exclude_none=True)
    payload["tenant_id"] = principal.tenant_id
    payload["operator_name"] = principal.audit_actor
    return _exec(lambda: service.create_organization(payload))


@router.get("/organizations/{organization_id}")
def get_organization(
    request: Request,
    organization_id: str = Path(min_length=3, max_length=64),
    x_bayan_tenant_id: Optional[str] = Header(default=None, alias="X-Bayan-Tenant-ID"),
) -> Dict[str, Any]:
    service, _, _ = _get_workflow_runtime(request)
    return _exec(
        lambda: (
            enforce_tenant_header(organization_id, x_bayan_tenant_id),
            service.get_organization(organization_id),
        )[1]
    )


@router.post("/organizations/{organization_id}/intake/approve")
def approve_intake(
    request: Request,
    organization_id: str,
    req: ActorReq,
    x_bayan_tenant_id: Optional[str] = Header(default=None, alias="X-Bayan-Tenant-ID"),
) -> Dict[str, Any]:
    service, _, _ = _get_workflow_runtime(request)
    return _exec(
        lambda: (
            enforce_tenant_header(organization_id, x_bayan_tenant_id),
            service.approve_intake(organization_id, _request_principal(request).audit_actor),
        )[1]
    )


@router.post("/organizations/{organization_id}/sources")
def add_source(
    request: Request,
    organization_id: str,
    req: SourceInput,
    x_bayan_tenant_id: Optional[str] = Header(default=None, alias="X-Bayan-Tenant-ID"),
) -> Dict[str, Any]:
    service, _, _ = _get_workflow_runtime(request)
    payload = req.model_dump(by_alias=True, exclude_none=True)
    return _exec(
        lambda: (
            enforce_tenant_header(organization_id, x_bayan_tenant_id),
            service.add_data_source(organization_id, payload),
        )[1]
    )


@router.delete("/organizations/{organization_id}/sources/{source_id}")
def delete_source(
    request: Request,
    organization_id: str,
    source_id: str,
    x_bayan_tenant_id: Optional[str] = Header(default=None, alias="X-Bayan-Tenant-ID"),
) -> Dict[str, Any]:
    service, _, _ = _get_workflow_runtime(request)
    return _exec(
        lambda: (
            enforce_tenant_header(organization_id, x_bayan_tenant_id),
            service.remove_data_source(organization_id, source_id),
        )[1]
    )


@router.post("/organizations/{organization_id}/sources/{source_id}/test")
def test_source(
    request: Request,
    organization_id: str,
    source_id: str,
    req: TestSourceReq,
    x_bayan_tenant_id: Optional[str] = Header(default=None, alias="X-Bayan-Tenant-ID"),
) -> Dict[str, Any]:
    service, _, _ = _get_workflow_runtime(request)
    return _exec(
        lambda: (
            enforce_tenant_header(organization_id, x_bayan_tenant_id),
            service.test_data_source(
                organization_id,
                source_id,
                password=req.password,
                operator_name=_request_principal(request).audit_actor,
            ),
        )[1]
    )


@router.post("/organizations/{organization_id}/discovery/start")
def start_discovery(
    request: Request,
    organization_id: str,
    req: DiscoveryStartReq,
    x_bayan_tenant_id: Optional[str] = Header(default=None, alias="X-Bayan-Tenant-ID"),
) -> Dict[str, Any]:
    service, _, _ = _get_workflow_runtime(request)
    return _exec(
        lambda: (
            enforce_tenant_header(organization_id, x_bayan_tenant_id),
            service.run_discovery(
                organization_id,
                operator_name=_request_principal(request).audit_actor,
                passwords=req.passwords,
                generate_ai_proposals=req.generate_ai_proposals,
                approve_external_ai=req.approve_external_ai,
            ),
        )[1]
    )


@router.post("/organizations/{organization_id}/domains/analyze")
def analyze_domains(
    request: Request,
    organization_id: str,
    req: AnalyzeAIReq,
    x_bayan_tenant_id: Optional[str] = Header(default=None, alias="X-Bayan-Tenant-ID"),
) -> Dict[str, Any]:
    service, _, _ = _get_workflow_runtime(request)
    return _exec(
        lambda: (
            enforce_tenant_header(organization_id, x_bayan_tenant_id),
            service.analyze_domains(
                organization_id,
                operator_name=_request_principal(request).audit_actor,
                use_ai=req.use_ai,
                approve_external_ai=req.approve_external_ai,
            ),
        )[1]
    )


@router.post("/organizations/{organization_id}/domains/{domain_id}/review")
def review_domain(
    request: Request,
    organization_id: str,
    domain_id: str,
    req: ReviewDecisionReq,
    x_bayan_tenant_id: Optional[str] = Header(default=None, alias="X-Bayan-Tenant-ID"),
) -> Dict[str, Any]:
    service, _, _ = _get_workflow_runtime(request)
    return _exec(
        lambda: (
            enforce_tenant_header(organization_id, x_bayan_tenant_id),
            service.review_domain(
                organization_id,
                domain_id,
                decision=req.decision,
                operator_name=_request_principal(request).audit_actor,
                name_ar=req.name_ar,
                description=req.description,
                note=req.note,
            ),
        )[1]
    )


@router.post("/organizations/{organization_id}/domains/move-table")
def move_table(
    request: Request,
    organization_id: str,
    req: MoveTableReq,
    x_bayan_tenant_id: Optional[str] = Header(default=None, alias="X-Bayan-Tenant-ID"),
) -> Dict[str, Any]:
    service, _, _ = _get_workflow_runtime(request)
    return _exec(
        lambda: (
            enforce_tenant_header(organization_id, x_bayan_tenant_id),
            service.move_table_to_domain(
                organization_id,
                table_ref=req.table_ref,
                target_domain_id=req.target_domain_id,
                operator_name=_request_principal(request).audit_actor,
            ),
        )[1]
    )


@router.post("/organizations/{organization_id}/domains/merge")
def merge_domains(
    request: Request,
    organization_id: str,
    req: MergeDomainsReq,
    x_bayan_tenant_id: Optional[str] = Header(default=None, alias="X-Bayan-Tenant-ID"),
) -> Dict[str, Any]:
    service, _, _ = _get_workflow_runtime(request)
    return _exec(
        lambda: (
            enforce_tenant_header(organization_id, x_bayan_tenant_id),
            service.merge_domains(
                organization_id,
                domain_ids=req.domain_ids,
                name_ar=req.name_ar,
                description=req.description,
                operator_name=_request_principal(request).audit_actor,
            ),
        )[1]
    )


@router.post("/organizations/{organization_id}/concepts/generate")
def generate_concepts(
    request: Request,
    organization_id: str,
    req: AnalyzeAIReq,
    x_bayan_tenant_id: Optional[str] = Header(default=None, alias="X-Bayan-Tenant-ID"),
) -> Dict[str, Any]:
    service, _, _ = _get_workflow_runtime(request)
    return _exec(
        lambda: (
            enforce_tenant_header(organization_id, x_bayan_tenant_id),
            service.generate_concepts(
                organization_id,
                operator_name=_request_principal(request).audit_actor,
                regenerate=req.regenerate,
                use_ai=req.use_ai,
                approve_external_ai=req.approve_external_ai,
            ),
        )[1]
    )


@router.post("/organizations/{organization_id}/concepts/{concept_id}/review")
def review_concept(
    request: Request,
    organization_id: str,
    concept_id: str,
    req: ReviewDecisionReq,
    x_bayan_tenant_id: Optional[str] = Header(default=None, alias="X-Bayan-Tenant-ID"),
) -> Dict[str, Any]:
    service, _, _ = _get_workflow_runtime(request)
    return _exec(
        lambda: (
            enforce_tenant_header(organization_id, x_bayan_tenant_id),
            service.review_concept(
                organization_id,
                concept_id,
                decision=req.decision,
                operator_name=_request_principal(request).audit_actor,
                name_ar=req.name_ar,
                description=req.description,
                synonyms=req.synonyms,
                synonyms_en=req.synonyms_en,
                semantic_type=req.semantic_type,
                classification=req.classification,
                domain_id=req.domain_id,
                note=req.note,
            ),
        )[1]
    )


@router.post("/organizations/{organization_id}/stages/{stage}/approve-all")
def bulk_approve(
    request: Request,
    organization_id: str,
    stage: str,
    req: ActorReq,
    x_bayan_tenant_id: Optional[str] = Header(default=None, alias="X-Bayan-Tenant-ID"),
) -> Dict[str, Any]:
    service, _, _ = _get_workflow_runtime(request)
    return _exec(
        lambda: (
            enforce_tenant_header(organization_id, x_bayan_tenant_id),
            service.bulk_approve_stage(
                organization_id, stage=stage, operator_name=_request_principal(request).audit_actor
            ),
        )[1]
    )


@router.get("/organizations/{organization_id}/relationships/summary")
def relationship_summary(
    request: Request,
    organization_id: str,
    x_bayan_tenant_id: Optional[str] = Header(default=None, alias="X-Bayan-Tenant-ID"),
) -> Dict[str, Any]:
    service, _, _ = _get_workflow_runtime(request)
    return _exec(
        lambda: (
            enforce_tenant_header(organization_id, x_bayan_tenant_id),
            service.relationship_service.get_summary(organization_id),
        )[1]
    )


@router.post("/organizations/{organization_id}/relationships/analyze")
def analyze_relationships(
    request: Request,
    organization_id: str,
    req: AnalyzeAIReq,
    x_bayan_tenant_id: Optional[str] = Header(default=None, alias="X-Bayan-Tenant-ID"),
) -> Dict[str, Any]:
    service, _, _ = _get_workflow_runtime(request)
    return _exec(
        lambda: (
            enforce_tenant_header(organization_id, x_bayan_tenant_id),
            service.relationship_service.generate_candidates(
                organization_id,
                operator_name=_request_principal(request).audit_actor,
                use_ai=req.use_ai,
                approve_external_ai=req.approve_external_ai,
            ),
        )[1]
    )


@router.post("/organizations/{organization_id}/relationships/{relationship_id}/review")
def review_relationship(
    request: Request,
    organization_id: str,
    relationship_id: str,
    req: ReviewDecisionReq,
    x_bayan_tenant_id: Optional[str] = Header(default=None, alias="X-Bayan-Tenant-ID"),
) -> Dict[str, Any]:
    service, _, _ = _get_workflow_runtime(request)
    return _exec(
        lambda: (
            enforce_tenant_header(organization_id, x_bayan_tenant_id),
            service.relationship_service.review_relationship(
                organization_id,
                relationship_id,
                decision=req.decision,
                operator_name=_request_principal(request).audit_actor,
                note=req.note,
            ),
        )[1]
    )


@router.post("/organizations/{organization_id}/relationships/manual")
def manual_relationship(
    request: Request,
    organization_id: str,
    req: ManualRelationshipReq,
    x_bayan_tenant_id: Optional[str] = Header(default=None, alias="X-Bayan-Tenant-ID"),
) -> Dict[str, Any]:
    service, _, _ = _get_workflow_runtime(request)
    return _exec(
        lambda: (
            enforce_tenant_header(organization_id, x_bayan_tenant_id),
            service.relationship_service.create_manual_relationship(
                organization_id,
                source_column_refs=req.source_column_refs,
                target_column_refs=req.target_column_refs,
                cardinality=req.cardinality,
                label=req.label,
                rationale=req.rationale,
                operator_name=_request_principal(request).audit_actor,
            ),
        )[1]
    )


@router.patch("/organizations/{organization_id}/relationships/{relationship_id}")
def edit_relationship(
    request: Request,
    organization_id: str,
    relationship_id: str,
    req: EditRelationshipReq,
    x_bayan_tenant_id: Optional[str] = Header(default=None, alias="X-Bayan-Tenant-ID"),
) -> Dict[str, Any]:
    service, _, _ = _get_workflow_runtime(request)
    return _exec(
        lambda: (
            enforce_tenant_header(organization_id, x_bayan_tenant_id),
            service.relationship_service.edit_relationship(
                organization_id,
                relationship_id,
                label=req.label,
                rationale=req.rationale,
                cardinality=req.cardinality,
                operator_name=_request_principal(request).audit_actor,
            ),
        )[1]
    )


@router.post("/organizations/{organization_id}/escalations/{escalation_id}/resolve")
def resolve_escalation(
    request: Request,
    organization_id: str,
    escalation_id: str,
    req: ReviewDecisionReq,
    x_bayan_tenant_id: Optional[str] = Header(default=None, alias="X-Bayan-Tenant-ID"),
) -> Dict[str, Any]:
    service, _, _ = _get_workflow_runtime(request)
    return _exec(
        lambda: (
            enforce_tenant_header(organization_id, x_bayan_tenant_id),
            service.resolve_escalation(
                organization_id,
                escalation_id,
                decision=req.decision,
                operator_name=_request_principal(request).audit_actor,
                note=req.note,
            ),
        )[1]
    )


@router.get("/organizations/{organization_id}/stages/reset-status")
def stage_reset_status(
    request: Request,
    organization_id: str,
    x_bayan_tenant_id: Optional[str] = Header(default=None, alias="X-Bayan-Tenant-ID"),
) -> Dict[str, Any]:
    service, _, _ = _get_workflow_runtime(request)
    return _exec(
        lambda: (
            enforce_tenant_header(organization_id, x_bayan_tenant_id),
            get_stage_reset_status(service, organization_id),
        )[1]
    )


@router.get("/organizations/{organization_id}/stages/reset-history")
def stage_reset_history(
    request: Request,
    organization_id: str,
    x_bayan_tenant_id: Optional[str] = Header(default=None, alias="X-Bayan-Tenant-ID"),
) -> List[Dict[str, Any]]:
    service, _, _ = _get_workflow_runtime(request)
    return _exec(
        lambda: (
            enforce_tenant_header(organization_id, x_bayan_tenant_id),
            get_stage_reset_history(service, organization_id),
        )[1]
    )


@router.post("/organizations/{organization_id}/stages/{stage_ref}/reset")
def reset_stage_endpoint(
    request: Request,
    organization_id: str,
    stage_ref: str,
    req: StageResetReq,
    x_bayan_tenant_id: Optional[str] = Header(default=None, alias="X-Bayan-Tenant-ID"),
) -> Dict[str, Any]:
    service, _, _ = _get_workflow_runtime(request)
    return _exec(
        lambda: (
            enforce_tenant_header(organization_id, x_bayan_tenant_id),
            reset_stage(
                service,
                organization_id,
                stage_ref,
                _request_principal(request).audit_actor,
                reason=req.reason,
                confirm=req.confirm,
            ),
        )[1]
    )


@router.get("/organizations/{organization_id}/activation/readiness")
def activation_readiness(
    request: Request,
    organization_id: str,
    x_bayan_tenant_id: Optional[str] = Header(default=None, alias="X-Bayan-Tenant-ID"),
) -> Dict[str, Any]:
    service, _, _ = _get_workflow_runtime(request)
    return _exec(
        lambda: (
            enforce_tenant_header(organization_id, x_bayan_tenant_id),
            get_activation_readiness(service, organization_id),
        )[1]
    )


@router.post("/organizations/{organization_id}/activation/ai-readiness")
def activation_ai_advice(
    request: Request,
    organization_id: str,
    req: AnalyzeAIReq,
    x_bayan_tenant_id: Optional[str] = Header(default=None, alias="X-Bayan-Tenant-ID"),
) -> Dict[str, Any]:
    service, _, gateway = _get_workflow_runtime(request)
    return _exec(
        lambda: (
            enforce_tenant_header(organization_id, x_bayan_tenant_id),
            ai_activation_readiness(
                service,
                organization_id,
                ai_gateway=gateway,
                approve_external_ai=req.approve_external_ai,
            ),
        )[1]
    )


@router.post("/organizations/{organization_id}/activate")
def activate_org(
    request: Request,
    organization_id: str,
    req: ActivateReq,
    x_bayan_tenant_id: Optional[str] = Header(default=None, alias="X-Bayan-Tenant-ID"),
) -> Dict[str, Any]:
    service, bridge, _ = _get_workflow_runtime(request)
    return _exec(
        lambda: (
            enforce_tenant_header(organization_id, x_bayan_tenant_id),
            activate_organization(
                service,
                organization_id,
                operator_name=_request_principal(request).audit_actor,
                handover_note=req.handover_note,
                bridge=bridge,
            ),
        )[1]
    )


@router.get("/organizations/{organization_id}/manifest")
def stage_manifest(
    request: Request,
    organization_id: str,
    x_bayan_tenant_id: Optional[str] = Header(default=None, alias="X-Bayan-Tenant-ID"),
) -> Dict[str, Any]:
    service, _, _ = _get_workflow_runtime(request)
    return _exec(
        lambda: (
            enforce_tenant_header(organization_id, x_bayan_tenant_id),
            build_stage_manifest(service.get_organization(organization_id)),
        )[1]
    )


@router.get("/organizations/{organization_id}/catalog")
def approved_catalog_v2(
    request: Request,
    organization_id: str,
    allowed_views: Optional[List[str]] = Query(default=None),
    x_bayan_tenant_id: Optional[str] = Header(default=None, alias="X-Bayan-Tenant-ID"),
) -> List[Dict[str, Any]]:
    service, bridge, _ = _get_workflow_runtime(request)

    def _run():
        enforce_tenant_header(organization_id, x_bayan_tenant_id)
        org = service.get_organization(organization_id)
        tenant_id = str(org.get("tenant_id") or org["id"])
        entries = bridge.get_official_catalog(tenant_id=tenant_id, allowed_views=allowed_views)
        return [asdict(e) for e in entries]

    return _exec(_run)


@router.get("/organizations/{organization_id}/semantic-search")
def semantic_search_endpoint(
    request: Request,
    organization_id: str,
    q: str = Query(min_length=2, max_length=200),
    limit: int = Query(default=8, ge=1, le=25),
    x_bayan_tenant_id: Optional[str] = Header(default=None, alias="X-Bayan-Tenant-ID"),
) -> List[Dict[str, Any]]:
    service, bridge, _ = _get_workflow_runtime(request)

    def _run():
        enforce_tenant_header(organization_id, x_bayan_tenant_id)
        org = service.get_organization(organization_id)
        tenant_id = str(org.get("tenant_id") or org["id"])
        results = bridge.search(q, tenant_id=tenant_id, limit=limit)
        return [asdict(r) for r in results]

    return _exec(_run)


@router.post("/organizations/{organization_id}/monitor")
def monitor_org(
    request: Request,
    organization_id: str,
    req: MonitorReq,
    x_bayan_tenant_id: Optional[str] = Header(default=None, alias="X-Bayan-Tenant-ID"),
) -> Dict[str, Any]:
    service, _, _ = _get_workflow_runtime(request)
    return _exec(
        lambda: (
            enforce_tenant_header(organization_id, x_bayan_tenant_id),
            monitor_schema(
                service,
                organization_id,
                operator_name=_request_principal(request).audit_actor,
                passwords=req.passwords,
            ),
        )[1]
    )


@router.post("/organizations/{organization_id}/monitoring/start")
def start_async_monitor_org(
    request: Request,
    organization_id: str,
    req: MonitorReq,
    x_bayan_tenant_id: Optional[str] = Header(default=None, alias="X-Bayan-Tenant-ID"),
) -> Dict[str, Any]:
    service, _, _ = _get_workflow_runtime(request)
    return _exec(
        lambda: (
            enforce_tenant_header(organization_id, x_bayan_tenant_id),
            start_async_monitoring(
                service,
                organization_id,
                operator_name=_request_principal(request).audit_actor,
                passwords=req.passwords,
            ),
        )[1]
    )


@router.post("/organizations/{organization_id}/schema-changes/{change_id}/decision")
def schema_change_decision(
    request: Request,
    organization_id: str,
    change_id: str,
    req: SchemaChangeDecisionReq,
    x_bayan_tenant_id: Optional[str] = Header(default=None, alias="X-Bayan-Tenant-ID"),
) -> Dict[str, Any]:
    service, _, _ = _get_workflow_runtime(request)
    return _exec(
        lambda: (
            enforce_tenant_header(organization_id, x_bayan_tenant_id),
            decide_schema_change(
                service,
                organization_id,
                change_id,
                decision=req.decision,
                operator_name=_request_principal(request).audit_actor,
                note=req.note,
                updated_label_ar=req.updated_label_ar,
            ),
        )[1]
    )


@router.post("/organizations/{organization_id}/schema-changes/ai-proposals")
def schema_change_ai_proposals(
    request: Request,
    organization_id: str,
    req: AnalyzeAIReq,
    x_bayan_tenant_id: Optional[str] = Header(default=None, alias="X-Bayan-Tenant-ID"),
) -> Dict[str, Any]:
    service, _, gateway = _get_workflow_runtime(request)
    return _exec(
        lambda: (
            enforce_tenant_header(organization_id, x_bayan_tenant_id),
            ai_changed_semantics(
                service,
                organization_id,
                ai_gateway=gateway,
                approve_external_ai=req.approve_external_ai,
            ),
        )[1]
    )


@router.post("/organizations/{organization_id}/sync")
def sync_org_catalog(
    request: Request,
    organization_id: str,
    req: ActorReq,
    x_bayan_tenant_id: Optional[str] = Header(default=None, alias="X-Bayan-Tenant-ID"),
) -> Dict[str, Any]:
    service, bridge, _ = _get_workflow_runtime(request)
    return _exec(
        lambda: (
            enforce_tenant_header(organization_id, x_bayan_tenant_id),
            synchronize_semantic_catalog(
                service,
                organization_id,
                operator_name=_request_principal(request).audit_actor,
                bridge=bridge,
            ),
        )[1]
    )


@router.post("/organizations/{organization_id}/archive")
def archive_org(
    request: Request,
    organization_id: str,
    req: ActorReq,
    x_bayan_tenant_id: Optional[str] = Header(default=None, alias="X-Bayan-Tenant-ID"),
) -> Dict[str, Any]:
    service, _, _ = _get_workflow_runtime(request)
    return _exec(
        lambda: (
            enforce_tenant_header(organization_id, x_bayan_tenant_id),
            service.archive_organization(organization_id, _request_principal(request).audit_actor),
        )[1]
    )
