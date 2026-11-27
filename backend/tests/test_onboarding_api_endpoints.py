"""اختبارات واجهة FastAPI المدمجة لمسار التهيئة الذكية (/api/v1/onboarding) وعزل المستأجر."""

from __future__ import annotations

import sqlite3
from pathlib import Path
from types import SimpleNamespace

import pytest
from fastapi import Request
from fastapi.testclient import TestClient

from app.api.v1.endpoints import onboarding as onboarding_endpoint
from app.api.v1.endpoints.onboarding import get_onboarding_principal
from app.main import create_app
from app.services.onboarding.governance import Principal
from app.services.onboarding.persistence import InMemoryOnboardingStateRepository


def _mock_principal(
    *,
    tenant_id: str = "test-tenant",
    permissions: frozenset[str] = frozenset(
        {"onboarding.admin", "onboarding.catalog.read", "onboarding.reset"}
    ),
) -> Principal:
    return Principal(
        user_id="test-user",
        tenant_id=tenant_id,
        roles=frozenset({"onboarding_admin"}),
        permissions=permissions,
        membership_id="test-membership",
        session_id="test-session",
        display_name="نورة منصور",
    )


def _mock_principal_dependency(request: Request) -> Principal:
    principal = request.app.state.test_principal
    request.state.onboarding_principal = principal
    return principal


def _make_client() -> TestClient:
    app = create_app()
    app.state.test_principal = _mock_principal()
    app.dependency_overrides[get_onboarding_principal] = _mock_principal_dependency
    return TestClient(app)


def test_onboarding_requires_server_injected_principal_and_permissions(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("BAYAN_ENV", "production")
    unauthenticated = TestClient(create_app())
    assert (
        unauthenticated.get(
            "/api/v1/onboarding/readiness",
            headers={
                "X-Bayan-Tenant-ID": "test-tenant",
                "X-Bayan-Permissions": "onboarding.admin",
            },
        ).status_code
        == 401
    )

    read_only_app = create_app()
    read_only_app.state.test_principal = _mock_principal(
        permissions=frozenset({"onboarding.catalog.read"})
    )
    read_only_app.dependency_overrides[get_onboarding_principal] = _mock_principal_dependency
    assert TestClient(read_only_app).get("/api/v1/onboarding/readiness").status_code == 403


def test_production_runtime_uses_persistent_semantic_index_by_default(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    repository = object()
    monkeypatch.setenv("BAYAN_ENV", "production")
    monkeypatch.delenv("BAYAN_ONBOARDING_USE_PGVECTOR", raising=False)
    monkeypatch.setattr(
        onboarding_endpoint,
        "PgVectorSemanticRepository",
        lambda **_kwargs: repository,
    )
    monkeypatch.setattr(
        onboarding_endpoint,
        "create_state_repository",
        lambda **_kwargs: InMemoryOnboardingStateRepository(),
    )
    request = SimpleNamespace(app=SimpleNamespace(state=SimpleNamespace()))

    _, bridge, _ = onboarding_endpoint._get_workflow_runtime(request)

    assert bridge.repository is repository


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

    client.app.state.test_principal = _mock_principal(tenant_id="other-tenant")
    unauthorized_member = client.get(
        f"/api/v1/onboarding/organizations/{org_id}",
        headers={"X-Bayan-Tenant-ID": org_id},
    )
    assert unauthorized_member.status_code == 403
    client.app.state.test_principal = _mock_principal()

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

    # لا تستطيع ترويسة يرسلها العميل منح صلاحية إعادة التعيين
    client.app.state.test_principal = _mock_principal(
        permissions=frozenset({"onboarding.admin", "onboarding.catalog.read"})
    )
    denied_reset = client.post(
        f"/api/v1/onboarding/organizations/{org_id}/stages/relationships/reset",
        json={"operator_name": "نورة منصور", "confirm": True},
        headers={"X-Bayan-Permissions": "onboarding.reset"},
    )
    assert denied_reset.status_code == 403

    client.app.state.test_principal = _mock_principal()
    allowed_reset = client.post(
        f"/api/v1/onboarding/organizations/{org_id}/stages/relationships/reset",
        json={"operator_name": "نورة منصور", "confirm": True, "reason": "مراجعة إضافية"},
        headers={"X-Bayan-Permissions": "onboarding.read"},
    )
    assert allowed_reset.status_code == 200
    assert allowed_reset.json()["status"] == "pending"
