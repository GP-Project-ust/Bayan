"""موصلات الاستبطان الآمنة (Read-Only): إعادة استخدام PR-1 لـ PostgreSQL ودعم SQLite/MySQL/MSSQL."""

from __future__ import annotations

import os
import re
import sqlite3
import time
from contextlib import closing
from pathlib import Path
from typing import Any, Callable, Dict, Iterable, List, Optional
from urllib.parse import quote

from app.services.onboarding.discovery.descriptions import DeterministicArabicDescriber
from app.services.onboarding.discovery.fingerprints import (
    catalog_fingerprint as pr1_catalog_fingerprint,
)
from app.services.onboarding.discovery.fingerprints import (
    object_fingerprint as pr1_object_fingerprint,
)
from app.services.onboarding.discovery.fingerprints import (
    semantic_object_fingerprint as pr1_semantic_fingerprint,
)
from app.services.onboarding.discovery.fingerprints import (
    stats_object_fingerprint as pr1_stats_fingerprint,
)
from app.services.onboarding.discovery.fingerprints import (
    structural_catalog_fingerprint as pr1_structural_fingerprint,
)
from app.services.onboarding.discovery.fingerprints import (
    structural_object_fingerprint as pr1_structural_object_fingerprint,
)
from app.services.onboarding.discovery.introspector import PostgresIntrospector
from app.services.onboarding.discovery.models import (
    CatalogCounts,
    ColumnMetadata,
    DeclaredRelationshipMetadata,
    DescribedColumn,
    DescribedObject,
    DiscoveryReport,
    ForeignKeyMetadata,
    IndexMetadata,
    KeyConstraintMetadata,
)
from app.services.onboarding.discovery.settings import PostgresConnectionSettings

SUPPORTED_ENGINES = {"postgresql", "sqlite", "mysql", "mariadb", "sqlserver", "mssql"}
DEFAULT_PORTS = {
    "postgresql": 5432,
    "mysql": 3306,
    "mariadb": 3306,
    "sqlserver": 1433,
    "mssql": 1433,
    "sqlite": 0,
}
ALLOWED_SSL_MODES = {
    "postgresql": {"disable", "allow", "prefer", "require", "verify-ca", "verify-full"},
    "mysql": {"disabled", "preferred", "required", "verify-ca", "verify-full"},
    "mariadb": {"disabled", "preferred", "required", "verify-ca", "verify-full"},
    "sqlserver": {"require", "verify-ca", "verify-full", "disable"},
    "mssql": {"require", "verify-ca", "verify-full", "disable"},
    "sqlite": {"disable"},
}


class ConnectorSecurityError(ValueError):
    """انتهاك قيود الأمان عند إعداد أو فحص موصل قاعدة البيانات."""


class DataSourceConnectionError(RuntimeError):
    """خطأ منضبط ومقروء بالعربية دون تسريب كلمات مرور أو سلاسل اتصال."""

    def __init__(
        self,
        code: str,
        message: str,
        *,
        retryable: bool = True,
        phase: str = "connection",
    ):
        super().__init__(message)
        self.code = code
        self.message = message
        self.retryable = retryable
        self.phase = phase


def _sanitize_text(value: str) -> str:
    text = str(value or "").strip()
    text = re.sub(r"(?i)(password|pwd|secret|token)\s*=\s*[^\s;]+", r"\1=***", text)
    return text[:260]


