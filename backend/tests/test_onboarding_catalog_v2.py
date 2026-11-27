"""اختبارات Catalog v2 والتوافق التام مع العقد المجمد والمشهدين الإضافيين."""

from __future__ import annotations

import copy
import re
from pathlib import Path

from app.agents.sql_catalog import CatalogColumn, CatalogEntry, get_catalog
from app.core.config import Settings
from app.services.onboarding.catalog import (
    CatalogBuildOptions,
    SemanticCatalogV2Provider,
)
from app.services.onboarding.discovery import (
    DiscoveryPipeline,
    PostgresConnectionSettings,
)
from app.services.onboarding.indexing import (
    InMemorySemanticRepository,
    OfficialEmbeddingService,
    SemanticIndexer,
)
from tests.test_onboarding_introspection import (
    InMemoryPostgresConnection,
    _official_university_catalog,
)

REPO_ROOT = Path(__file__).resolve().parents[2]
VIEWS_04_PATH = REPO_ROOT / "database" / "university_demo" / "04_views.sql"


def _university_catalog_with_two_new_views() -> dict:
    catalog = copy.deepcopy(_official_university_catalog())
    catalog["objects"].extend(
        [
            {
                "schema": "public",
                "name": "v_student_financial_status",
                "object_type": "view",
                "comment": (
                    "بيان: الحالة المالية لكل طالب مع البرنامج والدفعة والمدينة والجنس — "
                    "يدعم أسئلة المتأخرات المصفاة ديموغرافياً وأكاديمياً دون كشف بيانات التواصل"
                ),
                "dependencies": [
                    "public.op_batch",
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
                    {"name": "city", "data_type": "character varying", "ordinal_position": 3},
                    {"name": "gender", "data_type": "character varying", "ordinal_position": 4},
                    {
                        "name": "program_code",
                        "data_type": "character varying",
                        "ordinal_position": 5,
                    },
                    {
                        "name": "program_name",
                        "data_type": "character varying",
                        "ordinal_position": 6,
                    },
                    {"name": "batch_name", "data_type": "character varying", "ordinal_position": 7},
                    {"name": "total_amount", "data_type": "numeric", "ordinal_position": 8},
                    {"name": "total_paid", "data_type": "numeric", "ordinal_position": 9},
                    {"name": "outstanding", "data_type": "numeric", "ordinal_position": 10},
                    {"name": "fees_records_count", "data_type": "bigint", "ordinal_position": 11},
                    {"name": "has_overdue", "data_type": "boolean", "ordinal_position": 12},
                ],
            },
            {
                "schema": "public",
                "name": "v_program_financial_summary",
                "object_type": "view",
                "comment": (
                    "بيان: الملخص المالي المجمع لكل برنامج ودفعة — "
                    "إجمالي المستحق والمسدد والمتأخرات دون بيانات أفراد الطلاب"
                ),
                "dependencies": [
                    "public.op_batch",
                    "public.op_course",
                    "public.op_student",
                    "public.op_student_fees_details",
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
                    {"name": "batch_name", "data_type": "character varying", "ordinal_position": 3},
                    {"name": "students_count", "data_type": "bigint", "ordinal_position": 4},
                    {"name": "total_fees_due", "data_type": "numeric", "ordinal_position": 5},
                    {"name": "total_fees_paid", "data_type": "numeric", "ordinal_position": 6},
                    {"name": "total_outstanding", "data_type": "numeric", "ordinal_position": 7},
                    {
                        "name": "students_with_outstanding",
                        "data_type": "bigint",
                        "ordinal_position": 8,
                    },
                ],
            },
        ]
    )
    return catalog


def _indexed_v2_provider(
    catalog_data: dict,
) -> tuple[SemanticCatalogV2Provider, InMemorySemanticRepository]:
    repo = InMemorySemanticRepository(dimensions=1024)
    embedder = OfficialEmbeddingService(app_settings=Settings(embedding_provider="mock"))
    report = DiscoveryPipeline(
        connect_fn=lambda **_kw: InMemoryPostgresConnection(catalog_data)
    ).run(
        PostgresConnectionSettings(database="university", source_id="SRC-UNI", schemas=("public",))
    )
    SemanticIndexer(repository=repo, embedder=embedder).index_report(
        report,
        tenant_id="tenant-uni",
        source_id="SRC-UNI",
    )
    provider = SemanticCatalogV2Provider(
        repository=repo,
        options=CatalogBuildOptions(tenant_id="tenant-uni", source_id="SRC-UNI"),
    )
    return provider, repo


