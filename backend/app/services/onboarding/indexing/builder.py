"""بناء القيود والسجلات الدلالية من مخرجات الاكتشاف الحتمي (PR-1 -> PR-2)."""

from __future__ import annotations

import re
from typing import Any, Iterable, Mapping

from app.services.onboarding.discovery.models import (
    DeclaredRelationshipMetadata,
    DescribedObject,
    DiscoveryReport,
)

from .fingerprints import entry_content_hash, semantic_entry_id
from .models import SemanticEntry, validate_safe_semantic_payload

DEFAULT_SPRINT1_CLASSIFICATION = "public"
DEFAULT_CATALOG_VERSION = "catalog-v2-sprint1"


def _extract_concepts(text: str, *, technical_name: str, label_ar: str) -> tuple[str, ...]:
    """استخلاص كلمات ومفاهيم عربية مفتاحية بحتمية كاملة (Zero-LLM)."""
    tokens: list[str] = []
    for source in (label_ar, text):
        cleaned = re.sub(r"[^\w\u0600-\u06FF\s]", " ", source)
        for token in cleaned.split():
            norm = token.strip()
            if len(norm) >= 2 and norm not in {
                "بيان",
                "وصف",
                "تقني",
                "حتمي",
                "تعليق",
                "المصدر",
                "الموثق",
                "الجدول",
                "المشهد",
                "الحقل",
                "يحتوي",
                "على",
                "نوعه",
                "لكل",
                "في",
                "من",
                "بـ",
            }:
                tokens.append(norm)
    if label_ar.strip():
        tokens.insert(0, label_ar.strip())
    if technical_name.strip():
        tokens.append(technical_name.strip())
    return tuple(dict.fromkeys(tokens))[:24]


def _approx_ar_type(data_type: str) -> str:
    dt = data_type.lower()
    if any(k in dt for k in ("int", "numeric", "decimal", "real", "double", "float", "money")):
        return "رقم"
    if "bool" in dt:
        return "منطقي"
    if any(k in dt for k in ("date", "time", "interval")):
        return "تاريخ"
    return "نص"


