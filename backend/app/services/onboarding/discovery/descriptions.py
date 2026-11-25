"""توصيف عربي حتمي نقي بلا أي استدعاء لنموذج لغوي (Zero-LLM)."""

from __future__ import annotations

import hashlib
import re
from typing import Any, Iterable, Mapping

from .models import (
    DeclaredRelationshipMetadata,
    DescribedColumn,
    DescribedObject,
    ForeignKeyMetadata,
    IndexMetadata,
    KeyConstraintMetadata,
)

DESCRIPTION_RULES_VERSION = "bayan-deterministic-discovery-v1"

WORD_GLOSSARY = {
    "op": "النظام",
    "res": "المشترك",
    "partner": "جهة الاتصال",
    "partners": "جهات الاتصال",
    "batch": "الدفعة",
    "batches": "الدفعات",
    "subject": "المقرر",
    "subjects": "المقررات",
    "fees": "الرسوم",
    "fee": "الرسم",
    "details": "التفاصيل",
    "rel": "ربط",
    "roll": "القيد",
    "number": "رقم",
    "gender": "الجنس",
    "state": "الحالة",
    "paid": "المسدد",
    "stats": "الإحصاءات",
    "profile": "الملف الشخصي",
    "summary": "الملخص",
    "overview": "النظرة العامة",
    "active": "النشطة",
    "customer": "العميل",
    "customers": "العملاء",
    "branch": "الفرع",
    "branches": "الفروع",
    "product": "المنتج",
    "products": "المنتجات",
    "warehouse": "المستودع",
    "warehouses": "المستودعات",
    "supplier": "المورد",
    "suppliers": "الموردين",
    "employee": "الموظف",
    "employees": "الموظفين",
    "department": "القسم",
    "departments": "الأقسام",
    "faculty": "هيئة التدريس",
    "program": "البرنامج",
    "programs": "البرامج",
    "student": "الطالب",
    "students": "الطلاب",
    "instructor": "المحاضر",
    "instructors": "المحاضرين",
    "course": "البرنامج",
    "courses": "البرامج",
    "semester": "الفصل الدراسي",
    "semesters": "الفصول الدراسية",
    "section": "الشعبة",
    "sections": "الشعب",
    "enrollment": "التسجيل",
    "enrollments": "التسجيلات",
    "invoice": "الفاتورة",
    "invoices": "الفواتير",
    "payment": "الدفعة",
    "payments": "المدفوعات",
    "shipment": "الشحنة",
    "shipments": "الشحنات",
    "carrier": "الناقل",
    "carriers": "الناقلون",
    "driver": "السائق",
    "drivers": "السائقون",
    "route": "المسار",
    "routes": "المسارات",
    "stop": "المحطة",
    "stops": "المحطات",
    "delivery": "التسليم",
    "confirmation": "التأكيد",
    "confirmations": "التأكيدات",
    "order": "الطلب",
    "orders": "الطلبات",
    "item": "البند",
    "items": "البنود",
    "id": "المعرف",
    "code": "الرمز",
    "name": "الاسم",
    "title": "العنوان",
    "status": "الحالة",
    "date": "التاريخ",
    "amount": "المبلغ",
    "total": "الإجمالي",
    "outstanding": "المتأخرات",
    "count": "العدد",
    "quantity": "الكمية",
    "weight": "الوزن",
    "capacity": "السعة",
    "city": "المدينة",
    "region": "المنطقة",
    "email": "البريد الإلكتروني",
    "phone": "الهاتف",
    "notes": "الملاحظات",
    "created": "الإنشاء",
    "updated": "التحديث",
    "male": "الذكور",
    "female": "الإناث",
    "financial": "المالية",
    "dispatch": "الإرسال",
    "seq": "التسلسل",
}


def humanize_identifier_ar(name: str) -> str:
    """تحويل المعرّفات البرمجية إلى تسمية عربية واضحة وحتمية."""
    cleaned = re.sub(r"^v_", "", str(name or "").strip(), flags=re.IGNORECASE)
    parts = [part for part in re.split(r"[_\W]+", cleaned) if part]
    if not parts:
        return str(name or "عنصر")
    mapped = [WORD_GLOSSARY.get(part.lower()) for part in parts]
    if all(mapped):
        return " ".join(str(item) for item in mapped)
    return " ".join(WORD_GLOSSARY.get(part.lower(), part) for part in parts)


