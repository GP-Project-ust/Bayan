"""اختبارات PR-1 لاستبطان PostgreSQL العام وقراءة المخططين دون تعديل الكود."""

from __future__ import annotations

import re
from pathlib import Path
from typing import Any

import pytest

from app.core.config import Settings
from app.services.onboarding.discovery import (
    DiscoveryPipeline,
    PostgresConnectionSettings,
    PostgresIntrospectionError,
    PostgresIntrospector,
)

REPO_ROOT = Path(__file__).resolve().parents[2]
UNIVERSITY_DIR = REPO_ROOT / "database" / "university_demo"
LOGISTICS_DIR = REPO_ROOT / "database" / "fixtures" / "logistics_demo"


class InMemoryPostgresCursor:
    """محاكي استعلامات ``information_schema`` و``pg_catalog`` للاختبارات الوحدوية."""

    def __init__(self, catalog: dict[str, Any], *, transaction_read_only: str = "on"):
        self.catalog = catalog
        self.transaction_read_only = transaction_read_only
        self._rows: list[tuple[Any, ...]] = []

    def __enter__(self) -> InMemoryPostgresCursor:
        return self

    def __exit__(self, exc_type, exc, tb) -> None:
        return None

    def execute(self, query: str, params: tuple[Any, ...] = ()) -> None:
        normalized = " ".join(query.split())
        if normalized == "SHOW transaction_read_only":
            self._rows = [(self.transaction_read_only,)]
            return
        if "FROM information_schema.schemata" in normalized:
            schemas = sorted(
                {obj["schema"] for obj in self.catalog["objects"]}
                - {"pg_catalog", "information_schema"}
            )
            self._rows = [(s,) for s in schemas]
            return
        if "FROM information_schema.tables" in normalized:
            target_schemas = (
                list(params[0]) if isinstance(params[0], (list, tuple)) else [params[0]]
            )
            rows = []
            for obj in self.catalog["objects"]:
                if obj["schema"] in target_schemas:
                    t_type = "VIEW" if obj["object_type"] == "view" else "BASE TABLE"
                    rows.append((obj["schema"], obj["name"], t_type))
            rows.sort(key=lambda r: (r[0], r[2], r[1]))
            self._rows = rows
            return

        schema_name = str(params[0]) if len(params) >= 1 else ""
        table_name = str(params[1]) if len(params) >= 2 else ""
        obj = next(
            (
                o
                for o in self.catalog["objects"]
                if o["schema"] == schema_name and o["name"] == table_name
            ),
            None,
        )
        if obj is None:
            self._rows = []
            return

        if "FROM information_schema.columns" in normalized:
            self._rows = [
                (
                    col["name"],
                    col["data_type"],
                    "YES" if col.get("nullable", True) else "NO",
                    col.get("default"),
                    col["ordinal_position"],
                )
                for col in sorted(obj["columns"], key=lambda c: c["ordinal_position"])
            ]
        elif "pg_catalog.format_type" in normalized:
            self._rows = [
                (
                    col["name"],
                    col.get("comment"),
                    col.get("formatted_type") or col["data_type"],
                )
                for col in obj["columns"]
            ]
        elif "obj_description(" in normalized:
            self._rows = [(obj.get("comment"),)]
        elif "c.reltuples" in normalized:
            rel = obj.get("reltuples")
            self._rows = [(None if rel is not None and rel < 0 else rel,)]
        elif "tc.constraint_type = 'PRIMARY KEY'" in normalized:
            self._rows = [
                (pk["name"], col_name, idx)
                for pk in obj.get("primary_keys", [])
                for idx, col_name in enumerate(pk["columns"], start=1)
            ]
        elif "tc.constraint_type = 'UNIQUE'" in normalized:
            self._rows = [
                (uq["name"], col_name, idx)
                for uq in obj.get("unique_constraints", [])
                for idx, col_name in enumerate(uq["columns"], start=1)
            ]
        elif "tc.constraint_type = 'FOREIGN KEY'" in normalized:
            rows = []
            for fk in obj.get("foreign_keys", []):
                for idx, (scol, tcol) in enumerate(
                    zip(fk["columns"], fk["target_columns"], strict=True), start=1
                ):
                    rows.append(
                        (fk["name"], scol, fk["target_schema"], fk["target_table"], tcol, idx)
                    )
            self._rows = rows
        elif "FROM information_schema.view_table_usage" in normalized:
            self._rows = [tuple(dep.split(".", 1)) for dep in obj.get("dependencies", [])]
        elif "FROM pg_catalog.pg_index" in normalized:
            self._rows = [
                (ix["name"], col_name, ix["unique"], ix["primary"], idx)
                for ix in obj.get("indexes", [])
                for idx, col_name in enumerate(ix["columns"], start=1)
            ]
        else:
            self._rows = []

    def fetchall(self) -> list[tuple[Any, ...]]:
        return list(self._rows)

    def fetchone(self) -> tuple[Any, ...] | None:
        return self._rows[0] if self._rows else None


