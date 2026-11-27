"""مهايئ بوابة الذكاء الاصطناعي المهيكل فوق app.llm.provider.get_llm الرسمي دون أي مزود منافس."""

from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass
from typing import Any, Callable, Dict, List, Literal, Optional, Protocol, Type

from pydantic import BaseModel, ConfigDict, Field, ValidationError

from app.core.config import get_settings
from app.llm.provider import get_llm

ARABIC_CHAR_RE = re.compile(r"[\u0600-\u06FF]")


class AIServiceError(RuntimeError):
    """خطأ منضبط عند استدعاء طبقة الذكاء الاصطناعي المهيكل."""

    def __init__(
        self,
        code: str,
        message: str,
        *,
        status_code: int = 502,
        retryable: bool = True,
    ):
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code
        self.retryable = retryable


class _StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class AISemanticColumnItem(_StrictModel):
    physical_ref: str = Field(min_length=3, max_length=600)
    label_ar: str = Field(min_length=2, max_length=160, pattern=r"[\u0600-\u06FF]")
    description_ar: str = Field(min_length=4, max_length=800, pattern=r"[\u0600-\u06FF]")
    synonyms_ar: List[str] = Field(default_factory=list, max_length=12)
    synonyms_en: List[str] = Field(default_factory=list, max_length=12)
    semantic_type: Literal[
        "identifier",
        "descriptive_attribute",
        "time_attribute",
        "measure_additive",
        "measure_semi_additive",
        "measure_non_additive",
        "foreign_key",
        "unknown",
    ]
    confidence: Optional[float] = Field(default=None, ge=0, le=1)
    reasoning_ar: Optional[str] = Field(default=None, max_length=800)


class AISemanticTableItem(_StrictModel):
    physical_ref: str = Field(min_length=3, max_length=600)
    domain_key: str = Field(min_length=2, max_length=120)
    domain_name_ar: str = Field(min_length=2, max_length=160, pattern=r"[\u0600-\u06FF]")
    domain_description_ar: str = Field(min_length=4, max_length=800, pattern=r"[\u0600-\u06FF]")
    label_ar: str = Field(min_length=2, max_length=160, pattern=r"[\u0600-\u06FF]")
    description_ar: str = Field(min_length=4, max_length=800, pattern=r"[\u0600-\u06FF]")
    synonyms_ar: List[str] = Field(default_factory=list, max_length=12)
    synonyms_en: List[str] = Field(default_factory=list, max_length=12)
    entity_type: Literal[
        "business_entity", "dimension", "fact", "bridge", "reference", "technical", "unknown"
    ]
    confidence: Optional[float] = Field(default=None, ge=0, le=1)
    reasoning_ar: Optional[str] = Field(default=None, max_length=800)
    columns: List[AISemanticColumnItem] = Field(default_factory=list, max_length=250)


class AISemanticRelationshipItem(_StrictModel):
    source_table_ref: str = Field(min_length=3, max_length=600)
    target_table_ref: str = Field(min_length=3, max_length=600)
    source_columns: List[str] = Field(min_length=1, max_length=16)
    target_columns: List[str] = Field(min_length=1, max_length=16)
    cardinality: Literal["one_to_one", "one_to_many", "many_to_one", "many_to_many", "unknown"]
    business_label_ar: str = Field(min_length=2, max_length=240, pattern=r"[\u0600-\u06FF]")
    rationale_ar: str = Field(min_length=4, max_length=800, pattern=r"[\u0600-\u06FF]")
    confidence: Optional[float] = Field(default=None, ge=0, le=1)
    evidence: List[str] = Field(default_factory=list, max_length=12)


class AISemanticResponse(_StrictModel):
    tables: List[AISemanticTableItem] = Field(default_factory=list, max_length=200)
    relationships: List[AISemanticRelationshipItem] = Field(default_factory=list, max_length=120)


class AIDomainDefinitionItem(_StrictModel):
    key: str = Field(min_length=2, max_length=120)
    name_ar: str = Field(min_length=2, max_length=160, pattern=r"[\u0600-\u06FF]")
    description_ar: str = Field(min_length=4, max_length=1200, pattern=r"[\u0600-\u06FF]")
    evidence: List[str] = Field(default_factory=list, max_length=20)
    confidence: float = Field(ge=0, le=1)


class AIDomainAssignmentItem(_StrictModel):
    table_ref: str = Field(min_length=3, max_length=600)
    domain_key: Optional[str] = Field(default=None, max_length=120)
    confidence: float = Field(ge=0, le=1)
    reasoning_ar: str = Field(min_length=4, max_length=1200, pattern=r"[\u0600-\u06FF]")
    evidence: List[str] = Field(default_factory=list, max_length=20)
    column_refs: List[str] = Field(default_factory=list, max_length=60)
    relationship_refs: List[str] = Field(default_factory=list, max_length=40)


class AIDomainOverlapItem(_StrictModel):
    domain_keys: List[str] = Field(min_length=2, max_length=8)
    reason_ar: str = Field(min_length=4, max_length=800, pattern=r"[\u0600-\u06FF]")