def infer_column_semantic_type(column: Mapping[str, Any]) -> str:
    """استنتاج الدور الدلالي للعمود حتمياً من بياناته الوصفية الفيزيائية."""
    name = str(column.get("name") or "").lower()
    data_type = str(column.get("data_type") or "").lower()
    if column.get("primary_key") or name == "id" or name.endswith("_id"):
        if column.get("foreign_key") and not column.get("primary_key"):
            return "foreign_key"
        return "identifier"
    if column.get("foreign_key"):
        return "foreign_key"
    if any(token in data_type for token in ("date", "time")) or name.endswith(
        ("_at", "_on", "_date")
    ):
        return "time_attribute"
    numeric = any(
        token in data_type
        for token in ("int", "decimal", "numeric", "real", "float", "double", "money")
    )
    if numeric and any(
        token in name
        for token in ("quantity", "qty", "amount", "total", "count", "balance", "weight", "mark")
    ):
        return "measure_additive"
    if numeric and any(
        token in name for token in ("price", "rate", "percent", "ratio", "cost", "fee")
    ):
        return "measure_non_additive"
    if numeric:
        return "measure_semi_additive"
    return "descriptive_attribute"


def infer_object_entity_type(table: Mapping[str, Any]) -> str:
    """تصنيف الدور البنيوي للجدول أو المشهد حتمياً."""
    if table.get("object_type") == "view":
        return "analytical_view"
    fk_count = len(table.get("foreign_keys", []))
    columns = table.get("columns", [])
    measure_count = sum(
        1 for col in columns if infer_column_semantic_type(col).startswith("measure_")
    )
    if fk_count >= 2 and len(columns) <= fk_count + 3:
        return "bridge"
    if fk_count and measure_count:
        return "fact"
    if fk_count:
        return "business_entity"
    return "dimension"