class InMemoryPostgresConnection:
    """اتصال محاكى يوثق تنفيذ rollback دون تعديل قاعدة العميل."""

    def __init__(self, catalog: dict[str, Any], *, transaction_read_only: str = "on"):
        self.catalog = catalog
        self.transaction_read_only = transaction_read_only
        self.rolled_back = False

    def __enter__(self) -> InMemoryPostgresConnection:
        return self

    def __exit__(self, exc_type, exc, tb) -> None:
        return None

    def cursor(self) -> InMemoryPostgresCursor:
        return InMemoryPostgresCursor(
            self.catalog, transaction_read_only=self.transaction_read_only
        )

    def rollback(self) -> None:
        self.rolled_back = True


def _official_university_catalog() -> dict[str, Any]:
    """بناء كتالوج الجامعة المحاكى مطابقاً حرفياً لملفات database/university_demo/ الرسمية."""
    return {
        "objects": [
            {
                "schema": "public",
                "name": "op_department",
                "object_type": "table",
                "comment": "بيان (توافق OpenEduCat): الأقسام الأكاديمية بالجامعة",
                "reltuples": 6,
                "columns": [
                    {
                        "name": "id",
                        "data_type": "integer",
                        "nullable": False,
                        "default": "nextval('op_department_id_seq'::regclass)",
                        "ordinal_position": 1,
                    },
                    {
                        "name": "name",
                        "data_type": "character varying",
                        "nullable": False,
                        "ordinal_position": 2,
                        "comment": "اسم القسم الأكاديمي بالعربية",
                    },
                    {
                        "name": "code",
                        "data_type": "character varying",
                        "nullable": False,
                        "ordinal_position": 3,
                        "comment": "رمز القسم اللاتيني المختصر",
                    },
                ],
                "primary_keys": [{"name": "op_department_pkey", "columns": ["id"]}],
                "unique_constraints": [{"name": "op_department_code_key", "columns": ["code"]}],
                "foreign_keys": [],
                "indexes": [
                    {
                        "name": "op_department_pkey",
                        "columns": ["id"],
                        "unique": True,
                        "primary": True,
                    }
                ],
            },
            {
                "schema": "public",
                "name": "res_partner",
                "object_type": "table",
                "comment": (
                    "بيان (توافق Odoo): جهات الاتصال — الأسماء وبيانات التواصل للطلاب وهيئة التدريس"
                ),
                "reltuples": 560,
                "columns": [
                    {
                        "name": "id",
                        "data_type": "integer",
                        "nullable": False,
                        "ordinal_position": 1,
                    },
                    {
                        "name": "name",
                        "data_type": "character varying",
                        "nullable": False,
                        "ordinal_position": 2,
                        "comment": "الاسم الكامل (اسم أب عائلة)",
                    },
                    {
                        "name": "email",
                        "data_type": "character varying",
                        "nullable": True,
                        "ordinal_position": 3,
                        "comment": "البريد الإلكتروني الجامعي",
                    },
                    {
                        "name": "phone",
                        "data_type": "character varying",
                        "nullable": True,
                        "ordinal_position": 4,
                        "comment": "رقم الهاتف بصيغة دولية يمنية",
                    },
                    {
                        "name": "city",
                        "data_type": "character varying",
                        "nullable": True,
                        "ordinal_position": 5,
                        "comment": "مدينة السكن (مدن يمنية)",
                    },
                ],
                "primary_keys": [{"name": "res_partner_pkey", "columns": ["id"]}],
                "unique_constraints": [],
                "foreign_keys": [],
                "indexes": [
                    {
                        "name": "res_partner_city_idx",
                        "columns": ["city"],
                        "unique": False,
                        "primary": False,
                    }
                ],
            },
            {
                "schema": "public",
                "name": "op_course",
                "object_type": "table",
                "comment": (
                    "بيان (توافق OpenEduCat): البرامج الأكاديمية — "
                    "«الدورة/Course» تعني برنامج التخرج"
                ),
                "reltuples": 6,
                "columns": [
                    {
                        "name": "id",
                        "data_type": "integer",
                        "nullable": False,
                        "ordinal_position": 1,
                    },
                    {
                        "name": "name",
                        "data_type": "character varying",
                        "nullable": False,
                        "ordinal_position": 2,
                        "comment": "اسم البرنامج الأكاديمي بالعربية",
                    },
                    {
                        "name": "code",
                        "data_type": "character varying",
                        "nullable": False,
                        "ordinal_position": 3,
                        "comment": "رمز البرنامج اللاتيني المختصر",
                    },
                ],
                "primary_keys": [{"name": "op_course_pkey", "columns": ["id"]}],
                "unique_constraints": [{"name": "op_course_code_key", "columns": ["code"]}],
                "foreign_keys": [],
                "indexes": [],
            },
            {
                "schema": "public",
                "name": "op_batch",
                "object_type": "table",
                "comment": "بيان (توافق OpenEduCat): دفعات القبول — لكل برنامج دفعة في كل سنة",
                "reltuples": 30,
                "columns": [
                    {
                        "name": "id",
                        "data_type": "integer",
                        "nullable": False,
                        "ordinal_position": 1,
                    },
                    {
                        "name": "name",
                        "data_type": "character varying",
                        "nullable": False,
                        "ordinal_position": 2,
                        "comment": "اسم الدفعة (سنة القبول)",
                    },
                    {
                        "name": "course_id",
                        "data_type": "integer",
                        "nullable": False,
                        "ordinal_position": 3,
                        "comment": "معرّف البرنامج (op_course.id)",
                    },
                ],
                "primary_keys": [{"name": "op_batch_pkey", "columns": ["id"]}],
                "unique_constraints": [
                    {"name": "op_batch_course_id_name_key", "columns": ["course_id", "name"]}
                ],
                "foreign_keys": [
                    {
                        "name": "op_batch_course_id_fkey",
                        "columns": ["course_id"],
                        "target_schema": "public",
                        "target_table": "op_course",
                        "target_columns": ["id"],
                    }
                ],
                "indexes": [],
            },
            {
                "schema": "public",
                "name": "op_student",
                "object_type": "table",
                "comment": (
                    "بيان (توافق OpenEduCat): سجلات قيد الطلاب — بيانات الهوية الأكاديمية فقط"
                ),
                "reltuples": 500,
                "columns": [
                    {
                        "name": "id",
                        "data_type": "integer",
                        "nullable": False,
                        "ordinal_position": 1,
                    },
                    {
                        "name": "roll_number",
                        "data_type": "character varying",
                        "nullable": False,
                        "ordinal_position": 2,
                        "comment": "رقم القيد الجامعي بصيغة YUxxxxxxx",
                    },
                    {
                        "name": "partner_id",
                        "data_type": "integer",
                        "nullable": False,
                        "ordinal_position": 3,
                        "comment": "معرّف جهة الاتصال (res_partner.id)",
                    },
                    {
                        "name": "course_id",
                        "data_type": "integer",
                        "nullable": False,
                        "ordinal_position": 4,
                        "comment": "معرّف البرنامج (op_course.id)",
                    },
                    {
                        "name": "batch_id",
                        "data_type": "integer",
                        "nullable": False,
                        "ordinal_position": 5,
                        "comment": "معرّف الدفعة (op_batch.id)",
                    },
                    {
                        "name": "gender",
                        "data_type": "character varying",
                        "nullable": False,
                        "ordinal_position": 6,
                        "comment": "الجنس (ذكر / أنثى)",
                    },
                ],
                "primary_keys": [{"name": "op_student_pkey", "columns": ["id"]}],
                "unique_constraints": [
                    {"name": "op_student_roll_number_key", "columns": ["roll_number"]}
                ],
                "foreign_keys": [
                    {
                        "name": "op_student_partner_id_fkey",
                        "columns": ["partner_id"],
                        "target_schema": "public",
                        "target_table": "res_partner",
                        "target_columns": ["id"],
                    },
                    {
                        "name": "op_student_course_id_fkey",
                        "columns": ["course_id"],
                        "target_schema": "public",
                        "target_table": "op_course",
                        "target_columns": ["id"],
                    },
                    {
                        "name": "op_student_batch_id_fkey",
                        "columns": ["batch_id"],
                        "target_schema": "public",
                        "target_table": "op_batch",
                        "target_columns": ["id"],
                    },
                ],
                "indexes": [],
            },
            {
                "schema": "public",
                "name": "op_faculty",
                "object_type": "table",
                "comment": "بيان (توافق OpenEduCat): أعضاء هيئة التدريس",
                "reltuples": 60,
                "columns": [
                    {
                        "name": "id",
                        "data_type": "integer",
                        "nullable": False,
                        "ordinal_position": 1,
                    },
                    {
                        "name": "partner_id",
                        "data_type": "integer",
                        "nullable": False,
                        "ordinal_position": 2,
                    },
                    {
                        "name": "department_id",
                        "data_type": "integer",
                        "nullable": False,
                        "ordinal_position": 3,
                    },
                ],
                "primary_keys": [{"name": "op_faculty_pkey", "columns": ["id"]}],
                "unique_constraints": [],
                "foreign_keys": [
                    {
                        "name": "op_faculty_partner_id_fkey",
                        "columns": ["partner_id"],
                        "target_schema": "public",
                        "target_table": "res_partner",
                        "target_columns": ["id"],
                    },
                    {
                        "name": "op_faculty_department_id_fkey",
                        "columns": ["department_id"],
                        "target_schema": "public",
                        "target_table": "op_department",
                        "target_columns": ["id"],
                    },
                ],
                "indexes": [],
            },
            {
                "schema": "public",
                "name": "op_student_fees_details",
                "object_type": "table",
                "comment": "بيان (توافق OpenEduCat): سطور رسوم الطلاب لكل فصل دراسي",
                "reltuples": 1200,
                "columns": [
                    {
                        "name": "id",
                        "data_type": "integer",
                        "nullable": False,
                        "ordinal_position": 1,
                    },
                    {
                        "name": "student_id",
                        "data_type": "integer",
                        "nullable": False,
                        "ordinal_position": 2,
                    },
                    {
                        "name": "amount",
                        "data_type": "numeric",
                        "nullable": False,
                        "ordinal_position": 3,
                    },
                    {
                        "name": "paid_amount",
                        "data_type": "numeric",
                        "nullable": False,
                        "default": "0",
                        "ordinal_position": 4,
                    },
                    {"name": "date", "data_type": "date", "nullable": False, "ordinal_position": 5},
                    {
                        "name": "state",
                        "data_type": "character varying",
                        "nullable": False,
                        "ordinal_position": 6,
                    },
                ],
                "primary_keys": [{"name": "op_student_fees_details_pkey", "columns": ["id"]}],
                "unique_constraints": [],
                "foreign_keys": [
                    {
                        "name": "op_student_fees_details_student_id_fkey",
                        "columns": ["student_id"],
                        "target_schema": "public",
                        "target_table": "op_student",
                        "target_columns": ["id"],
                    }
                ],
                "indexes": [],
            },
            {
                "schema": "public",
                "name": "op_subject",
                "object_type": "table",
                "comment": "بيان (توافق OpenEduCat): المقررات الدراسية ضمن كل برنامج",
                "reltuples": 24,
                "columns": [
                    {
                        "name": "id",
                        "data_type": "integer",
                        "nullable": False,
                        "ordinal_position": 1,
                    },
                    {
                        "name": "code",
                        "data_type": "character varying",
                        "nullable": False,
                        "ordinal_position": 2,
                    },
                    {
                        "name": "name",
                        "data_type": "character varying",
                        "nullable": False,
                        "ordinal_position": 3,
                    },
                    {
                        "name": "course_id",
                        "data_type": "integer",
                        "nullable": False,
                        "ordinal_position": 4,
                    },
                ],
                "primary_keys": [{"name": "op_subject_pkey", "columns": ["id"]}],
                "unique_constraints": [{"name": "op_subject_code_key", "columns": ["code"]}],
                "foreign_keys": [
                    {
                        "name": "op_subject_course_id_fkey",
                        "columns": ["course_id"],
                        "target_schema": "public",
                        "target_table": "op_course",
                        "target_columns": ["id"],
                    }
                ],
                "indexes": [],
            },
            {
                "schema": "public",
                "name": "op_student_course_rel",
                "object_type": "table",
                "comment": "بيان (نمط OpenEduCat _rel): تسجيل الطلاب في المقررات",
                "reltuples": 2000,
                "columns": [
                    {
                        "name": "student_id",
                        "data_type": "integer",
                        "nullable": False,
                        "ordinal_position": 1,
                    },
                    {
                        "name": "subject_id",
                        "data_type": "integer",
                        "nullable": False,
                        "ordinal_position": 2,
                    },
                ],
                "primary_keys": [
                    {"name": "op_student_course_rel_pkey", "columns": ["student_id", "subject_id"]}
                ],
                "unique_constraints": [],
                "foreign_keys": [
                    {
                        "name": "op_student_course_rel_student_id_fkey",
                        "columns": ["student_id"],
                        "target_schema": "public",
                        "target_table": "op_student",
                        "target_columns": ["id"],
                    },
                    {
                        "name": "op_student_course_rel_subject_id_fkey",
                        "columns": ["subject_id"],
                        "target_schema": "public",
                        "target_table": "op_subject",
                        "target_columns": ["id"],
                    },
                ],
                "indexes": [],
            },
            {
                "schema": "public",
                "name": "v_student_profile",
                "object_type": "view",
                "comment": (
                    "بيان: الملف الشخصي للطالب — رقم القيد والاسم والتواصل والبرنامج والدفعة"
                ),
                "dependencies": [
                    "public.op_batch",
                    "public.op_course",
                    "public.op_student",
                    "public.res_partner",
                ],
                "columns": [
                    {"name": "student_id", "data_type": "integer", "ordinal_position": 1},
                    {
                        "name": "roll_number",
                        "data_type": "character varying",
                        "ordinal_position": 2,
                    },
                    {
                        "name": "student_name",
                        "data_type": "character varying",
                        "ordinal_position": 3,
                    },
                    {"name": "email", "data_type": "character varying", "ordinal_position": 4},
                    {"name": "phone", "data_type": "character varying", "ordinal_position": 5},
                    {"name": "city", "data_type": "character varying", "ordinal_position": 6},
                    {
                        "name": "program_name",
                        "data_type": "character varying",
                        "ordinal_position": 7,
                    },
                    {
                        "name": "batch_name",
                        "data_type": "character varying",
                        "ordinal_position": 8,
                    },
                    {"name": "gender", "data_type": "character varying", "ordinal_position": 9},
                ],
                "primary_keys": [],
                "foreign_keys": [],
                "unique_constraints": [],
                "indexes": [],
            },
            {
                "schema": "public",
                "name": "v_fees_summary",
                "object_type": "view",
                "comment": "بيان: ملخص الرسوم والمتأخرات لكل طالب",
                "dependencies": [
                    "public.op_course",
                    "public.op_student",
                    "public.op_student_fees_details",
                    "public.res_partner",
                ],
                "columns": [
                    {
                        "name": "roll_number",
                        "data_type": "character varying",
                        "ordinal_position": 1,
                    },
                    {
                        "name": "student_name",
                        "data_type": "character varying",
                        "ordinal_position": 2,
                    },
                    {
                        "name": "program_name",
                        "data_type": "character varying",
                        "ordinal_position": 3,
                    },
                    {"name": "total_amount", "data_type": "numeric", "ordinal_position": 4},
                    {"name": "total_paid", "data_type": "numeric", "ordinal_position": 5},
                    {"name": "outstanding", "data_type": "numeric", "ordinal_position": 6},
                ],
                "primary_keys": [],
                "foreign_keys": [],
                "unique_constraints": [],
                "indexes": [],
            },
            {
                "schema": "public",
                "name": "v_program_stats",
                "object_type": "view",
                "comment": (
                    "بيان: إحصاءات الطلاب لكل برنامج ودفعة — العدد الكلي وتوزيعه حسب الجنس"
                ),
                "dependencies": [
                    "public.op_batch",
                    "public.op_course",
                    "public.op_student",
                ],
                "columns": [
                    {
                        "name": "program_code",
                        "data_type": "character varying",
                        "ordinal_position": 1,
                    },
                    {
                        "name": "program_name",
                        "data_type": "character varying",
                        "ordinal_position": 2,
                    },
                    {
                        "name": "batch_name",
                        "data_type": "character varying",
                        "ordinal_position": 3,
                    },
                    {"name": "student_count", "data_type": "bigint", "ordinal_position": 4},
                    {"name": "male_count", "data_type": "bigint", "ordinal_position": 5},
                    {"name": "female_count", "data_type": "bigint", "ordinal_position": 6},
                ],
                "primary_keys": [],
                "foreign_keys": [],
                "unique_constraints": [],
                "indexes": [],
            },
        ]
    }


