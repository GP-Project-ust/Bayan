"""حزمة الاستبطان الحتمي لـ PostgreSQL والأوصاف العربية (PR-1)."""

from .descriptions import (
    DESCRIPTION_RULES_VERSION,
    WORD_GLOSSARY,
    DeterministicArabicDescriber,
    humanize_identifier_ar,
    infer_column_semantic_type,
    infer_object_entity_type,
)
from .fingerprints import (
    canonical_json,
    catalog_fingerprint,
    column_fingerprint,
    object_fingerprint,
    semantic_object_fingerprint,
    stats_object_fingerprint,
    structural_catalog_fingerprint,
    structural_column_fingerprint,
    structural_object_fingerprint,
)
from .introspector import (
    PostgresIntrospectionError,
    PostgresIntrospector,
    read_postgresql_metadata,
)
from .models import (
    CatalogCounts,
    ColumnMetadata,
    DatabaseObjectMetadata,
    DeclaredRelationshipMetadata,
    DescribedColumn,
    DescribedObject,
    DiscoveryReport,
    ForeignKeyMetadata,
    IndexMetadata,
    KeyConstraintMetadata,
)
from .normalization import (
    compare_snapshots,
    compute_catalog_counts,
    deduplicate_objects_by_ref,
    normalize_discovered_objects,
)
from .pipeline import DiscoveryPipeline
from .report import build_arabic_discovery_report, format_arabic_report_markdown
from .settings import SYSTEM_SCHEMAS, PostgresConnectionSettings, parse_schema_selector

__all__ = [
    "CatalogCounts",
    "ColumnMetadata",
    "DESCRIPTION_RULES_VERSION",
    "DatabaseObjectMetadata",
    "DeclaredRelationshipMetadata",
    "DescribedColumn",
    "DescribedObject",
    "DeterministicArabicDescriber",
    "DiscoveryPipeline",
    "DiscoveryReport",
    "ForeignKeyMetadata",
    "IndexMetadata",
    "KeyConstraintMetadata",
    "PostgresConnectionSettings",
    "PostgresIntrospectionError",
    "PostgresIntrospector",
    "SYSTEM_SCHEMAS",
    "WORD_GLOSSARY",
    "build_arabic_discovery_report",
    "canonical_json",
    "catalog_fingerprint",
    "column_fingerprint",
    "compare_snapshots",
    "compute_catalog_counts",
    "deduplicate_objects_by_ref",
    "format_arabic_report_markdown",
    "humanize_identifier_ar",
    "infer_column_semantic_type",
    "infer_object_entity_type",
    "normalize_discovered_objects",
    "object_fingerprint",
    "parse_schema_selector",
    "read_postgresql_metadata",
    "semantic_object_fingerprint",
    "stats_object_fingerprint",
    "structural_catalog_fingerprint",
    "structural_column_fingerprint",
    "structural_object_fingerprint",
]