class AIDomainConflictItem(_StrictModel):
    table_ref: str = Field(min_length=3, max_length=600)
    candidate_domain_keys: List[str] = Field(min_length=2, max_length=8)
    reason_ar: str = Field(min_length=4, max_length=800, pattern=r"[\u0600-\u06FF]")


class AIDomainClassificationResponse(_StrictModel):
    domains: List[AIDomainDefinitionItem] = Field(default_factory=list, max_length=80)
    assignments: List[AIDomainAssignmentItem] = Field(default_factory=list, max_length=300)
    overlapping_domains: List[AIDomainOverlapItem] = Field(default_factory=list, max_length=40)
    conflicts: List[AIDomainConflictItem] = Field(default_factory=list, max_length=60)


@dataclass(frozen=True)
class GatewayResult:
    """مخرج موحد لطلب الإخراج المهيكل."""

    provider: str
    model: str
    parsed: Dict[str, Any]
    input_tokens: Optional[int] = None
    output_tokens: Optional[int] = None
    total_tokens: Optional[int] = None


class StructuredAIGateway(Protocol):
    """عقد البوابة الموحدة للإخراج المهيكل؛ يستبعد أي مصنع مزودين موازٍ."""

    def generate_structured(
        self,
        *,
        system_prompt: str,
        user_payload: Any,
        response_model: Type[BaseModel],
        role: str = "analyst",
    ) -> GatewayResult: ...


class OfficialLLMStructuredGateway:
    """الاعتماد المباشر على app.llm.provider.get_llm الرسمي في بيان."""

    def __init__(
        self,
        *,
        llm_factory: Callable[[str], Any] = get_llm,
        deterministic_fallback: Optional[Callable[[Type[BaseModel], Any], Dict[str, Any]]] = None,
    ):
        self._llm_factory = llm_factory
        self._deterministic_fallback = deterministic_fallback

    def describe_configuration(self) -> Dict[str, Any]:
        settings = get_settings()
        provider = str(settings.llm_provider or "mock").strip().lower()
        model_name = "bayan-mock" if provider == "mock" else str(settings.llm_model or "default")
        return {
            "configured": True,
            "provider": provider,
            "model": model_name,
            "official_gateway": "app.llm.provider.get_llm",
            "ollama_base_url": settings.ollama_base_url if provider == "ollama" else None,
            "external_ai_requires_approval": provider not in {"mock", "ollama"},
            "secret_stored": False,
        }

    def generate_structured(
        self,
        *,
        system_prompt: str,
        user_payload: Any,
        response_model: Type[BaseModel],
        role: str = "analyst",
    ) -> GatewayResult:
        settings = get_settings()
        provider = str(settings.llm_provider or "mock").strip().lower()
        model = self._llm_factory(role)

        # إذا كان المزود الرسمي في وضع mock أو لا يدعم with_structured_output
        if provider == "mock" or not hasattr(model, "with_structured_output"):
            if self._deterministic_fallback is not None:
                parsed = self._deterministic_fallback(response_model, user_payload)
                validated = response_model.model_validate(parsed).model_dump()
                return GatewayResult(
                    provider=provider,
                    model="deterministic-mock",
                    parsed=validated,
                )
            raise AIServiceError(
                "ai_structured_unsupported",
                "النموذج الحالي في وضع mock ولا يدعم الإخراج المهيكل المباشر بدون مُولِّد بديل.",
                status_code=400,
                retryable=False,
            )

        from langchain_core.messages import HumanMessage, SystemMessage

        payload_text = (
            user_payload
            if isinstance(user_payload, str)
            else json.dumps(user_payload, ensure_ascii=False, sort_keys=True)
        )
        try:
            structured = model.with_structured_output(response_model)
            result = structured.invoke(
                [
                    SystemMessage(content=system_prompt),
                    HumanMessage(content=payload_text),
                ]
            )
            if isinstance(result, BaseModel):
                data = result.model_dump()
            elif isinstance(result, dict):
                data = response_model.model_validate(result).model_dump()
            else:
                data = response_model.model_validate_json(str(result)).model_dump()
        except ValidationError as exc:
            raise AIServiceError(
                "ai_schema_mismatch",
                f"مخرج الذكاء الاصطناعي لم يطابق المخطط المطلوب: {exc}",
                status_code=502,
                retryable=True,
            ) from exc
        except AIServiceError:
            raise
        except Exception as exc:
            raise AIServiceError(
                "ai_provider_failure",
                f"تعذر استدعاء بوابة LLM الرسمية: {str(exc)[:220]}",
                status_code=502,
                retryable=True,
            ) from exc

        return GatewayResult(
            provider=provider,
            model=str(settings.llm_model or provider),
            parsed=data,
        )


def external_ai_enabled_by_default() -> bool:
    """قراءة سماحية البيئة للـ AI السحابي من الإعدادات الرسمية."""
    settings = get_settings()
    provider = str(settings.llm_provider or "mock").strip().lower()
    if provider == "mock":
        return False
    return os.getenv("BAYAN_ALLOW_EXTERNAL_AI", "true").strip().lower() in {"1", "true", "yes"}