def _logistics_catalog() -> dict[str, Any]:
    """كتالوج fixture اللوجستيات المستقلة (6 جداول + مشهدان + 6 مفاتيح أجنبية)."""
    return {
        "objects": [
            {
                "schema": "logistics",
                "name": "warehouses",
                "object_type": "table",
                "comment": "المستودعات ومراكز التوزيع اللوجستية.",
                "reltuples": 3,
                "columns": [
                    {
                        "name": "warehouse_id",
                        "data_type": "integer",
                        "nullable": False,
                        "ordinal_position": 1,
                        "comment": "المعرف الرقمي الفريد للمستودع.",
                    },
                    {
                        "name": "warehouse_code",
                        "data_type": "character varying",
                        "nullable": False,
                        "ordinal_position": 2,
                    },
                    {
                        "name": "warehouse_name",
                        "data_type": "character varying",
                        "nullable": False,
                        "ordinal_position": 3,
                        "comment": "الاسم المعتمد للمستودع.",
                    },
                    {
                        "name": "city",
                        "data_type": "character varying",
                        "nullable": False,
                        "ordinal_position": 4,
                    },
                ],
                "primary_keys": [{"name": "warehouses_pkey", "columns": ["warehouse_id"]}],
                "unique_constraints": [
                    {"name": "warehouses_warehouse_code_key", "columns": ["warehouse_code"]}
                ],
                "foreign_keys": [],
                "indexes": [],
            },
            {
                "schema": "logistics",
                "name": "carriers",
                "object_type": "table",
                "comment": "شركات النقل والتوصيل المتعاقد معها.",
                "reltuples": 2,
                "columns": [
                    {
                        "name": "carrier_id",
                        "data_type": "integer",
                        "nullable": False,
                        "ordinal_position": 1,
                    },
                    {
                        "name": "carrier_code",
                        "data_type": "character varying",
                        "nullable": False,
                        "ordinal_position": 2,
                    },
                    {
                        "name": "carrier_name",
                        "data_type": "character varying",
                        "nullable": False,
                        "ordinal_position": 3,
                    },
                ],
                "primary_keys": [{"name": "carriers_pkey", "columns": ["carrier_id"]}],
                "unique_constraints": [
                    {"name": "carriers_carrier_code_key", "columns": ["carrier_code"]}
                ],
                "foreign_keys": [],
                "indexes": [],
            },
            {
                "schema": "logistics",
                "name": "drivers",
                "object_type": "table",
                "comment": None,
                "reltuples": 3,
                "columns": [
                    {
                        "name": "driver_id",
                        "data_type": "integer",
                        "nullable": False,
                        "ordinal_position": 1,
                    },
                    {
                        "name": "carrier_id",
                        "data_type": "integer",
                        "nullable": False,
                        "ordinal_position": 2,
                    },
                    {
                        "name": "license_number",
                        "data_type": "character varying",
                        "nullable": False,
                        "ordinal_position": 3,
                    },
                    {
                        "name": "full_name",
                        "data_type": "character varying",
                        "nullable": False,
                        "ordinal_position": 4,
                    },
                ],
                "primary_keys": [{"name": "drivers_pkey", "columns": ["driver_id"]}],
                "unique_constraints": [
                    {"name": "drivers_license_number_key", "columns": ["license_number"]}
                ],
                "foreign_keys": [
                    {
                        "name": "fk_drivers_carrier",
                        "columns": ["carrier_id"],
                        "target_schema": "logistics",
                        "target_table": "carriers",
                        "target_columns": ["carrier_id"],
                    }
                ],
                "indexes": [],
            },
            {
                "schema": "logistics",
                "name": "shipments",
                "object_type": "table",
                "comment": "سجل الشحنات الصادرة من المستودعات إلى مدن الوجهة.",
                "reltuples": 3,
                "columns": [
                    {
                        "name": "shipment_id",
                        "data_type": "bigint",
                        "nullable": False,
                        "ordinal_position": 1,
                    },
                    {
                        "name": "tracking_number",
                        "data_type": "character varying",
                        "nullable": False,
                        "ordinal_position": 2,
                        "comment": "رقم التتبع المرجعي للشحنة.",
                    },
                    {
                        "name": "origin_warehouse_id",
                        "data_type": "integer",
                        "nullable": False,
                        "ordinal_position": 3,
                    },
                    {
                        "name": "carrier_id",
                        "data_type": "integer",
                        "nullable": False,
                        "ordinal_position": 4,
                    },
                    {
                        "name": "total_weight_kg",
                        "data_type": "numeric",
                        "nullable": False,
                        "ordinal_position": 5,
                        "comment": "الوزن الإجمالي للشحنة بالكيلوغرام.",
                    },
                    {
                        "name": "shipping_cost",
                        "data_type": "numeric",
                        "nullable": False,
                        "ordinal_position": 6,
                    },
                ],
                "primary_keys": [{"name": "shipments_pkey", "columns": ["shipment_id"]}],
                "unique_constraints": [
                    {"name": "shipments_tracking_number_key", "columns": ["tracking_number"]}
                ],
                "foreign_keys": [
                    {
                        "name": "fk_shipments_warehouse",
                        "columns": ["origin_warehouse_id"],
                        "target_schema": "logistics",
                        "target_table": "warehouses",
                        "target_columns": ["warehouse_id"],
                    },
                    {
                        "name": "fk_shipments_carrier",
                        "columns": ["carrier_id"],
                        "target_schema": "logistics",
                        "target_table": "carriers",
                        "target_columns": ["carrier_id"],
                    },
                ],
                "indexes": [],
            },
            {
                "schema": "logistics",
                "name": "route_stops",
                "object_type": "table",
                "comment": "محطات توقف وعبور الشحنة بمفتاح أساسي مركب.",
                "reltuples": 5,
                "columns": [
                    {
                        "name": "shipment_id",
                        "data_type": "bigint",
                        "nullable": False,
                        "ordinal_position": 1,
                    },
                    {
                        "name": "stop_seq",
                        "data_type": "smallint",
                        "nullable": False,
                        "ordinal_position": 2,
                    },
                    {
                        "name": "hub_city",
                        "data_type": "character varying",
                        "nullable": False,
                        "ordinal_position": 3,
                    },
                ],
                "primary_keys": [
                    {"name": "route_stops_pkey", "columns": ["shipment_id", "stop_seq"]}
                ],
                "unique_constraints": [],
                "foreign_keys": [
                    {
                        "name": "fk_route_stops_shipment",
                        "columns": ["shipment_id"],
                        "target_schema": "logistics",
                        "target_table": "shipments",
                        "target_columns": ["shipment_id"],
                    }
                ],
                "indexes": [],
            },
            {
                "schema": "logistics",
                "name": "delivery_confirmations",
                "object_type": "table",
                "comment": None,
                "reltuples": 1,
                "columns": [
                    {
                        "name": "confirmation_id",
                        "data_type": "bigint",
                        "nullable": False,
                        "ordinal_position": 1,
                    },
                    {
                        "name": "shipment_id",
                        "data_type": "bigint",
                        "nullable": False,
                        "ordinal_position": 2,
                    },
                    {
                        "name": "stop_seq",
                        "data_type": "smallint",
                        "nullable": False,
                        "ordinal_position": 3,
                    },
                    {
                        "name": "driver_id",
                        "data_type": "integer",
                        "nullable": False,
                        "ordinal_position": 4,
                    },
                ],
                "primary_keys": [
                    {"name": "delivery_confirmations_pkey", "columns": ["confirmation_id"]}
                ],
                "unique_constraints": [
                    {"name": "uq_confirmations_stop", "columns": ["shipment_id", "stop_seq"]}
                ],
                "foreign_keys": [
                    {
                        "name": "fk_confirmations_route_stop",
                        "columns": ["shipment_id", "stop_seq"],
                        "target_schema": "logistics",
                        "target_table": "route_stops",
                        "target_columns": ["shipment_id", "stop_seq"],
                    },
                    {
                        "name": "fk_confirmations_driver",
                        "columns": ["driver_id"],
                        "target_schema": "logistics",
                        "target_table": "drivers",
                        "target_columns": ["driver_id"],
                    },
                ],
                "indexes": [],
            },
            {
                "schema": "logistics",
                "name": "v_active_shipments_overview",
                "object_type": "view",
                "comment": "مشهد تحليلي لمتابعة الشحنات وربطها بالمستودع والناقل.",
                "dependencies": [
                    "logistics.carriers",
                    "logistics.shipments",
                    "logistics.warehouses",
                ],
                "columns": [
                    {"name": "shipment_id", "data_type": "bigint", "ordinal_position": 1},
                    {
                        "name": "tracking_number",
                        "data_type": "character varying",
                        "ordinal_position": 2,
                    },
                    {
                        "name": "warehouse_name",
                        "data_type": "character varying",
                        "ordinal_position": 3,
                        "comment": "اسم المستودع المرسل للشحنة.",
                    },
                ],
                "primary_keys": [],
                "foreign_keys": [],
                "unique_constraints": [],
                "indexes": [],
            },
            {
                "schema": "logistics",
                "name": "v_warehouse_dispatch_summary",
                "object_type": "view",
                "comment": None,
                "dependencies": ["logistics.shipments", "logistics.warehouses"],
                "columns": [
                    {"name": "warehouse_id", "data_type": "integer", "ordinal_position": 1},
                    {"name": "shipments_count", "data_type": "bigint", "ordinal_position": 2},
                ],
                "primary_keys": [],
                "foreign_keys": [],
                "unique_constraints": [],
                "indexes": [],
            },
        ]
    }