class SemanticEntryBuilder:
    """تحويل تقرير الاكتشاف الحتمي إلى عناصر فهرس دلالي جاهزة للتضمين."""

    def __init__(
        self,
        *,
        catalog_version: str = DEFAULT_CATALOG_VERSION,
        default_classification: str = DEFAULT_SPRINT1_CLASSIFICATION,
    ):
        self.catalog_version = catalog_version
        self.default_classification = default_classification

    def build_from_report(
        self,
        report: DiscoveryReport,
        *,
        tenant_id: str,
        source_id: str,
        embedding_config_id: str,
        approved_semantics: Mapping[str, Mapping[str, Any]] | None = None,
    ) -> list[SemanticEntry]:
        """توليد السجلات الدلالية المرتبة والمحكومة من تقرير الاكتشاف."""
        if not tenant_id.strip():
            raise ValueError("tenant_id إلزامي لبناء السجلات الدلالية.")
        if not source_id.strip():
            raise ValueError("source_id إلزامي لبناء السجلات الدلالية.")

        semantics_map = approved_semantics or {}
        entries: list[SemanticEntry] = []
        concept_buckets: dict[str, dict[str, Any]] = {}

        for obj in sorted(report.objects, key=lambda o: o.schema_qualified_name):
            override = semantics_map.get(obj.schema_qualified_name, {})
            classification = str(
                override.get("classification") or self.default_classification
            ).lower()
            if classification == "blacklist":
                continue

            entry_type = "view" if obj.object_type == "view" else "table"
            obj_entry = self._build_object_entry(
                obj,
                tenant_id=tenant_id,
                source_id=source_id,
                entry_type=entry_type,
                classification=classification,
                embedding_config_id=embedding_config_id,
                rules_version=report.rules_version,
                override=override,
            )
            entries.append(obj_entry)

            for col in obj.columns:
                col_entry = self._build_column_entry(
                    obj=obj,
                    col=col,
                    tenant_id=tenant_id,
                    source_id=source_id,
                    classification=classification,
                    embedding_config_id=embedding_config_id,
                    rules_version=report.rules_version,
                )
                entries.append(col_entry)

            for concept in obj_entry.concepts:
                if any("\u0600" <= ch <= "\u06ff" for ch in concept):
                    bucket = concept_buckets.setdefault(
                        concept,
                        {"refs": [], "descriptions": []},
                    )
                    bucket["refs"].append(obj.schema_qualified_name)
                    bucket["descriptions"].append(obj_entry.label_ar)

        for rel in sorted(report.relationships, key=lambda r: r.signature):
            entries.append(
                self._build_relationship_entry(
                    rel=rel,
                    tenant_id=tenant_id,
                    source_id=source_id,
                    embedding_config_id=embedding_config_id,
                    rules_version=report.rules_version,
                )
            )

        for term, info in sorted(concept_buckets.items()):
            entries.append(
                self._build_concept_entry(
                    term=term,
                    linked_objects=sorted(set(info["refs"])),
                    labels=sorted(set(info["descriptions"])),
                    tenant_id=tenant_id,
                    source_id=source_id,
                    embedding_config_id=embedding_config_id,
                    rules_version=report.rules_version,
                )
            )

        entries.sort(
            key=lambda e: (e.entry_type, e.schema_qualified_name, e.technical_name, e.entry_id)
        )
        return entries

    def _build_object_entry(
        self,
        obj: DescribedObject,
        *,
        tenant_id: str,
        source_id: str,
        entry_type: str,
        classification: str,
        embedding_config_id: str,
        rules_version: str,
        override: Mapping[str, Any],
    ) -> SemanticEntry:
        label_ar = str(override.get("label_ar") or obj.label_ar)
        description_ar = str(override.get("description_ar") or obj.description_ar)
        synonyms = tuple(str(s) for s in override.get("synonyms", ()))
        concepts = tuple(
            dict.fromkeys(
                [
                    *(str(c) for c in override.get("concepts", ())),
                    *_extract_concepts(
                        description_ar,
                        technical_name=obj.name,
                        label_ar=label_ar,
                    ),
                ]
            )
        )
        columns_meta = [
            {
                "name": col.name,
                "data_type": col.data_type,
                "ar_type": _approx_ar_type(col.data_type),
                "label_ar": col.label_ar,
                "description_ar": col.description_ar,
                "semantic_type": col.semantic_type,
                "description_source": col.description_source,
                "primary_key": col.primary_key,
                "foreign_key": col.foreign_key,
            }
            for col in obj.columns
        ]
        col_names_text = " ".join(f"{c['name']} {c['label_ar']}" for c in columns_meta)
        searchable_text = (
            f"{'مشهد' if entry_type == 'view' else 'جدول'}: {obj.schema_qualified_name} "
            f"| {label_ar} | {description_ar} | المفاهيم: {' '.join(concepts)} | "
            f"الأعمدة: {col_names_text}"
        ).strip()
        metadata_payload: dict[str, Any] = {
            "schema": obj.schema,
            "name": obj.name,
            "schema_qualified_name": obj.schema_qualified_name,
            "object_type": obj.object_type,
            "entity_type": obj.entity_type,
            "concepts": list(concepts),
            "synonyms": list(synonyms),
            "columns": columns_meta,
            "dependencies": list(obj.dependencies),
            "catalog_source": "semantic_v2",
        }
        validate_safe_semantic_payload(
            searchable_text=searchable_text,
            metadata_payload=metadata_payload,
        )
        meta_fp = obj.structural_fingerprint or obj.fingerprint
        return SemanticEntry(
            entry_id=semantic_entry_id(
                tenant_id=tenant_id,
                source_id=source_id,
                entry_type=entry_type,
                object_ref=obj.object_ref,
            ),
            tenant_id=tenant_id,
            source_id=source_id,
            schema_name=obj.schema,
            schema_qualified_name=obj.schema_qualified_name,
            object_ref=obj.object_ref,
            entry_type=entry_type,  # type: ignore[arg-type]
            technical_name=obj.name,
            label_ar=label_ar,
            description_ar=description_ar,
            description_source=obj.description_source,
            classification=classification,
            concepts=concepts,
            synonyms=synonyms,
            searchable_text=searchable_text,
            metadata_payload=metadata_payload,
            metadata_fingerprint=meta_fp,
            content_hash=entry_content_hash(
                searchable_text=searchable_text,
                metadata_payload=metadata_payload,
                metadata_fingerprint=meta_fp,
                embedding_config_id=embedding_config_id,
                classification=classification,
            ),
            embedding_config_id=embedding_config_id,
            catalog_version=self.catalog_version,
            rules_version=rules_version,
        )

    def _build_column_entry(
        self,
        *,
        obj: DescribedObject,
        col: Any,
        tenant_id: str,
        source_id: str,
        classification: str,
        embedding_config_id: str,
        rules_version: str,
    ) -> SemanticEntry:
        concepts = _extract_concepts(
            col.description_ar,
            technical_name=col.name,
            label_ar=col.label_ar,
        )
        searchable_text = (
            f"عمود: {obj.schema_qualified_name}.{col.name} | {col.label_ar} | "
            f"{col.description_ar} | النوع: {col.data_type}"
        ).strip()
        metadata_payload: dict[str, Any] = {
            "schema": obj.schema,
            "parent_object": obj.schema_qualified_name,
            "parent_type": obj.object_type,
            "column_name": col.name,
            "data_type": col.data_type,
            "ar_type": _approx_ar_type(col.data_type),
            "semantic_type": col.semantic_type,
            "primary_key": col.primary_key,
            "foreign_key": col.foreign_key,
            "nullable": col.nullable,
        }
        validate_safe_semantic_payload(
            searchable_text=searchable_text,
            metadata_payload=metadata_payload,
        )
        meta_fp = col.structural_fingerprint or col.fingerprint
        return SemanticEntry(
            entry_id=semantic_entry_id(
                tenant_id=tenant_id,
                source_id=source_id,
                entry_type="column",
                object_ref=col.object_ref,
            ),
            tenant_id=tenant_id,
            source_id=source_id,
            schema_name=obj.schema,
            schema_qualified_name=obj.schema_qualified_name,
            object_ref=col.object_ref,
            entry_type="column",
            technical_name=f"{obj.name}.{col.name}",
            label_ar=col.label_ar,
            description_ar=col.description_ar,
            description_source=col.description_source,
            classification=classification,
            concepts=concepts,
            synonyms=(),
            searchable_text=searchable_text,
            metadata_payload=metadata_payload,
            metadata_fingerprint=meta_fp,
            content_hash=entry_content_hash(
                searchable_text=searchable_text,
                metadata_payload=metadata_payload,
                metadata_fingerprint=meta_fp,
                embedding_config_id=embedding_config_id,
                classification=classification,
            ),
            embedding_config_id=embedding_config_id,
            catalog_version=self.catalog_version,
            rules_version=rules_version,
        )

    def _build_relationship_entry(
        self,
        *,
        rel: DeclaredRelationshipMetadata,
        tenant_id: str,
        source_id: str,
        embedding_config_id: str,
        rules_version: str,
    ) -> SemanticEntry:
        schema_name = rel.source_table.split(".", 1)[0] if "." in rel.source_table else "public"
        searchable_text = (
            f"علاقة: {rel.constraint_name} | {rel.business_label_ar} | {rel.rationale_ar}"
        ).strip()
        metadata_payload: dict[str, Any] = {
            "signature": rel.signature,
            "constraint_name": rel.constraint_name,
            "source_table": rel.source_table,
            "source_columns": list(rel.source_columns),
            "target_table": rel.target_table,
            "target_columns": list(rel.target_columns),
            "origin": rel.origin,
            "source_fact": rel.source_fact,
        }
        validate_safe_semantic_payload(
            searchable_text=searchable_text,
            metadata_payload=metadata_payload,
        )
        return SemanticEntry(
            entry_id=semantic_entry_id(
                tenant_id=tenant_id,
                source_id=source_id,
                entry_type="relationship",
                object_ref=rel.signature,
            ),
            tenant_id=tenant_id,
            source_id=source_id,
            schema_name=schema_name,
            schema_qualified_name=rel.source_table,
            object_ref=rel.signature,
            entry_type="relationship",
            technical_name=rel.constraint_name,
            label_ar=rel.business_label_ar,
            description_ar=rel.rationale_ar,
            description_source="database_foreign_key",
            classification=self.default_classification,
            concepts=(rel.business_label_ar, rel.constraint_name),
            synonyms=(),
            searchable_text=searchable_text,
            metadata_payload=metadata_payload,
            metadata_fingerprint=rel.signature,
            content_hash=entry_content_hash(
                searchable_text=searchable_text,
                metadata_payload=metadata_payload,
                metadata_fingerprint=rel.signature,
                embedding_config_id=embedding_config_id,
                classification=self.default_classification,
            ),
            embedding_config_id=embedding_config_id,
            catalog_version=self.catalog_version,
            rules_version=rules_version,
        )

    def _build_concept_entry(
        self,
        *,
        term: str,
        linked_objects: Iterable[str],
        labels: Iterable[str],
        tenant_id: str,
        source_id: str,
        embedding_config_id: str,
        rules_version: str,
    ) -> SemanticEntry:
        objs = list(linked_objects)
        lbls = list(labels)
        first_schema = objs[0].split(".", 1)[0] if objs and "." in objs[0] else "public"
        description_ar = f"مصطلح عربي مرتبط بالكائنات ({'، '.join(lbls[:4])}) ضمن المخطط المكتشف."
        searchable_text = f"مفهوم: {term} | {description_ar} | المراجع: {' '.join(objs)}"
        metadata_payload: dict[str, Any] = {
            "term": term,
            "linked_objects": objs,
            "labels": lbls,
        }
        validate_safe_semantic_payload(
            searchable_text=searchable_text,
            metadata_payload=metadata_payload,
        )
        obj_ref = f"{source_id}::concept::{term}"
        return SemanticEntry(
            entry_id=semantic_entry_id(
                tenant_id=tenant_id,
                source_id=source_id,
                entry_type="concept",
                object_ref=obj_ref,
            ),
            tenant_id=tenant_id,
            source_id=source_id,
            schema_name=first_schema,
            schema_qualified_name=first_schema,
            object_ref=obj_ref,
            entry_type="concept",
            technical_name=term,
            label_ar=term,
            description_ar=description_ar,
            description_source="deterministic_concept",
            classification=self.default_classification,
            concepts=(term,),
            synonyms=tuple(lbls),
            searchable_text=searchable_text,
            metadata_payload=metadata_payload,
            metadata_fingerprint=obj_ref,
            content_hash=entry_content_hash(
                searchable_text=searchable_text,
                metadata_payload=metadata_payload,
                metadata_fingerprint=obj_ref,
                embedding_config_id=embedding_config_id,
                classification=self.default_classification,
            ),
            embedding_config_id=embedding_config_id,
            catalog_version=self.catalog_version,
            rules_version=rules_version,
        )
