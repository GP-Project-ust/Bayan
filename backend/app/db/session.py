"""إدارة اتصالات قواعد البيانات.

قاعدتان منفصلتان تماماً (وفق الوثيقة):
  1. قاعدة المنصة (bayan)      — قراءة وكتابة: محادثات، ذاكرة pgvector، تدقيق
  2. قاعدة الجامعة (Odoo)      — قراءة فقط عبر bayan_reader: لا كتابة إطلاقاً

ملاحظة تصميمية: المحركات تُنشأ كسولاً عند أول استخدام — رابط معطوب في البيئة
يجعل فحص الصحة يبلّغ "down" بدل أن ينهار التطبيق عند الإقلاع.
"""

from functools import lru_cache

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import get_settings


@lru_cache
def get_platform_engine():
    """محرك قاعدة المنصة — يُنشأ مرة واحدة عند أول استخدام."""
    return create_engine(
        get_settings().database_url,
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=5,
        future=True,
    )


@lru_cache
def _get_platform_session_factory():
    return sessionmaker(bind=get_platform_engine(), autoflush=False, future=True)


def get_platform_session():
    """مولّد جلسة قاعدة المنصة لنقاط النهاية (dependency injection)."""
    factory = _get_platform_session_factory()
    session = factory()
    try:
        yield session
    finally:
        session.close()


def get_odoo_readonly_engine():
    """محرك قراءة فقط لقاعدة Odoo (بيئة الاختبار) — يُستخدم من وكيل SQL.

    يُنشأ عند الطلب وليس عند الإقلاع، حتى لا يفشل التطبيق
    حين تكون بيئة الاختبار غير مرفوعة.
    """
    return create_engine(
        get_settings().odoo_database_url,
        pool_pre_ping=True,
        connect_args={"connect_timeout": 5, "options": "-c default_transaction_read_only=on"},
        future=True,
    )
