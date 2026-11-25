"""مواءمة إعدادات اتصال PostgreSQL للقراءة فقط مع إعدادات المنصة الرسمية."""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from typing import Any, Mapping, Sequence
from urllib.parse import urlparse

from app.core.config import Settings, get_settings

DEFAULT_POSTGRES_PORT = 5432
SYSTEM_SCHEMAS = ("pg_catalog", "information_schema")


def parse_schema_selector(raw: Any, default: Sequence[str] = ("public",)) -> tuple[str, ...]:
    """تطبيع محدد المخططات (مخطط واحد، قائمة مفصولة بفواصل، أو ``*``)."""
    if raw is None:
        return tuple(default)
    if isinstance(raw, str):
        tokens = [part.strip() for part in raw.split(",") if part.strip()]
    elif isinstance(raw, Sequence):
        tokens = [str(part).strip() for part in raw if str(part).strip()]
    else:
        tokens = [str(raw).strip()] if str(raw).strip() else []

    if not tokens:
        return tuple(default)
    if any(token in ("*", "all", "ALL") for token in tokens):
        return ("*",)
    return tuple(dict.fromkeys(tokens))


@dataclass(frozen=True)
class PostgresConnectionSettings:
    """إعدادات اتصال PostgreSQL للقراءة فقط دون كشف كلمات المرور."""

    host: str = "localhost"
    port: int = DEFAULT_POSTGRES_PORT
    database: str = "university"
    username: str = "bayan_reader"
    password: str = field(default="", repr=False)
    dsn: str | None = field(default=None, repr=False)
    schemas: tuple[str, ...] = ("public",)
    ssl_mode: str = "prefer"
    ca_file: str | None = None
    connect_timeout_seconds: int = 4
    statement_timeout_ms: int = 10_000
    max_objects: int = 1000
    max_columns_per_object: int = 500
    source_id: str = "SRC-POSTGRES"
    source_name: str = "PostgreSQL"
    catalog_alias: str = ""

    def __post_init__(self) -> None:
        if not self.catalog_alias:
            db_name = self.database or self._dsn_database(self.dsn) or "postgres"
            object.__setattr__(self, "catalog_alias", db_name)
        if not self.schemas:
            object.__setattr__(self, "schemas", ("public",))

    @staticmethod
    def _dsn_database(dsn: str | None) -> str:
        if not dsn or "://" not in dsn:
            return ""
        return urlparse(dsn).path.lstrip("/")

    @classmethod
    def from_app_settings(
        cls,
        app_settings: Settings | None = None,
        *,
        environ: Mapping[str, str] | None = None,
        schemas: Any = None,
        source_id: str = "SRC-POSTGRES",
        source_name: str = "",
    ) -> PostgresConnectionSettings:
        """قراءة إعدادات قاعدة العميل مباشرة من ``app.core.config.get_settings()``."""
        cfg = app_settings or get_settings()
        env = environ if environ is not None else os.environ
        dsn = (cfg.odoo_db_dsn or "").strip() or None
        database = (cfg.odoo_db_name or cls._dsn_database(dsn) or "university").strip()
        ssl_mode = (env.get("ODOO_DB_SSLMODE") or "prefer").strip().lower()
        ca_file = (env.get("BAYAN_DB_CA_FILE") or "").strip() or None
        connect_timeout = max(1, int(float(env.get("BAYAN_DB_CONNECT_TIMEOUT", "4"))))
        timeout_ms = max(1000, int(float(env.get("BAYAN_METADATA_TIMEOUT", "10")) * 1000))
        resolved_schemas = parse_schema_selector(
            schemas
            if schemas is not None
            else env.get("ODOO_DB_SCHEMAS") or env.get("ODOO_DB_SCHEMA"),
            default=("public",),
        )
        return cls(
            host=cfg.odoo_db_host.strip(),
            port=int(cfg.odoo_db_port),
            database=database,
            username=cfg.odoo_db_user.strip(),
            password=cfg.odoo_db_password,
            dsn=dsn,
            schemas=resolved_schemas,
            ssl_mode=ssl_mode,
            ca_file=ca_file,
            connect_timeout_seconds=connect_timeout,
            statement_timeout_ms=timeout_ms,
            source_id=source_id,
            source_name=source_name or database or "PostgreSQL",
        )

    @classmethod
    def from_env(
        cls,
        environ: Mapping[str, str] | None = None,
        *,
        schemas: Any = None,
        source_id: str = "SRC-POSTGRES",
        source_name: str = "",
    ) -> PostgresConnectionSettings:
        """بناء الإعدادات من متغيرات البيئة ``ODOO_DB_*`` دون اشتراط تحميل ملف .env."""
        env = environ if environ is not None else os.environ
        dsn = (env.get("ODOO_DB_DSN") or "").strip() or None
        host = (env.get("ODOO_DB_HOST") or "localhost").strip()
        port_raw = (env.get("ODOO_DB_PORT") or "5433").strip()
        try:
            port = int(port_raw)
        except ValueError as exc:
            raise ValueError("منفذ ODOO_DB_PORT غير صالح.") from exc
        database = (env.get("ODOO_DB_NAME") or cls._dsn_database(dsn) or "university").strip()
        username = (env.get("ODOO_DB_USER") or "bayan_reader").strip()
        password = env.get("ODOO_DB_PASSWORD") or ""
        ssl_mode = (env.get("ODOO_DB_SSLMODE") or "prefer").strip().lower()
        ca_file = (env.get("BAYAN_DB_CA_FILE") or "").strip() or None
        connect_timeout = max(1, int(float(env.get("BAYAN_DB_CONNECT_TIMEOUT", "4"))))
        metadata_timeout_ms = max(1000, int(float(env.get("BAYAN_METADATA_TIMEOUT", "10")) * 1000))
        resolved_schemas = parse_schema_selector(
            schemas
            if schemas is not None
            else env.get("ODOO_DB_SCHEMAS") or env.get("ODOO_DB_SCHEMA"),
            default=("public",),
        )
        return cls(
            host=host,
            port=port,
            database=database,
            username=username,
            password=password,
            dsn=dsn,
            schemas=resolved_schemas,
            ssl_mode=ssl_mode,
            ca_file=ca_file,
            connect_timeout_seconds=connect_timeout,
            statement_timeout_ms=metadata_timeout_ms,
            source_id=source_id,
            source_name=source_name or database or "PostgreSQL",
        )

    def to_psycopg_kwargs(self) -> dict[str, Any]:
        """توليد معاملات ``psycopg.connect`` بوضع القراءة فقط الإجباري."""
        options = (
            "-c default_transaction_read_only=on "
            f"-c statement_timeout={int(self.statement_timeout_ms)}"
        )
        if self.dsn:
            kwargs: dict[str, Any] = {
                "conninfo": self.dsn,
                "connect_timeout": max(1, int(self.connect_timeout_seconds)),
                "options": options,
            }
        else:
            kwargs = {
                "host": self.host,
                "port": int(self.port),
                "dbname": self.database,
                "user": self.username,
                "password": self.password,
                "connect_timeout": max(1, int(self.connect_timeout_seconds)),
                "sslmode": self.ssl_mode,
                "options": options,
            }
        if self.ca_file and self.ssl_mode in ("verify-ca", "verify-full"):
            kwargs["sslrootcert"] = self.ca_file
        return kwargs

    def safe_summary(self) -> dict[str, Any]:
        """ملخص اتصال آمن للتقارير والسجلات (دون كلمات مرور أو أسرار DSN)."""
        parsed = urlparse(self.dsn) if self.dsn and "://" in self.dsn else None
        return {
            "source_id": self.source_id,
            "source_name": self.source_name,
            "host": parsed.hostname if parsed and parsed.hostname else self.host,
            "port": parsed.port if parsed and parsed.port else self.port,
            "database": self.database,
            "schemas": list(self.schemas),
            "username": parsed.username if parsed and parsed.username else self.username,
            "ssl_mode": self.ssl_mode,
            "read_only": True,
        }
