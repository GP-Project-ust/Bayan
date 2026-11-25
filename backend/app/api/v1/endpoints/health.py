"""نقطة فحص الصحة — تتحقق من جاهزية كل مكون من مكونات بيان.

تُستخدم للمراقبة وللتحقق السريع بعد رفع البنية التحتية:
كل مكوّن يُفحص باستقلال وبمهلة قصيرة، وعطل أي مكوّن لا يُسقط الخدمة كلها.
"""

import socket
from urllib.parse import urlparse

import httpx
import psycopg
from fastapi import APIRouter
from sqlalchemy import text

from app.core.config import get_settings
from app.core.logging import logger
from app.db.session import get_platform_engine

router = APIRouter()


def _check_tcp(host: str, port: int, timeout: float = 2.0) -> bool:
    """فحص جاهزية منفذ TCP (يُستخدم لـ Redis)."""
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except OSError:
        return False


def _check_http(url: str, timeout: float = 2.0) -> bool:
    """فحص جاهزية خدمة HTTP (يُستخدم لـ Qdrant و Ollama)."""
    try:
        response = httpx.get(url, timeout=timeout)
        return response.status_code < 500
    except httpx.HTTPError:
        return False


def _check_database() -> bool:
    """فحص الاتصال بقاعدة بيانات المنصة (رابط معطوب = down وليس انهياراً)."""
    try:
        with get_platform_engine().connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception:  # noqa: BLE001 — أي فشل اتصال يعني "غير جاهز"
        return False


def _check_university_database() -> bool:
    """فحص الاتصال بقاعدة بيانات الجامعة — الاعتماد الحرج لوكيل SQL."""
    try:
        with psycopg.connect(get_settings().odoo_database_url, connect_timeout=2):
            return True
    except Exception:  # noqa: BLE001 — أي فشل اتصال يعني "غير جاهز"
        return False


@router.get("/health")
def health_check() -> dict:
    """حالة التطبيق وكل مكونات البنية التحتية.

    المكوّنان الحرجان (قاعدة المنصة + قاعدة الجامعة) يُفحصان دائماً.
    المكوّنات المساندة تُفحص فقط عند تفعيلها في الإعدادات — حتى لا تُظهر
    بيئة النشر حالة "degraded" بسبب خدمات لم تُرفع أصلًا (وضع mock لا يحتاجها).
    """
    settings = get_settings()

    components = {
        "database": _check_database(),
        "university_database": _check_university_database(),
    }

    # Redis — يُفحص فقط عند ضبط رابطه (بيئة بلا Redis تضبطه فارغاً)
    if settings.redis_url:
        redis_url = urlparse(settings.redis_url)
        components["redis"] = _check_tcp(
            redis_url.hostname or "localhost", redis_url.port or 6379
        )

    # Qdrant — يُفحص فقط عند مزوّد تضمين حقيقي (ليس mock)
    if settings.embedding_provider.strip().lower() != "mock":
        components["qdrant"] = _check_http(settings.qdrant_url.rstrip("/") + "/healthz")

    # Ollama — يُفحص فقط عند اعتماد LLM محلي عليه
    if settings.llm_provider.strip().lower() == "ollama":
        components["ollama"] = _check_http(
            settings.ollama_base_url.rstrip("/") + "/api/tags"
        )

    status_by_component = {
        name: ("up" if ok else "down") for name, ok in components.items()
    }
    overall = "ok" if all(components.values()) else "degraded"

    logger.info("فحص الصحة: %s", status_by_component)
    return {
        "status": overall,
        "version": settings.version,
        "components": status_by_component,
    }
