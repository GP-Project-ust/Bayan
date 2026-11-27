"""اختبارات شاملة لمسار التهيئة الذكية المدمج (المراحل 0–8) وجسر المعرفة الدلالية في بيان."""

from __future__ import annotations

import copy
import sqlite3
from pathlib import Path
from typing import Any

import pytest

from app.agents.sql_catalog import CatalogColumn, CatalogEntry
from app.core.config import Settings
from app.services.onboarding.connectors import ConnectorSecurityError
from app.services.onboarding.governance import get_stage_reset_status, reset_stage
from app.services.onboarding.indexing import InMemorySemanticRepository, OfficialEmbeddingService
from app.services.onboarding.persistence import (
    ConcurrentStateUpdateError,
    InMemoryOnboardingStateRepository,
    JsonOnboardingStateRepository,
)
from app.services.onboarding.semantics import (
    DomainProposalValidationError,
    GatewayResult,
    normalize_domain_analysis,
)
from app.services.onboarding.workflow import (
    ApprovalRequiredError,
    OnboardingError,
    OnboardingWorkflowService,
    SemanticKnowledgeBridge,
    ValidationError,
    activate_organization,
    ai_changed_semantics,
    build_stage_manifest,
    decide_schema_change,
    get_activation_readiness,
    monitor_schema,
    synchronize_semantic_catalog,
)
from app.services.onboarding.workflow import sync as workflow_sync


def _deterministic_test_embedder() -> OfficialEmbeddingService:
    def _embed(texts: list[str]) -> list[list[float]]:
        vectors: list[list[float]] = []
        for text in texts:
            seed = sum(ord(ch) for ch in text) % 97
            vectors.append([round(((seed + idx) % 13) / 13.0, 6) for idx in range(8)])
        return vectors

    return OfficialEmbeddingService(app_settings=Settings(embedding_dimensions=8), embed_fn=_embed)


def _create_sample_sqlite(db_path: Path) -> None:
    with sqlite3.connect(db_path) as conn:
        conn.executescript(
            """
            CREATE TABLE programs (
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL
            );
            CREATE TABLE students (
                id INTEGER PRIMARY KEY,
                student_name TEXT NOT NULL,
                program_id INTEGER NOT NULL REFERENCES programs(id),
                roll_number TEXT UNIQUE
            );
            CREATE TABLE fees_invoices (
                id INTEGER PRIMARY KEY,
                student_id INTEGER NOT NULL REFERENCES students(id),
                total_amount NUMERIC NOT NULL,
                paid_amount NUMERIC NOT NULL
            );
            CREATE VIEW v_student_profile AS
            SELECT s.id AS student_id, s.student_name, p.name AS program_name
            FROM students s JOIN programs p ON s.program_id = p.id;

            CREATE VIEW v_fees_summary AS
            SELECT p.name AS program_name, SUM(f.total_amount) AS total_billed
            FROM fees_invoices f
            JOIN students s ON f.student_id = s.id
            JOIN programs p ON s.program_id = p.id
            GROUP BY p.name;

            CREATE VIEW v_student_financial_status AS
            SELECT s.id AS student_id, s.student_name, s.roll_number, f.total_amount, f.paid_amount
            FROM students s JOIN fees_invoices f ON s.id = f.student_id;
            """
        )


class _FakeAIGateway:
    def describe_configuration(self) -> dict[str, Any]:
        return {
            "configured": True,
            "provider": "mock-structured",
            "model": "test-model",
            "official_gateway": "app.llm.provider.get_llm",
            "secret_stored": False,
        }

    def generate_structured(
        self, *, system_prompt: str, user_payload: Any, response_model: Any, role: str = "analyst"
    ) -> GatewayResult:
        if "candidates" in (user_payload or {}):
            rels = [
                {
                    "candidate_key": c["candidate_key"],
                    "relationship_type": "business_fk",
                    "cardinality": "many_to_one",
                    "label_ar": f"ربط دلالي: {c['source_table']} -> {c['target_table']}",
                    "rationale_ar": "علاقة تحليلية مقترحة بناءً على اسم المفتاح.",
                    "confidence": 0.91,
                }
                for c in user_payload["candidates"]
            ]
            return GatewayResult(
                provider="mock-structured", model="test-model", parsed={"relationships": rels}
            )
        return GatewayResult(
            provider="mock-structured", model="test-model", parsed={"proposals": []}
        )