def test_official_university_sql_files_actual_counts():
    """التحقق مباشرة من ملفات SQL الرسمية: 9 جداول + 3 مشاهد = 12 كائناً."""
    schema_sql = (UNIVERSITY_DIR / "01_schema.sql").read_text(encoding="utf-8")
    views_sql = (UNIVERSITY_DIR / "03_views_and_reader.sql").read_text(encoding="utf-8")
    tables = re.findall(r"CREATE TABLE\s+([a-zA-Z0-9_]+)\s*\(", schema_sql, flags=re.IGNORECASE)
    views = re.findall(
        r"CREATE\s+OR\s+REPLACE\s+VIEW\s+([a-zA-Z0-9_]+)\s+AS", views_sql, flags=re.IGNORECASE
    )
    assert len(tables) == 9
    assert len(views) == 3
    assert "GRANT SELECT ON ALL TABLES IN SCHEMA public TO bayan_reader" in views_sql


def test_logistics_demo_sql_assets_satisfy_contract():
    schema_sql = (LOGISTICS_DIR / "01_schema.sql").read_text(encoding="utf-8")
    role_sql = (LOGISTICS_DIR / "03_readonly_role.sql").read_text(encoding="utf-8")
    tables = re.findall(r"CREATE TABLE\s+logistics\.([a-z0-9_]+)", schema_sql)
    views = re.findall(r"CREATE OR REPLACE VIEW\s+logistics\.([a-z0-9_]+)", schema_sql)
    fks = re.findall(r"FOREIGN KEY\s*\(", schema_sql)
    assert len(tables) == 6
    assert len(views) == 2
    assert len(fks) == 6
    assert "FOREIGN KEY (shipment_id, stop_seq)" in schema_sql
    assert "default_transaction_read_only = on" in role_sql


