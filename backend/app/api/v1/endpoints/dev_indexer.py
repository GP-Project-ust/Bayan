"""صفحة ونقاط فهرسة اختبارية — /dev/indexer (أداة تطوير لسلسلة RAG).

الغرض: أن يرى كل عضو فهرسة لوائح الجامعة التجريبية والبحث فيها من المتصفح
مباشرة (database/documents_demo/) — بنفس روح /dev/playground لسلسلة SQL.

يربط هذا الملف عقد الصفحة القائم بحزمة ``app.services.ingestion``؛ لا يعيش فيه
منطق تحميل أو تقطيع أو هوية أو وصول مباشر غير مقيد إلى Qdrant.

تُعطَّل كلياً في بيئة الإنتاج عبر ENABLE_PLAYGROUND=false (مثل playground).
"""

from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field, field_validator

from app.core.config import get_settings
from app.core.logging import logger
from app.core.qdrant import (
    QDRANT_POLICIES_COLLECTION,
    get_qdrant_client,
)
from app.services.ingestion.exceptions import (
    CollectionConfigurationError,
    DocumentLoadError,
    EmbeddingError,
    IngestionError,
    QdrantOperationError,
    RepositoryError,
    TenantIsolationError,
    TenantScopeError,
)
from app.services.ingestion.pipeline import build_ingestion_pipeline
from app.services.ingestion.repository import SQLiteIngestionRepository
from app.services.ingestion.tenant_scope import TenantScope

router = APIRouter()

_INDEXER_HTML = Path(__file__).resolve().parents[3] / "static" / "indexer.html"
_DOCUMENTS_DIR = Path(__file__).resolve().parents[5] / "database" / "documents_demo"
_STATE_DB = Path(__file__).resolve().parents[4] / ".ingestion" / "document_state.sqlite3"


class SearchRequest(BaseModel):
    """طلب بحث في اللوائح المفهرسة."""

    query: str = Field(..., min_length=2, max_length=500, description="سؤال البحث بالعربية")
    tenant: str | None = Field(
        default=None, description="حصر النتائج بمستأجر معين (عزل المستأجرين)"
    )
    top_k: int = Field(default=5, ge=1, le=20, description="عدد النتائج الأعلى تطابقًا")

    @field_validator("query")
    @classmethod
    def _validate_query(cls, value: str) -> str:
        """رفض الاستعلام الفارغ أو المسافات قبل الوصول إلى التضمين."""

        cleaned = value.strip()
        if len(cleaned) < 2:
            raise ValueError("نص البحث يجب أن يتضمن حرفين غير مسافتين على الأقل")
        return cleaned


def _require_enabled() -> None:
    if not get_settings().enable_playground:
        raise HTTPException(status_code=404, detail="أدوات التطوير معطّلة في هذه البيئة")


def _qdrant_client():
    """توحيد فشل إنشاء العميل إلى خطأ خدمة قابل للتصنيف."""

    try:
        return get_qdrant_client()
    except Exception as exc:  # noqa: BLE001 — حد اتصال خارجي
        logger.warning("تعذر إنشاء عميل Qdrant: %s", type(exc).__name__)
        raise QdrantOperationError("تعذر الاتصال بخدمة Qdrant") from exc


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
        logger.warning(
            "تعذر الوصول إلى Qdrant من /dev/indexer: %s",
            type(exc).__name__,
        )
        return {
            **base,
            "qdrant": "down",
            "points_count": 0,
            "error": "تعذر الاتصال بخدمة Qdrant",
        }