def validate_source_payload(payload: Dict[str, Any]) -> Dict[str, Any]:
    """التحقق الصارم من إعدادات المصدر مع فرض القراءة فقط ومنع حفظ الأسرار."""
    engine = str(payload.get("engine") or "postgresql").strip().lower()
    if engine not in SUPPORTED_ENGINES:
        raise ConnectorSecurityError(f"محرك قاعدة البيانات غير مدعوم: {engine}")

    name = str(payload.get("name") or "").strip()
    database = str(payload.get("database") or "").strip()
    if len(name) < 2:
        raise ConnectorSecurityError("اسم مصدر البيانات مطلوب ويجب أن لا يقل عن حرفين.")
    if not database:
        raise ConnectorSecurityError("اسم قاعدة البيانات أو مسار SQLite مطلوب.")

    read_only = bool(payload.get("read_only", True))
    if not read_only:
        raise ConnectorSecurityError("تتطلب سياسة بيان ربط قواعد بيانات العملاء بصلاحية قراءة فقط.")

    ssl_mode = (
        str(payload.get("ssl_mode") or ("disable" if engine == "sqlite" else "prefer"))
        .strip()
        .lower()
    )
    allowed_ssl = ALLOWED_SSL_MODES.get(engine, {"disable"})
    if ssl_mode not in allowed_ssl:
        ssl_mode = "disable" if engine == "sqlite" else "prefer"

    default_schema = (
        "main" if engine == "sqlite" else ("dbo" if engine in {"sqlserver", "mssql"} else "public")
    )
    schema = str(payload.get("schema") or default_schema).strip() or default_schema
    host = (
        "local-sqlite"
        if engine == "sqlite"
        else (str(payload.get("host") or "").strip() or "localhost")
    )
    port = 0 if engine == "sqlite" else int(payload.get("port") or DEFAULT_PORTS[engine])
    username = "sqlite_ro" if engine == "sqlite" else str(payload.get("username") or "").strip()

    if engine != "sqlite" and not username:
        raise ConnectorSecurityError("اسم مستخدم القراءة مطلوب لمصادر الشبكة.")
    if port < 0 or port > 65535:
        raise ConnectorSecurityError("رقم المنفذ غير صالح.")

    return {
        "name": name,
        "engine": engine,
        "host": host,
        "port": port,
        "database": database,
        "schema": schema,
        "username": username,
        "read_only": True,
        "ssl_mode": ssl_mode,
        "secret_stored": False,
    }


