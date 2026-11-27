"""محرك المراحل 6–8: التحقق من الجاهزية والتفعيل، مراقبة المخطط، ومزامنة التغييرات الدلالية."""

from __future__ import annotations

import copy
import threading
import time
import uuid
from typing import Any, Callable, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.services.onboarding.connectors import DataSourceConnectionError, scan_source_metadata
from app.services.onboarding.discovery.fingerprints import (
    catalog_fingerprint,
    structural_catalog_fingerprint,
)
from app.services.onboarding.semantics.ai_gateway import AIServiceError, StructuredAIGateway

from .bridge import SemanticKnowledgeBridge
from .models import (
    ApprovalRequiredError,
    ConflictError,
    ValidationError,
    utc_now,
    validate_human_actor,
)


class _AIReadinessRec(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    priority: str
    stage: int = Field(ge=0, le=8)
    title_ar: str = Field(min_length=2, pattern=r"[\u0600-\u06FF]")
    action_ar: str = Field(min_length=4, pattern=r"[\u0600-\u06FF]")


class AIActivationReadinessResponse(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    overall_summary_ar: str = Field(min_length=4, pattern=r"[\u0600-\u06FF]")
    readiness_level: str
    recommendations: List[_AIReadinessRec] = Field(default_factory=list)


class AIMonitoringImpactResponse(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    summary_ar: str = Field(min_length=4, pattern=r"[\u0600-\u06FF]")
    risk_level: str
    recommendations_ar: List[str] = Field(default_factory=list)


class AISchemaChangeProposalItem(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    change_id: str
    impact_summary_ar: str = Field(min_length=4, pattern=r"[\u0600-\u06FF]")
    recommendation_ar: str = Field(min_length=4, pattern=r"[\u0600-\u06FF]")
    suggested_label_ar: Optional[str] = None


class AISchemaChangeProposalResponse(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    proposals: List[AISchemaChangeProposalItem] = Field(default_factory=list)


def get_activation_readiness(service: Any, organization_id: str) -> Dict[str, Any]:
    """فحص بوابات الجاهزية الحتمية قبل السماح بالتفعيل في المرحلة 6."""
    org = service.get_organization(organization_id)
    blockers: List[Dict[str, Any]] = []

    if not org.get("intake", {}).get("approved"):
        blockers.append(
            {
                "stage": 0,
                "code": "intake_unapproved",
                "message": "لم يتم اعتماد اكتمال ملف الاستلام في المرحلة 0.",
            }
        )

    sources = org.get("data_sources") or []
    if not sources or not all(s.get("status") == "connected" for s in sources):
        blockers.append(
            {
                "stage": 1,
                "code": "sources_disconnected",
                "message": "يجب اختبار نجاح اتصال جميع مصادر البيانات (قراءة فقط).",
            }
        )

    if org.get("discovery", {}).get("status") != "completed" or not (
        org.get("physical_catalog") or []
    ):
        blockers.append(
            {
                "stage": 2,
                "code": "discovery_incomplete",
                "message": "يجب إتمام الاكتشاف الفيزيائي الحتمي في المرحلة 2.",
            }
        )

    domains = org.get("domains") or []
    unresolved_domains = [d for d in domains if d.get("status") not in {"approved", "rejected"}]
    approved_domains = [d for d in domains if d.get("status") == "approved"]
    if not approved_domains or unresolved_domains:
        blockers.append(
            {
                "stage": 3,
                "code": "domains_pending",
                "message": (
                    f"توجد {len(unresolved_domains) or 1} نطاقات غير محسومة في المرحلة 3."
                ),
            }
        )

    concepts = org.get("concepts") or []
    unresolved_concepts = [c for c in concepts if c.get("status") not in {"approved", "rejected"}]
    approved_concepts = [c for c in concepts if c.get("status") == "approved"]
    if not approved_concepts or unresolved_concepts:
        blockers.append(
            {
                "stage": 4,
                "code": "concepts_pending",
                "message": (
                    f"توجد {len(unresolved_concepts) or 1} مفاهيم عربية "
                    "بانتظار الاعتماد في المرحلة 4."
                ),
            }
        )

    rels = org.get("relationships") or []
    unresolved_rels = [r for r in rels if r.get("status") not in {"approved", "rejected"}]
    if unresolved_rels:
        blockers.append(
            {
                "stage": 5,
                "code": "relationships_unresolved",
                "message": f"توجد {len(unresolved_rels)} علاقات غير محسومة في المرحلة 5.",
            }
        )

    open_escalations = [e for e in (org.get("escalations") or []) if e.get("status") == "open"]
    if open_escalations:
        blockers.append(
            {
                "stage": 5,
                "code": "open_escalations",
                "message": f"توجد {len(open_escalations)} تصعيدات مفتوحة تتطلب الحسم قبل التفعيل.",
            }
        )

    return {
        "organization_id": organization_id,
        "ready": len(blockers) == 0,
        "already_active": org.get("status") == "active",
        "blockers": blockers,
        "summary": {
            "tables": sum(
                1 for t in (org.get("physical_catalog") or []) if t.get("object_type") != "view"
            ),
            "views": sum(
                1 for t in (org.get("physical_catalog") or []) if t.get("object_type") == "view"
            ),
            "approved_domains": sum(1 for d in domains if d.get("status") == "approved"),
            "approved_concepts": sum(1 for c in concepts if c.get("status") == "approved"),
            "approved_relationships": sum(1 for r in rels if r.get("status") == "approved"),
            "rejected_relationships": sum(1 for r in rels if r.get("status") == "rejected"),
        },
    }


def ai_activation_readiness(
    service: Any,
    organization_id: str,
    *,
    ai_gateway: Optional[StructuredAIGateway] = None,
    approve_external_ai: bool = False,
) -> Dict[str, Any]:
    """استشارة AI اختيارية لتلخيص المخاطر قبل التفعيل دون أي تعديل آلي للاعتمادات."""
    readiness = get_activation_readiness(service, organization_id)
    if ai_gateway is not None and approve_external_ai:
        try:
            res = ai_gateway.generate_structured(
                system_prompt="قدّم تقييم جاهزية ومخاطر تفعيل مختصر بالعربية للكتالوج الدلالي فقط.",
                user_payload=readiness,
                response_model=AIActivationReadinessResponse,
                role="reporter",
            )
            return {**readiness, "ai_advice": res.parsed, "provider": res.provider}
        except AIServiceError:
            pass
    level = "ready" if readiness["ready"] else "blocked"
    advice = {
        "overall_summary_ar": (
            "جميع بوابات الاعتماد مكتملة والكتالوج جاهز للتسليم والفهرسة في pgvector."
            if readiness["ready"]
            else (
                f"التفعيل محجوب حالياً لوجود {len(readiness['blockers'])} "
                "معوقات تتطلب الحسم البشري."
            )
        ),
        "readiness_level": level,
        "recommendations": [
            {
                "priority": "high",
                "stage": int(b.get("stage", 0)),
                "title_ar": "معالجة معوّق اعتماد",
                "action_ar": str(b.get("message") or ""),
            }
            for b in readiness["blockers"]
        ],
    }
    return {**readiness, "ai_advice": advice, "provider": "deterministic"}


def activate_organization(
    service: Any,
    organization_id: str,
    *,
    operator_name: str,
    handover_note: str = "",
    bridge: Optional[SemanticKnowledgeBridge] = None,
) -> Dict[str, Any]:
    """تنفيذ بوابة التفعيل (المرحلة 6) ونشر المعرفة المعتمدة إلى pgvector و Catalog v2."""
    actor = validate_human_actor(operator_name, "اسم المشغل المعتمد")
    readiness = get_activation_readiness(service, organization_id)
    if readiness["already_active"]:
        raise ConflictError(
            "المؤسسة مفعّلة بالفعل؛ استخدم المزامنة في المرحلة 8 للتحديثات اللاحقة.",
            code="already_active",
        )
    if not readiness["ready"]:
        raise ApprovalRequiredError(
            "تعذر التفعيل: " + " | ".join(b["message"] for b in readiness["blockers"]),
            code="readiness_blocked",
        )

    def _activate(org: Dict[str, Any]) -> Dict[str, Any]:
        catalog = list(org.get("physical_catalog") or [])
        base_fp = catalog_fingerprint(catalog) if catalog else ""
        base_struct_fp = structural_catalog_fingerprint(catalog) if catalog else ""
        activated_at = utc_now()

        org["status"] = "active"
        org["current_phase"] = "monitoring"
        org["activation"] = {
            "activated_at": activated_at,
            "activated_by": actor,
            "handover_note": handover_note.strip(),
            "baseline_fingerprint": base_fp,
            "baseline_structural_fingerprint": base_struct_fp,
            "semantic_publication": None,
        }
        org["monitoring"] = {
            "status": "healthy",
            "last_checked_at": activated_at,
            "baseline_fingerprint": base_fp,
            "current_fingerprint": base_fp,
            "baseline_structural_fingerprint": base_struct_fp,
            "current_structural_fingerprint": base_struct_fp,
            "baseline_tables": len(catalog),
            "current_tables": len(catalog),
            "history": [
                {
                    "checked_at": activated_at,
                    "status": "healthy",
                    "changes_detected": 0,
                    "actor": actor,
                }
            ],
            "snapshots": [copy.deepcopy(catalog)],
            "async_job": {"status": "idle", "attempts": 0, "error": None},
        }
        org["updated_at"] = activated_at
        org.setdefault("audit_logs", []).insert(
            0,
            {
                "id": str(uuid.uuid4())[:8],
                "action": "organization.activated",
                "actor": actor,
                "object_type": "organization",
                "object_id": organization_id,
                "details": "اعتماد التسليم النهائي وتفعيل المؤسسة في المرحلة 6.",
                "created_at": activated_at,
            },
        )
        return org

    org = service.mutate_organization(organization_id, _activate)

    # نشر المعرفة المعتمدة إلى pgvector و Catalog v2 إن وُجد الجسر
    if bridge is not None:
        pub = bridge.publish_approved_organization(org)

        def _attach_pub(state_org: Dict[str, Any]) -> Dict[str, Any]:
            state_org["activation"]["semantic_publication"] = {
                "tenant_id": pub.tenant_id,
                "source_ids": list(pub.source_ids),
                "indexing_summaries": list(pub.indexing_summaries),
                "catalog_views": [entry.view for entry in pub.catalog_views],
                "approved_objects_count": pub.approved_objects_count,
                "rejected_excluded_count": pub.rejected_excluded_count,
                "approved_relationships_count": pub.approved_relationships_count,
                "semantic_revision": pub.semantic_revision,
                "published_at": utc_now(),
            }
            return state_org

        org = service.mutate_organization(organization_id, _attach_pub)
    return org


def _diff_catalog_changes(
    baseline: List[Dict[str, Any]],
    current: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """مقارنة بنيوية غنية بين خط الأساس والمسح الحالي دون تأثر بعدد الصفوف أو الاتصال."""
    base_map = {t.get("schema_qualified_name") or t["name"]: t for t in baseline}
    curr_map = {t.get("schema_qualified_name") or t["name"]: t for t in current}
    changes: List[Dict[str, Any]] = []

    for qname, curr in sorted(curr_map.items()):
        if qname not in base_map:
            changes.append(
                {
                    "id": f"chg-{str(uuid.uuid4())[:8]}",
                    "change_type": "table_added"
                    if curr.get("object_type") != "view"
                    else "view_added",
                    "technical_name": qname,
                    "object_ref": curr.get("object_ref"),
                    "title": f"إضافة كائن جديد: {qname}",
                    "details": (
                        f"تم اكتشاف كائن جديد ({curr.get('object_type', 'table')}) "
                        f"يحتوي على {len(curr.get('columns', []))} أعمدة."
                    ),
                    "severity": "medium",
                    "status": "pending",
                    "detected_at": utc_now(),
                    "before_snapshot": None,
                    "after_snapshot": curr,
                }
            )
            continue

        prev = base_map[qname]
        prev_fp = prev.get("structural_fingerprint") or prev.get("fingerprint")
        curr_fp = curr.get("structural_fingerprint") or curr.get("fingerprint")
        if prev_fp != curr_fp:
            prev_cols = {c["name"]: c for c in prev.get("columns", [])}
            curr_cols = {c["name"]: c for c in curr.get("columns", [])}
            added_cols = sorted(set(curr_cols) - set(prev_cols))
            removed_cols = sorted(set(prev_cols) - set(curr_cols))
            changed_cols = sorted(
                name
                for name in (set(prev_cols) & set(curr_cols))
                if (
                    prev_cols[name].get("data_type") != curr_cols[name].get("data_type")
                    or bool(prev_cols[name].get("nullable"))
                    != bool(curr_cols[name].get("nullable"))
                )
            )
            details_parts = []
            if added_cols:
                details_parts.append(f"أعمدة مضافة: {', '.join(added_cols)}")
            if removed_cols:
                details_parts.append(f"أعمدة محذوفة: {', '.join(removed_cols)}")
            if changed_cols:
                details_parts.append(f"تعديل نوع/خصائص: {', '.join(changed_cols)}")
            if not details_parts:
                details_parts.append("تغير في المفاتيح أو القيود البنيوية.")
            changes.append(
                {
                    "id": f"chg-{str(uuid.uuid4())[:8]}",
                    "change_type": "object_modified",
                    "technical_name": qname,
                    "object_ref": curr.get("object_ref"),
                    "title": f"تعديل بنيوي في {qname}",
                    "details": "؛ ".join(details_parts),
                    "severity": "high" if (removed_cols or changed_cols) else "medium",
                    "status": "pending",
                    "detected_at": utc_now(),
                    "added_columns": added_cols,
                    "removed_columns": removed_cols,
                    "modified_columns": changed_cols,
                    "before_snapshot": prev,
                    "after_snapshot": curr,
                }
            )

    for qname, prev in sorted(base_map.items()):
        if qname not in curr_map:
            changes.append(
                {
                    "id": f"chg-{str(uuid.uuid4())[:8]}",
                    "change_type": "table_removed"
                    if prev.get("object_type") != "view"
                    else "view_removed",
                    "technical_name": qname,
                    "object_ref": prev.get("object_ref"),
                    "title": f"حذف كائن من المصدر: {qname}",
                    "details": (
                        "لم يعد هذا الكائن موجوداً في المخطط المصدر "
                        "ويجب أرشفته من الفهرس والكتالوج."
                    ),
                    "severity": "high",
                    "status": "pending",
                    "detected_at": utc_now(),
                    "before_snapshot": prev,
                    "after_snapshot": None,
                }
            )
    return changes


def monitor_schema(
    service: Any,
    organization_id: str,
    *,
    operator_name: str = "مشغل التهيئة",
    passwords: Optional[Dict[str, str]] = None,
    override_catalog: Optional[List[Dict[str, Any]]] = None,
    postgres_connect_fn: Optional[Callable[..., Any]] = None,
) -> Dict[str, Any]:
    """فحص المخطط في المرحلة 7 (قراءة فقط) واكتشاف الانحراف البنيوي الفعلي فقط."""
    actor = validate_human_actor(operator_name)
    org = service.get_organization(organization_id)
    if org.get("status") != "active":
        raise ApprovalRequiredError(
            "مراقبة المخطط متاحة فقط بعد تفعيل المؤسسة في المرحلة 6.",
            code="organization_not_active",
        )

    baseline = list(org.get("physical_catalog") or [])
    if override_catalog is not None:
        scanned = copy.deepcopy(override_catalog)
    else:
        scanned = []
        pw_map = passwords or {}
        for src in org.get("data_sources") or []:
            pw = pw_map.get(src["id"], "")
            scanned.extend(
                scan_source_metadata(
                    src,
                    password=pw,
                    postgres_connect_fn=postgres_connect_fn,
                )
            )

    new_changes = _diff_catalog_changes(baseline, scanned)
    now_ts = utc_now()
    curr_fp = catalog_fingerprint(scanned) if scanned else ""
    curr_struct_fp = structural_catalog_fingerprint(scanned) if scanned else ""

    def _apply(state_org: Dict[str, Any]) -> Dict[str, Any]:
        mon = state_org.setdefault("monitoring", {})
        status = "drift_detected" if new_changes else "healthy"
        mon["status"] = status
        mon["last_checked_at"] = now_ts
        mon["current_fingerprint"] = curr_fp
        mon["current_structural_fingerprint"] = curr_struct_fp
        mon["current_tables"] = len(scanned)
        mon["latest_scanned_catalog"] = scanned
        mon.setdefault("history", []).insert(
            0,
            {
                "checked_at": now_ts,
                "status": status,
                "changes_detected": len(new_changes),
                "actor": actor,
            },
        )
        mon["history"] = mon["history"][:50]
        if new_changes:
            existing_open = {
                (ch.get("change_type"), ch.get("technical_name"))
                for ch in (state_org.get("schema_changes") or [])
                if ch.get("status") == "pending"
            }
            for ch in new_changes:
                key = (ch["change_type"], ch["technical_name"])
                if key not in existing_open:
                    state_org.setdefault("schema_changes", []).append(ch)
            state_org["current_phase"] = "schema"
        state_org["updated_at"] = now_ts
        state_org.setdefault("audit_logs", []).insert(
            0,
            {
                "id": str(uuid.uuid4())[:8],
                "action": "monitoring.checked",
                "actor": actor,
                "object_type": "monitoring",
                "object_id": organization_id,
                "details": (
                    f"فحص المخطط: رُصد {len(new_changes)} تغييرات."
                    if new_changes
                    else "فحص المخطط: المخطط مطابق لخط الأساس."
                ),
                "created_at": now_ts,
            },
        )
        return state_org

    return service.mutate_organization(organization_id, _apply)


def start_async_monitoring(
    service: Any,
    organization_id: str,
    *,
    operator_name: str = "مشغل التهيئة",
    passwords: Optional[Dict[str, str]] = None,
    override_catalog: Optional[List[Dict[str, Any]]] = None,
    postgres_connect_fn: Optional[Callable[..., Any]] = None,
    max_retries: int = 2,
) -> Dict[str, Any]:
    """تشغيل فحص مراقبة غير متزامن مع إعادة محاولة محدودة للأخطاء العابرة."""
    job_id = f"mon-{str(uuid.uuid4())[:8]}"

    def _mark_queued(org: Dict[str, Any]) -> Dict[str, Any]:
        mon = org.setdefault("monitoring", {})
        mon["async_job"] = {
            "job_id": job_id,
            "status": "running",
            "attempts": 0,
            "error": None,
            "started_at": utc_now(),
        }
        return org

    service.mutate_organization(organization_id, _mark_queued)

    def _worker():
        last_err = None
        for attempt in range(1, max_retries + 2):
            try:
                monitor_schema(
                    service,
                    organization_id,
                    operator_name=operator_name,
                    passwords=passwords,
                    override_catalog=override_catalog,
                    postgres_connect_fn=postgres_connect_fn,
                )

                def _done(org: Dict[str, Any], *, done_attempts: int = attempt) -> Dict[str, Any]:
                    org["monitoring"]["async_job"] = {
                        "job_id": job_id,
                        "status": "completed",
                        "attempts": done_attempts,
                        "error": None,
                        "completed_at": utc_now(),
                    }
                    return org

                service.mutate_organization(organization_id, _done)
                return
            except DataSourceConnectionError as exc:
                last_err = exc.message
                if not exc.retryable or attempt > max_retries:
                    break
                time.sleep(0.1 * attempt)
            except Exception as exc:
                last_err = str(exc)
                break

        def _failed(org: Dict[str, Any]) -> Dict[str, Any]:
            org.setdefault("monitoring", {})["async_job"] = {
                "job_id": job_id,
                "status": "failed",
                "attempts": max_retries + 1,
                "error": last_err or "فشل غير متوقع في مهمة المراقبة.",
                "completed_at": utc_now(),
            }
            return org

        service.mutate_organization(organization_id, _failed)

    thread = threading.Thread(target=_worker, daemon=True)
    thread.start()
    return {"job_id": job_id, "status": "running"}


def decide_schema_change(
    service: Any,
    organization_id: str,
    change_id: str,
    *,
    decision: str,
    operator_name: str,
    note: str = "",
    updated_label_ar: Optional[str] = None,
) -> Dict[str, Any]:
    """قرار المشغل البشري على تغيير مكتشف في المرحلة 8."""
    actor = validate_human_actor(operator_name)
    norm = str(decision or "").strip().lower()
    if norm not in {
        "approve",
        "approved",
        "modify",
        "modified",
        "escalate",
        "escalated",
        "reject",
        "rejected",
    }:
        raise ValidationError("القرار غير صالح؛ المسموح: approve, modify, escalate, reject.")
    status_map = {
        "approve": "approved",
        "approved": "approved",
        "modify": "approved",
        "modified": "approved",
        "escalate": "escalated",
        "escalated": "escalated",
        "reject": "rejected",
        "rejected": "rejected",
    }
    target_status = status_map[norm]

    def _apply(org: Dict[str, Any]) -> Dict[str, Any]:
        changes = org.get("schema_changes") or []
        target = next((ch for ch in changes if ch.get("id") == change_id), None)
        if target is None:
            raise KeyError(f"تغيير المخطط غير موجود: {change_id}")
        target["status"] = target_status
        target["decided_by"] = actor
        target["decided_at"] = utc_now()
        if note.strip():
            target["decision_note"] = note.strip()
        if updated_label_ar and updated_label_ar.strip():
            target["updated_label_ar"] = updated_label_ar.strip()
        if target_status == "escalated":
            org.setdefault("escalations", []).append(
                {
                    "id": f"esc-{str(uuid.uuid4())[:8]}",
                    "category": "schema_change",
                    "subject": target.get("title") or change_id,
                    "reason": note.strip() or target.get("details") or "تغيير يتطلب مراجعة المالك.",
                    "related_id": change_id,
                    "status": "open",
                    "created_at": utc_now(),
                    "created_by": actor,
                }
            )
        org["updated_at"] = utc_now()
        org.setdefault("audit_logs", []).insert(
            0,
            {
                "id": str(uuid.uuid4())[:8],
                "action": f"schema_change.{target_status}",
                "actor": actor,
                "object_type": "schema_change",
                "object_id": change_id,
                "details": note.strip() or f"حسم تغيير المخطط {target.get('technical_name')}.",
                "created_at": utc_now(),
            },
        )
        return org

    return service.mutate_organization(organization_id, _apply)


def ai_changed_semantics(
    service: Any,
    organization_id: str,
    *,
    ai_gateway: Optional[StructuredAIGateway] = None,
    approve_external_ai: bool = False,
) -> Dict[str, Any]:
    """توليد مقترحات دلالية مقتصرة على الكائنات المتغيرة فقط في المرحلة 8."""
    org = service.get_organization(organization_id)
    pending_changes = [
        ch for ch in (org.get("schema_changes") or []) if ch.get("status") == "pending"
    ]
    if ai_gateway is not None and approve_external_ai and pending_changes:
        try:
            res = ai_gateway.generate_structured(
                system_prompt="قدّم مقترحات دلالية عربية للتغييرات المذكورة فقط.",
                user_payload={
                    "changes": [
                        {
                            "id": ch["id"],
                            "type": ch["change_type"],
                            "name": ch["technical_name"],
                            "details": ch["details"],
                        }
                        for ch in pending_changes
                    ]
                },
                response_model=AISchemaChangeProposalResponse,
                role="analyst",
            )
            return {"proposals": res.parsed.get("proposals", []), "provider": res.provider}
        except AIServiceError:
            pass

    return {
        "proposals": [
            {
                "change_id": ch["id"],
                "impact_summary_ar": f"تأثير محدود على {ch['technical_name']}: {ch['details']}",
                "recommendation_ar": (
                    "اعتماد الإضافة وإعادة توليد المفاهيم المرتبطة بها."
                    if "added" in ch["change_type"]
                    else (
                        "أرشفة المراجع المحذوفة وتنظيف الفهرس الدلالي."
                        if "removed" in ch["change_type"]
                        else "مراجعة الأعمدة المعدلة وتحديث الوصف المعتمد."
                    )
                ),
                "suggested_label_ar": None,
            }
            for ch in pending_changes
        ],
        "provider": "deterministic",
    }


def synchronize_semantic_catalog(
    service: Any,
    organization_id: str,
    *,
    operator_name: str,
    bridge: Optional[SemanticKnowledgeBridge] = None,
) -> Dict[str, Any]:
    """مزامنة التغييرات المعتمدة في المرحلة 8 تزايدياً مع pgvector و Catalog v2 وأرشفة المحذوف."""
    actor = validate_human_actor(operator_name)
    org = service.get_organization(organization_id)
    changes = list(org.get("schema_changes") or [])
    unresolved = [ch for ch in changes if ch.get("status") in {"pending", "escalated"}]
    if unresolved:
        raise ApprovalRequiredError(
            f"لا يمكن المزامنة لوجود {len(unresolved)} تغييرات غير محسومة.",
            code="schema_changes_pending",
        )

    approved_changes = [ch for ch in changes if ch.get("status") == "approved"]
    latest_catalog = list(org.get("monitoring", {}).get("latest_scanned_catalog") or [])

    def _apply_sync(state_org: Dict[str, Any]) -> Dict[str, Any]:
        catalog_map = {
            t.get("schema_qualified_name") or t["name"]: t
            for t in (state_org.get("physical_catalog") or [])
        }
        scanned_map = {t.get("schema_qualified_name") or t["name"]: t for t in latest_catalog}
        retired_refs: List[str] = []

        for ch in approved_changes:
            qname = ch["technical_name"]
            ctype = ch["change_type"]
            if ctype in {"table_added", "view_added", "object_modified"}:
                if ch.get("after_snapshot"):
                    catalog_map[qname] = copy.deepcopy(ch["after_snapshot"])
                elif qname in scanned_map:
                    catalog_map[qname] = copy.deepcopy(scanned_map[qname])
                # تحديث المفهوم المرتبط أو إنشاء مفهوم مبدئي معتمد حسب مراجعة المشغل
                obj = catalog_map.get(qname)
                if obj:
                    tref = obj["object_ref"]
                    concepts = state_org.setdefault("concepts", [])
                    existing_c = next((c for c in concepts if c.get("physical_ref") == tref), None)
                    label = ch.get("updated_label_ar") or obj.get("label_ar") or obj["name"]
                    if existing_c:
                        existing_c["name_ar"] = label
                        existing_c["description"] = obj.get("description_ar") or label
                        existing_c["status"] = "approved"
                    else:
                        default_dom = (state_org.get("domains") or [{}])[0].get(
                            "id"
                        ) or "dom-general"
                        concepts.append(
                            {
                                "id": f"con-{str(uuid.uuid4())[:8]}",
                                "physical_ref": tref,
                                "table_ref": tref,
                                "source_type": "view"
                                if obj.get("object_type") == "view"
                                else "table",
                                "technical_name": obj["name"],
                                "name_ar": label,
                                "description": obj.get("description_ar") or label,
                                "synonyms": [label],
                                "synonyms_en": [obj["name"]],
                                "semantic_type": "business_entity",
                                "domain_id": default_dom,
                                "status": "approved",
                                "classification": "public",
                            }
                        )
            elif ctype in {"table_removed", "view_removed"}:
                old_obj = catalog_map.pop(qname, None)
                if old_obj:
                    old_ref = old_obj.get("object_ref")
                    if old_ref:
                        retired_refs.append(old_ref)
                        # أرشفة المفاهيم والعلاقات المرتبطة بأمان
                        for c in state_org.get("concepts") or []:
                            if c.get("physical_ref") == old_ref or c.get("table_ref") == old_ref:
                                c["status"] = "superseded"
                        for rel in state_org.get("relationships") or []:
                            if old_ref in (
                                rel.get("source_table_ref"),
                                rel.get("target_table_ref"),
                            ):
                                rel["status"] = "rejected"
            ch["status"] = "synced"
            ch["synced_at"] = utc_now()

        updated_catalog = sorted(
            catalog_map.values(), key=lambda x: str(x.get("schema_qualified_name") or x["name"])
        )
        state_org["physical_catalog"] = updated_catalog
        new_fp = catalog_fingerprint(updated_catalog) if updated_catalog else ""
        new_struct_fp = structural_catalog_fingerprint(updated_catalog) if updated_catalog else ""

        mon = state_org.setdefault("monitoring", {})
        mon["status"] = "healthy"
        mon["baseline_fingerprint"] = new_fp
        mon["current_fingerprint"] = new_fp
        mon["baseline_structural_fingerprint"] = new_struct_fp
        mon["current_structural_fingerprint"] = new_struct_fp
        mon["baseline_tables"] = len(updated_catalog)
        mon["current_tables"] = len(updated_catalog)

        sync_state = state_org.setdefault("semantic_sync", {})
        sync_state["status"] = "synced"
        sync_state["last_synced_at"] = utc_now()
        sync_state["last_synced_by"] = actor
        sync_state.setdefault("history", []).insert(
            0,
            {
                "synced_at": utc_now(),
                "actor": actor,
                "applied_changes": len(approved_changes),
                "retired_refs": retired_refs,
                "new_structural_fingerprint": new_struct_fp,
            },
        )
        state_org["current_phase"] = "monitoring"
        state_org["updated_at"] = utc_now()
        state_org.setdefault("audit_logs", []).insert(
            0,
            {
                "id": str(uuid.uuid4())[:8],
                "action": "schema.synchronized",
                "actor": actor,
                "object_type": "semantic_sync",
                "object_id": organization_id,
                "details": (
                    f"مزامنة {len(approved_changes)} تغييرات "
                    f"وأرشفة {len(retired_refs)} مراجع محذوفة."
                ),
                "created_at": utc_now(),
            },
        )
        return state_org

    synced_org = service.mutate_organization(organization_id, _apply_sync)

    if bridge is not None:
        pub = bridge.publish_approved_organization(synced_org)

        def _attach_sync_pub(state_org: Dict[str, Any]) -> Dict[str, Any]:
            state_org.setdefault("semantic_sync", {})["last_publication"] = {
                "indexing_summaries": list(pub.indexing_summaries),
                "catalog_views": [entry.view for entry in pub.catalog_views],
                "semantic_revision": pub.semantic_revision,
            }
            return state_org

        synced_org = service.mutate_organization(organization_id, _attach_sync_pub)
    return synced_org
