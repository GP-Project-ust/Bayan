"""اختبارات فصل البصمات البنيوية عن تغيّر عدد الصفوف والترتيب ومعلومات الاتصال."""

from __future__ import annotations

import copy

from app.services.onboarding.discovery import (
    compare_snapshots,
    normalize_discovered_objects,
    structural_catalog_fingerprint,
)
from tests.test_onboarding_introspection import _logistics_catalog, _official_university_catalog


def test_structural_fingerprint_is_invariant_to_row_counts_ordering_and_connection_info():
    base_raw = _official_university_catalog()["objects"]
    snap_a = normalize_discovered_objects(
        base_raw,
        source_id="SRC-DEV-1",
        source_name="Uni Dev 1",
        catalog_alias="uni_a",
        database_name="university",
        default_schema="public",
    )

    changed_stats_raw = copy.deepcopy(base_raw)
    changed_stats_raw.reverse()
    for obj in changed_stats_raw:
        if obj["object_type"] == "table":
            obj["approximate_row_count"] = (obj.get("reltuples") or 10) + 25_000
        obj["columns"] = list(reversed(obj["columns"]))
        obj["foreign_keys"] = list(reversed(obj.get("foreign_keys", [])))

    snap_b = normalize_discovered_objects(
        changed_stats_raw,
        source_id="SRC-PROD-99",
        source_name="Uni Prod ReadOnly",
        catalog_alias="uni_b",
        database_name="university_replica",
        default_schema="public",
    )

    assert structural_catalog_fingerprint(snap_a) == structural_catalog_fingerprint(snap_b)
    diff = compare_snapshots(snap_a, snap_b)
    assert diff["structural_changed"] is False
    assert diff["structural_modified"] == []
    assert diff["added"] == []
    assert diff["removed"] == []


def test_structural_fingerprint_detects_real_schema_changes():
    base_raw = copy.deepcopy(_logistics_catalog()["objects"])
    snap_a = normalize_discovered_objects(
        base_raw,
        source_id="SRC-LOG",
        source_name="Logistics",
        catalog_alias="logistics",
        default_schema="logistics",
    )

    # 1) تغيير نوع عمود في جدول + إضافة عمود جديد
    mod_col_raw = copy.deepcopy(base_raw)
    shipments = next(o for o in mod_col_raw if o["name"] == "shipments")
    shipments["columns"][0]["data_type"] = "numeric(18,4)"
    shipments["columns"].append(
        {"name": "priority_code", "data_type": "character varying", "ordinal_position": 7}
    )
    snap_col = normalize_discovered_objects(
        mod_col_raw,
        source_id="SRC-LOG",
        source_name="Logistics",
        catalog_alias="logistics",
        default_schema="logistics",
    )
    diff_col = compare_snapshots(snap_a, snap_col)
    assert diff_col["structural_changed"] is True
    assert "logistics.shipments" in diff_col["structural_modified"]

    # 2) إزالة مشهد + إضافة جدول
    mod_obj_raw = [
        o for o in copy.deepcopy(base_raw) if o["name"] != "v_warehouse_dispatch_summary"
    ]
    mod_obj_raw.append(
        {
            "schema": "logistics",
            "name": "customs_holds",
            "object_type": "table",
            "columns": [{"name": "hold_id", "data_type": "bigint", "ordinal_position": 1}],
            "primary_keys": [{"name": "customs_holds_pkey", "columns": ["hold_id"]}],
        }
    )
    snap_obj = normalize_discovered_objects(
        mod_obj_raw,
        source_id="SRC-LOG",
        source_name="Logistics",
        catalog_alias="logistics",
        default_schema="logistics",
    )
    diff_obj = compare_snapshots(snap_a, snap_obj)
    assert diff_obj["structural_changed"] is True
    assert diff_obj["added"] == ["logistics.customs_holds"]
    assert diff_obj["removed"] == ["logistics.v_warehouse_dispatch_summary"]
