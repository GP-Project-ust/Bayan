"""طبقة التحقق الصارم من الهوية ونطاق المستأجر وصلاحيات التهيئة (Fail-Closed)."""

from __future__ import annotations

from dataclasses import dataclass
from typing import FrozenSet, Optional, Protocol

CATALOG_READ_PERMISSION = "onboarding.catalog.read"
ONBOARDING_ADMIN_PERMISSION = "onboarding.admin"
ONBOARDING_RESET_PERMISSION = "onboarding.reset"


class AuthorizationError(PermissionError):
    """خطأ تفويض منضبط يحمل رمز خطأ ورسالة عربية."""

    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code
        self.message = message


@dataclass(frozen=True)
class Principal:
    """هوية موثقة يحقنها middleware موثوق في ``request.state.principal``."""

    user_id: str
    tenant_id: str
    roles: FrozenSet[str]
    permissions: FrozenSet[str]
    membership_id: str
    session_id: str
    display_name: str = ""

    @property
    def audit_actor(self) -> str:
        return self.user_id

    @property
    def subject_id(self) -> str:
        return self.user_id

    @property
    def tenant_ids(self) -> FrozenSet[str]:
        return frozenset({self.tenant_id}) if self.tenant_id else frozenset()


class Authorizer(Protocol):
    def require(self, principal: Principal, tenant_id: str, permission: str) -> None: ...


class TenantPermissionAuthorizer:
    """تطبيق عزل المستأجر والصلاحية بمبدأ الرفض الافتراضي (Fail-Closed)."""

    def require(self, principal: Principal, tenant_id: str, permission: str) -> None:
        if not principal.user_id or not principal.session_id or not principal.membership_id:
            raise AuthorizationError("identity_required", "هوية المستخدم الموثقة مطلوبة.")
        if tenant_id not in principal.tenant_ids:
            raise AuthorizationError(
                "tenant_access_denied",
                "لا تملك الهوية صلاحية الوصول إلى نطاق هذا المستأجر.",
            )
        if permission not in principal.permissions:
            raise AuthorizationError(
                "permission_denied",
                "لا تملك الهوية الإذن المطلوب لتنفيذ هذه العملية.",
            )


def enforce_tenant_header(
    organization_id: str,
    x_bayan_tenant_id: Optional[str],
) -> None:
    """تحقق اختياري من اتساق الترويسة؛ لا تستخدم لإثبات الهوية أو العضوية."""
    tenant_hdr = (x_bayan_tenant_id or "").strip()
    if tenant_hdr and tenant_hdr != organization_id:
        raise AuthorizationError("tenant_access_denied", "تعارض في نطاق المستأجر بالطلب.")