@router.post("/dev/indexer/ingest")
def indexer_ingest() -> dict:
    """فهرسة تزايدية آمنة لمستندات documents_demo عبر خط PR-3."""
    _require_enabled()
    if not _DOCUMENTS_DIR.is_dir():
        # المسار المطلق يبقى في السجل فقط؛ الاستجابة لا تكشف بنية الخادم.
        logger.error("مجلد المستندات التجريبي مفقود: %s", _DOCUMENTS_DIR)
        raise HTTPException(
            status_code=500,
            detail="مجلد المستندات التجريبي مفقود على الخادم",
        )

    try:
        files = sorted(_DOCUMENTS_DIR.glob("*.txt"))
    except OSError as exc:
        logger.error("تعذر سرد مجلد المستندات التجريبي: %s", type(exc).__name__)
        raise HTTPException(status_code=500, detail="تعذر قراءة مجلد المستندات التجريبي") from exc
    if not files:
        raise HTTPException(
            status_code=404, detail="لا توجد مستندات .txt للفهرسة في documents_demo"
        )

    try:
        client = _qdrant_client()
        repository = SQLiteIngestionRepository(_STATE_DB)
        pipeline = build_ingestion_pipeline(
            qdrant_client=client,
            repository=repository,
        )
        stats = pipeline.sync_directory(_DOCUMENTS_DIR)
    except CollectionConfigurationError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except DocumentLoadError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except TenantScopeError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except EmbeddingError as exc:
        logger.warning("فشل مزود التضمين أثناء الفهرسة: %s", type(exc).__name__)
        raise HTTPException(
            status_code=503,
            detail="تعذر إنشاء تضمينات المستندات — تحقق من مزود التضمين",
        ) from exc
    except RepositoryError as exc:
        logger.error("فشل مخزن حالة الفهرسة: %s", type(exc).__name__)
        raise HTTPException(
            status_code=500,
            detail="تعذر حفظ حالة الفهرسة؛ لم تُسجَّل العملية بوصفها ناجحة",
        ) from exc
    except QdrantOperationError as exc:
        logger.warning("فشل Qdrant أثناء الفهرسة: %s", type(exc).__name__)
        raise HTTPException(
            status_code=503,
            detail="تعذر الوصول إلى Qdrant — شغّل البنية التحتية أولًا (make infra)",
        ) from exc
    except IngestionError as exc:
        logger.error("فشل داخلي أثناء الفهرسة: %s", type(exc).__name__)
        raise HTTPException(
            status_code=500,
            detail="تعذر إكمال الفهرسة بسبب خطأ داخلي",
        ) from exc
    except Exception as exc:  # noqa: BLE001 — حد الأداة التطويرية
        logger.exception("خطأ غير متوقع أثناء الفهرسة: %s", type(exc).__name__)
        raise HTTPException(
            status_code=500,
            detail="تعذر إكمال الفهرسة بسبب خطأ غير متوقع",
        ) from exc

    settings = get_settings()
    result = {
        **stats.as_dict(),
        "collection": QDRANT_POLICIES_COLLECTION,
        "embedding_provider": settings.embedding_provider,
        "embedding_model": settings.embedding_model,
        "embedding_dimensions": settings.embedding_dimensions,
    }
    logger.info("فهرسة تزايدية عبر /dev/indexer: %s", result)
    return result


@router.post("/dev/indexer/search")
def indexer_search(request: SearchRequest) -> dict:
    """بحث عامّ التصنيف مع TenantScope إلزامي وفلتر داخل Qdrant."""
    _require_enabled()
    try:
        client = _qdrant_client()
        try:
            collection_exists = client.collection_exists(QDRANT_POLICIES_COLLECTION)
        except Exception as exc:  # noqa: BLE001 — حد خدمة Qdrant
            raise QdrantOperationError("تعذر فحص مجموعة فهرسة المستندات") from exc
        if not collection_exists:
            raise HTTPException(
                status_code=409,
                detail="المجموعة غير موجودة بعد — اضغط «فهرسة اللوائح» أولًا",
            )
        scope = TenantScope.public_only(request.tenant or "")
        repository = SQLiteIngestionRepository(_STATE_DB)
        pipeline = build_ingestion_pipeline(
            qdrant_client=client,
            repository=repository,
        )
        results = pipeline.search(scope, request.query, top_k=request.top_k)
    except HTTPException:
        raise
    except TenantScopeError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except EmbeddingError as exc:
        logger.warning("فشل تضمين سؤال البحث: %s", type(exc).__name__)
        raise HTTPException(
            status_code=503,
            detail="تعذر إنشاء تضمين سؤال البحث — تحقق من مزود التضمين",
        ) from exc
    except RepositoryError as exc:
        logger.error("فشل التحقق المرجعي لنتائج البحث: %s", type(exc).__name__)
        raise HTTPException(status_code=503, detail="تعذر التحقق من مراجع المستندات") from exc
    except QdrantOperationError as exc:
        logger.warning("فشل Qdrant أثناء البحث: %s", type(exc).__name__)
        raise HTTPException(
            status_code=503,
            detail="تعذر البحث في Qdrant — شغّل البنية التحتية أولًا (make infra)",
        ) from exc
    except TenantIsolationError as exc:
        logger.error("رُفضت نتيجة بحث خارج نطاق العزل: %s", type(exc).__name__)
        raise HTTPException(
            status_code=500,
            detail="تعذر التحقق من نطاق نتائج البحث",
        ) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail="طلب البحث غير صالح") from exc
    except IngestionError as exc:
        logger.error("فشل داخلي أثناء البحث: %s", type(exc).__name__)
        raise HTTPException(
            status_code=500,
            detail="تعذر إكمال البحث بسبب خطأ داخلي",
        ) from exc
    except Exception as exc:  # noqa: BLE001 — حد الأداة التطويرية
        logger.exception("خطأ غير متوقع أثناء البحث: %s", type(exc).__name__)
        raise HTTPException(
            status_code=500,
            detail="تعذر إكمال البحث بسبب خطأ غير متوقع",
        ) from exc

    hits = [
        {
            "score": round(hit.score, 4),
            "payload": hit.payload,
        }
        for hit in results
    ]
    return {"query": request.query, "tenant": scope.tenant_id, "hits": hits}
