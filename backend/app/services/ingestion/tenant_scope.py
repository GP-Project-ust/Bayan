"""سياق عزل المؤسسة والتصنيفات المصرح بها — منع افتراضي."""

import re
import unicodedata
from dataclasses import dataclass
from typing import Self

from app.services.ingestion.exceptions import TenantScopeError
from app.services.ingestion.models import PUBLIC_SECURITY_LEVELS, SUPPORTED_SECURITY_LEVELS

_MAX_TENANT_ID_LENGTH = 200
_WHITESPACE_RUN = re.compile(r"\s+")
# Cc = محارف تحكم، Cf = محارف تنسيق/غير مرئية، Cs = بدائل، Co = خاصة،
# Cn = غير مخصصة، Zl/Zp = فواصل أسطر وفقرات. كلها تفتح باب انتحال بصري
# لهوية مؤسسة أخرى أو كسر عقد الحمولة.
_FORBIDDEN_UNICODE_CATEGORIES = frozenset({"Cc", "Cf", "Cs", "Co", "Cn", "Zl", "Zp"})


def validate_tenant_id(value: str) -> str:
    """تطبيع مؤسسة صريح ورفض المحارف غير المرئية أو المتحكمات.

    التطبيع مقصود ومحدود: NFC ثم تحويل كل سلسلة مسافات إلى مسافة ASCII واحدة.
    لا تُحذف الحروف ولا التشكيلات العربية ولا تُغيَّر الهمزات، لأن ذلك يغيّر
    هوية المؤسسة القانونية. الهدف منع ``Tenant A`` و``Tenant\\u200bA`` من
    الظهور كأنهما مستأجران مختلفان مع تشابه بصري مضلل.
    """

    if not isinstance(value, str):
        raise TenantScopeError("سياق المؤسسة مطلوب")
    stripped = value.strip()
    if not stripped:
        raise TenantScopeError("سياق المؤسسة مفقود أو غير صالح")
    for character in stripped:
        if unicodedata.category(character) in _FORBIDDEN_UNICODE_CATEGORIES:
            raise TenantScopeError("سياق المؤسسة يتضمن محارف غير مرئية أو غير صالحة")
    normalized = unicodedata.normalize("NFC", stripped)
    normalized = _WHITESPACE_RUN.sub(" ", normalized)
    if not normalized or len(normalized) > _MAX_TENANT_ID_LENGTH:
        raise TenantScopeError("سياق المؤسسة مفقود أو غير صالح")
    return normalized


@dataclass(frozen=True, slots=True)
class TenantScope:
    """هوية مؤسسة موثوقة مع حد التصنيفات المفوضة.

    لا تملك الفئة قيمة افتراضية للتصنيفات كي لا يتحول نسيان التفويض إلى سماح.
    """

    tenant_id: str
    allowed_security_levels: frozenset[str]

    def __post_init__(self) -> None:
        object.__setattr__(self, "tenant_id", validate_tenant_id(self.tenant_id))
        levels = frozenset(self.allowed_security_levels)
        if not levels:
            raise TenantScopeError("يجب تحديد تصنيف واحد مصرح به على الأقل")
        unknown = levels - SUPPORTED_SECURITY_LEVELS
        if unknown:
            raise TenantScopeError("يتضمن السياق تصنيفاً أمنياً غير معتمد")
        object.__setattr__(self, "allowed_security_levels", levels)

    @classmethod
    def public_only(cls, tenant_id: str) -> Self:
        """سياق تطوير مقيد بالمحتوى العام عند غياب RBAC المنتج."""

        return cls(tenant_id=tenant_id, allowed_security_levels=PUBLIC_SECURITY_LEVELS)

    @classmethod
    def for_ingestion(cls, tenant_id: str, security_level: str) -> Self:
        """سياق ضيق لمستند واحد موثوق المصدر أثناء الفهرسة."""

        return cls(tenant_id=tenant_id, allowed_security_levels=frozenset({security_level}))

    @classmethod
    def trusted_all(cls, tenant_id: str) -> Self:
        """سياق صيانة داخلي؛ لا يُنشأ من مدخل عميل عام."""

        return cls(tenant_id=tenant_id, allowed_security_levels=SUPPORTED_SECURITY_LEVELS)

    def require_level(self, security_level: str) -> None:
        """رفض مورد لا يقع ضمن التصنيفات المفوضة."""

        if security_level not in self.allowed_security_levels:
            raise TenantScopeError("التصنيف الأمني للمستند خارج نطاق التفويض")
