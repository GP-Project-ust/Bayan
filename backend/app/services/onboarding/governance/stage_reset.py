"""إعادة تعيين المراحل 0–8 مع فرض الاعتماديات التسلسلية وتدقيق المشغل البشري."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Tuple

STAGES_ORDER: Tuple[Dict[str, Any], ...] = (
    {"stage_number": 0, "key": "intake", "title_ar": "استلام المؤسسة"},
    {"stage_number": 1, "key": "connection", "title_ar": "الاتصال والمسح"},
    {"stage_number": 2, "key": "discovery", "title_ar": "الاكتشاف الحتمي للمخطط"},
    {"stage_number": 3, "key": "domains", "title_ar": "النطاقات الدلالية"},
    {"stage_number": 4, "key": "concepts", "title_ar": "المفاهيم العربية"},
    {"stage_number": 5, "key": "relationships", "title_ar": "العلاقات الفيزيائية والدلالية"},
    {"stage_number": 6, "key": "activation", "title_ar": "التسليم والتفعيل"},
    {"stage_number": 7, "key": "monitoring", "title_ar": "متابعة صحة المخطط"},
    {"stage_number": 8, "key": "schema", "title_ar": "مراجعة تغييرات المخطط والمزامنة"},
)

STAGE_BY_KEY = {item["key"]: item for item in STAGES_ORDER}
STAGE_ALIASES = {
    "0": "intake",
    "stage_0": "intake",
    "intake": "intake",
    "1": "connection",
    "stage_1": "connection",
    "connection": "connection",
    "2": "discovery",
    "stage_2": "discovery",
    "discovery": "discovery",
    "3": "domains",
    "stage_3": "domains",
    "domains": "domains",
    "4": "concepts",
    "stage_4": "concepts",
    "concepts": "concepts",
    "5": "relationships",
    "stage_5": "relationships",
    "relationships": "relationships",
    "6": "activation",
    "stage_6": "activation",
    "activation": "activation",
    "7": "monitoring",
    "stage_7": "monitoring",
    "monitoring": "monitoring",
    "8": "schema",
    "stage_8": "schema",
    "schema": "schema",
    "schema_changes": "schema",
}

FORBIDDEN_ACTORS = {"ai", "llm", "bot", "system", "النظام", "auto", "automatic"}


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def resolve_stage(stage_ref: str) -> Dict[str, Any]:
    """تحويل رقم أو مفتاح المرحلة إلى تعريفها المعياري."""
    normalized = STAGE_ALIASES.get(str(stage_ref or "").strip().lower())
    if not normalized:
        raise ValueError(f"مرجع المرحلة غير صالح: {stage_ref}")
    return STAGE_BY_KEY[normalized]


def _validate_human_actor(operator_name: str) -> str:
    cleaned = str(operator_name or "").strip()
    if len(cleaned) < 2:
        raise ValueError("اسم المشغل البشري مطلوب لإعادة تعيين المرحلة.")
    if cleaned.lower() in FORBIDDEN_ACTORS:
        raise ValueError("لا يُسمح بإعادة تعيين المرحلة آلياً؛ يلزم مشغل بشري.")
    return cleaned


def _stage_completion(org: Dict[str, Any], key: str) -> bool:
    if key == "intake":
        return bool(org.get("intake", {}).get("approved"))
    if key == "connection":
        sources = org.get("data_sources") or []
        return bool(sources) and all(src.get("status") == "connected" for src in sources)
    if key == "discovery":
        return org.get("discovery", {}).get("status") == "completed"
    if key == "domains":
        domains = org.get("domains") or []
        return bool(domains) and all(item.get("status") == "approved" for item in domains)
    if key == "concepts":
        concepts = org.get("concepts") or []
        return bool(concepts) and all(item.get("status") == "approved" for item in concepts)
    if key == "relationships":
        rels = org.get("relationships") or []
        return all(item.get("status") in {"approved", "rejected"} for item in rels) and bool(
            org.get("relationship_analysis", {}).get("completed_at")
            or org.get("discovery", {}).get("status") == "completed"
        )
    if key == "activation":
        return org.get("status") == "active"
    if key == "monitoring":
        return bool(org.get("monitoring", {}).get("last_checked_at"))
    if key == "schema":
        changes = org.get("schema_changes") or []
        return bool(org.get("semantic_sync", {}).get("last_synced_at")) or bool(
            changes and all(ch.get("status") != "pending" for ch in changes)
        )
    return False


def get_stage_reset_status(
    service: Any,
    organization_id: str,
) -> Dict[str, Any]:
    """عرض قابلية إعادة التعيين وحالة الاعتمادية التسلسلية للمراحل 0–8."""
    org = service.get_organization(organization_id)
    stages = []
    for meta in STAGES_ORDER:
        key = meta["key"]
        idx = meta["stage_number"]
        downstream = [s["key"] for s in STAGES_ORDER[idx + 1 :]]
        stages.append(
            {
                "stage_number": idx,
                "key": key,
                "title_ar": meta["title_ar"],
                "completed": _stage_completion(org, key),
                "downstream_stages": downstream,
                "can_reset": True,
            }
        )
    return {
        "organization_id": organization_id,
        "current_phase": org.get("current_phase"),
        "organization_status": org.get("status"),
        "stages": stages,
    }


def get_stage_reset_history(service: Any, organization_id: str) -> List[Dict[str, Any]]:
    org = service.get_organization(organization_id)
    return list(org.get("stage_reset_history") or [])


def reset_stage(
    service: Any,
    organization_id: str,
    stage_ref: str,
    operator_name: str,
    *,
    reason: str = "",
    confirm: bool = True,
) -> Dict[str, Any]:
    """إعادة تعيين مرحلة محددة مع تصفير جميع المراحل اللاحقة التابعة لها بأمان."""
    if not confirm:
        raise ValueError("يجب تأكيد عملية إعادة تعيين المرحلة صراحة (confirm=true).")
    actor = _validate_human_actor(operator_name)
    target = resolve_stage(stage_ref)
    target_num = target["stage_number"]
    target_key = target["key"]
    affected_keys = [s["key"] for s in STAGES_ORDER[target_num:]]

    def _apply(org: Dict[str, Any]) -> Dict[str, Any]:
        # مسح المراحل من الأدنى تبعيةً حسب target_num
        if target_num <= 0:
            org["intake"] = {"approved": False, "approved_at": None, "approved_by": None}
        if target_num <= 1:
            for src in org.get("data_sources", []):
                src["status"] = "pending"
                src["last_tested_at"] = None
                src["table_count"] = 0
        if target_num <= 2:
            org["physical_catalog"] = []
            org["discovery"] = {
                "status": "not_started",
                "progress": 0,
                "stage": "في انتظار بدء الاكتشاف",
                "started_at": None,
                "completed_at": None,
                "catalog_fingerprint": None,
                "structural_fingerprint": None,
                "ai_approved": False,
                "cancel_requested": False,
                "logs": [],
            }
        if target_num <= 3:
            org["domains"] = []
            org["domain_analysis"] = {
                "status": "idle",
                "progress": 0,
                "stage": "في انتظار تحليل النطاقات",
                "started_at": None,
                "completed_at": None,
                "metadata_version": None,
                "target_table_refs": [],
                "protected_table_refs": [],
                "stale_approved_table_refs": [],
                "assignments": [],
                "unclassified_table_refs": [],
                "conflicts": [],
                "overlapping_domains": [],
                "rejected_domains": [],
                "provenance": None,
            }
        if target_num <= 4:
            org["concepts"] = []
            org["semantic_enrichment"] = {"status": "idle", "last_run_at": None, "provider": None}
        if target_num <= 5:
            org["relationships"] = []
            org["relationship_analysis"] = {"status": "idle", "completed_at": None, "summary": {}}
        if target_num <= 6:
            org["status"] = "pending"
            org["activation"] = {"activated_at": None, "activated_by": None, "handover": None}
            org["approved_catalog_snapshot"] = None
        if target_num <= 7:
            org["monitoring"] = {
                "status": "not_available",
                "last_checked_at": None,
                "baseline_fingerprint": None,
                "current_fingerprint": None,
                "baseline_structural_fingerprint": None,
                "current_structural_fingerprint": None,
                "baseline_tables": 0,
                "current_tables": 0,
                "history": [],
                "snapshots": [],
                "async_job": {"status": "idle", "attempts": 0, "error": None},
            }
        if target_num <= 8:
            org["schema_changes"] = []
            org["semantic_sync"] = {"status": "idle", "last_synced_at": None, "history": []}

        # إلغاء صلاحية التصعيدات في المراحل المُصفّرة
        for esc in org.get("escalations", []):
            if esc.get("status") == "open":
                esc["status"] = "dismissed"
                esc["resolution_note"] = f"أُغلق تلقائياً بسبب إعادة تعيين المرحلة {target_key}."
                esc["resolved_at"] = _utc_now()
                esc["resolved_by"] = actor

        history = org.setdefault("stage_reset_history", [])
        history.append(
            {
                "id": str(uuid.uuid4())[:8],
                "target_stage": target_key,
                "target_stage_number": target_num,
                "affected_stages": affected_keys,
                "operator_name": actor,
                "reason": str(reason or "").strip(),
                "reset_at": _utc_now(),
            }
        )
        org["current_phase"] = target_key
        org["updated_at"] = _utc_now()
        org.setdefault("audit_logs", []).insert(
            0,
            {
                "id": str(uuid.uuid4())[:8],
                "action": "stage.reset",
                "actor": actor,
                "object_type": "stage",
                "object_id": target_key,
                "details": (
                    f"إعادة تعيين المرحلة {target['title_ar']} والمراحل التابعة "
                    f"({', '.join(affected_keys)})."
                ),
                "created_at": _utc_now(),
            },
        )
        return org

    return service.mutate_organization(organization_id, _apply)
