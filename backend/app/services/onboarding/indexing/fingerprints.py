"""حساب المعرّفات وبصمات المحتوى وإعدادات التضمين للفهرسة التزايدية."""

from __future__ import annotations

import hashlib
from typing import Any, Mapping

from app.core.config import Settings
from app.services.onboarding.discovery.fingerprints import canonical_json


def build_embedding_config_id(app_settings: Settings) -> str:
    """معرّف حتمي لإعداد التضمين الحالي يُجبر إعادة الفهرسة عند تغير النموذج أو الأبعاد."""
    provider = app_settings.embedding_provider.strip().lower()
    model = app_settings.embedding_model.strip()
    dims = int(app_settings.embedding_dimensions)
    return f"{provider}:{model}:{dims}:cosine"


def semantic_entry_id(
    *,
    tenant_id: str,
    source_id: str,
    entry_type: str,
    object_ref: str,
) -> str:
    """توليد معرّف مستقر وحتمي لكل سجل دلالي ضمن نطاق المستأجر والمصدر."""
    raw = f"{tenant_id}::{source_id}::{entry_type}::{object_ref}"
    digest = hashlib.sha256(raw.encode("utf-8")).hexdigest()[:24]
    return f"sem-{digest}"


def entry_content_hash(
    *,
    searchable_text: str,
    metadata_payload: Mapping[str, Any],
    metadata_fingerprint: str,
    embedding_config_id: str,
    classification: str,
) -> str:
    """بصمة SHA-256 شاملة تحدد متى يلزم إعادة التضمين أو التحديث."""
    payload = {
        "searchable_text": searchable_text,
        "metadata_payload": metadata_payload,
        "metadata_fingerprint": metadata_fingerprint,
        "embedding_config_id": embedding_config_id,
        "classification": classification,
    }
    return hashlib.sha256(canonical_json(payload).encode("utf-8")).hexdigest()
