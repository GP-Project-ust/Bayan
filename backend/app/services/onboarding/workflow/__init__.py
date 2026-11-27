"""حزمة تنسيق مسار التهيئة الذكية المراحل 0–8 والجسر الدلالي نحو pgvector و Catalog v2."""

from .bridge import (
    SemanticKnowledgeBridge,
    SemanticPublishResult,
    build_approved_semantics_map,
    build_stage_manifest,
)
from .models import (
    ApprovalRequiredError,
    ConflictError,
    NotFoundError,
    OnboardingError,
    ValidationError,
)
from .service import OnboardingWorkflowService
from .sync import (
    activate_organization,
    ai_activation_readiness,
    ai_changed_semantics,
    decide_schema_change,
    get_activation_readiness,
    monitor_schema,
    start_async_monitoring,
    synchronize_semantic_catalog,
)

__all__ = [
    "ApprovalRequiredError",
    "ConflictError",
    "NotFoundError",
    "OnboardingError",
    "OnboardingWorkflowService",
    "SemanticKnowledgeBridge",
    "SemanticPublishResult",
    "ValidationError",
    "activate_organization",
    "ai_activation_readiness",
    "ai_changed_semantics",
    "build_approved_semantics_map",
    "build_stage_manifest",
    "decide_schema_change",
    "get_activation_readiness",
    "monitor_schema",
    "start_async_monitoring",
    "synchronize_semantic_catalog",
]
