"""طبقة التحقق الصارم من الهوية ونطاق المستأجر وصلاحيات التهيئة (Fail-Closed)."""

from __future__ import annotations

import os
from dataclasses import dataclass
from typing import FrozenSet, Optional, Protocol

CATALOG_READ_PERMISSION = "onboarding.catalog.read"
ONBOARDING_ADMIN_PERMISSION = "onboarding.admin"


class AuthorizationError(PermissionError):
    """خطأ تفويض منضبط يحمل رمز خطأ ورسالة عربية."""

    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code
        self.message = message


@dataclass(frozen=True)
class Principal:
    """الهوية الموثقة للطلب (تُحقن من بوابة/تطبيق بيان الرسمي)."""

    subject_id: str
    tenant_ids: FrozenSet[str]
    permissions: FrozenSet[str]
    display_name: str = ""

    @property
    def audit_actor(self) -> str:
        return self.subject_id


class Authorizer(Protocol):
    def require(self, principal: Principal, tenant_id: str, permission: str) -> None: ...


class TenantPermissionAuthorizer:
    """تطبيق عزل المستأجر والصلاحية بمبدأ الرفض الافتراضي (Fail-Closed)."""

    def require(self, principal: Principal, tenant_id: str, permission: str) -> None:
        if not principal.subject_id:
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
    x_bayan_permissions: Optional[str] = None,
    required_permission: Optional[str] = None,
) -> None:
    """فرض مطابقة ترويسة المستأجر عند تزويدها أو في وضع الإنتاج الصارم."""
    strict = os.getenv("BAYAN_ENV", "development").strip().lower() == "production"
    tenant_hdr = (x_bayan_tenant_id or "").strip()
    if strict and not tenant_hdr:
        raise AuthorizationError(
            "tenant_header_required", "ترويسة X-Bayan-Tenant-ID مطلوبة في هذا المسار."
        )
    if tenant_hdr and tenant_hdr != organization_id:
        allowed_set = {item.strip() for item in tenant_hdr.split(",") if item.strip()}
        if organization_id not in allowed_set:
            raise AuthorizationError(
                "tenant_access_denied",
                "تعارض في نطاق المستأجر المصرّح به في الطلب.",
            )
    if required_permission:
        perms = {p.strip() for p in (x_bayan_permissions or "").split(",") if p.strip()}
        if (strict or x_bayan_permissions is not None) and required_permission not in perms:
            raise AuthorizationError(
                "permission_denied",
                f"الصلاحية المطلوبة مفقودة: {required_permission}.",
            )