def test_settings_reuses_official_config_without_leaking_secrets():
    cfg = Settings(
        odoo_db_host="db.internal",
        odoo_db_port=5433,
        odoo_db_name="university",
        odoo_db_user="bayan_reader",
        odoo_db_password="super-secret-password",
    )
    pg_settings = PostgresConnectionSettings.from_app_settings(cfg, schemas="public,logistics")
    kwargs = pg_settings.to_psycopg_kwargs()
    assert "default_transaction_read_only=on" in kwargs["options"]
    assert pg_settings.schemas == ("public", "logistics")
    summary = pg_settings.safe_summary()
    assert "super-secret-password" not in repr(pg_settings)
    assert "super-secret-password" not in str(summary)


def test_introspector_enforces_readonly_multi_schema_and_pg_types():
    writable_conn = InMemoryPostgresConnection(_logistics_catalog(), transaction_read_only="off")
    with pytest.raises(PostgresIntrospectionError, match="القراءة فقط"):
        PostgresIntrospector(connect_fn=lambda **_kw: writable_conn).introspect(
            PostgresConnectionSettings(schemas=("logistics",))
        )

    mixed = {
        "objects": [
            *_logistics_catalog()["objects"],
            {
                "schema": "billing",
                "name": "invoices",
                "object_type": "table",
                "reltuples": -1,
                "columns": [
                    {
                        "name": "tags",
                        "data_type": "ARRAY",
                        "formatted_type": "text[]",
                        "ordinal_position": 1,
                    },
                    {
                        "name": "tier",
                        "data_type": "USER-DEFINED",
                        "formatted_type": "billing.tier_enum",
                        "ordinal_position": 2,
                    },
                ],
                "primary_keys": [],
                "foreign_keys": [],
                "unique_constraints": [],
                "indexes": [],
            },
        ]
    }
    conn = InMemoryPostgresConnection(mixed, transaction_read_only="on")
    rows = PostgresIntrospector(connect_fn=lambda **_kw: conn).introspect(
        PostgresConnectionSettings(schemas=("*",))
    )
    assert conn.rolled_back is True
    assert len(rows) == 9
    inv = next(item for item in rows if item["name"] == "invoices")
    assert inv["approximate_row_count"] is None
    assert [c["data_type"] for c in inv["columns"]] == ["text[]", "billing.tier_enum"]


