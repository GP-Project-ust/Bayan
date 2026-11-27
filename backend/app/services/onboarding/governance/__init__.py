"""وحدات الحوكمة والتفويض وإعادة تعيين المراحل 0–8."""

from .identity import (
    CATALOG_READ_PERMISSION,
    ONBOARDING_ADMIN_PERMISSION,
    ONBOARDING_RESET_PERMISSION,
    AuthorizationError,
    Authorizer,
    Principal,
    TenantPermissionAuthorizer,
    enforce_tenant_header,
)
from .stage_reset import (
    STAGE_ALIASES,
    STAGES_ORDER,
    get_stage_reset_history,
    get_stage_reset_status,
    reset_stage,
    resolve_stage,
)

__all__ = [
    "Authorizer",
    "AuthorizationError",
    "CATALOG_READ_PERMISSION",
    "ONBOARDING_ADMIN_PERMISSION",
    "ONBOARDING_RESET_PERMISSION",
    "Principal",
    "STAGE_ALIASES",
    "STAGES_ORDER",
    "TenantPermissionAuthorizer",
    "enforce_tenant_header",
    "get_stage_reset_history",
    "get_stage_reset_status",
    "reset_stage",
    "resolve_stage",
]
