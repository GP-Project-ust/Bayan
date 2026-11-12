"""صفحة ونقاط فهرسة اختبارية — /dev/indexer (أداة تطوير لسلسلة RAG).

الغرض: أن يرى كل عضو فهرسة لوائح الجامعة التجريبية والبحث فيها من المتصفح
مباشرة (database/documents_demo/) — بنفس روح /dev/playground لسلسلة SQL.

هذا **تنفيذ ساذج مؤقت** عن قصد: تقطيع لكل «مادة» على حدة وتضمين عبر مصنع
Qdrant (ADR-005). مهمة طبقة التهيئة في Sprint 1 تستبدل منطق التقطيع والفهرسة
بحزمة فهرسة حقيقية — **الصفحة والنقاط تبقيان والربط يتغير من الداخل**.

تُعطَّل كلياً في بيئة الإنتاج عبر ENABLE_PLAYGROUND=false (مثل playground).
"""

import uuid
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from qdrant_client.http import models as qmodels

from app.core.config import get_settings
from app.core.logging import logger
from app.core.qdrant import (
    QDRANT_POLICIES_COLLECTION,
    ensure_collection,
    get_embeddings,
    get_qdrant_client,
)

router = APIRouter()

_INDEXER_HTML = Path(__file__).resolve().parents[3] / "static" / "indexer.html"
_DOCUMENTS_DIR = Path(__file__).resolve().parents[5] / "database" / "documents_demo"

# معرفات مقاطع حتمية: إعادة الفهرسة تحدّث النقاط نفسها ولا تكررها
_NAMESPACE = uuid.uuid5(uuid.NAMESPACE_URL, "bayan.dev.indexer")


class SearchRequest(BaseModel):
    """طلب بحث في اللوائح المفهرسة."""

    query: str = Field(..., min_length=2, max_length=500, description="سؤال البحث بالعربية")
    tenant: str | None = Field(
        default=None, description="حصر النتائج بمستأجر معين (عزل المستأجرين)"
    )
    top_k: int = Field(default=5, ge=1, le=20, description="عدد النتائج الأعلى تطابقًا")


def _require_enabled() -> None:
    if not get_settings().enable_playground:
        raise HTTPException(status_code=404, detail="أدوات التطوير معطّلة في هذه البيئة")


@router.get("/dev/indexer", include_in_schema=False)
def indexer_page() -> FileResponse:
    """تقديم صفحة فحص الفهرسة (ملف واحد خارج /api/v1 — أداة تطوير)."""
    _require_enabled()
    if not _INDEXER_HTML.exists():
        raise HTTPException(status_code=500, detail="ملف الواجهة مفقود: static/indexer.html")
    return FileResponse(_INDEXER_HTML, media_type="text/html")


@router.get("/dev/indexer/status")
def indexer_status() -> dict:
    """حالة مجموعة الفهرسة: هل Qdrant يعمل؟ كم مقطعًا مفهرسًا؟ ومَن المزوّد؟"""
    _require_enabled()
    settings = get_settings()
    base = {
        "collection": QDRANT_POLICIES_COLLECTION,
        "embedding_provider": settings.embedding_provider,
        "embedding_model": settings.embedding_model,
        "embedding_dimensions": settings.embedding_dimensions,
    }
    try:
        client = get_qdrant_client()
        info = client.get_collection(QDRANT_POLICIES_COLLECTION)
        return {
            **base,
            "qdrant": "up",
            "points_count": info.points_count,
        }
    except Exception as exc:  # noqa: BLE001 — أدوات تطوير: عطل واضح أفضل من انهيار
        logger.warning("تعذر الوصول إلى Qdrant من /dev/indexer: %s", exc)
        return {**base, "qdrant": "down", "points_count": 0, "error": str(exc)}


