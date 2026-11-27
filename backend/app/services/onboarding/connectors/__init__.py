"""موصلات الاستبطان الآمنة لقراءة فقط (PostgreSQL عبر PR-1 + SQLite + MySQL + SQL Server)."""

from .scanner import (
    ConnectorSecurityError,
    DataSourceConnectionError,
    build_discovery_report_from_catalog,
    scan_source_metadata,
    test_source_connection,
    validate_source_payload,
)

__all__ = [
    "ConnectorSecurityError",
    "DataSourceConnectionError",
    "build_discovery_report_from_catalog",
    "scan_source_metadata",
    "test_source_connection",
    "validate_source_payload",
]
