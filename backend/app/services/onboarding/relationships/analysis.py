"""خدمة تحليل العلاقات الفيزيائية والدلالية (المرحلة 5) مع التفريق الصارم للمصدر والحوكمة."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Iterable, List, Optional, Tuple

from pydantic import BaseModel, ConfigDict, Field

from app.services.onboarding.semantics.ai_gateway import AIServiceError, StructuredAIGateway

VALID_CARDINALITIES = {"one_to_one", "one_to_many", "many_to_one", "many_to_many", "unknown"}


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


class RelationshipValidationError(ValueError):
    """خطأ إدخال أو ربط غير متسق في تحليل العلاقات."""


class RelationshipConflictError(RuntimeError):
    """تعارض في حالة المراجعة أو الاعتماد."""


class _AICandidateJudgment(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    candidate_key: str = Field(min_length=3, max_length=300)
    relationship_type: str = Field(min_length=2, max_length=60)
    cardinality: str = Field(min_length=3, max_length=40)
    label_ar: str = Field(min_length=2, max_length=240, pattern=r"[\u0600-\u06FF]")
    rationale_ar: str = Field(min_length=4, max_length=1200, pattern=r"[\u0600-\u06FF]")
    confidence: float = Field(ge=0, le=1)


class AIRelationshipBatchResponse(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    relationships: List[_AICandidateJudgment] = Field(default_factory=list, max_length=100)


def _signature(source_refs: Iterable[str], target_refs: Iterable[str]) -> str:
    left = "|".join(sorted(str(x) for x in source_refs))
    right = "|".join(sorted(str(x) for x in target_refs))
    return f"{left}->{right}"


def _column_lookup(
    tables: List[Dict[str, Any]],
) -> Tuple[Dict[str, Dict[str, Any]], Dict[str, Dict[str, Any]]]:
    table_map: Dict[str, Dict[str, Any]] = {}
    col_map: Dict[str, Dict[str, Any]] = {}
    for tbl in tables:
        tref = tbl.get("object_ref")
        if not tref:
            continue
        table_map[tref] = tbl
        for col in tbl.get("columns", []):
            cref = col.get("object_ref") or f"{tref}::{col.get('name', '')}"
            col_map[cref] = {**col, "table_ref": tref, "table_name": tbl.get("name", "")}
    return table_map, col_map


def _normalize_fk_name(col_name: str) -> str:
    low = col_name.lower()
    for suffix in ("_id", "_key", "_code", "_fk", "_no"):
        if low.endswith(suffix) and len(low) > len(suffix):
            return low[: -len(suffix)]
    return ""


class RelationshipAnalysisService:
    """المرحلة 5: اكتشاف المرشحين + التمييز الصارم بين المعلن والمستنتج واليدوي."""

    def __init__(
        self,
        workflow_service: Any,
        *,
        ai_gateway: Optional[StructuredAIGateway] = None,
    ):
        self.workflow = workflow_service
        self.ai_gateway = ai_gateway

    def get_summary(self, organization_id: str) -> Dict[str, Any]:
        org = self.workflow.get_organization(organization_id)
        rels = list(org.get("relationships") or [])
        declared = [r for r in rels if r.get("origin") == "declared"]
        inferred = [r for r in rels if r.get("origin") == "ai_inferred"]
        manual = [r for r in rels if r.get("origin") == "manual"]
        approved = [r for r in rels if r.get("status") == "approved"]
        pending = [r for r in rels if r.get("status") in {"pending", "escalated"}]
        rejected = [r for r in rels if r.get("status") == "rejected"]
        return {
            "organization_id": organization_id,
            "total": len(rels),
            "declared_count": len(declared),
            "ai_inferred_count": len(inferred),
            "manual_count": len(manual),
            "approved_count": len(approved),
            "pending_count": len(pending),
            "rejected_count": len(rejected),
            "composite_count": sum(1 for r in rels if r.get("is_composite")),
            "analysis": org.get("relationship_analysis") or {},
            "relationships": rels,
        }

    def generate_candidates(
        self,
        organization_id: str,
        *,
        operator_name: str = "مشغل التهيئة",
        approve_external_ai: bool = False,
        use_ai: bool = False,
    ) -> Dict[str, Any]:
        """توليد مرشحي العلاقات غير المعلنة حتمياً وبشكل اختياري إثراؤها عبر بوابة AI الموحدة."""
        org = self.workflow.get_organization(organization_id)
        tables = list(org.get("physical_catalog") or [])
        if not tables:
            raise RelationshipValidationError("لا توجد بيانات فيزيائية مكتشفة لتوليد علاقات.")

        existing = list(org.get("relationships") or [])
        existing_sigs = {
            _signature(r.get("source_column_refs", []), r.get("target_column_refs", []))
            for r in existing
            if r.get("source_column_refs") and r.get("target_column_refs")
        }

        table_map, col_map = _column_lookup(tables)
        # بناء فهرس للمفاتيح الأساسية
        pk_targets: Dict[str, Tuple[str, str, Dict[str, Any]]] = {}
        for tbl in tables:
            tname = str(tbl.get("name") or "").lower()
            tref = tbl["object_ref"]
            pk_cols = [c for c in tbl.get("columns", []) if c.get("primary_key")]
            if len(pk_cols) == 1:
                pk_col = pk_cols[0]
                pk_ref = pk_col.get("object_ref") or f"{tref}::{pk_col['name']}"
                for variant in {tname, tname.rstrip("s"), f"{tname}s"}:
                    if variant:
                        pk_targets[variant] = (tref, pk_ref, pk_col)

        candidates: List[Dict[str, Any]] = []
        seen_sigs = set(existing_sigs)

        for tbl in tables:
            src_ref = tbl["object_ref"]
            for col in tbl.get("columns", []):
                if col.get("primary_key"):
                    continue
                cname = str(col.get("name") or "")
                stem = _normalize_fk_name(cname)
                if not stem:
                    continue
                target_entry = pk_targets.get(stem) or pk_targets.get(f"{stem}s")
                if not target_entry:
                    continue
                tgt_tref, tgt_cref, tgt_col = target_entry
                if tgt_tref == src_ref:
                    continue
                src_cref = col.get("object_ref") or f"{src_ref}::{cname}"
                sig = _signature([src_cref], [tgt_cref])
                if sig in seen_sigs:
                    continue
                seen_sigs.add(sig)
                tgt_tbl = table_map[tgt_tref]
                candidates.append(
                    {
                        "candidate_key": (
                            f"{tbl['name']}.{cname}->{tgt_tbl['name']}.{tgt_col['name']}"
                        ),
                        "source_table": tbl["name"],
                        "source_table_ref": src_ref,
                        "source_column": cname,
                        "source_column_refs": [src_cref],
                        "target_table": tgt_tbl["name"],
                        "target_table_ref": tgt_tref,
                        "target_column": tgt_col["name"],
                        "target_column_refs": [tgt_cref],
                        "cardinality": "many_to_one",
                        "confidence": 0.78,
                        "label_ar": (
                            f"ربط {tbl.get('label_ar') or tbl['name']}"
                            f" بـ {tgt_tbl.get('label_ar') or tgt_tbl['name']}"
                        ),
                        "rationale_ar": (
                            f"تطابق تسمية العمود '{cname}' مع المفتاح الأساسي في "
                            f"'{tgt_tbl['name']}.{tgt_col['name']}'."
                        ),
                    }
                )

        if use_ai and approve_external_ai and self.ai_gateway is not None and candidates:
            try:
                result = self.ai_gateway.generate_structured(
                    system_prompt=(
                        "أنت محلل نماذج بيانات عربية. قيّم مرشحي العلاقات "
                        "الوصفية فقط بدون أي صفوف فعلية."
                    ),
                    user_payload={"candidates": candidates[:40]},
                    response_model=AIRelationshipBatchResponse,
                    role="analyst",
                )
                ai_map = {
                    item["candidate_key"]: item
                    for item in (result.parsed.get("relationships") or [])
                }
                for cand in candidates:
                    ai_item = ai_map.get(cand["candidate_key"])
                    if ai_item:
                        cand["label_ar"] = ai_item["label_ar"]
                        cand["rationale_ar"] = ai_item["rationale_ar"]
                        cand["confidence"] = float(ai_item["confidence"])
                        if ai_item["cardinality"] in VALID_CARDINALITIES:
                            cand["cardinality"] = ai_item["cardinality"]
            except AIServiceError:
                pass

        new_rels: List[Dict[str, Any]] = []
        for cand in candidates:
            new_rels.append(
                {
                    "id": f"rel-{str(uuid.uuid4())[:8]}",
                    "origin": "ai_inferred",
                    "status": "pending",
                    "constraint_name": None,
                    "source_table": cand["source_table"],
                    "source_table_ref": cand["source_table_ref"],
                    "source_column": cand["source_column"],
                    "source_column_refs": cand["source_column_refs"],
                    "target_table": cand["target_table"],
                    "target_table_ref": cand["target_table_ref"],
                    "target_column": cand["target_column"],
                    "target_column_refs": cand["target_column_refs"],
                    "is_composite": False,
                    "cardinality": cand["cardinality"],
                    "confidence": cand["confidence"],
                    "label": cand["label_ar"],
                    "rationale": cand["rationale_ar"],
                    "evidence": [cand["rationale_ar"]],
                    "history": [],
                }
            )

        def _apply(state_org: Dict[str, Any]) -> Dict[str, Any]:
            state_org.setdefault("relationships", []).extend(new_rels)
            state_org["relationship_analysis"] = {
                "status": "completed",
                "completed_at": _utc_now(),
                "generated_candidates": len(new_rels),
                "ai_assisted": bool(use_ai and approve_external_ai),
            }
            state_org["updated_at"] = _utc_now()
            state_org.setdefault("audit_logs", []).insert(
                0,
                {
                    "id": str(uuid.uuid4())[:8],
                    "action": "relationships.analyzed",
                    "actor": operator_name,
                    "object_type": "relationship_analysis",
                    "object_id": organization_id,
                    "details": (
                        f"تحليل العلاقات وإضافة {len(new_rels)} مرشحاً دلالياً "
                        "للمراجعة البشرية."
                    ),
                    "created_at": _utc_now(),
                },
            )
            return state_org

        self.workflow.mutate_organization(organization_id, _apply)
        return self.get_summary(organization_id)

    def review_relationship(
        self,
        organization_id: str,
        relationship_id: str,
        *,
        decision: str,
        operator_name: str,
        note: str = "",
    ) -> Dict[str, Any]:
        """اعتماد أو رفض أو تصعيد علاقة من طرف المشغل البشري فقط."""
        normalized = str(decision or "").strip().lower()
        if normalized not in {"approve", "approved", "reject", "rejected", "escalate", "escalated"}:
            raise RelationshipValidationError(
                "قرار المراجعة يجب أن يكون approve أو reject أو escalate."
            )
        status_map = {
            "approve": "approved",
            "approved": "approved",
            "reject": "rejected",
            "rejected": "rejected",
            "escalate": "escalated",
            "escalated": "escalated",
        }
        target_status = status_map[normalized]

        def _apply(org: Dict[str, Any]) -> Dict[str, Any]:
            rels = org.get("relationships") or []
            target = next((r for r in rels if r.get("id") == relationship_id), None)
            if target is None:
                raise KeyError(f"العلاقة غير موجودة: {relationship_id}")
            target["status"] = target_status
            target["reviewed_by"] = operator_name
            target["reviewed_at"] = _utc_now()
            if note.strip():
                target["review_note"] = note.strip()
            target.setdefault("history", []).append(
                {
                    "status": target_status,
                    "operator": operator_name,
                    "note": note.strip(),
                    "at": _utc_now(),
                }
            )
            if target_status == "escalated":
                org.setdefault("escalations", []).append(
                    {
                        "id": f"esc-{str(uuid.uuid4())[:8]}",
                        "category": "relationship",
                        "subject": target.get("label") or relationship_id,
                        "reason": note.strip() or "تتطلب مراجعة خبير النمذجة.",
                        "related_id": relationship_id,
                        "status": "open",
                        "created_at": _utc_now(),
                        "created_by": operator_name,
                    }
                )
            org["updated_at"] = _utc_now()
            org.setdefault("audit_logs", []).insert(
                0,
                {
                    "id": str(uuid.uuid4())[:8],
                    "action": f"relationship.{target_status}",
                    "actor": operator_name,
                    "object_type": "relationship",
                    "object_id": relationship_id,
                    "details": note.strip() or f"تحديث حالة العلاقة إلى {target_status}.",
                    "created_at": _utc_now(),
                },
            )
            return org

        self.workflow.mutate_organization(organization_id, _apply)
        return self.get_summary(organization_id)

    def create_manual_relationship(
        self,
        organization_id: str,
        *,
        source_column_refs: List[str],
        target_column_refs: List[str],
        cardinality: str,
        label: str,
        rationale: str,
        operator_name: str,
    ) -> Dict[str, Any]:
        """إنشاء علاقة يدوية (بسيطة أو مركبة) وتثبيتها بأعمدة حقيقية من الكتالوج الفيزيائي."""
        if not source_column_refs or len(source_column_refs) != len(target_column_refs):
            raise RelationshipValidationError(
                "يجب تطابق عدد أعمدة المصدر والهدف لإنشاء علاقة صحيحة."
            )
        if cardinality not in VALID_CARDINALITIES:
            raise RelationshipValidationError("نوع التعددية غير مدعوم.")

        org = self.workflow.get_organization(organization_id)
        table_map, col_map = _column_lookup(list(org.get("physical_catalog") or []))
        for ref in [*source_column_refs, *target_column_refs]:
            if ref not in col_map:
                raise RelationshipValidationError(f"مرجع العمود غير موجود في الكتالوج: {ref}")

        src_first = col_map[source_column_refs[0]]
        tgt_first = col_map[target_column_refs[0]]
        rel_obj = {
            "id": f"rel-{str(uuid.uuid4())[:8]}",
            "origin": "manual",
            "status": "approved",
            "constraint_name": None,
            "source_table": src_first["table_name"],
            "source_table_ref": src_first["table_ref"],
            "source_column": ", ".join(col_map[r]["name"] for r in source_column_refs),
            "source_column_refs": list(source_column_refs),
            "target_table": tgt_first["table_name"],
            "target_table_ref": tgt_first["table_ref"],
            "target_column": ", ".join(col_map[r]["name"] for r in target_column_refs),
            "target_column_refs": list(target_column_refs),
            "is_composite": len(source_column_refs) > 1,
            "cardinality": cardinality,
            "confidence": 1.0,
            "label": str(label).strip(),
            "rationale": str(rationale).strip(),
            "evidence": ["إضافة يدوية معتمدة من المشغل البشري"],
            "created_by": operator_name,
            "created_at": _utc_now(),
            "reviewed_by": operator_name,
            "reviewed_at": _utc_now(),
            "history": [],
        }

        def _apply(state_org: Dict[str, Any]) -> Dict[str, Any]:
            state_org.setdefault("relationships", []).append(rel_obj)
            state_org["updated_at"] = _utc_now()
            state_org.setdefault("audit_logs", []).insert(
                0,
                {
                    "id": str(uuid.uuid4())[:8],
                    "action": "relationship.manual_created",
                    "actor": operator_name,
                    "object_type": "relationship",
                    "object_id": rel_obj["id"],
                    "details": f"إضافة علاقة يدوية: {rel_obj['label']}",
                    "created_at": _utc_now(),
                },
            )
            return state_org

        self.workflow.mutate_organization(organization_id, _apply)
        return self.get_summary(organization_id)

    def edit_relationship(
        self,
        organization_id: str,
        relationship_id: str,
        *,
        label: Optional[str] = None,
        rationale: Optional[str] = None,
        cardinality: Optional[str] = None,
        operator_name: str = "مشغل التهيئة",
    ) -> Dict[str, Any]:
        if cardinality is not None and cardinality not in VALID_CARDINALITIES:
            raise RelationshipValidationError("نوع التعددية غير مدعوم.")

        def _apply(org: Dict[str, Any]) -> Dict[str, Any]:
            target = next(
                (r for r in (org.get("relationships") or []) if r.get("id") == relationship_id),
                None,
            )
            if target is None:
                raise KeyError(f"العلاقة غير موجودة: {relationship_id}")
            if label is not None and label.strip():
                target["label"] = label.strip()
            if rationale is not None and rationale.strip():
                target["rationale"] = rationale.strip()
            if cardinality is not None:
                target["cardinality"] = cardinality
            target["modified_by"] = operator_name
            target["modified_at"] = _utc_now()
            org["updated_at"] = _utc_now()
            return org

        self.workflow.mutate_organization(organization_id, _apply)
        return self.get_summary(organization_id)
