"""اشتقاق الهويات الحتمية لخط المستندات من SHA-256.

كل دالة تستخدم نطاقاً وإصداراً صريحين حتى لا تُعاد دلالة بصمة واحدة بين
هوية الملف والمستند والإصدار والمقطع ونقطة Qdrant.
"""

import hashlib
import json
import uuid
from collections.abc import Mapping

IDENTITY_SCHEME = "bayan.document-ingestion.sha256.v1"


def sha256_bytes(value: bytes) -> str:
    """إرجاع SHA-256 الكامل بوصفه نصاً سداسياً صغير الأحرف."""

    return hashlib.sha256(value).hexdigest()


def sha256_text(value: str) -> str:
    """بصمة نص UTF-8 دون أي تطبيع ضمني."""

    return sha256_bytes(value.encode("utf-8"))


def canonical_sha256(kind: str, *parts: object) -> str:
    """بصمة مفصولة المجال لمدخلات JSON قانونية وحتمية."""

    payload = {
        "scheme": IDENTITY_SCHEME,
        "kind": kind,
        "parts": [_canonical_part(part) for part in parts],
    }
    encoded = json.dumps(
        payload,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    ).encode("utf-8")
    return sha256_bytes(encoded)


def document_identity(tenant_id: str, source_reference: str) -> str:
    """هوية وثيقة ثابتة تفصل المؤسسة والمسار المنطقي للمصدر."""

    return canonical_sha256("document", tenant_id, source_reference)


def version_identity(document_id: str, version_no: str, file_hash: str) -> str:
    """هوية إصدار تفصل الوثيقة ورقم الإصدار ومحتواه الفعلي."""

    return canonical_sha256("document-version", document_id, version_no, file_hash)


def chunk_identity(
    version_id: str,
    chunking_fingerprint: str,
    chunk_no: int,
    start_offset: int,
    end_offset: int,
    content_hash: str,
) -> str:
    """هوية مقطع تميز الموضع حتى عند تكرار الفقرة نفسها."""

    return canonical_sha256(
        "document-chunk",
        version_id,
        chunking_fingerprint,
        chunk_no,
        start_offset,
        end_offset,
        content_hash,
    )


def indexing_identity(
    version_id: str,
    chunking_fingerprint: str,
    embedding_fingerprint: str,
) -> str:
    """معرف جيل فهرسة يتغير عند تغير النص أو إعداد التقطيع أو التضمين."""

    return canonical_sha256(
        "indexing-generation",
        version_id,
        chunking_fingerprint,
        embedding_fingerprint,
    )


def point_identity(chunk_id: str, embedding_fingerprint: str) -> tuple[str, str]:
    """إرجاع (SHA-256 الكامل، UUID صالح) لنقطة Qdrant.

    تُشتق بايتات UUID من أول 128 بت من SHA-256، ثم تضبط بتات نسخة UUID 5
    ومتغير RFC 4122. لا يُستخدم UUID وحده كمرجع؛ تحفظ البصمة الكاملة في
    الحمولة والمخزن المرجعي.
    """

    digest = canonical_sha256("qdrant-point", chunk_id, embedding_fingerprint)
    point_uuid = uuid.UUID(bytes=bytes.fromhex(digest)[:16], version=5)
    return digest, str(point_uuid)


def _canonical_part(value: object) -> object:
    if isinstance(value, Mapping):
        return {str(key): _canonical_part(item) for key, item in sorted(value.items())}
    if isinstance(value, (list, tuple)):
        return [_canonical_part(item) for item in value]
    if isinstance(value, (str, int, float, bool)) or value is None:
        return value
    return str(value)