def _parse_document(path: Path) -> tuple[dict, list[dict]]:
    """تحليل ساذج: رأس بيانات ثم مقاطع «المادة ن». يعيد (الرأس، المقاطع)."""
    header: dict[str, str] = {}
    sections: list[dict] = []
    current: dict | None = None

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line:
            continue
        key, _, value = line.partition(":")
        key = key.strip()
        if key in ("المستند", "الإصدار", "التصنيف", "المستأجر") and current is None:
            header[key] = value.strip()
        elif line.startswith("المادة"):
            if current is not None:
                sections.append(current)
            current = {"section": line.split(":", 1)[0].strip(), "text": line}
        elif current is not None:
            current["text"] += f" {line}"
    if current is not None:
        sections.append(current)

    return header, sections


@router.post("/dev/indexer/ingest")
def indexer_ingest() -> dict:
    """فهرسة ساذجة لمستندات database/documents_demo/ في مجموعة bayan_policies.

    تقطيع كل «مادة» كمقطع مستقل + معرفات حتمية (إعادة الفهرسة تحدّث لا تكرر).
    """
    _require_enabled()
    if not _DOCUMENTS_DIR.is_dir():
        raise HTTPException(status_code=500, detail=f"مجلد المستندات مفقود: {_DOCUMENTS_DIR}")

    files = sorted(_DOCUMENTS_DIR.glob("*.txt"))
    if not files:
        raise HTTPException(
            status_code=404, detail="لا توجد مستندات .txt للفهرسة في documents_demo"
        )

    client = get_qdrant_client()
    try:
        ensure_collection(client)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=503,
            detail=f"تعذر الوصول إلى Qdrant — شغّل البنية التحتية أولًا (make infra): {exc}",
        ) from exc

    points = []
    for path in files:
        header, sections = _parse_document(path)
        if not sections:
            continue
        vectors = get_embeddings([section["text"] for section in sections])
        for section, vector in zip(sections, vectors, strict=True):
            points.append(
                qmodels.PointStruct(
                    id=str(uuid.uuid5(_NAMESPACE, f"{path.name}::{section['section']}")),
                    vector=vector,
                    payload={
                        "document": header.get("المستند", path.stem),
                        "version": header.get("الإصدار", ""),
                        "classification": header.get("التصنيف", "عام"),
                        "tenant": header.get("المستأجر", ""),
                        "section": section["section"],
                        "text": section["text"],
                        "source_file": path.name,
                    },
                )
            )

    if points:
        client.upsert(collection_name=QDRANT_POLICIES_COLLECTION, points=points, wait=True)

    settings = get_settings()
    result = {
        "files": len(files),
        "chunks": len(points),
        "collection": QDRANT_POLICIES_COLLECTION,
        "embedding_provider": settings.embedding_provider,
        "embedding_model": settings.embedding_model,
        "embedding_dimensions": settings.embedding_dimensions,
    }
    logger.info("فهرسة ساذجة عبر /dev/indexer: %s", result)
    return result


@router.post("/dev/indexer/search")
def indexer_search(request: SearchRequest) -> dict:
    """بحث متجهي في اللوائح المفهرسة مع فلترة صارمة بالمستأجر."""
    _require_enabled()
    client = get_qdrant_client()
    try:
        if not client.collection_exists(QDRANT_POLICIES_COLLECTION):
            raise HTTPException(
                status_code=409,
                detail="المجموعة غير موجودة بعد — اضغط «فهرسة اللوائح» أولًا",
            )

        query_filter = None
        if request.tenant:
            query_filter = qmodels.Filter(
                must=[
                    qmodels.FieldCondition(
                        key="tenant",
                        match=qmodels.MatchValue(value=request.tenant),
                    )
                ]
            )

        response = client.query_points(
            collection_name=QDRANT_POLICIES_COLLECTION,
            query=get_embeddings([request.query])[0],
            limit=request.top_k,
            query_filter=query_filter,
            with_payload=True,
        )
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=503,
            detail=f"تعذر البحث في Qdrant — شغّل البنية التحتية أولًا (make infra): {exc}",
        ) from exc

    hits = [
        {
            "score": round(point.score, 4),
            "payload": point.payload or {},
        }
        for point in response.points
    ]
    return {"query": request.query, "tenant": request.tenant, "hits": hits}
