"""البصمات الحتمية (SHA-256) مع فصل البنية عن الإحصاءات والأوصاف وبيانات الاتصال."""

from __future__ import annotations

import hashlib
import json
from typing import Any, Iterable, Mapping


def canonical_json(value: Any) -> str:
    """تسلسل JSON حتمي مستقل عن ترتيب المفاتيح في القواميس."""
    return json.dumps(
        value,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
        default=str,
    )


def _sorted_keys(items: Iterable[Mapping[str, Any]]) -> list[dict[str, Any]]:
    normalized = [
        {"name": str(item.get("name") or ""), "columns": [str(c) for c in item.get("columns", [])]}
        for item in items
    ]
    return sorted(normalized, key=lambda entry: (entry["name"], entry["columns"]))


def _sorted_foreign_keys(items: Iterable[Mapping[str, Any]]) -> list[dict[str, Any]]:
    normalized = [
        {
            "name": str(item.get("name") or ""),
            "columns": [str(c) for c in item.get("columns", [])],
            "target_schema": str(item.get("target_schema") or ""),
            "target_table": str(item.get("target_table") or ""),
            "target_columns": [str(c) for c in item.get("target_columns", [])],
        }
        for item in items
    ]
    return sorted(
        normalized,
        key=lambda entry: (
            entry["name"],
            entry["columns"],
            entry["target_schema"],
            entry["target_table"],
            entry["target_columns"],
        ),
    )


def _sorted_indexes(items: Iterable[Mapping[str, Any]]) -> list[dict[str, Any]]:
    normalized = [
        {
            "name": str(item.get("name") or ""),
            "columns": [str(c) for c in item.get("columns", [])],
            "unique": bool(item.get("unique", False)),
            "primary": bool(item.get("primary", False)),
        }
        for item in items
    ]
    return sorted(normalized, key=lambda entry: (entry["name"], entry["columns"]))


def structural_column_fingerprint(column: Mapping[str, Any]) -> str:
    """بصمة بنيوية خالصة للعمود (مستقلة عن الإحصاءات وبيانات الاتصال)."""
    projection = {
        "name": str(column.get("name") or ""),
        "data_type": str(column.get("data_type") or "unknown"),
        "nullable": bool(column.get("nullable", True)),
        "default": column.get("default"),
        "ordinal_position": int(column.get("ordinal_position") or 0),
        "primary_key": bool(column.get("primary_key", False)),
        "foreign_key": bool(column.get("foreign_key", False)),
        "unique": bool(column.get("unique", False)),
    }
    return hashlib.sha256(canonical_json(projection).encode("utf-8")).hexdigest()


def structural_object_fingerprint(table: Mapping[str, Any]) -> str:
    """بصمة بنيوية خالصة للجدول/المشهد.

    لا تتأثر بعدد الصفوف التقريبي، ولا بطوابع الزمن، ولا ببيانات الاتصال أو
    ``source_id``، ولا بترتيب نتائج الاستعلام.
    """
    columns = sorted(
        table.get("columns", []),
        key=lambda item: (int(item.get("ordinal_position") or 0), str(item.get("name") or "")),
    )
    projection = {
        "schema": str(table.get("schema") or "public"),
        "name": str(table.get("name") or ""),
        "object_type": "view" if table.get("object_type") == "view" else "table",
        "columns": [
            {
                "name": str(col.get("name") or ""),
                "structural_fingerprint": structural_column_fingerprint(col),
            }
            for col in columns
        ],
        "primary_keys": _sorted_keys(table.get("primary_keys", [])),
        "foreign_keys": _sorted_foreign_keys(table.get("foreign_keys", [])),
        "unique_constraints": _sorted_keys(table.get("unique_constraints", [])),
        "indexes": _sorted_indexes(table.get("indexes", [])),
        "dependencies": sorted(str(dep) for dep in table.get("dependencies", []) if dep),
    }
    return hashlib.sha256(canonical_json(projection).encode("utf-8")).hexdigest()


def structural_catalog_fingerprint(tables: Iterable[Mapping[str, Any]]) -> str:
    """بصمة بنيوية لكامل المخطط مستقلة عن ترتيب الكائنات أو عدادات الصفوف أو الاتصال."""
    projection = [
        {
            "schema_qualified_name": (
                str(t.get("schema_qualified_name") or f"{t.get('schema') or 'public'}.{t['name']}")
            ),
            "structural_fingerprint": (
                t.get("structural_fingerprint") or structural_object_fingerprint(t)
            ),
        }
        for t in sorted(
            tables,
            key=lambda item: (
                str(item.get("schema") or "public"),
                str(item.get("name") or ""),
            ),
        )
    ]
    return hashlib.sha256(canonical_json(projection).encode("utf-8")).hexdigest()


def stats_object_fingerprint(table: Mapping[str, Any]) -> str:
    """بصمة إحصائية منفصلة لعدد الصفوف التقريبي دون المساس بالبصمة البنيوية."""
    projection = {
        "schema": str(table.get("schema") or "public"),
        "name": str(table.get("name") or ""),
        "approximate_row_count": table.get("approximate_row_count"),
    }
    return hashlib.sha256(canonical_json(projection).encode("utf-8")).hexdigest()


def semantic_object_fingerprint(table: Mapping[str, Any]) -> str:
    """بصمة التوصيف والتعليقات الموثقة (COMMENT ON) منفصلة عن البنية الفيزيائية."""
    columns = sorted(table.get("columns", []), key=lambda item: str(item.get("name") or ""))
    projection = {
        "schema": str(table.get("schema") or "public"),
        "name": str(table.get("name") or ""),
        "object_type": "view" if table.get("object_type") == "view" else "table",
        "comment": table.get("comment"),
        "column_comments": [
            {"name": str(col.get("name") or ""), "comment": col.get("comment")} for col in columns
        ],
    }
    return hashlib.sha256(canonical_json(projection).encode("utf-8")).hexdigest()


def column_fingerprint(column: Mapping[str, Any]) -> str:
    """بصمة العمود الكاملة (البنية + التعليق)."""
    projection = {
        "structural": structural_column_fingerprint(column),
        "comment": column.get("comment"),
    }
    return hashlib.sha256(canonical_json(projection).encode("utf-8")).hexdigest()


def object_fingerprint(table: Mapping[str, Any]) -> str:
    """بصمة الكائن الكاملة (البنية + التعليقات الدلالية) دون إحصاءات الصفوف أو الاتصال."""
    projection = {
        "structural": structural_object_fingerprint(table),
        "semantic": semantic_object_fingerprint(table),
    }
    return hashlib.sha256(canonical_json(projection).encode("utf-8")).hexdigest()


def catalog_fingerprint(tables: Iterable[Mapping[str, Any]]) -> str:
    """بصمة الكتالوج الكاملة المرتبة حتمياً دون تأثر بترتيب الاستعلام أو الصفوف."""
    projection = [
        {
            "schema_qualified_name": (
                str(t.get("schema_qualified_name") or f"{t.get('schema') or 'public'}.{t['name']}")
            ),
            "fingerprint": t.get("fingerprint") or object_fingerprint(t),
        }
        for t in sorted(
            tables,
            key=lambda item: (
                str(item.get("schema") or "public"),
                str(item.get("name") or ""),
            ),
        )
    ]
    return hashlib.sha256(canonical_json(projection).encode("utf-8")).hexdigest()
