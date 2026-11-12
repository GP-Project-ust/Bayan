"""إعدادات بيان المركزية — تُقرأ من متغيرات البيئة (راجع .env.example)."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """كل إعدادات المنصة في مكان واحد — مصدر الحقيقة الوحيد."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # ---------- التطبيق ----------
    app_name: str = "بيان — Bayan API"
    version: str = "0.1.0"
    api_prefix: str = "/api/v1"
    cors_origins: str = "http://localhost:3000"

    # ---------- قاعدة بيانات المنصة (محادثات + ذاكرة pgvector + تدقيق) ----------
    database_url: str = "postgresql://bayan:bayan@localhost:5432/bayan"

    # ---------- بنية تحتية مساندة ----------
    redis_url: str = "redis://localhost:6379/0"
    qdrant_url: str = "http://localhost:6333"

    # ---------- النموذج اللغوي ----------
    # mock = ردود حتمية للتطوير دون أي اتصال (الأنسب لأول تشغيل لكل عضو)
    llm_provider: str = "mock"
    llm_model: str = "qwen2.5:14b"
    ollama_base_url: str = "http://localhost:11434"

    # ---------- التضمين (ADR-005: bge-m3 عبر Ollama — 1024 بعداً) ----------
    # مزوّد مستقل عن مزوّد النموذج اللغوي: mock = متجهات حتمية بلا أي اتصال
    # (افتراضي التطوير وCI) | ollama = bge-m3 المحلي (راجع app/core/qdrant.py)
    embedding_provider: str = "mock"
    embedding_model: str = "bge-m3"
    embedding_dimensions: int = 1024
    # فارغ = يفرَّغ تلقائياً إلى ollama_base_url (يضبط فقط لخادم تضمين مستقل)
    embedding_base_url: str = ""

    # ---------- أدوات التطوير ----------
    # واجهة الاختبار الموحدة (/dev/playground) — تعطَّل في بيئة الإنتاج لاحقاً
    enable_playground: bool = True

    # ---------- بيئة الاختبار: قاعدة بيانات الجامعة (قراءة فقط) ----------
    # القاعدة التجريبية الموحدة تُجهَّز بأمر واحد: make dev-db  (راجع database/university_demo/)
    odoo_db_dsn: str = ""  # تجاوز كامل للرابط إن ضُبط (مفيد لقواعد socket في الاختبارات)
    odoo_db_host: str = "localhost"
    odoo_db_port: int = 5433
    odoo_db_name: str = "university"
    odoo_db_user: str = "bayan_reader"
    odoo_db_password: str = ""

    @property
    def odoo_database_url(self) -> str:
        """رابط اتصال للقراءة فقط بقاعدة الجامعة (التجريبية أو الحقيقية)."""
        if self.odoo_db_dsn:
            return self.odoo_db_dsn
        return (
            f"postgresql://{self.odoo_db_user}:{self.odoo_db_password}"
            f"@{self.odoo_db_host}:{self.odoo_db_port}/{self.odoo_db_name}"
        )

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    """نسخة واحدة مشتركة من الإعدادات (تُخزَّن مؤقتاً)."""
    return Settings()