class DeterministicArabicDescriber:
    """توليد توصيفات عربية متطابقة 100% لنفس المخطط (COMMENT أولاً ثم القالب)."""

    rules_version = DESCRIPTION_RULES_VERSION

    def describe_object(self, table: Mapping[str, Any]) -> DescribedObject:
        object_type: str = "view" if table.get("object_type") == "view" else "table"
        schema = str(table.get("schema") or "public")
        name = str(table["name"])
        schema_qualified = str(table.get("schema_qualified_name") or f"{schema}.{name}")
        object_ref = str(table.get("object_ref") or f"SRC::{schema}::{name}")
        label_ar = humanize_identifier_ar(name)
        comment = str(table.get("comment") or "").strip()

        if comment:
            description_ar = f"تعليق المصدر الموثق: {comment}"
            description_source = "database_comment"
        else:
            kind_ar = "المشهد" if object_type == "view" else "الجدول"
            col_count = len(table.get("columns", []))
            fk_count = len(table.get("foreign_keys", []))
            fk_note = f" ويرتبط بـ {fk_count} مفتاح أجنبي معلن" if fk_count else ""
            description_ar = (
                f"وصف تقني حتمي ({self.rules_version}): {kind_ar} «{label_ar}» "
                f"({schema_qualified}) يحتوي على {col_count} عموداً{fk_note}."
            )
            description_source = "deterministic_template"

        described_cols = tuple(
            self.describe_column(column, table_label_ar=label_ar)
            for column in table.get("columns", [])
        )
        pks = tuple(
            KeyConstraintMetadata(
                name=str(k.get("name") or "PRIMARY"), columns=tuple(k.get("columns", []))
            )
            for k in table.get("primary_keys", [])
        )
        fks = tuple(
            ForeignKeyMetadata(
                name=str(k.get("name") or ""),
                columns=tuple(k.get("columns", [])),
                target_schema=str(k.get("target_schema") or schema),
                target_table=str(k.get("target_table") or ""),
                target_columns=tuple(k.get("target_columns", [])),
                source_table_ref=k.get("source_table_ref"),
                target_table_ref=k.get("target_table_ref"),
                declared=bool(k.get("declared", True)),
            )
            for k in table.get("foreign_keys", [])
        )
        uqs = tuple(
            KeyConstraintMetadata(
                name=str(u.get("name") or ""), columns=tuple(u.get("columns", []))
            )
            for u in table.get("unique_constraints", [])
        )
        idxs = tuple(
            IndexMetadata(
                name=str(ix.get("name") or ""),
                columns=tuple(ix.get("columns", [])),
                unique=bool(ix.get("unique", False)),
                primary=bool(ix.get("primary", False)),
            )
            for ix in table.get("indexes", [])
        )
        return DescribedObject(
            object_ref=object_ref,
            schema=schema,
            name=name,
            schema_qualified_name=schema_qualified,
            object_type="view" if object_type == "view" else "table",
            label_ar=label_ar,
            description_ar=description_ar,
            entity_type=infer_object_entity_type(table),
            description_source=description_source,
            approximate_row_count=table.get("approximate_row_count"),
            fingerprint=str(table.get("fingerprint") or ""),
            columns=described_cols,
            primary_keys=pks,
            foreign_keys=fks,
            unique_constraints=uqs,
            indexes=idxs,
            dependencies=tuple(table.get("dependencies", [])),
            structural_fingerprint=str(table.get("structural_fingerprint") or ""),
            stats_fingerprint=str(table.get("stats_fingerprint") or ""),
            semantic_fingerprint=str(table.get("semantic_fingerprint") or ""),
        )

    def describe_column(
        self,
        column: Mapping[str, Any],
        *,
        table_label_ar: str,
    ) -> DescribedColumn:
        name = str(column["name"])
        data_type = str(column.get("data_type") or "unknown")
        label_ar = humanize_identifier_ar(name)
        comment = str(column.get("comment") or "").strip()

        if comment:
            description_ar = f"تعليق المصدر الموثق: {comment}"
            description_source = "database_comment"
        else:
            role_notes = []
            if column.get("primary_key"):
                role_notes.append("مفتاح أساسي")
            if column.get("foreign_key"):
                role_notes.append("مفتاح أجنبي")
            if column.get("unique"):
                role_notes.append("قيد فريد")
            role_suffix = f" ({'، '.join(role_notes)})" if role_notes else ""
            description_ar = (
                f"وصف تقني حتمي ({self.rules_version}): الحقل «{label_ar}» في «{table_label_ar}» "
                f"نوعه {data_type}{role_suffix}."
            )
            description_source = "deterministic_template"

        return DescribedColumn(
            object_ref=str(column.get("object_ref") or name),
            name=name,
            data_type=data_type,
            nullable=bool(column.get("nullable", True)),
            primary_key=bool(column.get("primary_key", False)),
            foreign_key=bool(column.get("foreign_key", False)),
            unique=bool(column.get("unique", False)),
            label_ar=label_ar,
            description_ar=description_ar,
            semantic_type=infer_column_semantic_type(column),
            description_source=description_source,
            fingerprint=str(column.get("fingerprint") or ""),
            structural_fingerprint=str(column.get("structural_fingerprint") or ""),
        )

    def build_declared_relationships(
        self,
        tables: Iterable[Mapping[str, Any]],
    ) -> tuple[DeclaredRelationshipMetadata, ...]:
        table_list = list(tables)
        label_by_ref = {
            str(t["object_ref"]): humanize_identifier_ar(str(t["name"]))
            for t in table_list
            if t.get("object_ref")
        }
        table_by_key = {
            (str(t.get("source_id") or ""), str(t.get("schema") or ""), str(t["name"])): t
            for t in table_list
        }
        relationships: list[DeclaredRelationshipMetadata] = []
        seen_signatures: set[str] = set()
        for table in table_list:
            src_ref = str(table["object_ref"])
            src_schema = str(table.get("schema") or "")
            src_qualified = str(
                table.get("schema_qualified_name") or f"{src_schema}.{table['name']}"
            )
            src_label = label_by_ref.get(src_ref, table["name"])
            for fk in table.get("foreign_keys", []):
                src_cols = tuple(str(c) for c in fk.get("columns", []) if c)
                tgt_schema = str(fk.get("target_schema") or src_schema)
                tgt_name = str(fk.get("target_table") or "")
                tgt_cols = tuple(str(c) for c in fk.get("target_columns", []) if c)
                target_table = table_by_key.get(
                    (str(table.get("source_id") or ""), tgt_schema, tgt_name)
                )
                tgt_ref = (
                    str(target_table["object_ref"]) if target_table else fk.get("target_table_ref")
                )
                tgt_qualified = f"{tgt_schema}.{tgt_name}" if tgt_schema else tgt_name
                tgt_label = label_by_ref.get(str(tgt_ref or ""), humanize_identifier_ar(tgt_name))
                constraint = str(fk.get("name") or f"fk_{table['name']}_{'_'.join(src_cols)}")
                sig_raw = (
                    f"declared:{src_ref}:{'+'.join(src_cols)}->"
                    f"{tgt_ref or tgt_qualified}:{'+'.join(tgt_cols)}"
                )
                if sig_raw in seen_signatures:
                    continue
                seen_signatures.add(sig_raw)
                digest = hashlib.sha256(sig_raw.encode("utf-8")).hexdigest()[:14]
                composite_note = " (مفتاح أجنبي مركب)" if len(src_cols) > 1 else ""
                relationships.append(
                    DeclaredRelationshipMetadata(
                        signature=f"rel-decl-{digest}",
                        constraint_name=constraint,
                        source_table_ref=src_ref,
                        source_table=src_qualified,
                        source_columns=src_cols,
                        target_table_ref=str(tgt_ref) if tgt_ref else None,
                        target_table=tgt_qualified,
                        target_columns=tgt_cols,
                        business_label_ar=f"يرتبط «{src_label}» بـ «{tgt_label}»{composite_note}",
                        rationale_ar=(
                            f"علاقة مفتاح أجنبي معلنة في القاعدة ({constraint}): "
                            f"{src_qualified}({', '.join(src_cols)}) → "
                            f"{tgt_qualified}({', '.join(tgt_cols)})."
                        ),
                    )
                )
        return tuple(relationships)
