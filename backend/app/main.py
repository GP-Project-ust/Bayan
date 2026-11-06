"""نقطة دخول بيان — تطبيق FastAPI الرئيسي."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.endpoints.playground import router as dev_router
from app.api.v1.router import api_router
from app.core.config import get_settings
from app.core.logging import logger, setup_logging


@asynccontextmanager
async def lifespan(app: FastAPI):
    """دورة حياة التطبيق — يُستخدم لاحقاً لفتح/إغلاق اتصالات قواعد البيانات."""
    setup_logging()
    settings = get_settings()
    logger.info("تشغيل %s إصدار %s", settings.app_name, settings.version)
    yield
    logger.info("إيقاف بيان")


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title=settings.app_name,
        version=settings.version,
        description="المساعد المؤسسي الذكي — واجهة برمجية لوكلاء LangGraph",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(api_router, prefix=settings.api_prefix)

    # واجهة الاختبار الموحدة — أداة تطوير تُقدَّم خارج بادئة الـ API
    app.include_router(dev_router)
    return app


app = create_app()
