"""نماذج واستثناءات مسار التهيئة الذكية (المراحل 0–8)."""

from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from typing import Any, Dict

FORBIDDEN_ACTORS = {"ai", "llm", "bot", "system", "النظام", "auto", "automatic"}


class OnboardingError(RuntimeError):
    """الخطأ الأساسي لمسار التهيئة الذكية."""

    def __init__(self, code: str, message: str, *, status_code: int = 400):
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code


class NotFoundError(OnboardingError):
    def __init__(self, message: str):
        super().__init__("not_found", message, status_code=404)


class ValidationError(OnboardingError):
    def __init__(self, message: str, code: str = "validation_error"):
        super().__init__(code, message, status_code=422)


class ConflictError(OnboardingError):
    def __init__(self, message: str, code: str = "conflict"):
        super().__init__(code, message, status_code=409)


class ApprovalRequiredError(OnboardingError):
    def __init__(self, message: str, code: str = "approval_required"):
        super().__init__(code, message, status_code=409)


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def canonical_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"), default=str)


def sha256_hash(value: Any) -> str:
    return hashlib.sha256(canonical_json(value).encode("utf-8")).hexdigest()


def validate_human_actor(actor: str, label: str = "اسم المشغل") -> str:
    cleaned = str(actor or "").strip()
    if len(cleaned) < 2:
        raise ValidationError(f"{label} مطلوب ويجب أن لا يقل عن حرفين.")
    if cleaned.lower() in FORBIDDEN_ACTORS:
        raise ValidationError(f"لا يُسمح بالتنفيذ الآلي؛ يلزم تحديد {label} بشري.")
    return cleaned


def compute_progress(org: Dict[str, Any]) -> int:
    """حساب نسبة التقدم الموثقة عبر المراحل 0–6."""
    score = 0
    if org.get("intake", {}).get("approved"):
        score += 15
    sources = org.get("data_sources") or []
    if sources and all(s.get("status") == "connected" for s in sources):
        score += 15
    if org.get("discovery", {}).get("status") == "completed":
        score += 20
    domains = org.get("domains") or []
    if domains and all(d.get("status") == "approved" for d in domains):
        score += 15
    concepts = org.get("concepts") or []
    if concepts and all(c.get("status") == "approved" for c in concepts):
        score += 15
    rels = org.get("relationships") or []
    if all(r.get("status") in {"approved", "rejected"} for r in rels) and (
        org.get("discovery", {}).get("status") == "completed"
    ):
        score += 10
    if org.get("status") == "active":
        score += 10
    return min(100, score)


def count_pending_reviews(org: Dict[str, Any]) -> int:
    pending = 0
    for bucket in ("domains", "concepts", "relationships", "schema_changes"):
        pending += sum(
            1 for item in (org.get(bucket) or []) if item.get("status") in {"pending", "escalated"}
        )
    return pending
