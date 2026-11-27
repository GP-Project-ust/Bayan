"""بوابة الذكاء الاصطناعي الدلالي للمراحل 3–8 وإثراء النطاقات والمفاهيم."""

from .ai_gateway import (
    AIDomainAssignmentItem,
    AIDomainClassificationResponse,
    AIDomainDefinitionItem,
    AISemanticColumnItem,
    AISemanticRelationshipItem,
    AISemanticResponse,
    AISemanticTableItem,
    AIServiceError,
    GatewayResult,
    OfficialLLMStructuredGateway,
    StructuredAIGateway,
)
from .domain_proposals import (
    DomainProposalValidationError,
    normalize_domain_analysis,
)

__all__ = [
    "AIDomainAssignmentItem",
    "AIDomainClassificationResponse",
    "AIDomainDefinitionItem",
    "AISemanticColumnItem",
    "AISemanticRelationshipItem",
    "AISemanticResponse",
    "AISemanticTableItem",
    "AIServiceError",
    "DomainProposalValidationError",
    "GatewayResult",
    "OfficialLLMStructuredGateway",
    "StructuredAIGateway",
    "normalize_domain_analysis",
]
