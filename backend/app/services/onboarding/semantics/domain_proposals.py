"""تحقق وتطبيع اقتراحات النطاقات الدلالية في المرحلة 3 استناداً إلى المخطط المكتشف فقط."""

from __future__ import annotations

import re
from typing import Any, Dict, Iterable, List, Optional, Tuple

ARABIC_RE = re.compile(r"[\u0600-\u06FF]")


class DomainProposalValidationError(ValueError):
    """مخرج AI للنطاقات غير متسق أو غير مسند ببيانات حقيقية من الكتالوج الفيزيائي."""


def _slug_key(value: str, fallback: str = "domain") -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9_]+", "_", str(value or "").strip().lower()).strip("_")
    return cleaned or fallback


def _has_arabic(value: Optional[str]) -> bool:
    return bool(value and ARABIC_RE.search(str(value)))


def _similarity_tokens(text: str) -> set[str]:
    return {
        token
        for token in re.split(r"[^A-Za-z0-9\u0600-\u06FF]+", str(text or "").lower())
        if len(token) >= 2
    }


def _detect_overlaps(domains: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    overlaps: List[Dict[str, Any]] = []
    seen: set[Tuple[str, str]] = set()
    for index, left in enumerate(domains):
        left_tokens = _similarity_tokens(f"{left.get('name_ar', '')} {left.get('description', '')}")
        left_prefixes = {
            str(ref).split("::")[-1].split(".")[-1].split("_")[0].lower()
            for ref in left.get("table_refs", [])
            if ref
        }
        for right in domains[index + 1 :]:
            right_tokens = _similarity_tokens(
                f"{right.get('name_ar', '')} {right.get('description', '')}"
            )
            right_prefixes = {
                str(ref).split("::")[-1].split(".")[-1].split("_")[0].lower()
                for ref in right.get("table_refs", [])
                if ref
            }
            shared_tokens = left_tokens & right_tokens
            union_tokens = left_tokens | right_tokens
            token_ratio = (len(shared_tokens) / len(union_tokens)) if union_tokens else 0.0
            shared_prefixes = {p for p in (left_prefixes & right_prefixes) if len(p) >= 3}
            if (len(shared_tokens) >= 2 and token_ratio >= 0.45) or shared_prefixes:
                pair = tuple(sorted((left["key"], right["key"])))
                if pair not in seen:
                    seen.add(pair)
                    overlaps.append(
                        {
                            "domain_keys": list(pair),
                            "reason_ar": "تشابه لغوي أو اشتراك في بادئة أسماء الكائنات الفيزيائية.",
                            "source": "deterministic_similarity",
                        }
                    )
    return overlaps


def normalize_domain_analysis(
    parsed_payload: Dict[str, Any],
    *,
    target_tables: Iterable[Dict[str, Any]],
    declared_relationship_refs: Iterable[str] = (),
    existing_domains: Iterable[Dict[str, Any]] = (),
    rejected_domain_keys: Iterable[str] = (),
    confidence_threshold: float = 0.72,
) -> Dict[str, Any]:
    """تطبيع مخرجات AI للنطاقات مع رفض أي إسناد غير موجود في المخطط الفعلي."""
    tables_list = list(target_tables)
    table_by_ref = {table["object_ref"]: table for table in tables_list if table.get("object_ref")}
    valid_column_refs: Dict[str, set[str]] = {
        table_ref: {
            str(col.get("object_ref") or f"{table_ref}::{col.get('name', '')}")
            for col in table.get("columns", [])
        }
        for table_ref, table in table_by_ref.items()
    }
    valid_rel_refs = {str(item) for item in declared_relationship_refs if item}
    rejected_keys = {str(key).strip().lower() for key in rejected_domain_keys if key}

    raw_domains = list(parsed_payload.get("domains") or [])
    raw_assignments = list(parsed_payload.get("assignments") or [])
    if not raw_domains and not raw_assignments and tables_list:
        raise DomainProposalValidationError("أرجع مزود AI قائمة فارغة للنطاقات والتصنيفات.")

    existing_by_key = {
        _slug_key(item.get("key") or item.get("name_ar") or ""): item
        for item in existing_domains
        if item.get("key") or item.get("name_ar")
    }

    normalized_domains: Dict[str, Dict[str, Any]] = {}
    for raw in raw_domains:
        name_ar = str(raw.get("name_ar") or raw.get("suggested_name_ar") or "").strip()
        desc_ar = str(raw.get("description_ar") or raw.get("description") or "").strip()
        if not _has_arabic(name_ar) or not _has_arabic(desc_ar):
            raise DomainProposalValidationError("يجب أن يتضمن كل نطاق اسماً ووصفاً بالعربية الفصحى.")
        key = _slug_key(str(raw.get("key") or name_ar))
        if key in rejected_keys:
            key = f"{key}_proposed"
        if key in normalized_domains:
            raise DomainProposalValidationError(f"تعارض مفتاح نطاق مكرر في مخرج AI: {key}")
        confidence = float(raw.get("confidence", 0.75))
        if not 0.0 <= confidence <= 1.0:
            raise DomainProposalValidationError(f"ثقة النطاق خارج النطاق [0..1]: {confidence}")
        evidence = [str(item).strip() for item in raw.get("evidence") or [] if str(item).strip()]
        normalized_domains[key] = {
            "key": key,
            "name_ar": name_ar,
            "description": desc_ar,
            "confidence": round(confidence, 4),
            "evidence": evidence,
            "table_refs": [],
            "reuses_existing": key in existing_by_key,
        }

    assignments_by_ref: Dict[str, Dict[str, Any]] = {}
    conflicts: List[Dict[str, Any]] = []
    unclassified_refs: List[str] = []
    seen_conflict_tables: set[str] = set()

    for raw in raw_assignments:
        table_ref = str(raw.get("table_ref") or "").strip()
        if table_ref not in table_by_ref:
            raise DomainProposalValidationError(f"أسند مخرج AI مرجع جدول غير موجود: {table_ref}")
        if table_ref in assignments_by_ref:
            raise DomainProposalValidationError(
                f"أرجع مخرج AI أكثر من تصنيف واحد لنفس الجدول: {table_ref}"
            )

        reasoning_ar = str(raw.get("reasoning_ar") or "").strip()
        if not _has_arabic(reasoning_ar):
            raise DomainProposalValidationError(f"ينقص تفسير عربي مسند لتصنيف الجدول: {table_ref}")
        confidence = float(raw.get("confidence", 0.0))
        if not 0.0 <= confidence <= 1.0:
            raise DomainProposalValidationError(f"ثقة التصنيف خارج النطاق [0..1]: {confidence}")

        column_refs = [
            str(item).strip() for item in raw.get("column_refs") or [] if str(item).strip()
        ]
        bad_cols = [ref for ref in column_refs if ref not in valid_column_refs[table_ref]]
        if bad_cols:
            raise DomainProposalValidationError(
                f"مرجع عمود غير موجود في {table_ref}: {bad_cols[0]}"
            )

        rel_refs = [
            str(item).strip() for item in raw.get("relationship_refs") or [] if str(item).strip()
        ]
        if valid_rel_refs:
            bad_rels = [ref for ref in rel_refs if ref not in valid_rel_refs]
            if bad_rels:
                raise DomainProposalValidationError(
                    f"مرجع علاقة غير موجود في المخطط: {bad_rels[0]}"
                )

        evidence = [str(item).strip() for item in raw.get("evidence") or [] if str(item).strip()]
        raw_domain_key = raw.get("domain_key")
        domain_key = _slug_key(str(raw_domain_key)) if raw_domain_key else None
        if domain_key and domain_key not in normalized_domains:
            if domain_key in existing_by_key:
                existing = existing_by_key[domain_key]
                normalized_domains[domain_key] = {
                    "key": domain_key,
                    "name_ar": existing.get("name_ar") or domain_key,
                    "description": existing.get("description")
                    or existing.get("suggested_description")
                    or "",
                    "confidence": round(confidence, 4),
                    "evidence": evidence,
                    "table_refs": [],
                    "reuses_existing": True,
                }
            else:
                raise DomainProposalValidationError(
                    f"أسند AI الجدول إلى نطاق غير معرّف: {domain_key}"
                )

        if domain_key is None or confidence < confidence_threshold:
            unclassified_refs.append(table_ref)
        else:
            normalized_domains[domain_key]["table_refs"].append(table_ref)

        assignments_by_ref[table_ref] = {
            "table_ref": table_ref,
            "table_name": table_by_ref[table_ref]["name"],
            "domain_key": domain_key if confidence >= confidence_threshold else None,
            "proposed_domain_key": domain_key,
            "confidence": round(confidence, 4),
            "reasoning_ar": reasoning_ar,
            "evidence": evidence,
            "column_refs": column_refs,
            "relationship_refs": rel_refs,
            "status": "suggested"
            if (domain_key and confidence >= confidence_threshold)
            else "unresolved",
        }

    for table in tables_list:
        tref = table["object_ref"]
        if tref not in assignments_by_ref:
            unclassified_refs.append(tref)
            assignments_by_ref[tref] = {
                "table_ref": tref,
                "table_name": table["name"],
                "domain_key": None,
                "proposed_domain_key": None,
                "confidence": 0.0,
                "reasoning_ar": "لم يصدر تصنيف مستقر لهذا الكائن؛ يلزم التخصيص البشري.",
                "evidence": [],
                "column_refs": [],
                "relationship_refs": [],
                "status": "unresolved",
            }

    for conflict in parsed_payload.get("conflicts") or []:
        tref = str(conflict.get("table_ref") or "").strip()
        if tref not in table_by_ref or tref in seen_conflict_tables:
            continue
        seen_conflict_tables.add(tref)
        c_keys = [
            _slug_key(str(k))
            for k in conflict.get("candidate_domain_keys") or []
            if _slug_key(str(k)) in normalized_domains
        ]
        if len(c_keys) >= 2:
            conflicts.append(
                {
                    "table_ref": tref,
                    "table_name": table_by_ref[tref]["name"],
                    "candidate_domain_keys": c_keys,
                    "reason": str(
                        conflict.get("reason_ar") or conflict.get("reason") or "تداخل بين نطاقين."
                    ),
                    "status": "open",
                }
            )

    overlaps = _detect_overlaps(list(normalized_domains.values()))
    return {
        "domains": list(normalized_domains.values()),
        "assignments": list(assignments_by_ref.values()),
        "unclassified_table_refs": sorted(set(unclassified_refs)),
        "conflicts": conflicts,
        "overlapping_domains": overlaps,
    }
