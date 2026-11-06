"""واجهة الاختبار الموحدة — صفحة واحدة تخدمها الخلفية على /dev/playground.

الغرض: أن يختبر كل عضو في الفريق سلسلة الوكلاء كاملة (سؤال ← توجيه ←
وكيل ← نتائج/أخطاء) من المتصفح مباشرة دون بناء الواجهة الأمامية أو
التعامل مع curl. ملف الواجهة نفسه: backend/app/static/playground.html

تُعطَّل كلياً في بيئة الإنتاج عبر ENABLE_PLAYGROUND=false.
"""

from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from app.core.config import get_settings

router = APIRouter()

_PLAYGROUND_HTML = Path(__file__).resolve().parents[3] / "static" / "playground.html"


@router.get("/dev/playground", include_in_schema=False)
def playground() -> FileResponse:
    """تقديم صفحة الاختبار الموحدة (خارج /api/v1 — أداة تطوير)."""
    if not get_settings().enable_playground:
        raise HTTPException(status_code=404, detail="واجهة الاختبار معطّلة في هذه البيئة")
    if not _PLAYGROUND_HTML.exists():
        raise HTTPException(status_code=500, detail="ملف الواجهة مفقود: static/playground.html")
    return FileResponse(_PLAYGROUND_HTML, media_type="text/html")