def _describe_catalog_items(
    raw_tables: List[Dict[str, Any]],
    *,
    source: Dict[str, Any],
    describer: Optional[DeterministicArabicDescriber] = None,
) -> List[Dict[str, Any]]:
    """توحيد مخرجات الاستبطان وتزويدها بأوصاف عربية حتمية وبصمات PR-1."""
    describer = describer or DeterministicArabicDescriber()
    source_id = str(source.get("id") or source.get("source_id") or "source")
    source_name = str(source.get("name") or source.get("database") or source_id)
    enriched: List[Dict[str, Any]] = []

    for tbl in raw_tables:
        schema_name = str(tbl.get("schema") or source.get("schema") or "public")
        obj_name = str(tbl.get("name") or "")
        obj_type = "view" if tbl.get("object_type") == "view" else "table"
        qualified_name = str(tbl.get("qualified_name") or f"{schema_name}.{obj_name}")
        object_ref = str(tbl.get("object_ref") or f"{source_id}::{qualified_name}")

        raw_cols = tbl.get("columns") or []
        col_metas: List[ColumnMetadata] = []
        enriched_cols: List[Dict[str, Any]] = []
        for idx, col in enumerate(raw_cols, start=1):
            col_name = str(col.get("name") or "")
            col_ref = str(col.get("object_ref") or f"{object_ref}::{col_name}")
            meta = ColumnMetadata(
                object_ref=col_ref,
                name=col_name,
                data_type=str(col.get("data_type") or "unknown"),
                nullable=bool(col.get("nullable", True)),
                ordinal_position=int(col.get("ordinal_position") or idx),
                default=col.get("default"),
                comment=col.get("comment"),
                primary_key=bool(col.get("primary_key")),
                foreign_key=bool(col.get("foreign_key")),
                unique=bool(col.get("unique")),
            )
            col_metas.append(meta)

        fks = [
            ForeignKeyMetadata(
                name=str(fk.get("name") or "fk"),
                columns=tuple(str(c) for c in fk.get("columns", [])),
                target_schema=str(fk.get("target_schema") or schema_name),
                target_table=str(fk.get("target_table") or ""),
                target_columns=tuple(str(c) for c in fk.get("target_columns", [])),
                source_table_ref=object_ref,
                target_table_ref=fk.get("target_table_ref"),
            )
            for fk in (tbl.get("foreign_keys") or [])
        ]
        pks = [
            KeyConstraintMetadata(
                name=str(pk.get("name") or "PRIMARY"),
                columns=tuple(str(c) for c in pk.get("columns", [])),
            )
            for pk in (tbl.get("primary_keys") or [])
        ]
        uqs = [
            KeyConstraintMetadata(
                name=str(uq.get("name") or "uq"),
                columns=tuple(str(c) for c in uq.get("columns", [])),
            )
            for uq in (tbl.get("unique_constraints") or [])
        ]
        idxs = [
            IndexMetadata(
                name=str(ix.get("name") or "idx"),
                columns=tuple(str(c) for c in ix.get("columns", [])),
                unique=bool(ix.get("unique")),
                primary=bool(ix.get("primary")),
            )
            for ix in (tbl.get("indexes") or [])
        ]

        fp_table_payload = {
            "object_ref": object_ref,
            "schema": schema_name,
            "name": obj_name,
            "schema_qualified_name": f"{schema_name}.{obj_name}",
            "object_type": obj_type,
            "comment": tbl.get("comment"),
            "approximate_row_count": tbl.get("approximate_row_count"),
            "dependencies": list(tbl.get("dependencies") or ()),
            "columns": [
                {
                    "object_ref": c.object_ref,
                    "name": c.name,
                    "data_type": c.data_type,
                    "nullable": c.nullable,
                    "ordinal_position": c.ordinal_position,
                    "default": c.default,
                    "primary_key": c.primary_key,
                    "foreign_key": c.foreign_key,
                    "unique": c.unique,
                    "comment": c.comment,
                }
                for c in col_metas
            ],
            "primary_keys": [{"name": pk.name, "columns": list(pk.columns)} for pk in pks],
            "foreign_keys": [
                {
                    "name": fk.name,
                    "columns": list(fk.columns),
                    "target_schema": fk.target_schema,
                    "target_table": fk.target_table,
                    "target_columns": list(fk.target_columns),
                    "source_table_ref": object_ref,
                    "target_table_ref": fk.target_table_ref,
                }
                for fk in fks
            ],
            "unique_constraints": [{"name": u.name, "columns": list(u.columns)} for u in uqs],
            "indexes": [
                {
                    "name": i.name,
                    "columns": list(i.columns),
                    "unique": i.unique,
                    "primary": i.primary,
                }
                for i in idxs
            ],
        }
        fp = pr1_object_fingerprint(fp_table_payload)
        struct_fp = pr1_structural_object_fingerprint(fp_table_payload)
        stats_fp = pr1_stats_fingerprint(fp_table_payload)
        sem_fp = pr1_semantic_fingerprint(fp_table_payload)

        # توليد الأوصاف الحتمية عبر PR-1 مباشرة من القاموس المعياري
        described = describer.describe_object(fp_table_payload)

        described_col_map = {c.name: c for c in described.columns}
        for col_meta in col_metas:
            dcol = described_col_map.get(col_meta.name)
            enriched_cols.append(
                {
                    "object_ref": col_meta.object_ref,
                    "name": col_meta.name,
                    "data_type": col_meta.data_type,
                    "nullable": col_meta.nullable,
                    "default": col_meta.default,
                    "comment": col_meta.comment,
                    "primary_key": col_meta.primary_key,
                    "foreign_key": col_meta.foreign_key,
                    "unique": col_meta.unique,
                    "ordinal_position": col_meta.ordinal_position,
                    "label_ar": dcol.label_ar if dcol else col_meta.name,
                    "description": dcol.description_ar
                    if dcol
                    else (col_meta.comment or col_meta.name),
                    "description_ar": dcol.description_ar
                    if dcol
                    else (col_meta.comment or col_meta.name),
                    "semantic_type": dcol.semantic_type if dcol else "unknown",
                    "description_source": dcol.description_source
                    if dcol
                    else "deterministic_template",
                }
            )

        enriched.append(
            {
                "source_id": source_id,
                "source_name": source_name,
                "catalog": tbl.get("catalog") or source.get("database"),
                "schema": schema_name,
                "name": obj_name,
                "qualified_name": qualified_name,
                "schema_qualified_name": f"{schema_name}.{obj_name}",
                "object_ref": object_ref,
                "object_type": obj_type,
                "comment": tbl.get("comment"),
                "approximate_row_count": tbl.get("approximate_row_count"),
                "dependencies": list(tbl.get("dependencies") or []),
                "label_ar": described.label_ar,
                "description": described.description_ar,
                "description_ar": described.description_ar,
                "entity_type": described.entity_type,
                "description_source": described.description_source,
                "fingerprint": fp,
                "structural_fingerprint": struct_fp,
                "stats_fingerprint": stats_fp,
                "semantic_fingerprint": sem_fp,
                "columns": enriched_cols,
                "primary_keys": list(tbl.get("primary_keys") or []),
                "foreign_keys": [
                    {
                        "name": fk.name,
                        "columns": list(fk.columns),
                        "target_schema": fk.target_schema,
                        "target_table": fk.target_table,
                        "target_columns": list(fk.target_columns),
                        "target_table_ref": fk.target_table_ref
                        or f"{source_id}::{fk.target_schema}.{fk.target_table}",
                    }
                    for fk in fks
                ],
                "unique_constraints": list(tbl.get("unique_constraints") or []),
                "indexes": list(tbl.get("indexes") or []),
            }
        )
    return enriched


