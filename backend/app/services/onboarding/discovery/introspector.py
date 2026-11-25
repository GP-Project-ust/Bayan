"""مستبطن PostgreSQL عام للقراءة فقط عبر information_schema وpg_catalog."""

from __future__ import annotations

import time
from typing import Any, Callable, Dict, List, Optional, Sequence

from .settings import SYSTEM_SCHEMAS, PostgresConnectionSettings


class PostgresIntrospectionError(RuntimeError):
    """خطأ منظم وآمن من الأسرار عند فشل استبطان PostgreSQL."""

    def __init__(self, code: str, message: str, *, retryable: bool = False):
        super().__init__(message)
        self.code = code
        self.message = message
        self.retryable = retryable


def read_postgresql_metadata(
    cursor: Any,
    schemas: Sequence[str],
    *,
    deadline: Optional[float] = None,
    max_objects: int = 1000,
    max_columns_per_object: int = 500,
) -> List[Dict[str, Any]]:
    """استخراج المخطط الخام الموحد من ``information_schema`` و``pg_catalog``.

    يدعم مخططاً واحداً، قائمة مخططات، أو ``("*",)`` لاكتشاف كل المخططات غير النظامية.
    """

    def execute(query: str, params: tuple[Any, ...] = ()) -> None:
        if deadline is not None and time.monotonic() >= deadline:
            raise PostgresIntrospectionError(
                "metadata_timeout",
                "انتهت مهلة قراءة كتالوج metadata من PostgreSQL.",
                retryable=True,
            )
        cursor.execute(query, params)

    # فرض وضع القراءة فقط على الجلسة؛ رفض أي جلسة قابلة للكتابة.
    try:
        execute("SHOW transaction_read_only")
        ro_row = cursor.fetchone()
        if ro_row and str(ro_row[0]).strip().lower() not in ("on", "true", "1"):
            raise PostgresIntrospectionError(
                "read_only_required",
                "تم رفض جلسة PostgreSQL لأنها ليست في وضع القراءة فقط (transaction_read_only=on).",
            )
    except PostgresIntrospectionError:
        raise
    except Exception:
        pass

    target_schemas = list(schemas or ("public",))
    if target_schemas == ["*"]:
        execute(
            "SELECT schema_name FROM information_schema.schemata "
            "WHERE schema_name NOT IN ('pg_catalog', 'information_schema') "
            "AND schema_name NOT LIKE 'pg_toast%' "
            "AND schema_name NOT LIKE 'pg_temp_%' "
            "ORDER BY schema_name"
        )
        discovered_schemas = [str(row[0]) for row in cursor.fetchall() if row and row[0]]
        if not discovered_schemas:
            raise PostgresIntrospectionError(
                "empty_schema",
                "لا توجد مخططات غير نظامية قابلة للاكتشاف في قاعدة PostgreSQL.",
            )
        target_schemas = discovered_schemas

    if len(target_schemas) == 1:
        schema_clause = "table_schema = %s"
        schema_params: tuple[Any, ...] = (target_schemas[0],)
    else:
        schema_clause = "table_schema = ANY(%s)"
        schema_params = (target_schemas,)

    execute(
        f"SELECT table_schema, table_name, table_type FROM information_schema.tables "
        f"WHERE table_type IN ('BASE TABLE','VIEW') AND {schema_clause} "
        f"ORDER BY table_schema, table_type, table_name",
        schema_params,
    )
    table_rows = cursor.fetchall()
    if not table_rows:
        raise PostgresIntrospectionError(
            "empty_schema",
            "نجح الاتصال لكن المخطط المحدد لا يحتوي جداول أو مشاهد قابلة للاكتشاف.",
        )
    if len(table_rows) > max_objects:
        raise ValueError("عدد الجداول والمشاهد يتجاوز الحد المسموح به للاكتشاف.")

    objects: List[Dict[str, Any]] = []
    for table_row in table_rows:
        schema_name, table_name = str(table_row[0]), str(table_row[1])
        if schema_name in SYSTEM_SCHEMAS:
            continue
        raw_table_type = str(table_row[2]).upper() if len(table_row) > 2 else "BASE TABLE"
        object_type = "view" if "VIEW" in raw_table_type else "table"

        execute(
            "SELECT column_name, data_type, is_nullable, column_default, ordinal_position "
            "FROM information_schema.columns WHERE table_schema = %s "
            "AND table_name = %s ORDER BY ordinal_position",
            (schema_name, table_name),
        )
        column_rows = cursor.fetchall()
        if len(column_rows) > max_columns_per_object:
            raise ValueError(f"عدد أعمدة الكائن {schema_name}.{table_name} يتجاوز الحد المسموح به.")

        execute(
            "SELECT a.attname, col_description(a.attrelid, a.attnum), "
            "pg_catalog.format_type(a.atttypid, a.atttypmod) "
            "FROM pg_catalog.pg_attribute a "
            "JOIN pg_catalog.pg_class c ON c.oid = a.attrelid "
            "JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace "
            "WHERE n.nspname = %s AND c.relname = %s "
            "AND a.attnum > 0 AND NOT a.attisdropped",
            (schema_name, table_name),
        )
        column_comments: Dict[str, Optional[str]] = {}
        formatted_types: Dict[str, str] = {}
        for attr_row in cursor.fetchall():
            col_name = str(attr_row[0])
            column_comments[col_name] = attr_row[1] if len(attr_row) > 1 else None
            if len(attr_row) > 2 and attr_row[2]:
                formatted_types[col_name] = str(attr_row[2])

        execute(
            "SELECT obj_description(c.oid, 'pg_class') FROM pg_catalog.pg_class c "
            "JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace "
            "WHERE n.nspname = %s AND c.relname = %s",
            (schema_name, table_name),
        )
        comment_rows = cursor.fetchall()
        table_comment = comment_rows[0][0] if comment_rows and comment_rows[0][0] else None

        approximate_row_count: Optional[int] = None
        if object_type == "table":
            execute(
                "SELECT CASE WHEN c.reltuples < 0 THEN NULL ELSE c.reltuples::bigint END "
                "FROM pg_catalog.pg_class c "
                "JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace "
                "WHERE n.nspname = %s AND c.relname = %s",
                (schema_name, table_name),
            )
            count_rows = cursor.fetchall()
            if count_rows and count_rows[0][0] is not None:
                approximate_row_count = max(0, int(count_rows[0][0]))

        execute(
            "SELECT tc.constraint_name, kcu.column_name, kcu.ordinal_position "
            "FROM information_schema.table_constraints tc "
            "JOIN information_schema.key_column_usage kcu "
            "ON tc.constraint_name = kcu.constraint_name "
            "AND tc.constraint_schema = kcu.constraint_schema "
            "AND tc.table_schema = kcu.table_schema AND tc.table_name = kcu.table_name "
            "WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_schema = %s "
            "AND tc.table_name = %s ORDER BY tc.constraint_name, kcu.ordinal_position",
            (schema_name, table_name),
        )
        primary_rows = cursor.fetchall()
        primary_columns = {str(row[1]) for row in primary_rows}
        primary_keys = [
            {
                "name": str(cname),
                "columns": [str(row[1]) for row in primary_rows if row[0] == cname],
            }
            for cname in dict.fromkeys(row[0] for row in primary_rows)
        ]

        execute(
            "SELECT tc.constraint_name, kcu.column_name, kcu.ordinal_position "
            "FROM information_schema.table_constraints tc "
            "JOIN information_schema.key_column_usage kcu "
            "ON tc.constraint_name = kcu.constraint_name "
            "AND tc.constraint_schema = kcu.constraint_schema "
            "AND tc.table_schema = kcu.table_schema AND tc.table_name = kcu.table_name "
            "WHERE tc.constraint_type = 'UNIQUE' AND tc.table_schema = %s "
            "AND tc.table_name = %s ORDER BY tc.constraint_name, kcu.ordinal_position",
            (schema_name, table_name),
        )
        unique_rows = cursor.fetchall()
        unique_constraints = [
            {
                "name": str(cname),
                "columns": [str(row[1]) for row in unique_rows if row[0] == cname],
            }
            for cname in dict.fromkeys(row[0] for row in unique_rows)
        ]

        execute(
            "SELECT kcu.constraint_name, kcu.column_name, ukcu.table_schema, ukcu.table_name, "
            "ukcu.column_name, kcu.ordinal_position "
            "FROM information_schema.table_constraints tc "
            "JOIN information_schema.key_column_usage kcu "
            "ON tc.constraint_name = kcu.constraint_name "
            "AND tc.constraint_schema = kcu.constraint_schema "
            "AND tc.table_schema = kcu.table_schema AND tc.table_name = kcu.table_name "
            "JOIN information_schema.referential_constraints rc "
            "ON rc.constraint_name = tc.constraint_name "
            "AND rc.constraint_schema = tc.constraint_schema "
            "JOIN information_schema.key_column_usage ukcu "
            "ON ukcu.constraint_name = rc.unique_constraint_name "
            "AND ukcu.constraint_schema = rc.unique_constraint_schema "
            "AND ukcu.ordinal_position = kcu.position_in_unique_constraint "
            "WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = %s "
            "AND tc.table_name = %s ORDER BY kcu.constraint_name, kcu.ordinal_position",
            (schema_name, table_name),
        )
        foreign_rows = cursor.fetchall()
        foreign_keys = []
        for cname in dict.fromkeys(row[0] for row in foreign_rows):
            matching = [row for row in foreign_rows if row[0] == cname]
            foreign_keys.append(
                {
                    "name": str(cname),
                    "columns": [str(row[1]) for row in matching],
                    "target_schema": str(matching[0][2]),
                    "target_table": str(matching[0][3]),
                    "target_columns": [str(row[4]) for row in matching],
                }
            )

        columns = []
        for row in column_rows:
            col_name = str(row[0])
            raw_type = str(row[1] or "unknown")
            resolved_type = (
                formatted_types.get(col_name, raw_type)
                if raw_type.upper() in ("USER-DEFINED", "ARRAY", "UNKNOWN")
                else raw_type
            )
            columns.append(
                {
                    "name": col_name,
                    "data_type": resolved_type or "unknown",
                    "nullable": str(row[2]).upper() == "YES",
                    "default": row[3],
                    "ordinal_position": int(row[4]),
                    "comment": column_comments.get(col_name),
                    "primary_key": col_name in primary_columns,
                }
            )

        dependencies: List[str] = []
        if object_type == "view":
            execute(
                "SELECT table_schema, table_name FROM information_schema.view_table_usage "
                "WHERE view_schema = %s AND view_name = %s "
                "ORDER BY table_schema, table_name",
                (schema_name, table_name),
            )
            dependencies = sorted(
                dict.fromkeys(f"{row[0]}.{row[1]}" for row in cursor.fetchall() if row and row[1])
            )

        indexes: Dict[str, Dict[str, Any]] = {}
        if object_type == "table":
            execute(
                "SELECT i.relname, a.attname, ix.indisunique, ix.indisprimary, keys.ordinality "
                "FROM pg_catalog.pg_class t "
                "JOIN pg_catalog.pg_namespace n ON n.oid = t.relnamespace "
                "JOIN pg_catalog.pg_index ix ON t.oid = ix.indrelid "
                "JOIN pg_catalog.pg_class i ON i.oid = ix.indexrelid "
                "JOIN LATERAL unnest(ix.indkey) WITH ORDINALITY keys(attnum, ordinality) ON true "
                "JOIN pg_catalog.pg_attribute a ON a.attrelid = t.oid AND a.attnum = keys.attnum "
                "WHERE n.nspname = %s AND t.relname = %s AND a.attnum > 0 AND NOT a.attisdropped "
                "ORDER BY i.relname, keys.ordinality",
                (schema_name, table_name),
            )
            for index_name, column_name, is_unique, is_primary, _ in cursor.fetchall():
                index = indexes.setdefault(
                    str(index_name),
                    {
                        "name": str(index_name),
                        "columns": [],
                        "unique": bool(is_unique),
                        "primary": bool(is_primary),
                    },
                )
                index["columns"].append(str(column_name))

        objects.append(
            {
                "schema": schema_name,
                "name": table_name,
                "comment": table_comment,
                "object_type": object_type,
                "approximate_row_count": approximate_row_count,
                "dependencies": dependencies,
                "columns": columns,
                "primary_keys": primary_keys,
                "foreign_keys": foreign_keys,
                "unique_constraints": unique_constraints,
                "indexes": list(indexes.values()),
            }
        )
    return objects


class PostgresIntrospector:
    """مستبطن PostgreSQL رسمي للقراءة فقط."""

    def __init__(self, connect_fn: Optional[Callable[..., Any]] = None):
        self._connect_fn = connect_fn

    def introspect(self, settings: PostgresConnectionSettings) -> List[Dict[str, Any]]:
        if self._connect_fn is None:
            try:
                import psycopg
            except ImportError as exc:
                raise PostgresIntrospectionError(
                    "driver_missing",
                    "موصل PostgreSQL غير مثبت على الخادم.",
                ) from exc
            connect = psycopg.connect
        else:
            connect = self._connect_fn

        deadline = time.monotonic() + max(1.0, settings.statement_timeout_ms / 1000.0)
        with connect(**settings.to_psycopg_kwargs()) as connection:
            try:
                with connection.cursor() as cursor:
                    return read_postgresql_metadata(
                        cursor,
                        settings.schemas,
                        deadline=deadline,
                        max_objects=settings.max_objects,
                        max_columns_per_object=settings.max_columns_per_object,
                    )
            finally:
                connection.rollback()