def test_full_stages_0_to_8_with_sqlite_pgvector_and_catalog_v2(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    db_file = tmp_path / "university_demo.sqlite"
    _create_sample_sqlite(db_file)
    monkeypatch.setenv("BAYAN_SQLITE_ROOT", str(tmp_path))

    sem_repo = InMemorySemanticRepository(dimensions=8)
    bridge = SemanticKnowledgeBridge(repository=sem_repo, embedder=_deterministic_test_embedder())
    state_path = tmp_path / "onboarding_state.json"
    state_repo = JsonOnboardingStateRepository(state_path)
    service = OnboardingWorkflowService(
        repository=state_repo,
        ai_gateway=_FakeAIGateway(),
        bridge=bridge,
    )

    # المرحلة 0: الاستلام والاعتماد البشري (ورفض الفاعل الآلي)
    org = service.create_organization({"name": "جامعة البيان", "sector": "التعليم العالي"})
    org_id = org["id"]
    with pytest.raises(ValidationError):
        service.approve_intake(org_id, "ai")
    org = service.approve_intake(org_id, "د. سارة أحمد")
    assert org["intake"]["approved"] is True

    # المرحلة 1: مصدر بيانات قراءة فقط + رفض المصادر غير الآمنة
    with pytest.raises(ConnectorSecurityError):
        service.add_data_source(
            org_id,
            {"name": "unsafe", "engine": "sqlite", "database": db_file.name, "read_only": False},
        )
    outside_path = tmp_path.parent / "outside.sqlite"
    org = service.add_data_source(
        org_id,
        {"name": "قاعدة الجامعة", "engine": "sqlite", "database": db_file.name, "read_only": True},
    )
    src_id = org["data_sources"][0]["id"]
    with pytest.raises(ConnectorSecurityError):
        bad_org = service.add_data_source(
            org_id,
            {"name": "خارجي", "engine": "sqlite", "database": str(outside_path), "read_only": True},
        )
        service.test_data_source(org_id, bad_org["data_sources"][-1]["id"])
    # حذف المصدر الخارجي والاختبار على المصدر المصرح به
    org = service.remove_data_source(
        org_id,
        org["data_sources"][-1]["id"]
        if len(org["data_sources"]) > 1
        else service.get_organization(org_id)["data_sources"][-1]["id"],
    )
    test_res = service.test_data_source(org_id, src_id, operator_name="د. سارة أحمد")
    assert test_res["connection_test"]["connected"] is True
    assert test_res["connection_test"]["physical_table_count"] == 3
    assert test_res["connection_test"]["view_count"] == 3

    # التأكد من عدم حفظ أي كلمة مرور أو أسرار في JSON
    raw_saved = state_path.read_text(encoding="utf-8")
    assert '"password"' not in raw_saved

    # التفعيل محجوب قبل إتمام الاعتمادات
    readiness_before = get_activation_readiness(service, org_id)
    assert readiness_before["ready"] is False
    with pytest.raises(ApprovalRequiredError):
        activate_organization(service, org_id, operator_name="د. سارة أحمد", bridge=bridge)

    # المرحلة 2: الاكتشاف الحتمي (Zero-LLM)
    org = service.run_discovery(org_id, operator_name="د. سارة أحمد")
    assert org["discovery"]["status"] == "completed"
    assert len(org["physical_catalog"]) == 6
    assert any(r["origin"] == "declared" for r in org["relationships"])

    # المرحلة 3: مراجعة النطاقات، نقل كائن ثم اعتماده
    org = service.bulk_approve_stage(org_id, stage="domains", operator_name="د. سارة أحمد")
    assert all(d["status"] == "approved" for d in org["domains"])
    if len(org["domains"]) >= 2:
        first_ref = org["domains"][0]["table_refs"][0]
        target_dom_id = org["domains"][1]["id"]
        moved = service.move_table_to_domain(
            org_id,
            table_ref=first_ref,
            target_domain_id=target_dom_id,
            operator_name="د. سارة أحمد",
        )
        assert (
            first_ref in next(d for d in moved["domains"] if d["id"] == target_dom_id)["table_refs"]
        )

    # المرحلة 4: تعديل مفهوم واعتماده + رفض تعريض مشهد مالي فردي + حماية المعتمد عند التجديد
    profile_concept = next(
        c
        for c in org["concepts"]
        if c["source_type"] == "view" and c["technical_name"] == "v_student_profile"
    )
    financial_concept = next(
        c
        for c in org["concepts"]
        if c["source_type"] == "view" and c["technical_name"] == "v_student_financial_status"
    )
    org = service.review_concept(
        org_id,
        profile_concept["id"],
        decision="edit",
        operator_name="د. سارة أحمد",
        name_ar="ملف الطالب المعتمد",
        synonyms=["بيانات الطلاب", "ملف الطلبة"],
    )
    org = service.review_concept(
        org_id,
        financial_concept["id"],
        decision="reject",
        operator_name="د. سارة أحمد",
        note="مقيد بالسياسة المالية الفردية",
    )
    org = service.generate_concepts(org_id, operator_name="د. سارة أحمد", regenerate=True)
    preserved = next(c for c in org["concepts"] if c["id"] == profile_concept["id"])
    assert preserved["status"] == "approved"
    assert preserved["name_ar"] == "ملف الطالب المعتمد"

    org = service.bulk_approve_stage(org_id, stage="concepts", operator_name="د. سارة أحمد")

    # المرحلة 5: العلاقات (مركّب + يدوي + تمييز المعلن/المستنتج/اليدوي)
    table_cols = {
        f"{t['name']}.{c['name']}": c["object_ref"]
        for t in org["physical_catalog"]
        for c in t["columns"]
    }
    rel_summary = service.relationship_service.create_manual_relationship(
        org_id,
        source_column_refs=[table_cols["fees_invoices.student_id"], table_cols["fees_invoices.id"]],
        target_column_refs=[table_cols["students.id"], table_cols["students.program_id"]],
        cardinality="many_to_one",
        label="علاقة فاتورة بطالب (مركبة)",
        rationale="ربط تشغيلي مالي مزدوج.",
        operator_name="د. سارة أحمد",
    )
    assert rel_summary["composite_count"] >= 1
    assert rel_summary["manual_count"] == 1

    # المرحلة 6: التسليم والتفعيل + الفهرسة الدلالية + Catalog v2
    assert get_activation_readiness(service, org_id)["ready"] is True
    org = activate_organization(
        service,
        org_id,
        operator_name="د. سارة أحمد",
        handover_note="جاهز للتشغيل",
        bridge=bridge,
    )
    assert org["status"] == "active"
    pub_info = org["activation"]["semantic_publication"]
    assert pub_info is not None
    assert "v_student_profile" in pub_info["catalog_views"]
    assert "v_fees_summary" in pub_info["catalog_views"]
    # المشهد المرفوض v_student_financial_status محجوب من Catalog v2
    assert "v_student_financial_status" not in pub_info["catalog_views"]

    catalog_entries = bridge.get_official_catalog(tenant_id=org["tenant_id"])
    assert all(isinstance(e, CatalogEntry) for e in catalog_entries)
    assert all(isinstance(col, CatalogColumn) for e in catalog_entries for col in e.columns)
    assert all(e.source == "semantic_v2" for e in catalog_entries)

    # المرحلة 7: فحص المراقبة مع تغيّر إحصاء الصفوف فقط (يجب ألا يطلق انحرافاً بنيوياً)
    with sqlite3.connect(db_file) as conn:
        conn.execute("INSERT INTO programs (id, name) VALUES (1, 'علوم الحاسوب')")
    mon_clean = monitor_schema(service, org_id, operator_name="د. سارة أحمد")
    assert mon_clean["monitoring"]["status"] == "healthy"
    assert mon_clean["schema_changes"] == []

    # إضافة مشهد جديد في SQLite ثم فحص المراقبة -> اكتشاف الانحراف البنيوي
    with sqlite3.connect(db_file) as conn:
        conn.executescript(
            """
            CREATE VIEW v_program_stats AS
            SELECT id AS program_id, name AS program_name FROM programs;
            """
        )
    mon_drift = monitor_schema(service, org_id, operator_name="د. سارة أحمد")
    assert mon_drift["monitoring"]["status"] == "drift_detected"
    assert len(mon_drift["schema_changes"]) == 1
    chg_id = mon_drift["schema_changes"][0]["id"]

    # مقترحات AI للكائن المتغير فقط (المرحلة 8)
    ai_props = ai_changed_semantics(service, org_id)
    assert len(ai_props["proposals"]) == 1

    # مزامنة محجوبة قبل قرار المشغل
    with pytest.raises(ApprovalRequiredError):
        synchronize_semantic_catalog(service, org_id, operator_name="د. سارة أحمد", bridge=bridge)

    decide_schema_change(
        service,
        org_id,
        chg_id,
        decision="approve",
        operator_name="د. سارة أحمد",
        updated_label_ar="إحصائيات البرامج المعتمدة",
    )
    synced = synchronize_semantic_catalog(
        service, org_id, operator_name="د. سارة أحمد", bridge=bridge
    )
    last_pub = synced["semantic_sync"]["last_publication"]
    assert "v_program_stats" in last_pub["catalog_views"]
    # التضمين التزايدي: أعاد استخدام السجلات غير المتغيرة ولم يعد تضمينها كلها
    idx_sum = last_pub["indexing_summaries"][0]
    assert idx_sum["unchanged"] >= 1
    assert idx_sum["embedded_count"] < idx_sum["total_active"]

    manifest = build_stage_manifest(synced)
    assert len(manifest["stages"]) == 9


def test_domain_grounding_rejects_hallucinated_refs_and_reset_cascades() -> None:
    tables = [
        {
            "object_ref": "src1::public.students",
            "name": "students",
            "columns": [{"object_ref": "src1::public.students::id", "name": "id"}],
        },
    ]
    with pytest.raises(DomainProposalValidationError):
        normalize_domain_analysis(
            {
                "domains": [
                    {
                        "key": "acad",
                        "name_ar": "أكاديمي",
                        "description_ar": "بيانات أكاديمية",
                        "confidence": 0.9,
                    }
                ],
                "assignments": [
                    {
                        "table_ref": "src1::public.ghost_table",
                        "domain_key": "acad",
                        "confidence": 0.9,
                        "reasoning_ar": "تصنيف خاطئ لجدول وهمي",
                        "column_refs": [],
                        "relationship_refs": [],
                    }
                ],
            },
            target_tables=tables,
        )

    # اختبار التسلسل في إعادة تعيين المراحل والتزامن التفاؤلي
    repo = InMemoryOnboardingStateRepository()
    snap0 = repo.save_snapshot({"organizations": {}}, expected_version=None)
    repo.save_snapshot({"organizations": {"x": {}}}, expected_version=snap0.version)
    with pytest.raises(ConcurrentStateUpdateError):
        repo.save_snapshot({"organizations": {}}, expected_version=snap0.version)

    svc = OnboardingWorkflowService(repository=InMemoryOnboardingStateRepository())
    org = svc.create_organization({"name": "شركة تجريبية"})
    org = svc.approve_intake(org["id"], "أحمد علي")
    status_before = get_stage_reset_status(svc, org["id"])
    assert status_before["stages"][0]["completed"] is True
    reset_org = reset_stage(
        svc, org["id"], "intake", "أحمد علي", reason="إعادة اختبار", confirm=True
    )
    assert reset_org["intake"]["approved"] is False
    assert reset_org["current_phase"] == "intake"
    assert len(reset_org["stage_reset_history"]) == 1


def test_postgresql_connector_delegates_to_pr1_introspector_read_only() -> None:
    from app.services.onboarding.connectors import scan_source_metadata

    fake_discovered = [
        {
            "catalog": "university",
            "schema": "public",
            "name": "v_program_stats",
            "object_type": "view",
            "comment": "إحصائيات البرامج الأكاديمية",
            "approximate_row_count": None,
            "dependencies": ["programs"],
            "columns": [
                {
                    "name": "program_name",
                    "data_type": "text",
                    "nullable": False,
                    "ordinal_position": 1,
                    "default": None,
                    "comment": None,
                    "primary_key": False,
                    "foreign_key": False,
                    "unique": False,
                }
            ],
            "primary_keys": [],
            "foreign_keys": [],
            "unique_constraints": [],
            "indexes": [],
        }
    ]

    with pytest.MonkeyPatch.context() as mp:
        mp.setattr(
            "app.services.onboarding.connectors.scanner.PostgresIntrospector.introspect",
            lambda _self, _settings: fake_discovered,
        )
        items = scan_source_metadata(
            {
                "id": "pg-1",
                "name": "university_db",
                "engine": "postgresql",
                "host": "localhost",
                "port": 5433,
                "database": "university",
                "schema": "public",
                "username": "bayan_reader",
            },
            password="secret",
        )
    assert len(items) == 1
    assert items[0]["schema_qualified_name"] == "public.v_program_stats"
    assert items[0]["description_source"] == "database_comment"


class _TransactionalTestService:
    def __init__(self, organization: dict[str, Any]) -> None:
        self.organization = copy.deepcopy(organization)

    def get_organization(self, _organization_id: str) -> dict[str, Any]:
        return copy.deepcopy(self.organization)

    def mutate_organization(
        self,
        _organization_id: str,
        mutator: Any,
    ) -> dict[str, Any]:
        candidate = copy.deepcopy(self.organization)
        updated = mutator(candidate)
        self.organization = copy.deepcopy(updated)
        return copy.deepcopy(updated)


def test_activation_does_not_persist_before_semantic_publication(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    service = _TransactionalTestService(
        {"id": "org-test", "status": "pending", "physical_catalog": [], "audit_logs": []}
    )
    monkeypatch.setattr(
        workflow_sync,
        "get_activation_readiness",
        lambda *_args: {"already_active": False, "ready": True, "blockers": []},
    )

    class _FailingBridge:
        def publish_approved_organization(self, organization: dict[str, Any]) -> None:
            assert organization["status"] == "active"
            raise RuntimeError("indexing failed")

    with pytest.raises(RuntimeError, match="indexing failed"):
        activate_organization(
            service,
            "org-test",
            operator_name="د. سارة أحمد",
            bridge=_FailingBridge(),
        )

    assert service.organization["status"] == "pending"
    assert "activation" not in service.organization


def test_sync_does_not_persist_before_semantic_publication() -> None:
    organization = {
        "id": "org-test",
        "status": "active",
        "physical_catalog": [],
        "schema_changes": [
            {
                "id": "change-1",
                "technical_name": "public.students",
                "change_type": "object_modified",
                "status": "approved",
                "after_snapshot": {
                    "object_ref": "source::public.students",
                    "name": "students",
                    "schema_qualified_name": "public.students",
                    "columns": [],
                },
            }
        ],
        "monitoring": {"latest_scanned_catalog": []},
        "concepts": [],
        "relationships": [],
        "semantic_sync": {"status": "idle", "history": []},
        "audit_logs": [],
    }
    service = _TransactionalTestService(organization)

    class _FailingBridge:
        def publish_approved_organization(self, _organization: dict[str, Any]) -> None:
            raise RuntimeError("indexing failed")

    with pytest.raises(RuntimeError, match="indexing failed"):
        synchronize_semantic_catalog(
            service,
            "org-test",
            operator_name="د. سارة أحمد",
            bridge=_FailingBridge(),
        )

    assert service.organization["schema_changes"][0]["status"] == "approved"
    assert service.organization["semantic_sync"]["status"] == "idle"


def test_activation_requires_semantic_index_bridge(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    service = _TransactionalTestService(
        {"id": "org-test", "status": "pending", "physical_catalog": [], "audit_logs": []}
    )
    monkeypatch.setattr(
        workflow_sync,
        "get_activation_readiness",
        lambda *_args: {"already_active": False, "ready": True, "blockers": []},
    )

    with pytest.raises(OnboardingError) as error:
        activate_organization(service, "org-test", operator_name="د. سارة أحمد")

    assert error.value.status_code == 503
    assert service.organization["status"] == "pending"