def _scan_postgresql_via_pr1(
    source: Dict[str, Any],
    password: str,
    *,
    connect_fn: Optional[Callable[..., Any]] = None,
    connect_timeout: int = 5,
    statement_timeout_ms: int = 10000,
) -> List[Dict[str, Any]]:
    """استبطان PostgreSQL بإعادة استخدام PostgresIntrospector من PR-1 مباشرة دون أي ازدواج."""
    if not str(password or "").strip():
        raise DataSourceConnectionError(
            "password_required",
            "أدخل كلمة مرور مستخدم القراءة لاختبار أو استبطان هذا المصدر؛ لن تُحفظ.",
            retryable=False,
        )
    schema = str(source.get("schema") or "public").strip() or "public"
    pg_settings = PostgresConnectionSettings(
        source_id=str(source.get("id") or "pg-source"),
        source_name=str(source.get("name") or source.get("database") or "pg-source"),
        host=str(source.get("host") or "localhost"),
        port=int(source.get("port") or 5432),
        database=str(source.get("database") or ""),
        username=str(source.get("username") or ""),
        password=password,
        schemas=(schema,),
        ssl_mode=str(source.get("ssl_mode") or "prefer"),
        connect_timeout_seconds=max(1, int(connect_timeout)),
        statement_timeout_ms=max(1000, int(statement_timeout_ms)),
    )
    introspector = PostgresIntrospector(connect_fn=connect_fn)
    try:
        discovered = introspector.introspect(pg_settings)
    except Exception as exc:
        msg = _sanitize_text(str(exc))
        code = "postgresql_connection_error"
        lower = msg.lower()
        if "password" in lower or "authentication" in lower:
            code = "authentication_failed"
        elif "timeout" in lower:
            code = "connection_timeout"
        raise DataSourceConnectionError(
            code,
            f"تعذر الاتصال أو استبطان قاعدة PostgreSQL: {msg}",
            retryable=code != "authentication_failed",
        ) from exc

    return _describe_catalog_items(list(discovered), source=source)


