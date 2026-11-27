"""اختبارات واجهة FastAPI المدمجة لمسار التهيئة الذكية (/api/v1/onboarding) وعزل المستأجر."""

from __future__ import annotations

import sqlite3
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.main import create_app


def _make_client() -> TestClient:
    return TestClient(create_app())


def test_onboarding_api_lifecycle_and_tenant_isolation(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    db_file = tmp_path / "logistics_api.sqlite"
    with sqlite3.connect(db_file) as conn:
        conn.executescript(
            """
            CREATE TABLE warehouses (id INTEGER PRIMARY KEY, city TEXT NOT NULL);
            CREATE TABLE shipments (
                id INTEGER PRIMARY KEY,
                warehouse_id INTEGER REFERENCES warehouses(id),
                tracking_code TEXT NOT NULL,
                total_cost NUMERIC NOT NULL
            );
            CREATE VIEW v_warehouse_shipments AS
            SELECT w.city, COUNT(s.id) AS shipments_count
            FROM warehouses w LEFT JOIN shipments s ON w.id = s.warehouse_id
            GROUP BY w.city;
            """
        )

    monkeypatch.setenv("BAYAN_SQLITE_ROOT", str(tmp_path))
    monkeypatch.setenv("BAYAN_ONBOARDING_STATE_BACKEND", "memory")
    monkeypatch.setenv("CATALOG_PROVIDER", "legacy")

    client = _make_client()

    # فحص جاهزية النظام (بدون كشف أسرار)
    ready = client.get("/api/v1/onboarding/readiness")
    assert ready.status_code == 200
    assert ready.json()["catalog_provider_active"] == "legacy"
    assert ready.json()["ai_gateway"]["secret_stored"] is False

    # إنشاء مؤسسة (المرحلة 0)
    create_resp = client.post(
        "/api/v1/onboarding/organizations",
        json={
            "name": "شركة اللوجستيات الحديثة",
            "sector": "النقل والشحن",
            "operator_name": "نورة منصور",
        },
    )
    assert create_resp.status_code == 201
    org_id = create_resp.json()["id"]

    # عزل المستأجر (Fail-Closed عند ترويسة مخالفة)
    wrong_tenant = client.get(
        f"/api/v1/onboarding/organizations/{org_id}",
        headers={"X-Bayan-Tenant-ID": "other-tenant"},
    )
    assert wrong_tenant.status_code == 403

    # اعتماد الاستلام + إضافة مصدر SQLite + اختبار الاتصال
    assert (
        client.post(
            f"/api/v1/onboarding/organizations/{org_id}/intake/approve",
            json={"operator_name": "نورة منصور"},
        ).status_code
        == 200
    )

    src_resp = client.post(
        f"/api/v1/onboarding/organizations/{org_id}/sources",
        json={
            "name": "مستودع الشحن",
            "engine": "sqlite",
            "database": db_file.name,
            "read_only": True,
        },
    )
    assert src_resp.status_code == 200
    src_id = src_resp.json()["data_sources"][0]["id"]

    assert (
        client.post(
            f"/api/v1/onboarding/organizations/{org_id}/sources/{src_id}/test",
            json={"operator_name": "نورة منصور"},
        ).status_code
        == 200
    )

    # المرحلة 2: الاكتشاف + المرحلة 3/4 الاعتماد الجماعي + المرحلة 5 تحليل العلاقات
    disc_resp = client.post(
        f"/api/v1/onboarding/organizations/{org_id}/discovery/start",
        json={"operator_name": "نورة منصور"},
    )
    assert disc_resp.status_code == 200
    assert disc_resp.json()["discovery"]["status"] == "completed"

    assert (
        client.post(
            f"/api/v1/onboarding/organizations/{org_id}/stages/domains/approve-all",
            json={"operator_name": "نورة منصور"},
        ).status_code
        == 200
    )
    assert (
        client.post(
            f"/api/v1/onboarding/organizations/{org_id}/stages/concepts/approve-all",
            json={"operator_name": "نورة منصور"},
        ).status_code
        == 200
    )
    assert (
        client.post(
            f"/api/v1/onboarding/organizations/{org_id}/relationships/analyze",
            json={"operator_name": "نورة منصور"},
        ).status_code
        == 200
    )

    # المرحلة 6: جاهزية وتفعيل
    readiness = client.get(f"/api/v1/onboarding/organizations/{org_id}/activation/readiness")
    assert readiness.status_code == 200
    assert readiness.json()["ready"] is True

    act = client.post(
        f"/api/v1/onboarding/organizations/{org_id}/activate",
        json={"operator_name": "نورة منصور", "handover_note": "تسليم أولي"},
    )
    assert act.status_code == 200
    assert act.json()["status"] == "active"

    # الكتالوج الرسمي المتوافق + البحث الدلالي
    cat = client.get(f"/api/v1/onboarding/organizations/{org_id}/catalog")
    assert cat.status_code == 200
    views = [entry["view"] for entry in cat.json()]
    assert views == ["v_warehouse_shipments"]

    search = client.get(
        f"/api/v1/onboarding/organizations/{org_id}/semantic-search",
        params={"q": "الشحنات"},
    )
    assert search.status_code == 200
    assert len(search.json()) >= 1

    # اختبار حماية صلاحية إعادة التعيين
    denied_reset = client.post(
        f"/api/v1/onboarding/organizations/{org_id}/stages/relationships/reset",
        json={"operator_name": "نورة منصور", "confirm": True},
        headers={"X-Bayan-Permissions": "onboarding.read"},
    )
    assert denied_reset.status_code == 403

    allowed_reset = client.post(
        f"/api/v1/onboarding/organizations/{org_id}/stages/relationships/reset",
        json={"operator_name": "نورة منصور", "confirm": True, "reason": "مراجعة إضافية"},
        headers={"X-Bayan-Permissions": "onboarding.reset"},
    )
    assert allowed_reset.status_code == 200
    assert allowed_reset.json()["status"] == "pending"
