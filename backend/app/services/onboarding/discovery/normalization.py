"""تطبيع بيانات المخطط المستبطنة ومنع التكرار ومقارنة اللقطات."""

from __future__ import annotations

import copy
from typing import Any, Dict, Iterable, List, Mapping

from .fingerprints import (
    catalog_fingerprint,
    column_fingerprint,
    object_fingerprint,
    semantic_object_fingerprint,
    stats_object_fingerprint,
    structural_catalog_fingerprint,
    structural_column_fingerprint,
    structural_object_fingerprint,
)
from .models import CatalogCounts


def deduplicate_objects_by_ref(tables: Iterable[Mapping[str, Any]]) -> List[Dict[str, Any]]:
    """الاحتفاظ بأول سجل مستقر لكل ``object_ref`` لمنع تضخم العدادات."""
    seen: set[str] = set()
    unique: List[Dict[str, Any]] = []
    for item in tables:
        ref = str(item.get("object_ref") or "")
        if ref:
            if ref in seen:
                continue
            seen.add(ref)
        unique.append(copy.deepcopy(dict(item)))
    return unique


def compute_catalog_counts(tables: Iterable[Mapping[str, Any]]) -> CatalogCounts:
    """حساب عدد الجداول الفيزيائية والمشاهد وإجمالي الكائنات بدقة دون تكرار."""
    unique = deduplicate_objects_by_ref(tables)
    physical_tables = sum(1 for item in unique if item.get("object_type", "table") != "view")
    views = sum(1 for item in unique if item.get("object_type") == "view")
    schemas = len({str(item.get("schema") or "") for item in unique if item.get("schema")})
    return CatalogCounts(
        tables=physical_tables,
        views=views,
        total_objects=len(unique),
        columns=sum(len(item.get("columns", [])) for item in unique),
        primary_keys=sum(len(item.get("primary_keys", [])) for item in unique),
        foreign_keys=sum(len(item.get("foreign_keys", [])) for item in unique),
        unique_constraints=sum(len(item.get("unique_constraints", [])) for item in unique),
        indexes=sum(len(item.get("indexes", [])) for item in unique),
        schemas=schemas,
    )


def normalize_discovered_objects(
    raw_tables: Iterable[Mapping[str, Any]],
    *,
    source_id: str,
    source_name: str,
    catalog_alias: str,
    database_name: str | None = None,
    default_schema: str = "public",
    qualify_with_alias: bool = False,
    always_schema_qualify: bool = False,
) -> List[Dict[str, Any]]:
    """تطبيع المخطط المستخرج بمعرّفات مؤهلة بالمخطط وبصمات مفصولة."""
    raw_list = [copy.deepcopy(dict(item)) for item in raw_tables]
    distinct_schemas = {
        str(item.get("schema") or default_schema)
        for item in raw_list
        if item.get("schema") or default_schema
    }
    multi_schema_in_source = len(distinct_schemas) > 1

    normalized: List[Dict[str, Any]] = []
    seen_refs: set[str] = set()
    for table in sorted(
        raw_list,
        key=lambda item: (
            str(item.get("schema") or default_schema),
            0 if item.get("object_type", "table") != "view" else 1,
            str(item.get("original_name") or item.get("name") or ""),
        ),
    ):
        original_name = str(table.get("original_name") or table["name"])
        schema_name = str(table.get("schema") or default_schema)
        schema_qualified_name = f"{schema_name}.{original_name}" if schema_name else original_name
        table_ref = f"{source_id}::{schema_name}::{original_name}"
        if table_ref in seen_refs:
            continue
        seen_refs.add(table_ref)

        if qualify_with_alias:
            qualified_name = (
                f"{catalog_alias}.{schema_qualified_name}"
                if multi_schema_in_source and schema_name
                else f"{catalog_alias}.{original_name}"
            )
        elif always_schema_qualify or multi_schema_in_source:
            qualified_name = schema_qualified_name
        else:
            qualified_name = original_name

        table.update(
            name=original_name,
            original_name=original_name,
            schema=schema_name,
            qualified_name=qualified_name,
            schema_qualified_name=schema_qualified_name,
            object_ref=table_ref,
            catalog=database_name if database_name is not None else table.get("catalog"),
            source_id=source_id,
            source_name=source_name,
            catalog_alias=catalog_alias,
        )
        table["object_type"] = "view" if table.get("object_type") == "view" else "table"
        table.setdefault("comment", None)
        table.setdefault("approximate_row_count", None)
        table["dependencies"] = sorted(
            dict.fromkeys(str(dep) for dep in table.get("dependencies", []) if dep)
        )
        table["primary_keys"] = sorted(
            [
                {
                    "name": str(k.get("name") or ""),
                    "columns": [str(c) for c in k.get("columns", [])],
                }
                for k in table.get("primary_keys", [])
            ],
            key=lambda item: (item["name"], item["columns"]),
        )
        table.setdefault("foreign_keys", [])
        table["unique_constraints"] = sorted(
            [
                {
                    "name": str(u.get("name") or ""),
                    "columns": [str(c) for c in u.get("columns", [])],
                }
                for u in table.get("unique_constraints", [])
            ],
            key=lambda item: (item["name"], item["columns"]),
        )
        table["indexes"] = sorted(
            [
                {
                    "name": str(ix.get("name") or ""),
                    "columns": [str(c) for c in ix.get("columns", [])],
                    "unique": bool(ix.get("unique", False)),
                    "primary": bool(ix.get("primary", False)),
                }
                for ix in table.get("indexes", [])
            ],
            key=lambda item: (item["name"], item["columns"]),
        )

        primary_columns = {
            col_name for key in table["primary_keys"] for col_name in key.get("columns", [])
        }
        foreign_columns = {
            col_name
            for key in table["foreign_keys"]
            for col_name in key.get("columns", [key.get("column")])
            if col_name
        }
        unique_columns = {
            col_name
            for constraint in table["unique_constraints"]
            for col_name in constraint.get("columns", [])
        }

        raw_columns = sorted(
            table.get("columns", []),
            key=lambda item: (int(item.get("ordinal_position") or 0), str(item.get("name") or "")),
        )
        normalized_columns: List[Dict[str, Any]] = []
        seen_cols: set[str] = set()
        for ordinal, raw_col in enumerate(raw_columns, start=1):
            col = dict(raw_col)
            col_name = str(col["name"])
            if col_name in seen_cols:
                continue
            seen_cols.add(col_name)
            col.setdefault("data_type", "unknown")
            col["nullable"] = bool(col.get("nullable", True))
            col["ordinal_position"] = int(col.get("ordinal_position") or ordinal)
            col.setdefault("default", None)
            col.setdefault("comment", None)
            col["primary_key"] = bool(col.get("primary_key") or col_name in primary_columns)
            col["foreign_key"] = col_name in foreign_columns
            col["unique"] = col_name in unique_columns
            col["object_ref"] = f"{table_ref}::{col_name}"
            col["structural_fingerprint"] = structural_column_fingerprint(col)
            col["fingerprint"] = column_fingerprint(col)
            normalized_columns.append(col)

        table["columns"] = normalized_columns
        normalized.append(table)

    lookup = {(item["source_id"], item["schema"], item["name"]): item for item in normalized}
    for table in normalized:
        normalized_fks = []
        for fk in table["foreign_keys"]:
            fk_copy = dict(fk)
            fk_copy.setdefault("columns", [fk.get("column")] if fk.get("column") else [])
            fk_copy.setdefault(
                "target_columns", [fk.get("target_column")] if fk.get("target_column") else []
            )
            target_schema = str(fk_copy.get("target_schema") or table["schema"] or "")
            target = lookup.get(
                (table["source_id"], target_schema, str(fk_copy.get("target_table") or ""))
            )
            fk_copy["target_schema"] = target_schema
            fk_copy["source_table_ref"] = table["object_ref"]
            fk_copy["target_table_ref"] = target["object_ref"] if target else None
            fk_copy["declared"] = True
            normalized_fks.append(fk_copy)
        table["foreign_keys"] = sorted(
            normalized_fks,
            key=lambda item: (
                str(item.get("name") or ""),
                list(item.get("columns", [])),
                str(item.get("target_schema") or ""),
                str(item.get("target_table") or ""),
            ),
        )

    for table in normalized:
        table["structural_fingerprint"] = structural_object_fingerprint(table)
        table["stats_fingerprint"] = stats_object_fingerprint(table)
        table["semantic_fingerprint"] = semantic_object_fingerprint(table)
        table["fingerprint"] = object_fingerprint(table)

    return normalized