def _scan_sqlite(
    source: Dict[str, Any],
    *,
    sqlite_root: Optional[Path] = None,
    max_bytes: int = 50 * 1024 * 1024,
    max_tables: int = 300,
    max_columns: int = 250,
) -> List[Dict[str, Any]]:
    root = (sqlite_root or Path(os.getenv("BAYAN_SQLITE_ROOT", str(Path.cwd())))).resolve()
    raw_path = Path(str(source.get("database") or ""))
    path = raw_path.resolve() if raw_path.is_absolute() else (root / raw_path).resolve()
    if not path.is_relative_to(root):
        raise ConnectorSecurityError("مسار SQLite خارج المجلد المسموح به للاكتشاف.")
    if not path.is_file():
        raise DataSourceConnectionError(
            "sqlite_file_not_found",
            f"ملف قاعدة SQLite غير موجود: {path.name}",
            retryable=False,
        )
    if path.stat().st_size > max_bytes:
        raise ConnectorSecurityError("حجم ملف SQLite يتجاوز الحد المسموح به للاكتشاف.")

    database_uri = f"file:{quote(path.as_posix(), safe='/:')}?mode=ro"
    tables: List[Dict[str, Any]] = []
    with closing(sqlite3.connect(database_uri, uri=True, timeout=5)) as conn:
        conn.execute("PRAGMA query_only = ON")
        rows = conn.execute(
            "SELECT name, type, sql FROM sqlite_master "
            "WHERE type IN ('table','view') AND name NOT LIKE 'sqlite_%' ORDER BY type, name"
        ).fetchall()
        if len(rows) > max_tables:
            raise ConnectorSecurityError("عدد جداول SQLite يتجاوز الحد المسموح به.")

        stats: Dict[str, Optional[int]] = {}
        has_stats = conn.execute(
            "SELECT 1 FROM sqlite_master WHERE type='table' AND name='sqlite_stat1'"
        ).fetchone()
        if has_stats:
            for tbl_name, stat_val in conn.execute("SELECT tbl, stat FROM sqlite_stat1").fetchall():
                try:
                    stats[str(tbl_name)] = int(str(stat_val).split()[0])
                except (TypeError, ValueError, IndexError):
                    stats[str(tbl_name)] = None

        for name, obj_type, definition in rows:
            quoted = str(name).replace('"', '""')
            table_info = [
                r
                for r in conn.execute(f'PRAGMA table_xinfo("{quoted}")').fetchall()
                if len(r) <= 6 or r[6] != 1
            ]
            if len(table_info) > max_columns:
                raise ConnectorSecurityError(f"عدد أعمدة الجدول {name} يتجاوز الحد المسموح به.")

            grouped_fks: Dict[int, Dict[str, Any]] = {}
            for fk_row in conn.execute(f'PRAGMA foreign_key_list("{quoted}")').fetchall():
                fk_entry = grouped_fks.setdefault(
                    int(fk_row[0]),
                    {
                        "name": f"fk_{name}_{fk_row[0]}",
                        "columns": [],
                        "target_schema": "main",
                        "target_table": str(fk_row[2]),
                        "target_columns": [],
                    },
                )
                fk_entry["columns"].append(str(fk_row[3]))
                fk_entry["target_columns"].append(str(fk_row[4]))

            fk_cols = {col for fk in grouped_fks.values() for col in fk["columns"]}
            indexes: List[Dict[str, Any]] = []
            unique_constraints: List[Dict[str, Any]] = []
            unique_cols: set[str] = set()
            for idx_row in conn.execute(f'PRAGMA index_list("{quoted}")').fetchall():
                idx_name = str(idx_row[1])
                q_idx = idx_name.replace('"', '""')
                idx_cols = [
                    str(ir[2])
                    for ir in conn.execute(f'PRAGMA index_info("{q_idx}")').fetchall()
                    if ir[2] is not None
                ]
                is_unique = bool(idx_row[2])
                is_primary = str(idx_row[3]) == "pk"
                indexes.append(
                    {
                        "name": idx_name,
                        "columns": idx_cols,
                        "unique": is_unique,
                        "primary": is_primary,
                    }
                )
                if is_unique and not is_primary:
                    unique_constraints.append({"name": idx_name, "columns": idx_cols})
                    if len(idx_cols) == 1:
                        unique_cols.add(idx_cols[0])

            columns = []
            for ordinal, row in enumerate(table_info, start=1):
                col_name = str(row[1])
                columns.append(
                    {
                        "name": col_name,
                        "data_type": str(row[2] or "unknown"),
                        "nullable": not bool(row[3]),
                        "default": row[4],
                        "primary_key": bool(row[5]),
                        "primary_key_position": int(row[5] or 0),
                        "foreign_key": col_name in fk_cols,
                        "unique": col_name in unique_cols,
                        "ordinal_position": ordinal,
                        "comment": None,
                    }
                )
            pk_cols = [
                c["name"]
                for c in sorted(columns, key=lambda item: item["primary_key_position"])
                if c["primary_key"]
            ]
            dependencies: List[str] = []
            if obj_type == "view" and definition:
                dependencies = sorted(
                    set(
                        m.group(1).strip('"`[]')
                        for m in re.finditer(
                            r"(?:FROM|JOIN)\s+([A-Za-z0-9_\-\.\"`\[\]]+)",
                            str(definition),
                            flags=re.IGNORECASE,
                        )
                    )
                )
            tables.append(
                {
                    "catalog": path.name,
                    "schema": "main",
                    "name": str(name),
                    "object_type": "view" if obj_type == "view" else "table",
                    "comment": None,
                    "approximate_row_count": stats.get(str(name)) if obj_type == "table" else None,
                    "dependencies": dependencies,
                    "columns": columns,
                    "primary_keys": [{"name": "PRIMARY", "columns": pk_cols}] if pk_cols else [],
                    "foreign_keys": list(grouped_fks.values()),
                    "unique_constraints": unique_constraints,
                    "indexes": indexes,
                }
            )

    if not tables:
        raise DataSourceConnectionError(
            "empty_database",
            "قاعدة SQLite لا تحتوي على جداول أو مشاهد قابلة للاكتشاف.",
            retryable=False,
        )
    return _describe_catalog_items(tables, source=source)