def test_same_pipeline_discovers_official_university_and_logistics_schemas():
    pipeline_uni = DiscoveryPipeline(
        connect_fn=lambda **_kw: InMemoryPostgresConnection(_official_university_catalog())
    )
    uni_report = pipeline_uni.run(
        PostgresConnectionSettings(
            host="localhost",
            port=5433,
            database="university",
            username="bayan_reader",
            password="bayan_dev_reader",
            schemas=("public",),
        )
    )
    pipeline_log = DiscoveryPipeline(
        connect_fn=lambda **_kw: InMemoryPostgresConnection(_logistics_catalog())
    )
    log_report = pipeline_log.run(
        PostgresConnectionSettings(
            host="localhost",
            port=5433,
            database="logistics_demo",
            username="bayan_logistics_reader",
            password="bayan_dev_logistics_reader",
            schemas=("logistics",),
        )
    )

    assert uni_report.counts.tables == 9
    assert uni_report.counts.views == 3
    assert uni_report.counts.total_objects == 12
    assert log_report.counts.tables == 6
    assert log_report.counts.views == 2
    assert log_report.counts.total_objects == 8
    assert log_report.counts.foreign_keys == 6
    assert any(
        rel.constraint_name == "fk_confirmations_route_stop"
        and rel.source_columns == ("shipment_id", "stop_seq")
        for rel in log_report.relationships
    )
    assert "bayan_dev_logistics_reader" not in log_report.markdown_ar