def test_catalog_v2_satisfies_frozen_contract_for_legacy_views():
    provider, _ = _indexed_v2_provider(_university_catalog_with_two_new_views())
    legacy_views = ["v_student_profile", "v_fees_summary", "v_program_stats"]

    v1_entries = get_catalog()
    v2_entries = provider.get_catalog(allowed_views=legacy_views)

    assert [e.view for e in v2_entries] == [e.view for e in v1_entries]
    assert provider.get_catalog(["v_program_stats", "v_fees_summary"])[0].view == "v_fees_summary"
    assert provider.get_catalog([]) == []
    assert [e.view for e in provider.get_catalog(["v_student_profile", "v_unknown"])] == [
        "v_student_profile"
    ]
    assert provider.get_catalog(legacy_views) == provider.get_catalog(legacy_views)

    for v1_entry, v2_entry in zip(v1_entries, v2_entries, strict=True):
        assert isinstance(v2_entry, CatalogEntry)
        assert v2_entry.source == "semantic_v2"
        assert {c.name for c in v2_entry.columns} == {c.name for c in v1_entry.columns}
        for col in v2_entry.columns:
            assert isinstance(col, CatalogColumn)
            assert col.name.strip()
            assert col.type.strip()
            assert col.description.strip()
        try:
            v2_entry.view = "v_tampered"  # type: ignore[misc]
            raise AssertionError("CatalogEntry في v2 يجب أن يبقى مجمداً")
        except Exception:
            pass


def test_catalog_v2_exposes_five_views_and_blocks_physical_tables():
    provider, repo = _indexed_v2_provider(_university_catalog_with_two_new_views())
    all_entries = provider.get_catalog()
    names = [e.view for e in all_entries]
    assert names == [
        "v_student_profile",
        "v_fees_summary",
        "v_program_stats",
        "v_student_financial_status",
        "v_program_financial_summary",
    ]
    # التأكد من عدم تسرب أي جدول فيزيائي عبر get_catalog حتى عند تمرير اسمه
    assert provider.get_catalog(["op_student", "res_partner"]) == []

    # التأكد من تصنيف v_student_financial_status كـ restricted وحجبها عند تقييد التصنيف
    all_stored_views = {v.technical_name: v for v in repo.list_active_views(tenant_id="tenant-uni")}
    assert all_stored_views["v_student_financial_status"].classification == "restricted"
    assert all_stored_views["v_program_financial_summary"].classification == "public"

    public_only = SemanticCatalogV2Provider(
        repository=repo,
        options=CatalogBuildOptions(
            tenant_id="tenant-uni",
            source_id="SRC-UNI",
            allowed_classifications=("public", "masked"),
        ),
    )
    assert "v_student_financial_status" not in [e.view for e in public_only.get_catalog()]
    assert "v_program_financial_summary" in [e.view for e in public_only.get_catalog()]

    # التأكد من أن allowed_views_scope يمنع توسيع النطاق عند الاستدعاء
    scoped = SemanticCatalogV2Provider(
        repository=repo,
        options=CatalogBuildOptions(
            tenant_id="tenant-uni",
            source_id="SRC-UNI",
            allowed_views_scope=("v_program_stats",),
        ),
    )
    assert [
        e.view for e in scoped.get_catalog(["v_student_financial_status", "v_program_stats"])
    ] == ["v_program_stats"]


def test_04_views_sql_defines_two_documented_readonly_views():
    sql = VIEWS_04_PATH.read_text(encoding="utf-8")
    executable_sql = " ".join(re.sub(r"--[^\n]*", "", sql).split())
    views = re.findall(r"CREATE\s+OR\s+REPLACE\s+VIEW\s+([a-z0-9_]+)\s+AS", executable_sql)
    assert views == ["v_student_financial_status", "v_program_financial_summary"]
    assert "DROP VIEW" not in executable_sql.upper()
    assert "CASCADE" not in executable_sql.upper()
    assert "COALESCE(BOOL_OR(f.state = 'متأخر'), FALSE) AS has_overdue" in executable_sql
    assert "WITH student_totals AS" in executable_sql
    assert "COMMENT ON VIEW v_student_financial_status" in executable_sql
    assert "COMMENT ON VIEW v_program_financial_summary" in executable_sql
    assert (
        "GRANT SELECT ON v_student_financial_status, v_program_financial_summary TO bayan_reader"
        in executable_sql
    )
    # التأكد من عدم كشف البريد أو الهاتف داخل المشهد المالي الجديد
    assert "p.email" not in executable_sql
    assert "p.phone" not in executable_sql