def _scan_mysql(source: Dict[str, Any], password: str) -> List[Dict[str, Any]]:
    if not str(password or "").strip():
        raise DataSourceConnectionError(
            "password_required",
            "أدخل كلمة مرور مستخدم القراءة لمصدر MySQL/MariaDB؛ لن تُحفظ.",
            retryable=False,
        )
    try:
        import pymysql  # type: ignore
    except ImportError as exc:
        raise DataSourceConnectionError(
            "driver_missing",
            "موصل MySQL/MariaDB (pymysql) غير مثبت في بيئة التشغيل الحالية.",
            retryable=False,
        ) from exc

    db_schema = str(source.get("schema") or source.get("database") or "")
    try:
        conn = pymysql.connect(
            host=source["host"],
            port=int(source["port"]),
            user=source["username"],
            password=password,
            database=source["database"],
            connect_timeout=5,
            read_timeout=15,
            charset="utf8mb4",
        )
        with closing(conn):
            with conn.cursor() as cur:
                cur.execute("SET SESSION TRANSACTION READ ONLY")
                cur.execute(
                    "SELECT table_name, table_type, table_comment, table_rows "
                    "FROM information_schema.tables WHERE table_schema = %s ORDER BY table_name",
                    (db_schema,),
                )
                table_rows = cur.fetchall()
                tables: List[Dict[str, Any]] = []
                for tname, ttype, tcomment, approx_rows in table_rows:
                    cur.execute(
                        "SELECT column_name, data_type, is_nullable, column_default, column_key, "
                        "ordinal_position, column_comment "
                        "FROM information_schema.columns "
                        "WHERE table_schema = %s AND table_name = %s ORDER BY ordinal_position",
                        (db_schema, tname),
                    )
                    cols = [
                        {
                            "name": str(c[0]),
                            "data_type": str(c[1]),
                            "nullable": str(c[2]).upper() == "YES",
                            "default": c[3],
                            "primary_key": str(c[4]).upper() == "PRI",
                            "unique": str(c[4]).upper() in {"PRI", "UNI"},
                            "foreign_key": str(c[4]).upper() == "MUL",
                            "ordinal_position": int(c[5]),
                            "comment": c[6] or None,
                        }
                        for c in cur.fetchall()
                    ]
                    tables.append(
                        {
                            "catalog": source["database"],
                            "schema": db_schema,
                            "name": str(tname),
                            "object_type": "view" if "VIEW" in str(ttype).upper() else "table",
                            "comment": tcomment or None,
                            "approximate_row_count": int(approx_rows)
                            if approx_rows is not None
                            else None,
                            "dependencies": [],
                            "columns": cols,
                            "primary_keys": [],
                            "foreign_keys": [],
                            "unique_constraints": [],
                            "indexes": [],
                        }
                    )
                conn.rollback()
    except DataSourceConnectionError:
        raise
    except Exception as exc:
        raise DataSourceConnectionError(
            "mysql_connection_error",
            f"تعذر الاتصال أو الاستبطان من MySQL/MariaDB: {_sanitize_text(str(exc))}",
            retryable=True,
        ) from exc

    return _describe_catalog_items(tables, source=source)


def _scan_sqlserver(source: Dict[str, Any], password: str) -> List[Dict[str, Any]]:
    if not str(password or "").strip():
        raise DataSourceConnectionError(
            "password_required",
            "أدخل كلمة مرور مستخدم القراءة لمصدر SQL Server؛ لن تُحفظ.",
            retryable=False,
        )
    try:
        import pyodbc  # type: ignore
    except ImportError as exc:
        raise DataSourceConnectionError(
            "driver_missing",
            "موصل SQL Server (pyodbc) غير مثبت في بيئة التشغيل الحالية.",
            retryable=False,
        ) from exc

    schema = str(source.get("schema") or "dbo")
    conn_str = (
        f"DRIVER={{ODBC Driver 18 for SQL Server}};SERVER={source['host']},{source['port']};"
        f"DATABASE={source['database']};UID={source['username']};PWD={password};"
        f"ApplicationIntent=ReadOnly;Encrypt=yes;TrustServerCertificate=no;"
    )
    try:
        with closing(pyodbc.connect(conn_str, timeout=5, readonly=True)) as conn:
            cur = conn.cursor()
            cur.execute(
                "SELECT TABLE_NAME, TABLE_TYPE FROM INFORMATION_SCHEMA.TABLES "
                "WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME",
                (schema,),
            )
            table_rows = cur.fetchall()
            tables: List[Dict[str, Any]] = []
            for tname, ttype in table_rows:
                cur.execute(
                    "SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, ORDINAL_POSITION "
                    "FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? "
                    "ORDER BY ORDINAL_POSITION",
                    (schema, tname),
                )
                cols = [
                    {
                        "name": str(c[0]),
                        "data_type": str(c[1]),
                        "nullable": str(c[2]).upper() == "YES",
                        "default": c[3],
                        "ordinal_position": int(c[4]),
                    }
                    for c in cur.fetchall()
                ]
                tables.append(
                    {
                        "catalog": source["database"],
                        "schema": schema,
                        "name": str(tname),
                        "object_type": "view" if "VIEW" in str(ttype).upper() else "table",
                        "columns": cols,
                    }
                )
            conn.rollback()
    except Exception as exc:
        raise DataSourceConnectionError(
            "sqlserver_connection_error",
            f"تعذر الاتصال أو الاستبطان من SQL Server: {_sanitize_text(str(exc))}",
            retryable=True,
        ) from exc
    return _describe_catalog_items(tables, source=source)


