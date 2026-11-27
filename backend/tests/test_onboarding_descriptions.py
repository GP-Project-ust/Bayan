"""اختبارات التوصيف العربي الحتمي (Zero-LLM) وأولوية COMMENT ON."""

from __future__ import annotations

from app.services.onboarding.discovery import (
    DESCRIPTION_RULES_VERSION,
    DeterministicArabicDescriber,
    DiscoveryPipeline,
    PostgresConnectionSettings,
    normalize_discovered_objects,
)
from tests.test_onboarding_introspection import (
    InMemoryPostgresConnection,
    _logistics_catalog,
    _official_university_catalog,
)


def test_deterministic_descriptions_prioritize_db_comments_over_templates():
    describer = DeterministicArabicDescriber()
    normalized = normalize_discovered_objects(
        _logistics_catalog()["objects"],
        source_id="SRC-L",
        source_name="logistics_demo",
        catalog_alias="logistics_demo",
        default_schema="logistics",
    )
    warehouses = describer.describe_object(next(o for o in normalized if o["name"] == "warehouses"))
    drivers = describer.describe_object(next(o for o in normalized if o["name"] == "drivers"))
    assert warehouses.description_source == "database_comment"
    assert "المستودعات ومراكز التوزيع اللوجستية" in warehouses.description_ar
    assert drivers.description_source == "deterministic_template"
    assert DESCRIPTION_RULES_VERSION in drivers.description_ar


def test_consecutive_discovery_runs_are_byte_for_byte_identical():
    settings = PostgresConnectionSettings(
        host="localhost",
        port=5433,
        database="university",
        username="bayan_reader",
        password="bayan_dev_reader",
        schemas=("public",),
    )
    run_1 = DiscoveryPipeline(
        connect_fn=lambda **_kw: InMemoryPostgresConnection(_official_university_catalog())
    ).run(settings)
    run_2 = DiscoveryPipeline(
        connect_fn=lambda **_kw: InMemoryPostgresConnection(_official_university_catalog())
    ).run(settings)
    assert run_1 == run_2
    assert run_1.markdown_ar == run_2.markdown_ar
    assert run_1.catalog_fingerprint == run_2.catalog_fingerprint
    assert run_1.structural_fingerprint == run_2.structural_fingerprint
