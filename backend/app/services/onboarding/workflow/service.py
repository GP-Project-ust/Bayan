"""منسّق مسار التهيئة الذكية الموحد (المراحل 0–8) فوق مستودع الحالة وجسر المعرفة الدلالية."""

from __future__ import annotations

import copy
import threading
import uuid
from typing import Any, Callable, Dict, List, Optional

from app.services.onboarding.connectors import (
    scan_source_metadata,
    test_source_connection,
    validate_source_payload,
)
from app.services.onboarding.discovery.fingerprints import (
    catalog_fingerprint,
    structural_catalog_fingerprint,
)
from app.services.onboarding.persistence import (
    ConcurrentStateUpdateError,
    InMemoryOnboardingStateRepository,
    OnboardingStateRepository,
)
from app.services.onboarding.relationships import RelationshipAnalysisService
from app.services.onboarding.semantics import (
    AIDomainClassificationResponse,
    AIServiceError,
    OfficialLLMStructuredGateway,
    StructuredAIGateway,
    normalize_domain_analysis,
)

from .bridge import SemanticKnowledgeBridge
from .models import (
    ApprovalRequiredError,
    ConflictError,
    NotFoundError,
    ValidationError,
    compute_progress,
    count_pending_reviews,
    sha256_hash,
    utc_now,
    validate_human_actor,
)


def _rule_domain_for_table(name: str) -> tuple[str, str, str]:
    low = str(name or "").lower()
    if any(k in low for k in ("fee", "invoice", "payment", "financial", "ledger", "billing")):
        return (
            "finance",
            "النطاق المالي والرسوم",
            "إدارة الفواتير والرسوم والمدفوعات والحالة المالية.",
        )
    if any(
        k in low
        for k in (
            "student",
            "program",
            "enroll",
            "subject",
            "faculty",
            "academic",
            "course",
            "semester",
        )
    ):
        return (
            "academic",
            "النطاق الأكاديمي والطلاب",
            "بيانات الطلاب والبرامج الدراسية والتسجيل والمقررات.",
        )
    if any(
        k in low
        for k in ("shipment", "carrier", "driver", "warehouse", "delivery", "order", "route")
    ):
        return (
            "logistics",
            "النطاق اللوجستي والتشغيلي",
            "إدارة الشحنات والناقلين والمستودعات ومسارات التوصيل.",
        )
    if any(k in low for k in ("user", "employee", "hr", "staff", "department")):
        return (
            "organization",
            "الموارد البشرية والتنظيم",
            "هيكلة الموظفين والأقسام والصلاحيات المؤسسية.",
        )
    return ("general", "النطاق التشغيلي العام", "كيانات ومشاهد تشغيلية عامة للمؤسسة.")