def scan_source_metadata(
    source: Dict[str, Any],
    password: str = "",
    *,
    postgres_connect_fn: Optional[Callable[..., Any]] = None,
    sqlite_root: Optional[Path] = None,
) -> List[Dict[str, Any]]:
    """استبطان المخطط فقط بصلاحية قراءة فقط وبحسب محرك قاعدة البيانات."""
    engine = str(source.get("engine") or "postgresql").strip().lower()
    if engine == "postgresql":
        return _scan_postgresql_via_pr1(source, password, connect_fn=postgres_connect_fn)
    if engine == "sqlite":
        return _scan_sqlite(source, sqlite_root=sqlite_root)
    if engine in {"mysql", "mariadb"}:
        return _scan_mysql(source, password)
    if engine in {"sqlserver", "mssql"}:
        return _scan_sqlserver(source, password)
    raise ConnectorSecurityError(f"محرك قاعدة البيانات غير مدعوم: {engine}")


def test_source_connection(
    source: Dict[str, Any],
    password: str = "",
    *,
    postgres_connect_fn: Optional[Callable[..., Any]] = None,
    sqlite_root: Optional[Path] = None,
) -> Dict[str, Any]:
    """اختبار الاتصال الآمن وإرجاع ملخص الكائنات المكتشفة."""
    started = time.monotonic()
    tables = scan_source_metadata(
        source,
        password=password,
        postgres_connect_fn=postgres_connect_fn,
        sqlite_root=sqlite_root,
    )
    elapsed_ms = int((time.monotonic() - started) * 1000)
    physical_count = sum(1 for item in tables if item.get("object_type") == "table")
    view_count = sum(1 for item in tables if item.get("object_type") == "view")
    return {
        "connected": True,
        "latency_ms": elapsed_ms,
        "table_count": len(tables),
        "physical_table_count": physical_count,
        "view_count": view_count,
        "tables": tables,
    }


