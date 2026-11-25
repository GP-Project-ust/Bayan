"""أمر سطر الأوامر الرسمي الموحد لطبقة التهيئة الدلالية (make onboarding)."""

from __future__ import annotations

import argparse
import dataclasses
import json
import sys
from typing import Any, Callable, Optional, Sequence

from app.core.config import Settings, get_settings
from app.services.onboarding.discovery import PostgresConnectionSettings, parse_schema_selector
from app.services.onboarding.indexing import SemanticIndexRepository
from app.services.onboarding.pipeline import UnifiedOnboardingPipeline


def _to_plain(value: Any) -> Any:
    if dataclasses.is_dataclass(value) and not isinstance(value, type):
        return {k: _to_plain(v) for k, v in dataclasses.asdict(value).items()}
    if isinstance(value, (list, tuple)):
        return [_to_plain(v) for v in value]
    if isinstance(value, dict):
        return {str(k): _to_plain(v) for k, v in value.items()}
    return value


def main(
    argv: Optional[Sequence[str]] = None,
    *,
    app_settings: Settings | None = None,
    repository: SemanticIndexRepository | None = None,
    source_connect_fn: Optional[Callable[..., Any]] = None,
) -> int:
    parser = argparse.ArgumentParser(
        prog="bayan-onboarding",
        description="Unified deterministic PostgreSQL discovery + pgvector semantic onboarding.",
    )
    parser.add_argument("--tenant", default="default-university", help="Authorized tenant ID")
    parser.add_argument("--source-id", default="SRC-POSTGRES", help="Logical data source ID")
    parser.add_argument("--source-name", default="", help="Display label for the source")
    parser.add_argument("--schemas", default=None, help="Comma-separated schemas or '*'")
    parser.add_argument("--format", choices=("markdown", "json"), default="markdown")
    args = parser.parse_args(argv)

    cfg = app_settings or get_settings()
    schemas = parse_schema_selector(args.schemas) if args.schemas else None
    source_settings = PostgresConnectionSettings.from_app_settings(
        cfg,
        schemas=schemas,
        source_id=args.source_id,
        source_name=args.source_name,
    )
    pipeline = UnifiedOnboardingPipeline(
        app_settings=cfg,
        repository=repository,
        source_connect_fn=source_connect_fn,
    )
    try:
        result = pipeline.run(
            source_settings=source_settings,
            tenant_id=args.tenant,
        )
    except Exception as exc:
        print(f"فشل تشغيل التهيئة الدلالية الموحدة: {exc}", file=sys.stderr)
        return 1

    if args.format == "json":
        payload = {
            "tenant_id": result.tenant_id,
            "source_id": result.source_id,
            "catalog_views": list(result.catalog_views),
            "indexing_summary": _to_plain(result.indexing_summary),
            "counts": _to_plain(result.discovery_report.counts),
            "schemas": list(result.discovery_report.schemas),
        }
        print(json.dumps(payload, ensure_ascii=False, indent=2))
    else:
        print(result.execution_report_ar)
    return 0


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
