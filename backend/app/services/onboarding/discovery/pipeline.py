"""نقطة تشغيل خط الاستبطان والأوصاف الحتمية (PR-1 — Zero-LLM، قراءة فقط)."""

from __future__ import annotations

import argparse
import dataclasses
import json
from typing import Any, Callable, Optional, Sequence

from .descriptions import DeterministicArabicDescriber
from .introspector import PostgresIntrospector
from .models import DiscoveryReport
from .normalization import normalize_discovered_objects
from .report import build_arabic_discovery_report
from .settings import PostgresConnectionSettings, parse_schema_selector


class DiscoveryPipeline:
    """استبطان ← تطبيع وبصمات ← وصف عربي حتمي ← تقرير عربي."""

    def __init__(
        self,
        *,
        introspector: Optional[PostgresIntrospector] = None,
        describer: Optional[DeterministicArabicDescriber] = None,
        connect_fn: Optional[Callable[..., Any]] = None,
    ):
        self.introspector = introspector or PostgresIntrospector(connect_fn=connect_fn)
        self.describer = describer or DeterministicArabicDescriber()

    def run(
        self,
        settings: PostgresConnectionSettings,
        *,
        always_schema_qualify: bool = True,
    ) -> DiscoveryReport:
        raw_objects = self.introspector.introspect(settings)
        default_schema = (
            settings.schemas[0] if settings.schemas and settings.schemas[0] != "*" else "public"
        )
        normalized = normalize_discovered_objects(
            raw_objects,
            source_id=settings.source_id,
            source_name=settings.source_name,
            catalog_alias=settings.catalog_alias,
            database_name=settings.database,
            default_schema=default_schema,
            qualify_with_alias=False,
            always_schema_qualify=always_schema_qualify,
        )
        return build_arabic_discovery_report(
            normalized,
            source_summary=settings.safe_summary(),
            describer=self.describer,
        )


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
    connect_fn: Optional[Callable[..., Any]] = None,
) -> int:
    parser = argparse.ArgumentParser(
        prog="bayan-discovery",
        description="Read-only PostgreSQL introspection & deterministic Arabic report.",
    )
    parser.add_argument("--schemas", default=None, help="Comma-separated schemas or '*'")
    parser.add_argument("--source-name", default="", help="Display label for source")
    parser.add_argument("--format", choices=("markdown", "json"), default="markdown")
    args = parser.parse_args(argv)

    schemas = parse_schema_selector(args.schemas) if args.schemas else None
    settings = PostgresConnectionSettings.from_app_settings(
        schemas=schemas,
        source_name=args.source_name,
    )
    report = DiscoveryPipeline(connect_fn=connect_fn).run(settings)
    if args.format == "json":
        print(json.dumps(_to_plain(report), ensure_ascii=False, indent=2))
    else:
        print(report.markdown_ar)
    return 0


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