class OnboardingWorkflowService:
    """الخدمة المركزية المنسقة لمسار التهيئة الذكية (المراحل 0–8)."""

    def __init__(
        self,
        *,
        repository: Optional[OnboardingStateRepository] = None,
        ai_gateway: Optional[StructuredAIGateway] = None,
        bridge: Optional[SemanticKnowledgeBridge] = None,
        postgres_connect_fn: Optional[Callable[..., Any]] = None,
    ):
        self.repository = repository or InMemoryOnboardingStateRepository()
        self.ai_gateway = ai_gateway or OfficialLLMStructuredGateway()
        self.bridge = bridge
        self.postgres_connect_fn = postgres_connect_fn
        self._lock = threading.RLock()
        self.relationship_service = RelationshipAnalysisService(self, ai_gateway=self.ai_gateway)

    # ------------------------------------------------------------------
    # إدارة الحالة والتزامن التفاؤلي
    # ------------------------------------------------------------------
    def _load_state(self) -> tuple[Dict[str, Any], int]:
        snap = self.repository.load_snapshot()
        if snap is None:
            fresh = {"organizations": {}}
            saved = self.repository.save_snapshot(fresh, expected_version=None)
            return saved.state, saved.version
        return snap.state, snap.version

    def _mutate_state(self, mutator: Callable[[Dict[str, Any]], Any]) -> Any:
        with self._lock:
            state, version = self._load_state()
            result = mutator(state)
            try:
                self.repository.save_snapshot(state, expected_version=version)
            except ConcurrentStateUpdateError as exc:
                raise ConflictError(str(exc), code="concurrent_update") from exc
            return result

    def get_organization(self, organization_id: str) -> Dict[str, Any]:
        state, _ = self._load_state()
        org = (state.get("organizations") or {}).get(organization_id)
        if not org:
            raise NotFoundError(f"المؤسسة غير موجودة: {organization_id}")
        return copy.deepcopy(org)

    def mutate_organization(
        self,
        organization_id: str,
        mutator: Callable[[Dict[str, Any]], Dict[str, Any]],
    ) -> Dict[str, Any]:
        def _apply(state: Dict[str, Any]) -> Dict[str, Any]:
            orgs = state.setdefault("organizations", {})
            org = orgs.get(organization_id)
            if not org:
                raise NotFoundError(f"المؤسسة غير موجودة: {organization_id}")
            updated = mutator(org)
            updated["progress"] = compute_progress(updated)
            updated["pending_reviews"] = count_pending_reviews(updated)
            orgs[organization_id] = updated
            return copy.deepcopy(updated)

        return self._mutate_state(_apply)

    def list_organizations(self, *, include_archived: bool = False) -> List[Dict[str, Any]]:
        state, _ = self._load_state()
        items = []
        for org in (state.get("organizations") or {}).values():
            if not include_archived and org.get("archived_at"):
                continue
            items.append(
                {
                    "id": org["id"],
                    "tenant_id": org.get("tenant_id") or org["id"],
                    "name": org["name"],
                    "sector": org.get("sector", ""),
                    "status": org.get("status", "pending"),
                    "current_phase": org.get("current_phase", "intake"),
                    "progress": compute_progress(org),
                    "pending_reviews": count_pending_reviews(org),
                    "escalations_open": sum(
                        1 for e in (org.get("escalations") or []) if e.get("status") == "open"
                    ),
                    "updated_at": org.get("updated_at"),
                    "archived_at": org.get("archived_at"),
                }
            )
        items.sort(key=lambda x: str(x.get("updated_at") or ""), reverse=True)
        return items

    # ------------------------------------------------------------------
    # المرحلة 0: استلام ملف المؤسسة واعتماده
    # ------------------------------------------------------------------
    def create_organization(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        name = str(payload.get("name") or "").strip()
        sector = str(payload.get("sector") or "").strip()
        if len(name) < 2:
            raise ValidationError("اسم المؤسسة مطلوب ويجب أن لا يقل عن حرفين.")
        actor = validate_human_actor(str(payload.get("operator_name") or "مشغل التهيئة"))

        org_id = str(payload.get("id") or f"org-{str(uuid.uuid4())[:8]}").strip()
        tenant_id = str(payload.get("tenant_id") or org_id).strip()
        now_ts = utc_now()

        org: Dict[str, Any] = {
            "id": org_id,
            "tenant_id": tenant_id,
            "name": name,
            "sector": sector,
            "country": str(payload.get("country") or "YE").strip(),
            "language": "ar",
            "status": "pending",
            "current_phase": "intake",
            "created_at": now_ts,
            "updated_at": now_ts,
            "archived_at": None,
            "intake": {
                "owner_name": str(payload.get("owner_name") or "").strip(),
                "owner_email": str(payload.get("owner_email") or "").strip(),
                "goals": str(payload.get("goals") or "").strip(),
                "approved": False,
                "approved_at": None,
                "approved_by": None,
            },
            "data_sources": [],
            "physical_catalog": [],
            "discovery": {
                "status": "not_started",
                "progress": 0,
                "stage": "في انتظار بدء الاكتشاف",
                "started_at": None,
                "completed_at": None,
                "catalog_fingerprint": None,
                "structural_fingerprint": None,
                "logs": [],
            },
            "domains": [],
            "domain_analysis": {
                "status": "idle",
                "assignments": [],
                "conflicts": [],
                "overlapping_domains": [],
            },
            "concepts": [],
            "semantic_enrichment": {"status": "idle"},
            "relationships": [],
            "relationship_analysis": {"status": "idle"},
            "activation": {"activated_at": None, "activated_by": None, "handover_note": ""},
            "monitoring": {"status": "not_available", "history": []},
            "schema_changes": [],
            "semantic_sync": {"status": "idle", "history": []},
            "escalations": [],
            "stage_reset_history": [],
            "audit_logs": [
                {
                    "id": str(uuid.uuid4())[:8],
                    "action": "organization.created",
                    "actor": actor,
                    "object_type": "organization",
                    "object_id": org_id,
                    "details": f"إنشاء ملف استلام للمؤسسة ({name}).",
                    "created_at": now_ts,
                }
            ],
        }

        if payload.get("initial_source"):
            src = validate_source_payload(payload["initial_source"])
            src["id"] = f"src-{str(uuid.uuid4())[:8]}"
            src["status"] = "pending"
            src["table_count"] = 0
            org["data_sources"].append(src)

        def _insert(state: Dict[str, Any]) -> Dict[str, Any]:
            orgs = state.setdefault("organizations", {})
            if org_id in orgs:
                raise ConflictError(f"المعرف موجود مسبقاً: {org_id}")
            org["progress"] = compute_progress(org)
            org["pending_reviews"] = 0
            orgs[org_id] = org
            return copy.deepcopy(org)

        return self._mutate_state(_insert)

    def approve_intake(self, organization_id: str, operator_name: str) -> Dict[str, Any]:
        actor = validate_human_actor(operator_name)

        def _apply(org: Dict[str, Any]) -> Dict[str, Any]:
            now_ts = utc_now()
            org["intake"]["approved"] = True
            org["intake"]["approved_at"] = now_ts
            org["intake"]["approved_by"] = actor
            if org.get("current_phase") == "intake":
                org["current_phase"] = "connection"
            org["updated_at"] = now_ts
            org["audit_logs"].insert(
                0,
                {
                    "id": str(uuid.uuid4())[:8],
                    "action": "intake.approved",
                    "actor": actor,
                    "object_type": "intake",
                    "object_id": organization_id,
                    "details": "اعتماد اكتمال بيانات استلام المؤسسة في المرحلة 0.",
                    "created_at": now_ts,
                },
            )
            return org

        return self.mutate_organization(organization_id, _apply)

    # ------------------------------------------------------------------
    # المرحلة 1: إدارة مصادر البيانات واختبار الاتصال الآمن
    # ------------------------------------------------------------------
    def add_data_source(
        self,
        organization_id: str,
        payload: Dict[str, Any],
        *,
        operator_name: str = "مشغل التهيئة",
    ) -> Dict[str, Any]:
        actor = validate_human_actor(operator_name)
        validated = validate_source_payload(payload)
        source_entry = {
            **validated,
            "id": str(payload.get("id") or f"src-{str(uuid.uuid4())[:8]}"),
            "status": "pending",
            "last_tested_at": None,
            "last_error": None,
            "table_count": 0,
            "created_at": utc_now(),
        }

        def _apply(org: Dict[str, Any]) -> Dict[str, Any]:
            if org.get("status") == "active":
                raise ConflictError("أعد التعيين أو أوقف التفعيل قبل تعديل مصادر المؤسسة النشطة.")
            org.setdefault("data_sources", []).append(source_entry)
            org["updated_at"] = utc_now()
            org["audit_logs"].insert(
                0,
                {
                    "id": str(uuid.uuid4())[:8],
                    "action": "source.added",
                    "actor": actor,
                    "object_type": "data_source",
                    "object_id": source_entry["id"],
                    "details": (
                        f"إضافة مصدر بيانات ({source_entry['engine']} "
                        f"/ {source_entry['database']})."
                    ),
                    "created_at": utc_now(),
                },
            )
            return org

        return self.mutate_organization(organization_id, _apply)

    def remove_data_source(
        self,
        organization_id: str,
        source_id: str,
        *,
        operator_name: str = "مشغل التهيئة",
    ) -> Dict[str, Any]:
        actor = validate_human_actor(operator_name)

        def _apply(org: Dict[str, Any]) -> Dict[str, Any]:
            before = len(org.get("data_sources") or [])
            org["data_sources"] = [
                s for s in (org.get("data_sources") or []) if s.get("id") != source_id
            ]
            if len(org["data_sources"]) == before:
                raise NotFoundError(f"مصدر البيانات غير موجود: {source_id}")
            org["updated_at"] = utc_now()
            org["audit_logs"].insert(
                0,
                {
                    "id": str(uuid.uuid4())[:8],
                    "action": "source.removed",
                    "actor": actor,
                    "object_type": "data_source",
                    "object_id": source_id,
                    "details": "حذف مصدر بيانات.",
                    "created_at": utc_now(),
                },
            )
            return org

        return self.mutate_organization(organization_id, _apply)

    def test_data_source(
        self,
        organization_id: str,
        source_id: str,
        *,
        password: str = "",
        operator_name: str = "مشغل التهيئة",
    ) -> Dict[str, Any]:
        actor = validate_human_actor(operator_name)
        org = self.get_organization(organization_id)
        src = next((s for s in (org.get("data_sources") or []) if s.get("id") == source_id), None)
        if src is None:
            raise NotFoundError(f"مصدر البيانات غير موجود: {source_id}")

        result = test_source_connection(
            src,
            password=password,
            postgres_connect_fn=self.postgres_connect_fn,
        )

        def _apply(state_org: Dict[str, Any]) -> Dict[str, Any]:
            target = next((s for s in state_org["data_sources"] if s["id"] == source_id), None)
            if target is not None:
                target["status"] = "connected"
                target["last_tested_at"] = utc_now()
                target["last_error"] = None
                target["table_count"] = result["table_count"]
                target["latency_ms"] = result["latency_ms"]
            if state_org.get("current_phase") == "connection":
                state_org["current_phase"] = "discovery"
            state_org["updated_at"] = utc_now()
            state_org["audit_logs"].insert(
                0,
                {
                    "id": str(uuid.uuid4())[:8],
                    "action": "source.tested",
                    "actor": actor,
                    "object_type": "data_source",
                    "object_id": source_id,
                    "details": f"نجاح اختبار القراءة فقط: {result['table_count']} كائناً.",
                    "created_at": utc_now(),
                },
            )
            return state_org

        updated = self.mutate_organization(organization_id, _apply)
        return {
            "organization": updated,
            "connection_test": {k: v for k, v in result.items() if k != "tables"},
        }

    # ------------------------------------------------------------------
    # المرحلة 2: الاكتشاف الحتمي للمخطط (Zero-LLM) وتوليد النطاقات/المفاهيم الأولية
    # ------------------------------------------------------------------
    def run_discovery(
        self,
        organization_id: str,
        *,
        operator_name: str = "مشغل التهيئة",
        passwords: Optional[Dict[str, str]] = None,
        override_catalog: Optional[List[Dict[str, Any]]] = None,
        generate_ai_proposals: bool = False,
        approve_external_ai: bool = False,
    ) -> Dict[str, Any]:
        """تنفيذ الاكتشاف الحتمي في المرحلة 2 + بناء العلاقات المعلنة والمسودة الدلالية."""
        actor = validate_human_actor(operator_name)
        org = self.get_organization(organization_id)
        if not org.get("intake", {}).get("approved"):
            raise ApprovalRequiredError("يجب اعتماد المرحلة 0 قبل بدء الاكتشاف.")

        sources = org.get("data_sources") or []
        if override_catalog is None and not sources:
            raise ValidationError("أضف مصدر بيانات واحداً على الأقل قبل الاكتشاف.")

        if override_catalog is not None:
            scanned = copy.deepcopy(override_catalog)
        else:
            pw_map = passwords or {}
            scanned = []
            for src in sources:
                scanned.extend(
                    scan_source_metadata(
                        src,
                        password=pw_map.get(src["id"], ""),
                        postgres_connect_fn=self.postgres_connect_fn,
                    )
                )

        if not scanned:
            raise ValidationError("لم يُكتشف أي جدول أو مشهد في المصادر المحددة.")

        # بناء العلاقات الفيزيائية المعلنة بحتمية تامة
        table_by_name = {f"{t.get('schema', 'public')}.{t['name']}": t for t in scanned}
        declared_rels: List[Dict[str, Any]] = []
        seen_rel_keys: set[str] = set()
        for tbl in scanned:
            for fk in tbl.get("foreign_keys", []):
                target_schema = fk.get("target_schema") or tbl.get("schema", "public")
                target_q = f"{target_schema}.{fk.get('target_table', '')}"
                tgt_tbl = table_by_name.get(target_q)
                tgt_ref = fk.get("target_table_ref") or (
                    tgt_tbl["object_ref"] if tgt_tbl else target_q
                )
                src_cols = [str(c) for c in fk.get("columns", [])]
                tgt_cols = [str(c) for c in fk.get("target_columns", [])]
                src_refs = [f"{tbl['object_ref']}::{c}" for c in src_cols]
                tgt_refs = [f"{tgt_ref}::{c}" for c in tgt_cols]
                sig = f"{'|'.join(src_refs)}->{'|'.join(tgt_refs)}"
                if sig in seen_rel_keys:
                    continue
                seen_rel_keys.add(sig)
                declared_rels.append(
                    {
                        "id": f"rel-{str(uuid.uuid4())[:8]}",
                        "origin": "declared",
                        "status": "approved",
                        "constraint_name": fk.get("name"),
                        "source_table": tbl["name"],
                        "source_table_ref": tbl["object_ref"],
                        "source_column": ", ".join(src_cols),
                        "source_column_refs": src_refs,
                        "target_table": fk.get("target_table") or target_q,
                        "target_table_ref": tgt_ref,
                        "target_column": ", ".join(tgt_cols),
                        "target_column_refs": tgt_refs,
                        "is_composite": len(src_cols) > 1,
                        "cardinality": "many_to_one",
                        "confidence": 1.0,
                        "label": f"ربط معلن: {tbl['name']} ← {fk.get('target_table') or target_q}",
                        "rationale": (
                            f"مفتاح أجنبي مصرّح به في قاعدة البيانات "
                            f"({fk.get('name', 'FK')})."
                        ),
                        "evidence": [f"Constraint: {fk.get('name', 'FK')}"],
                        "history": [],
                    }
                )

        full_fp = catalog_fingerprint(scanned)
        struct_fp = structural_catalog_fingerprint(scanned)
        now_ts = utc_now()

        def _apply(state_org: Dict[str, Any]) -> Dict[str, Any]:
            for src in state_org.get("data_sources") or []:
                sid = src["id"]
                src["table_count"] = sum(
                    1 for item in scanned if item.get("source_id") == sid
                ) or len(scanned)
                src["status"] = "connected"
            state_org["physical_catalog"] = scanned
            state_org["relationships"] = declared_rels
            state_org["discovery"] = {
                "status": "completed",
                "progress": 100,
                "stage": "اكتمل الاكتشاف الحتمي بنجاح",
                "started_at": now_ts,
                "completed_at": now_ts,
                "catalog_fingerprint": full_fp,
                "structural_fingerprint": struct_fp,
                "ai_approved": bool(generate_ai_proposals and approve_external_ai),
                "logs": [f"اكتشاف حتمي لـ {len(scanned)} كائناً وعلاقة معلنة: {len(declared_rels)}"],
            }
            if state_org.get("current_phase") in {"intake", "connection", "discovery"}:
                state_org["current_phase"] = "domains"
            state_org["updated_at"] = now_ts
            state_org["audit_logs"].insert(
                0,
                {
                    "id": str(uuid.uuid4())[:8],
                    "action": "discovery.completed",
                    "actor": actor,
                    "object_type": "discovery",
                    "object_id": organization_id,
                    "details": (
                        f"اكتمال الاكتشاف الحتمي لـ {len(scanned)} كائنات "
                        "وبناء البصمة البنيوية."
                    ),
                    "created_at": now_ts,
                },
            )
            return state_org

        self.mutate_organization(organization_id, _apply)
        self.analyze_domains(
            organization_id,
            operator_name=actor,
            use_ai=generate_ai_proposals,
            approve_external_ai=approve_external_ai,
        )
        return self.generate_concepts(
            organization_id,
            operator_name=actor,
            use_ai=generate_ai_proposals,
            approve_external_ai=approve_external_ai,
        )

    # ------------------------------------------------------------------
    # المرحلة 3: تحليل النطاقات الدلالية، الدمج، الفصل، وتصحيح التداخل
    # ------------------------------------------------------------------
    def analyze_domains(
        self,
        organization_id: str,
        *,
        operator_name: str = "مشغل التهيئة",
        use_ai: bool = False,
        approve_external_ai: bool = False,
    ) -> Dict[str, Any]:
        validate_human_actor(operator_name)
        org = self.get_organization(organization_id)
        tables = list(org.get("physical_catalog") or [])
        if not tables:
            raise ValidationError("أكمل مرحلة الاكتشاف الفيزيائي قبل تحليل النطاقات.")

        raw_payload: Optional[Dict[str, Any]] = None
        provenance_provider = "deterministic_rules"
        if use_ai and approve_external_ai:
            try:
                compact_tables = [
                    {
                        "table_ref": t["object_ref"],
                        "name": t["name"],
                        "object_type": t.get("object_type", "table"),
                        "label_ar": t.get("label_ar"),
                        "description_ar": t.get("description_ar"),
                        "columns": [
                            {
                                "column_ref": c["object_ref"],
                                "name": c["name"],
                                "type": c["data_type"],
                            }
                            for c in t.get("columns", [])[:25]
                        ],
                    }
                    for t in tables[:80]
                ]
                ai_res = self.ai_gateway.generate_structured(
                    system_prompt=(
                        "اقترح نطاقات أعمال عربية واضحة وصنف الكائنات الفيزيائية "
                        "المسندة إليها فقط."
                    ),
                    user_payload={"tables": compact_tables},
                    response_model=AIDomainClassificationResponse,
                    role="analyst",
                )
                raw_payload = ai_res.parsed
                provenance_provider = ai_res.provider
            except AIServiceError:
                raw_payload = None

        if raw_payload is None:
            # حتمي مستند إلى القواعد العربية
            dom_groups: Dict[str, Dict[str, Any]] = {}
            assignments: List[Dict[str, Any]] = []
            for tbl in tables:
                key, name_ar, desc_ar = _rule_domain_for_table(tbl["name"])
                dom_groups.setdefault(
                    key,
                    {
                        "key": key,
                        "name_ar": name_ar,
                        "description_ar": desc_ar,
                        "confidence": 0.85,
                        "evidence": [f"تطابق تسمية الكائن: {tbl['name']}"],
                    },
                )
                assignments.append(
                    {
                        "table_ref": tbl["object_ref"],
                        "domain_key": key,
                        "confidence": 0.85,
                        "reasoning_ar": f"إسناد حتمي استناداً إلى دلالة اسم الجدول ({tbl['name']}).",
                        "evidence": [tbl.get("description_ar") or tbl["name"]],
                        "column_refs": [c["object_ref"] for c in tbl.get("columns", [])[:3]],
                        "relationship_refs": [],
                    }
                )
            raw_payload = {
                "domains": list(dom_groups.values()),
                "assignments": assignments,
                "overlapping_domains": [],
                "conflicts": [],
            }

        normalized = normalize_domain_analysis(
            raw_payload,
            target_tables=tables,
            existing_domains=org.get("domains") or [],
        )
        ref_to_table = {t["object_ref"]: t for t in tables}

        # الحفاظ على النطاقات المعتمدة مسبقاً ما لم يمسها المشغل
        existing_approved = {
            d["key"]: d for d in (org.get("domains") or []) if d.get("status") == "approved"
        }
        built_domains: List[Dict[str, Any]] = []
        for dom in normalized["domains"]:
            if dom["key"] in existing_approved:
                preserved = copy.deepcopy(existing_approved[dom["key"]])
                built_domains.append(preserved)
                continue
            trefs = dom.get("table_refs", [])
            built_domains.append(
                {
                    "id": f"dom-{dom['key']}",
                    "key": dom["key"],
                    "suggested_name_ar": dom["name_ar"],
                    "name_ar": dom["name_ar"],
                    "suggested_description": dom["description"],
                    "description": dom["description"],
                    "table_refs": trefs,
                    "tables": [ref_to_table[r]["name"] for r in trefs if r in ref_to_table],
                    "table_count": len(trefs),
                    "physical_table_count": sum(
                        1 for r in trefs if ref_to_table.get(r, {}).get("object_type") != "view"
                    ),
                    "view_count": sum(
                        1 for r in trefs if ref_to_table.get(r, {}).get("object_type") == "view"
                    ),
                    "status": "pending",
                    "classification_confidence": dom["confidence"],
                    "domain_evidence": dom["evidence"],
                    "provenance": {"provider": provenance_provider, "at": utc_now()},
                    "history": [],
                }
            )

        def _apply(state_org: Dict[str, Any]) -> Dict[str, Any]:
            state_org["domains"] = built_domains
            state_org["domain_analysis"] = {
                "status": "completed",
                "progress": 100,
                "stage": "تحليل النطاقات جاهز للمراجعة البشرية",
                "completed_at": utc_now(),
                "metadata_version": sha256_hash(built_domains)[:12],
                "assignments": normalized["assignments"],
                "unclassified_table_refs": normalized["unclassified_table_refs"],
                "conflicts": normalized["conflicts"],
                "overlapping_domains": normalized["overlapping_domains"],
                "provenance": {"provider": provenance_provider},
            }
            state_org["updated_at"] = utc_now()
            return state_org

        return self.mutate_organization(organization_id, _apply)

    def review_domain(
        self,
        organization_id: str,
        domain_id: str,
        *,
        decision: str,
        operator_name: str,
        name_ar: Optional[str] = None,
        description: Optional[str] = None,
        note: str = "",
    ) -> Dict[str, Any]:
        actor = validate_human_actor(operator_name)
        norm = str(decision or "").strip().lower()
        if norm not in {"approve", "approved", "reject", "rejected", "escalate", "escalated"}:
            raise ValidationError("القرار يجب أن يكون approve أو reject أو escalate.")
        status_map = {
            "approve": "approved",
            "approved": "approved",
            "reject": "rejected",
            "rejected": "rejected",
            "escalate": "escalated",
            "escalated": "escalated",
        }
        target_status = status_map[norm]

        def _apply(org: Dict[str, Any]) -> Dict[str, Any]:
            dom = next((d for d in (org.get("domains") or []) if d["id"] == domain_id), None)
            if dom is None:
                raise NotFoundError(f"النطاق غير موجود: {domain_id}")
            if name_ar and name_ar.strip():
                dom["name_ar"] = name_ar.strip()
            if description and description.strip():
                dom["description"] = description.strip()
            dom["status"] = target_status
            dom["modified_by"] = actor
            dom["modified_at"] = utc_now()
            dom.setdefault("history", []).append(
                {"status": target_status, "actor": actor, "note": note, "at": utc_now()}
            )
            if target_status == "escalated":
                org.setdefault("escalations", []).append(
                    {
                        "id": f"esc-{str(uuid.uuid4())[:8]}",
                        "category": "domain",
                        "subject": dom["name_ar"],
                        "reason": note.strip() or "تصعيد مراجعة النطاق الدلالي.",
                        "related_id": domain_id,
                        "status": "open",
                        "created_at": utc_now(),
                        "created_by": actor,
                    }
                )
            if (
                all(d.get("status") == "approved" for d in (org.get("domains") or []))
                and org.get("current_phase") == "domains"
            ):
                org["current_phase"] = "concepts"
            org["updated_at"] = utc_now()
            org["audit_logs"].insert(
                0,
                {
                    "id": str(uuid.uuid4())[:8],
                    "action": f"domain.{target_status}",
                    "actor": actor,
                    "object_type": "domain",
                    "object_id": domain_id,
                    "details": note.strip()
                    or f"تحديث حالة النطاق {dom['name_ar']} إلى {target_status}.",
                    "created_at": utc_now(),
                },
            )
            return org

        return self.mutate_organization(organization_id, _apply)

    def move_table_to_domain(
        self,
        organization_id: str,
        *,
        table_ref: str,
        target_domain_id: str,
        operator_name: str,
    ) -> Dict[str, Any]:
        actor = validate_human_actor(operator_name)

        def _apply(org: Dict[str, Any]) -> Dict[str, Any]:
            target_dom = next(
                (d for d in (org.get("domains") or []) if d["id"] == target_domain_id), None
            )
            if target_dom is None:
                raise NotFoundError(f"النطاق الهدف غير موجود: {target_domain_id}")
            tbl = next(
                (t for t in (org.get("physical_catalog") or []) if t["object_ref"] == table_ref),
                None,
            )
            if tbl is None:
                raise NotFoundError(f"الكائن الفيزيائي غير موجود: {table_ref}")
            for d in org["domains"]:
                refs = [r for r in (d.get("table_refs") or []) if r != table_ref]
                if d["id"] == target_domain_id:
                    refs.append(table_ref)
                d["table_refs"] = refs
                d["tables"] = [
                    item["name"] for item in org["physical_catalog"] if item["object_ref"] in refs
                ]
                d["table_count"] = len(refs)
            for c in org.get("concepts") or []:
                if c.get("table_ref") == table_ref or c.get("physical_ref") == table_ref:
                    c["domain_id"] = target_domain_id
            org["updated_at"] = utc_now()
            org["audit_logs"].insert(
                0,
                {
                    "id": str(uuid.uuid4())[:8],
                    "action": "domain.table_moved",
                    "actor": actor,
                    "object_type": "domain",
                    "object_id": target_domain_id,
                    "details": f"نقل الكائن {tbl['name']} إلى النطاق {target_dom['name_ar']}.",
                    "created_at": utc_now(),
                },
            )
            return org

        return self.mutate_organization(organization_id, _apply)

    def merge_domains(
        self,
        organization_id: str,
        *,
        domain_ids: List[str],
        name_ar: str,
        description: str,
        operator_name: str,
    ) -> Dict[str, Any]:
        actor = validate_human_actor(operator_name)
        if len(domain_ids) < 2:
            raise ValidationError("اختر نطاقين على الأقل لتنفيذ الدمج.")

        def _apply(org: Dict[str, Any]) -> Dict[str, Any]:
            to_merge = [d for d in (org.get("domains") or []) if d["id"] in set(domain_ids)]
            if len(to_merge) < 2:
                raise NotFoundError("تعذر العثور على النطاقات المحددة للدمج.")
            merged_id = f"dom-{str(uuid.uuid4())[:8]}"
            merged_refs = list(
                dict.fromkeys(r for d in to_merge for r in (d.get("table_refs") or []))
            )
            merged_tables = list(
                dict.fromkeys(t for d in to_merge for t in (d.get("tables") or []))
            )
            new_dom = {
                "id": merged_id,
                "key": f"merged_{merged_id[-4:]}",
                "suggested_name_ar": name_ar.strip(),
                "name_ar": name_ar.strip(),
                "suggested_description": description.strip(),
                "description": description.strip(),
                "table_refs": merged_refs,
                "tables": merged_tables,
                "table_count": len(merged_refs),
                "status": "approved",
                "modified_by": actor,
                "modified_at": utc_now(),
                "history": [{"status": "merged", "actor": actor, "at": utc_now()}],
            }
            org["domains"] = [d for d in org["domains"] if d["id"] not in set(domain_ids)] + [
                new_dom
            ]
            for c in org.get("concepts") or []:
                if c.get("domain_id") in set(domain_ids):
                    c["domain_id"] = merged_id
            org["updated_at"] = utc_now()
            org["audit_logs"].insert(
                0,
                {
                    "id": str(uuid.uuid4())[:8],
                    "action": "domains.merged",
                    "actor": actor,
                    "object_type": "domain",
                    "object_id": merged_id,
                    "details": f"دمج {len(to_merge)} نطاقات في '{name_ar.strip()}'.",
                    "created_at": utc_now(),
                },
            )
            return org

        return self.mutate_organization(organization_id, _apply)

    # ------------------------------------------------------------------
    # المرحلة 4: المفاهيم العربية والمرادفات مع حفظ المعتمدات البشرية
    # ------------------------------------------------------------------
    def generate_concepts(
        self,
        organization_id: str,
        *,
        operator_name: str = "مشغل التهيئة",
        regenerate: bool = False,
        use_ai: bool = False,
        approve_external_ai: bool = False,
    ) -> Dict[str, Any]:
        actor = validate_human_actor(operator_name)
        org = self.get_organization(organization_id)
        tables = list(org.get("physical_catalog") or [])
        if not tables:
            raise ValidationError("لا توجد كائنات مكتشفة لتوليد المفاهيم.")

        domains = list(org.get("domains") or [])
        table_to_domain: Dict[str, str] = {}
        for d in domains:
            for ref in d.get("table_refs") or []:
                table_to_domain[ref] = d["id"]
        fallback_dom = domains[0]["id"] if domains else "dom-general"

        existing_concepts = {
            c.get("physical_ref"): c for c in (org.get("concepts") or []) if c.get("physical_ref")
        }

        new_concepts: List[Dict[str, Any]] = []
        for tbl in tables:
            tref = tbl["object_ref"]
            dom_id = table_to_domain.get(tref, fallback_dom)
            prev = existing_concepts.get(tref)
            if prev and (
                prev.get("status") in {"approved", "rejected"}
                or (prev.get("modified_by_operator") and not regenerate)
            ):
                # الحفاظ الصارم على قرارات المشغل البشري (المعتمدة والمرفوضة)
                new_concepts.append(copy.deepcopy(prev))
            else:
                new_concepts.append(
                    {
                        "id": (prev or {}).get("id") or f"con-{str(uuid.uuid4())[:8]}",
                        "physical_ref": tref,
                        "table_ref": tref,
                        "source_type": "view" if tbl.get("object_type") == "view" else "table",
                        "technical_name": tbl["name"],
                        "suggested_name_ar": tbl.get("label_ar") or tbl["name"],
                        "name_ar": tbl.get("label_ar") or tbl["name"],
                        "suggested_description": tbl.get("description_ar") or tbl["name"],
                        "description": tbl.get("description_ar") or tbl["name"],
                        "synonyms": [tbl.get("label_ar") or tbl["name"]],
                        "synonyms_en": [tbl["name"]],
                        "semantic_type": "business_entity",
                        "classification": "restricted"
                        if "financial_status" in tbl["name"].lower()
                        else "public",
                        "domain_id": dom_id,
                        "status": "pending",
                        "modified_by_operator": False,
                        "provenance": {"provider": "deterministic_pr1", "at": utc_now()},
                    }
                )

            for col in tbl.get("columns", []):
                cref = col["object_ref"]
                prev_col = existing_concepts.get(cref)
                if prev_col and prev_col.get("status") in {"approved", "rejected"}:
                    new_concepts.append(copy.deepcopy(prev_col))
                else:
                    new_concepts.append(
                        {
                            "id": (prev_col or {}).get("id") or f"con-{str(uuid.uuid4())[:8]}",
                            "physical_ref": cref,
                            "table_ref": tref,
                            "source_type": "column",
                            "technical_name": f"{tbl['name']}.{col['name']}",
                            "suggested_name_ar": col.get("label_ar") or col["name"],
                            "name_ar": col.get("label_ar") or col["name"],
                            "suggested_description": col.get("description_ar") or col["name"],
                            "description": col.get("description_ar") or col["name"],
                            "synonyms": [col.get("label_ar") or col["name"]],
                            "synonyms_en": [col["name"]],
                            "semantic_type": col.get("semantic_type") or "descriptive_attribute",
                            "classification": "public",
                            "domain_id": dom_id,
                            "status": "pending",
                            "modified_by_operator": False,
                            "provenance": {"provider": "deterministic_pr1", "at": utc_now()},
                        }
                    )

        def _apply(state_org: Dict[str, Any]) -> Dict[str, Any]:
            state_org["concepts"] = new_concepts
            state_org["semantic_enrichment"] = {
                "status": "completed",
                "last_run_at": utc_now(),
                "provider": "ai_assisted"
                if (use_ai and approve_external_ai)
                else "deterministic_pr1",
                "total_concepts": len(new_concepts),
            }
            state_org["updated_at"] = utc_now()
            state_org["audit_logs"].insert(
                0,
                {
                    "id": str(uuid.uuid4())[:8],
                    "action": "concepts.generated",
                    "actor": actor,
                    "object_type": "concepts",
                    "object_id": organization_id,
                    "details": (
                        f"توليد/تحديث {len(new_concepts)} مفهوماً عربياً "
                        "مع حماية المعتمدات البشرية."
                    ),
                    "created_at": utc_now(),
                },
            )
            return state_org

        return self.mutate_organization(organization_id, _apply)

    def review_concept(
        self,
        organization_id: str,
        concept_id: str,
        *,
        decision: str,
        operator_name: str,
        name_ar: Optional[str] = None,
        description: Optional[str] = None,
        synonyms: Optional[List[str]] = None,
        synonyms_en: Optional[List[str]] = None,
        semantic_type: Optional[str] = None,
        classification: Optional[str] = None,
        domain_id: Optional[str] = None,
        note: str = "",
    ) -> Dict[str, Any]:
        actor = validate_human_actor(operator_name)
        norm = str(decision or "").strip().lower()
        if norm not in {
            "approve",
            "approved",
            "reject",
            "rejected",
            "escalate",
            "escalated",
            "edit",
        }:
            raise ValidationError("القرار غير صالح للمفهوم.")
        status_map = {
            "approve": "approved",
            "approved": "approved",
            "reject": "rejected",
            "rejected": "rejected",
            "escalate": "escalated",
            "escalated": "escalated",
            "edit": "approved",
        }
        target_status = status_map[norm]

        def _apply(org: Dict[str, Any]) -> Dict[str, Any]:
            con = next((c for c in (org.get("concepts") or []) if c["id"] == concept_id), None)
            if con is None:
                raise NotFoundError(f"المفهوم غير موجود: {concept_id}")
            if name_ar and name_ar.strip():
                con["name_ar"] = name_ar.strip()
                con["modified_by_operator"] = True
            if description and description.strip():
                con["description"] = description.strip()
                con["modified_by_operator"] = True
            if synonyms is not None:
                con["synonyms"] = [str(s).strip() for s in synonyms if str(s).strip()]
            if synonyms_en is not None:
                con["synonyms_en"] = [str(s).strip() for s in synonyms_en if str(s).strip()]
            if semantic_type:
                con["semantic_type"] = semantic_type
            if classification:
                con["classification"] = str(classification).strip().lower()
            if domain_id:
                con["domain_id"] = domain_id
            con["status"] = target_status
            con["modified_by"] = actor
            con["modified_at"] = utc_now()
            if target_status == "escalated":
                org.setdefault("escalations", []).append(
                    {
                        "id": f"esc-{str(uuid.uuid4())[:8]}",
                        "category": "concept",
                        "subject": con["name_ar"],
                        "reason": note.strip() or "مراجعة تعريف المفهوم العربي.",
                        "related_id": concept_id,
                        "status": "open",
                        "created_at": utc_now(),
                        "created_by": actor,
                    }
                )
            org["updated_at"] = utc_now()
            org["audit_logs"].insert(
                0,
                {
                    "id": str(uuid.uuid4())[:8],
                    "action": f"concept.{target_status}",
                    "actor": actor,
                    "object_type": "concept",
                    "object_id": concept_id,
                    "details": note.strip()
                    or f"حسم المفهوم '{con['name_ar']}' -> {target_status}.",
                    "created_at": utc_now(),
                },
            )
            return org

        return self.mutate_organization(organization_id, _apply)

    def bulk_approve_stage(
        self,
        organization_id: str,
        *,
        stage: str,
        operator_name: str,
    ) -> Dict[str, Any]:
        """اعتماد جماعي لعناصر مرحلة (domains/concepts/relationships) من طرف المشغل البشري."""
        actor = validate_human_actor(operator_name)
        key = str(stage or "").strip().lower()
        if key not in {"domains", "concepts", "relationships"}:
            raise ValidationError("المرحلة يجب أن تكون domains أو concepts أو relationships.")

        def _apply(org: Dict[str, Any]) -> Dict[str, Any]:
            count = 0
            for item in org.get(key) or []:
                if item.get("status") == "pending":
                    item["status"] = "approved"
                    item["reviewed_by"] = actor
                    item["reviewed_at"] = utc_now()
                    count += 1
            if key == "domains" and org.get("current_phase") == "domains":
                org["current_phase"] = "concepts"
            elif key == "concepts" and org.get("current_phase") == "concepts":
                org["current_phase"] = "relationships"
            elif key == "relationships" and org.get("current_phase") == "relationships":
                org["current_phase"] = "activation"
            org["updated_at"] = utc_now()
            org["audit_logs"].insert(
                0,
                {
                    "id": str(uuid.uuid4())[:8],
                    "action": f"{key}.bulk_approved",
                    "actor": actor,
                    "object_type": key,
                    "object_id": organization_id,
                    "details": f"اعتماد {count} عنصر في {key} دفعة واحدة.",
                    "created_at": utc_now(),
                },
            )
            return org

        return self.mutate_organization(organization_id, _apply)

    # ------------------------------------------------------------------
    # الحوكمة والتصعيد والأرشفة
    # ------------------------------------------------------------------
    def resolve_escalation(
        self,
        organization_id: str,
        escalation_id: str,
        *,
        decision: str,
        operator_name: str,
        note: str = "",
    ) -> Dict[str, Any]:
        actor = validate_human_actor(operator_name)
        norm = str(decision or "").strip().lower()
        if norm not in {"confirm", "dismiss"}:
            raise ValidationError("قرار التصعيد يجب أن يكون confirm أو dismiss.")

        def _apply(org: Dict[str, Any]) -> Dict[str, Any]:
            esc = next(
                (e for e in (org.get("escalations") or []) if e["id"] == escalation_id), None
            )
            if esc is None:
                raise NotFoundError(f"التصعيد غير موجود: {escalation_id}")
            esc["status"] = "resolved" if norm == "confirm" else "dismissed"
            esc["resolved_at"] = utc_now()
            esc["resolved_by"] = actor
            esc["resolution_note"] = note.strip()

            related_id = esc.get("related_id")
            if related_id:
                new_status = "approved" if norm == "confirm" else "rejected"
                for bucket in ("domains", "concepts", "relationships", "schema_changes"):
                    for item in org.get(bucket) or []:
                        if item.get("id") == related_id and item.get("status") == "escalated":
                            item["status"] = new_status
                            item["reviewed_by"] = actor
                            item["reviewed_at"] = utc_now()
            org["updated_at"] = utc_now()
            org["audit_logs"].insert(
                0,
                {
                    "id": str(uuid.uuid4())[:8],
                    "action": f"escalation.{norm}",
                    "actor": actor,
                    "object_type": "escalation",
                    "object_id": escalation_id,
                    "details": note.strip() or f"إغلاق التصعيد ({esc['subject']}).",
                    "created_at": utc_now(),
                },
            )
            return org

        return self.mutate_organization(organization_id, _apply)

    def archive_organization(self, organization_id: str, operator_name: str) -> Dict[str, Any]:
        actor = validate_human_actor(operator_name)

        def _apply(org: Dict[str, Any]) -> Dict[str, Any]:
            org["archived_at"] = utc_now()
            org["archived_by"] = actor
            org["audit_logs"].insert(
                0,
                {
                    "id": str(uuid.uuid4())[:8],
                    "action": "organization.archived",
                    "actor": actor,
                    "object_type": "organization",
                    "object_id": organization_id,
                    "details": "أرشفة سجل التهيئة.",
                    "created_at": utc_now(),
                },
            )
            return org

        return self.mutate_organization(organization_id, _apply)