def build_discovery_report_from_catalog(
    *,
    source: Dict[str, Any],
    catalog_tables: Iterable[Dict[str, Any]],
    describer: Optional[DeterministicArabicDescriber] = None,
) -> DiscoveryReport:
    """تحويل الكتالوج الفيزيائي إلى DiscoveryReport للاستخدام مع SemanticIndexer وCatalog v2."""
    describer = describer or DeterministicArabicDescriber()
    raw_list = list(catalog_tables)
    described_list = _describe_catalog_items(raw_list, source=source, describer=describer)

    described_objects: List[DescribedObject] = []
    declared_relationships: List[DeclaredRelationshipMetadata] = []
    seen_rel_sigs: set[str] = set()
    schemas_seen: List[str] = []

    table_count = 0
    view_count = 0
    col_count = 0
    pk_count = 0
    fk_count = 0
    uq_count = 0
    idx_count = 0

    for item in described_list:
        schema = str(item["schema"])
        if schema not in schemas_seen:
            schemas_seen.append(schema)
        obj_type = "view" if item.get("object_type") == "view" else "table"
        if obj_type == "view":
            view_count += 1
        else:
            table_count += 1

        pk_count += len(item.get("primary_keys", []))
        uq_count += len(item.get("unique_constraints", []))
        idx_count += len(item.get("indexes", []))

        d_cols: List[DescribedColumn] = []
        for col in item.get("columns", []):
            col_count += 1
            raw_desc_src = str(col.get("description_source") or "deterministic_template")
            desc_src = (
                "database_comment"
                if raw_desc_src == "database_comment"
                else "deterministic_template"
            )
            d_cols.append(
                DescribedColumn(
                    object_ref=str(col["object_ref"]),
                    name=str(col["name"]),
                    data_type=str(col.get("data_type") or "unknown"),
                    nullable=bool(col.get("nullable", True)),
                    primary_key=bool(col.get("primary_key")),
                    foreign_key=bool(col.get("foreign_key")),
                    unique=bool(col.get("unique")),
                    label_ar=str(col.get("label_ar") or col["name"]),
                    description_ar=str(
                        col.get("description_ar") or col.get("description") or col["name"]
                    ),
                    semantic_type=str(col.get("semantic_type") or "unknown"),
                    description_source=desc_src,
                    fingerprint=str(col.get("fingerprint") or ""),
                    structural_fingerprint=str(col.get("structural_fingerprint") or ""),
                )
            )

        for fk in item.get("foreign_keys", []):
            fk_count += 1
            cols_t = tuple(str(c) for c in fk.get("columns", []))
            tcols_t = tuple(str(c) for c in fk.get("target_columns", []))
            t_schema = str(fk.get("target_schema") or schema)
            t_table = str(fk.get("target_table") or "")
            target_q = f"{t_schema}.{t_table}"
            sig = (
                f"{item['schema_qualified_name']}({','.join(cols_t)})"
                f"->{target_q}({','.join(tcols_t)})"
            )
            if sig not in seen_rel_sigs:
                seen_rel_sigs.add(sig)
                declared_relationships.append(
                    DeclaredRelationshipMetadata(
                        signature=sig,
                        constraint_name=str(fk.get("name") or "fk"),
                        source_table_ref=str(item["object_ref"]),
                        source_table=str(item["schema_qualified_name"]),
                        source_columns=cols_t,
                        target_table_ref=fk.get("target_table_ref"),
                        target_table=target_q,
                        target_columns=tcols_t,
                        business_label_ar=f"ارتباط {item['name']} بـ {t_table}",
                        rationale_ar=f"مفتاح أجنبي مصرح به ({fk.get('name', 'FK')}).",
                    )
                )

        obj_desc_src = (
            "database_comment"
            if item.get("description_source") == "database_comment"
            else "deterministic_template"
        )
        described_objects.append(
            DescribedObject(
                object_ref=str(item["object_ref"]),
                schema=schema,
                name=str(item["name"]),
                schema_qualified_name=str(item["schema_qualified_name"]),
                object_type=obj_type,
                approximate_row_count=item.get("approximate_row_count"),
                dependencies=tuple(str(d) for d in item.get("dependencies", [])),
                label_ar=str(item.get("label_ar") or item["name"]),
                description_ar=str(
                    item.get("description_ar") or item.get("description") or item["name"]
                ),
                entity_type=str(item.get("entity_type") or "كيان"),
                description_source=obj_desc_src,
                fingerprint=str(item.get("fingerprint") or ""),
                structural_fingerprint=str(item.get("structural_fingerprint") or ""),
                stats_fingerprint=str(item.get("stats_fingerprint") or ""),
                semantic_fingerprint=str(item.get("semantic_fingerprint") or ""),
                columns=tuple(d_cols),
                primary_keys=tuple(
                    KeyConstraintMetadata(
                        name=str(pk.get("name") or "pk"), columns=tuple(pk.get("columns", []))
                    )
                    for pk in item.get("primary_keys", [])
                ),
                foreign_keys=tuple(
                    ForeignKeyMetadata(
                        name=str(fk.get("name") or "fk"),
                        columns=tuple(fk.get("columns", [])),
                        target_schema=str(fk.get("target_schema") or schema),
                        target_table=str(fk.get("target_table") or ""),
                        target_columns=tuple(fk.get("target_columns", [])),
                        source_table_ref=str(item["object_ref"]),
                        target_table_ref=fk.get("target_table_ref"),
                    )
                    for fk in item.get("foreign_keys", [])
                ),
                unique_constraints=tuple(
                    KeyConstraintMetadata(
                        name=str(uq.get("name") or "uq"), columns=tuple(uq.get("columns", []))
                    )
                    for uq in item.get("unique_constraints", [])
                ),
                indexes=tuple(
                    IndexMetadata(
                        name=str(ix.get("name") or "idx"),
                        columns=tuple(ix.get("columns", [])),
                        unique=bool(ix.get("unique")),
                        primary=bool(ix.get("primary")),
                    )
                    for ix in item.get("indexes", [])
                ),
            )
        )

    full_fp = pr1_catalog_fingerprint(described_list) if described_list else ""
    struct_fp = pr1_structural_fingerprint(described_list) if described_list else ""

    return DiscoveryReport(
        rules_version="pr1-rules-v1",
        source_summary={
            "source_id": str(source.get("id") or source.get("source_id") or "source"),
            "database": str(source.get("database") or ""),
            "host": str(source.get("host") or "localhost"),
            "port": int(source.get("port") or 0),
            "read_only": True,
            "engine": str(source.get("engine") or "postgresql"),
        },
        schemas=tuple(schemas_seen or [str(source.get("schema") or "public")]),
        counts=CatalogCounts(
            tables=table_count,
            views=view_count,
            total_objects=table_count + view_count,
            columns=col_count,
            primary_keys=pk_count,
            foreign_keys=fk_count,
            unique_constraints=uq_count,
            indexes=idx_count,
            schemas=len(schemas_seen) or 1,
        ),
        catalog_fingerprint=full_fp,
        structural_fingerprint=struct_fp,
        objects=tuple(described_objects),
        relationships=tuple(declared_relationships),
        markdown_ar="",
    )
