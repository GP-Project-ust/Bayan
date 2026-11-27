"""نماذج البيانات المجمدة لحزمة الاستبطان والأوصاف الحتمية (PR-1).

تظل هذه النماذج داخلية ومستقلة تماماً عن العقد المجمد لوكيل SQL
(``app.agents.sql_catalog.CatalogEntry`` و``CatalogColumn``).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Literal


@dataclass(frozen=True)
class ColumnMetadata:
    object_ref: str
    name: str
    data_type: str
    nullable: bool
    ordinal_position: int
    default: str | None = None
    comment: str | None = None
    primary_key: bool = False
    foreign_key: bool = False
    unique: bool = False
    fingerprint: str = ""
    structural_fingerprint: str = ""


@dataclass(frozen=True)
class KeyConstraintMetadata:
    name: str
    columns: tuple[str, ...]


@dataclass(frozen=True)
class ForeignKeyMetadata:
    name: str
    columns: tuple[str, ...]
    target_schema: str
    target_table: str
    target_columns: tuple[str, ...]
    source_table_ref: str | None = None
    target_table_ref: str | None = None
    declared: bool = True


@dataclass(frozen=True)
class IndexMetadata:
    name: str
    columns: tuple[str, ...]
    unique: bool
    primary: bool


@dataclass(frozen=True)
class DatabaseObjectMetadata:
    object_ref: str
    source_id: str
    source_name: str
    catalog_alias: str
    catalog: str | None
    schema: str
    name: str
    original_name: str
    qualified_name: str
    schema_qualified_name: str
    object_type: Literal["table", "view"]
    comment: str | None = None
    approximate_row_count: int | None = None
    dependencies: tuple[str, ...] = ()
    columns: tuple[ColumnMetadata, ...] = ()
    primary_keys: tuple[KeyConstraintMetadata, ...] = ()
    foreign_keys: tuple[ForeignKeyMetadata, ...] = ()
    unique_constraints: tuple[KeyConstraintMetadata, ...] = ()
    indexes: tuple[IndexMetadata, ...] = ()
    fingerprint: str = ""
    structural_fingerprint: str = ""
    stats_fingerprint: str = ""
    semantic_fingerprint: str = ""


@dataclass(frozen=True)
class DeclaredRelationshipMetadata:
    signature: str
    constraint_name: str
    source_table_ref: str
    source_table: str
    source_columns: tuple[str, ...]
    target_table_ref: str | None
    target_table: str
    target_columns: tuple[str, ...]
    business_label_ar: str
    rationale_ar: str
    origin: str = "declared"
    source_fact: bool = True


@dataclass(frozen=True)
class CatalogCounts:
    tables: int
    views: int
    total_objects: int
    columns: int
    primary_keys: int
    foreign_keys: int
    unique_constraints: int
    indexes: int
    schemas: int


@dataclass(frozen=True)
class DescribedColumn:
    object_ref: str
    name: str
    data_type: str
    nullable: bool
    primary_key: bool
    foreign_key: bool
    unique: bool
    label_ar: str
    description_ar: str
    semantic_type: str
    description_source: Literal["database_comment", "deterministic_template"]
    fingerprint: str
    structural_fingerprint: str = ""


@dataclass(frozen=True)
class DescribedObject:
    object_ref: str
    schema: str
    name: str
    schema_qualified_name: str
    object_type: Literal["table", "view"]
    label_ar: str
    description_ar: str
    entity_type: str
    description_source: Literal["database_comment", "deterministic_template"]
    approximate_row_count: int | None
    fingerprint: str
    columns: tuple[DescribedColumn, ...]
    primary_keys: tuple[KeyConstraintMetadata, ...]
    foreign_keys: tuple[ForeignKeyMetadata, ...]
    unique_constraints: tuple[KeyConstraintMetadata, ...]
    indexes: tuple[IndexMetadata, ...]
    dependencies: tuple[str, ...] = ()
    structural_fingerprint: str = ""
    stats_fingerprint: str = ""
    semantic_fingerprint: str = ""


@dataclass(frozen=True)
class DiscoveryReport:
    rules_version: str
    catalog_fingerprint: str
    source_summary: dict[str, Any]
    schemas: tuple[str, ...]
    counts: CatalogCounts
    objects: tuple[DescribedObject, ...]
    relationships: tuple[DeclaredRelationshipMetadata, ...]
    warnings_ar: tuple[str, ...] = ()
    markdown_ar: str = ""
    structural_fingerprint: str = ""
    metadata: dict[str, Any] = field(default_factory=dict)