def compare_snapshots(
    baseline: Iterable[Mapping[str, Any]],
    current: Iterable[Mapping[str, Any]],
) -> Dict[str, Any]:
    """مقارنة لقطتين مع تمييز التغير البنيوي عن التغير الدلالي والإحصائي."""
    old = {
        str(item.get("schema_qualified_name") or item["name"]): item
        for item in deduplicate_objects_by_ref(baseline)
        if item.get("name")
    }
    new = {
        str(item.get("schema_qualified_name") or item["name"]): item
        for item in deduplicate_objects_by_ref(current)
        if item.get("name")
    }
    added = sorted(new.keys() - old.keys())
    removed = sorted(old.keys() - new.keys())
    common = sorted(old.keys() & new.keys())

    structural_modified: List[str] = []
    semantic_only_modified: List[str] = []
    stats_only_modified: List[str] = []
    modified: List[str] = []

    for key in common:
        o_item, n_item = old[key], new[key]
        o_struct = o_item.get("structural_fingerprint") or structural_object_fingerprint(o_item)
        n_struct = n_item.get("structural_fingerprint") or structural_object_fingerprint(n_item)
        o_sem = o_item.get("semantic_fingerprint") or semantic_object_fingerprint(o_item)
        n_sem = n_item.get("semantic_fingerprint") or semantic_object_fingerprint(n_item)
        o_stat = o_item.get("stats_fingerprint") or stats_object_fingerprint(o_item)
        n_stat = n_item.get("stats_fingerprint") or stats_object_fingerprint(n_item)

        if o_struct != n_struct:
            structural_modified.append(key)
            modified.append(key)
        elif o_sem != n_sem:
            semantic_only_modified.append(key)
            modified.append(key)
        elif o_stat != n_stat:
            stats_only_modified.append(key)

    unchanged = len(common) - len(modified)
    return {
        "has_baseline": bool(old),
        "baseline_fingerprint": catalog_fingerprint(old.values()) if old else None,
        "current_fingerprint": catalog_fingerprint(new.values()) if new else None,
        "baseline_structural_fingerprint": (
            structural_catalog_fingerprint(old.values()) if old else None
        ),
        "current_structural_fingerprint": (
            structural_catalog_fingerprint(new.values()) if new else None
        ),
        "added": added,
        "removed": removed,
        "modified": modified,
        "structural_modified": structural_modified,
        "semantic_only_modified": semantic_only_modified,
        "stats_only_modified": stats_only_modified,
        "structural_changed": bool(added or removed or structural_modified),
        "unchanged": unchanged,
        "changed_objects": len(added) + len(removed) + len(modified),
    }
