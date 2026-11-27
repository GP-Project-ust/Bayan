"""مستودع حفظ واسترجاع الفهرس الدلالي في pgvector (مع نسخة ذاكرة مطابقة لاختبارات CI)."""

from __future__ import annotations

import copy
import json
import math
from typing import Any, Callable, Protocol, Sequence

from app.core.config import get_settings

from .models import (
    ExistingEntryState,
    IndexedRecord,
    SemanticEntry,
    SemanticSearchResult,
    validate_safe_semantic_payload,
)


class SemanticIndexRepository(Protocol):
    """منفذ تخزين الفهرس الدلالي المعزول لكل مستأجر ومصدر."""

    def ensure_schema(self) -> None: ...

    def fetch_existing_states(
        self,
        *,
        tenant_id: str,
        source_id: str,
    ) -> dict[str, ExistingEntryState]: ...

    def apply_changes(
        self,
        *,
        tenant_id: str,
        source_id: str,
        upserts: Sequence[IndexedRecord],
        retire_ids: Sequence[str],
    ) -> None: ...

    def search(
        self,
        query_vector: Sequence[float],
        *,
        tenant_id: str,
        source_ids: Sequence[str] | None = None,
        allowed_views: Sequence[str] | None = None,
        allowed_classifications: Sequence[str] | None = None,
        entry_types: Sequence[str] | None = None,
        limit: int = 10,
    ) -> list[SemanticSearchResult]: ...

    def list_active_views(
        self,
        *,
        tenant_id: str,
        source_id: str | None = None,
        allowed_views: Sequence[str] | None = None,
        allowed_classifications: Sequence[str] | None = None,
    ) -> list[SemanticEntry]: ...


def _cosine_similarity(vec_a: Sequence[float], vec_b: Sequence[float]) -> float:
    if len(vec_a) != len(vec_b) or not vec_a:
        return 0.0
    dot = sum(a * b for a, b in zip(vec_a, vec_b, strict=True))
    norm_a = math.sqrt(sum(a * a for a in vec_a))
    norm_b = math.sqrt(sum(b * b for b in vec_b))
    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0
    return float(dot / (norm_a * norm_b))


def _format_pgvector_literal(vector: Sequence[float]) -> str:
    return "[" + ",".join(f"{float(v):.12g}" for v in vector) + "]"


class PgVectorSemanticRepository:
    """مستودع PostgreSQL + pgvector في قاعدة بيانات المنصة فقط."""

    def __init__(
        self,
        *,
        database_url: str | None = None,
        dimensions: int | None = None,
        connect_fn: Callable[..., Any] | None = None,
    ):
        cfg = get_settings()
        self._database_url = database_url or cfg.database_url
        dims = int(dimensions if dimensions is not None else cfg.embedding_dimensions)
        if dims <= 0 or dims > 4096:
            raise ValueError("أبعاد متجه pgvector يجب أن تكون بين 1 و 4096.")
        self.dimensions = dims
        self._connect_fn = connect_fn

    def _connect(self) -> Any:
        if self._connect_fn is not None:
            return self._connect_fn(self._database_url)
        import psycopg

        return psycopg.connect(self._database_url, connect_timeout=5)

    def ensure_schema(self) -> None:
        """التحقق من امتداد vector وإنشاء جدول وفهارس المنصة بشكل idempotent."""
        with self._connect() as conn:
            with conn.cursor() as cur:
                cur.execute("CREATE EXTENSION IF NOT EXISTS vector")
                cur.execute("SELECT extversion FROM pg_extension WHERE extname = 'vector'")
                row = cur.fetchone()
                if not row:
                    raise RuntimeError("امتداد pgvector (vector) غير متاح في قاعدة المنصة.")
                cur.execute(
                    f"""
                    CREATE TABLE IF NOT EXISTS onboarding_semantic_entries (
                        entry_id VARCHAR(64) PRIMARY KEY,
                        tenant_id VARCHAR(128) NOT NULL,
                        source_id VARCHAR(128) NOT NULL,
                        schema_name VARCHAR(128) NOT NULL,
                        schema_qualified_name VARCHAR(255) NOT NULL,
                        object_ref VARCHAR(512) NOT NULL,
                        entry_type VARCHAR(32) NOT NULL,
                        technical_name VARCHAR(255) NOT NULL,
                        label_ar TEXT NOT NULL,
                        description_ar TEXT NOT NULL,
                        description_source VARCHAR(64) NOT NULL,
                        classification VARCHAR(32) NOT NULL DEFAULT 'public',
                        searchable_text TEXT NOT NULL,
                        metadata_payload JSONB NOT NULL DEFAULT '{{}}'::jsonb,
                        metadata_fingerprint VARCHAR(64) NOT NULL,
                        content_hash VARCHAR(64) NOT NULL,
                        embedding_config_id VARCHAR(255) NOT NULL,
                        catalog_version VARCHAR(64) NOT NULL,
                        rules_version VARCHAR(64) NOT NULL,
                        indexing_state VARCHAR(32) NOT NULL DEFAULT 'indexed',
                        retired_at TIMESTAMPTZ NULL,
                        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                        embedding vector({self.dimensions}) NOT NULL,
                        CONSTRAINT uq_onboarding_semantic_scope
                            UNIQUE (tenant_id, source_id, entry_type, object_ref)
                    )
                    """
                )
                cur.execute(
                    """
                    CREATE INDEX IF NOT EXISTS ix_onboarding_semantic_tenant_state
                        ON onboarding_semantic_entries
                        (tenant_id, source_id, indexing_state, entry_type)
                    """
                )
                cur.execute(
                    """
                    CREATE INDEX IF NOT EXISTS ix_onboarding_semantic_qualified_name
                        ON onboarding_semantic_entries (tenant_id, schema_qualified_name)
                    """
                )
            conn.commit()

    def fetch_existing_states(
        self,
        *,
        tenant_id: str,
        source_id: str,
    ) -> dict[str, ExistingEntryState]:
        if not tenant_id.strip():
            raise ValueError("tenant_id مطلوب للاستعلام عن حالة الفهرس.")
        with self._connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT entry_id, content_hash, embedding_config_id,
                           indexing_state, metadata_fingerprint
                    FROM onboarding_semantic_entries
                    WHERE tenant_id = %s AND source_id = %s
                    """,
                    (tenant_id, source_id),
                )
                rows = cur.fetchall()
            conn.rollback()
        return {
            str(r[0]): ExistingEntryState(
                entry_id=str(r[0]),
                content_hash=str(r[1]),
                embedding_config_id=str(r[2]),
                indexing_state=str(r[3]),
                metadata_fingerprint=str(r[4]),
            )
            for r in rows
        }

    def apply_changes(
        self,
        *,
        tenant_id: str,
        source_id: str,
        upserts: Sequence[IndexedRecord],
        retire_ids: Sequence[str],
    ) -> None:
        if not tenant_id.strip() or not source_id.strip():
            raise ValueError("tenant_id وsource_id مطلوبان للتعديل المعاملاتي.")
        with self._connect() as conn:
            try:
                with conn.cursor() as cur:
                    cur.execute(
                        "SELECT pg_advisory_xact_lock(hashtext(%s))",
                        (f"bayan:semantic:{tenant_id}:{source_id}",),
                    )
                    for item in upserts:
                        entry = item.entry
                        if entry.tenant_id != tenant_id or entry.source_id != source_id:
                            raise ValueError("منع تجاوز نطاق المستأجر أو المصدر أثناء الحفظ.")
                        validate_safe_semantic_payload(
                            searchable_text=entry.searchable_text,
                            metadata_payload=entry.metadata_payload,
                        )
                        if len(item.embedding) != self.dimensions:
                            raise ValueError("عدم تطابق أبعاد المتجه مع عمود pgvector.")
                        vector_lit = _format_pgvector_literal(item.embedding)
                        payload_json = json.dumps(
                            {
                                "concepts": list(entry.concepts),
                                "synonyms": list(entry.synonyms),
                                **entry.metadata_payload,
                            },
                            ensure_ascii=False,
                        )
                        cur.execute(
                            """
                            INSERT INTO onboarding_semantic_entries (
                                entry_id, tenant_id, source_id, schema_name,
                                schema_qualified_name, object_ref, entry_type,
                                technical_name, label_ar, description_ar,
                                description_source, classification, searchable_text,
                                metadata_payload, metadata_fingerprint, content_hash,
                                embedding_config_id, catalog_version, rules_version,
                                indexing_state, retired_at, updated_at, embedding
                            ) VALUES (
                                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                                %s, %s::jsonb, %s, %s, %s, %s, %s, 'indexed', NULL, NOW(),
                                %s::vector
                            )
                            ON CONFLICT (entry_id) DO UPDATE SET
                                schema_name = EXCLUDED.schema_name,
                                schema_qualified_name = EXCLUDED.schema_qualified_name,
                                technical_name = EXCLUDED.technical_name,
                                label_ar = EXCLUDED.label_ar,
                                description_ar = EXCLUDED.description_ar,
                                description_source = EXCLUDED.description_source,
                                classification = EXCLUDED.classification,
                                searchable_text = EXCLUDED.searchable_text,
                                metadata_payload = EXCLUDED.metadata_payload,
                                metadata_fingerprint = EXCLUDED.metadata_fingerprint,
                                content_hash = EXCLUDED.content_hash,
                                embedding_config_id = EXCLUDED.embedding_config_id,
                                catalog_version = EXCLUDED.catalog_version,
                                rules_version = EXCLUDED.rules_version,
                                indexing_state = 'indexed',
                                retired_at = NULL,
                                updated_at = NOW(),
                                embedding = EXCLUDED.embedding
                            """,
                            (
                                entry.entry_id,
                                entry.tenant_id,
                                entry.source_id,
                                entry.schema_name,
                                entry.schema_qualified_name,
                                entry.object_ref,
                                entry.entry_type,
                                entry.technical_name,
                                entry.label_ar,
                                entry.description_ar,
                                entry.description_source,
                                entry.classification,
                                entry.searchable_text,
                                payload_json,
                                entry.metadata_fingerprint,
                                entry.content_hash,
                                entry.embedding_config_id,
                                entry.catalog_version,
                                entry.rules_version,
                                vector_lit,
                            ),
                        )

                    if retire_ids:
                        cur.execute(
                            """
                            UPDATE onboarding_semantic_entries
                            SET indexing_state = 'retired',
                                retired_at = NOW(),
                                updated_at = NOW()
                            WHERE tenant_id = %s
                              AND source_id = %s
                              AND entry_id = ANY(%s)
                            """,
                            (tenant_id, source_id, list(retire_ids)),
                        )
                conn.commit()
            except Exception:
                conn.rollback()
                raise

    def search(
        self,
        query_vector: Sequence[float],
        *,
        tenant_id: str,
        source_ids: Sequence[str] | None = None,
        allowed_views: Sequence[str] | None = None,
        allowed_classifications: Sequence[str] | None = None,
        entry_types: Sequence[str] | None = None,
        limit: int = 10,
    ) -> list[SemanticSearchResult]:
        if not tenant_id.strip():
            raise ValueError("يُمنع البحث الدلالي دون تحديد tenant_id (fail-closed).")
        if (
            allowed_views is not None
            and len(allowed_views) == 0
            and (entry_types and list(entry_types) == ["view"])
        ):
            return []
        bounded_limit = max(1, min(int(limit), 50))
        vec_lit = _format_pgvector_literal(query_vector)
        clauses = [
            "tenant_id = %s",
            "indexing_state = 'indexed'",
            "classification <> 'blacklist'",
        ]
        params: list[Any] = [vec_lit, tenant_id]

        if allowed_classifications is not None:
            cls_list = [
                str(c).strip().lower()
                for c in allowed_classifications
                if str(c).strip() and str(c).strip().lower() != "blacklist"
            ]
            if not cls_list:
                return []
            clauses.append("LOWER(classification) = ANY(%s)")
            params.append(cls_list)
        if source_ids is not None:
            src_list = [s for s in source_ids if s]
            if not src_list:
                return []
            clauses.append("source_id = ANY(%s)")
            params.append(src_list)
        if entry_types is not None:
            type_list = [t for t in entry_types if t]
            if not type_list:
                return []
            clauses.append("entry_type = ANY(%s)")
            params.append(type_list)
        if allowed_views is not None:
            views_list = [v for v in allowed_views if v]
            if views_list:
                clauses.append("(entry_type <> 'view' OR technical_name = ANY(%s))")
                params.append(views_list)
            else:
                clauses.append("entry_type <> 'view'")

        where_sql = " AND ".join(clauses)
        params.extend([vec_lit, bounded_limit])
        with self._connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    f"""
                    SELECT entry_id, tenant_id, source_id, entry_type, technical_name,
                           schema_qualified_name, label_ar, description_ar,
                           classification,
                           1 - (embedding <=> %s::vector) AS score,
                           metadata_payload
                    FROM onboarding_semantic_entries
                    WHERE {where_sql}
                    ORDER BY embedding <=> %s::vector ASC, entry_id ASC
                    LIMIT %s
                    """,
                    tuple(params),
                )
                rows = cur.fetchall()
            conn.rollback()
        return [
            SemanticSearchResult(
                entry_id=str(r[0]),
                tenant_id=str(r[1]),
                source_id=str(r[2]),
                entry_type=r[3],
                technical_name=str(r[4]),
                schema_qualified_name=str(r[5]),
                label_ar=str(r[6]),
                description_ar=str(r[7]),
                classification=str(r[8]),
                score=float(r[9]),
                metadata_payload=dict(r[10] or {}),
            )
            for r in rows
        ]

    def list_active_views(
        self,
        *,
        tenant_id: str,
        source_id: str | None = None,
        allowed_views: Sequence[str] | None = None,
        allowed_classifications: Sequence[str] | None = None,
    ) -> list[SemanticEntry]:
        if not tenant_id.strip():
            raise ValueError("tenant_id مطلوب لقراءة المشاهد المعتمدة من الفهرس.")
        if allowed_views is not None and len(allowed_views) == 0:
            return []
        clauses = [
            "tenant_id = %s",
            "entry_type = 'view'",
            "indexing_state = 'indexed'",
            "classification <> 'blacklist'",
        ]
        params: list[Any] = [tenant_id]
        if allowed_classifications is not None:
            cls_list = [
                str(c).strip().lower()
                for c in allowed_classifications
                if str(c).strip() and str(c).strip().lower() != "blacklist"
            ]
            if not cls_list:
                return []
            clauses.append("LOWER(classification) = ANY(%s)")
            params.append(cls_list)
        if source_id:
            clauses.append("source_id = %s")
            params.append(source_id)
        if allowed_views is not None:
            clauses.append("technical_name = ANY(%s)")
            params.append(list(allowed_views))
        where_sql = " AND ".join(clauses)
        with self._connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    f"""
                    SELECT entry_id, tenant_id, source_id, schema_name, schema_qualified_name,
                           object_ref, entry_type, technical_name, label_ar, description_ar,
                           description_source, classification, searchable_text,
                           metadata_payload, metadata_fingerprint, content_hash,
                           embedding_config_id, catalog_version, rules_version, indexing_state
                    FROM onboarding_semantic_entries
                    WHERE {where_sql}
                    ORDER BY technical_name ASC, schema_qualified_name ASC
                    """,
                    tuple(params),
                )
                rows = cur.fetchall()
            conn.rollback()
        entries: list[SemanticEntry] = []
        for r in rows:
            payload = dict(r[13] or {})
            concepts = tuple(str(c) for c in payload.pop("concepts", ()))
            synonyms = tuple(str(s) for s in payload.pop("synonyms", ()))
            entries.append(
                SemanticEntry(
                    entry_id=str(r[0]),
                    tenant_id=str(r[1]),
                    source_id=str(r[2]),
                    schema_name=str(r[3]),
                    schema_qualified_name=str(r[4]),
                    object_ref=str(r[5]),
                    entry_type=r[6],
                    technical_name=str(r[7]),
                    label_ar=str(r[8]),
                    description_ar=str(r[9]),
                    description_source=str(r[10]),
                    classification=str(r[11]),
                    concepts=concepts,
                    synonyms=synonyms,
                    searchable_text=str(r[12]),
                    metadata_payload=payload,
                    metadata_fingerprint=str(r[14]),
                    content_hash=str(r[15]),
                    embedding_config_id=str(r[16]),
                    catalog_version=str(r[17]),
                    rules_version=str(r[18]),
                    indexing_state=r[19],
                )
            )
        return entries


class InMemorySemanticRepository:
    """مستودع داخل الذاكرة مطابق دلالياً وأمنياً لـ ``PgVectorSemanticRepository`` لاختبارات CI."""

    def __init__(self, *, dimensions: int = 1024):
        self.dimensions = int(dimensions)
        self.schema_initialized = False
        self._records: dict[str, IndexedRecord] = {}
        self.fail_on_next_apply = False

    def ensure_schema(self) -> None:
        self.schema_initialized = True

    def fetch_existing_states(
        self,
        *,
        tenant_id: str,
        source_id: str,
    ) -> dict[str, ExistingEntryState]:
        if not tenant_id.strip():
            raise ValueError("tenant_id مطلوب للاستعلام عن حالة الفهرس.")
        return {
            rec.entry.entry_id: ExistingEntryState(
                entry_id=rec.entry.entry_id,
                content_hash=rec.entry.content_hash,
                embedding_config_id=rec.entry.embedding_config_id,
                indexing_state=rec.entry.indexing_state,
                metadata_fingerprint=rec.entry.metadata_fingerprint,
            )
            for rec in self._records.values()
            if rec.entry.tenant_id == tenant_id and rec.entry.source_id == source_id
        }

    def apply_changes(
        self,
        *,
        tenant_id: str,
        source_id: str,
        upserts: Sequence[IndexedRecord],
        retire_ids: Sequence[str],
    ) -> None:
        if not tenant_id.strip() or not source_id.strip():
            raise ValueError("tenant_id وsource_id مطلوبان للتعديل المعاملاتي.")
        if self.fail_on_next_apply:
            self.fail_on_next_apply = False
            raise RuntimeError("فشل حفظ المعاملة في pgvector.")

        staged = copy.deepcopy(self._records)
        for item in upserts:
            entry = item.entry
            if entry.tenant_id != tenant_id or entry.source_id != source_id:
                raise ValueError("منع تجاوز نطاق المستأجر أو المصدر أثناء الحفظ.")
            validate_safe_semantic_payload(
                searchable_text=entry.searchable_text,
                metadata_payload=entry.metadata_payload,
            )
            if len(item.embedding) != self.dimensions:
                raise ValueError("عدم تطابق أبعاد المتجه مع إعداد المنصة.")
            staged[entry.entry_id] = copy.deepcopy(item)

        retire_set = set(retire_ids)
        for entry_id in list(staged.keys()):
            if entry_id in retire_set:
                rec = staged[entry_id]
                if rec.entry.tenant_id == tenant_id and rec.entry.source_id == source_id:
                    e = rec.entry
                    staged[entry_id] = IndexedRecord(
                        entry=SemanticEntry(
                            entry_id=e.entry_id,
                            tenant_id=e.tenant_id,
                            source_id=e.source_id,
                            schema_name=e.schema_name,
                            schema_qualified_name=e.schema_qualified_name,
                            object_ref=e.object_ref,
                            entry_type=e.entry_type,
                            technical_name=e.technical_name,
                            label_ar=e.label_ar,
                            description_ar=e.description_ar,
                            description_source=e.description_source,
                            classification=e.classification,
                            concepts=e.concepts,
                            synonyms=e.synonyms,
                            searchable_text=e.searchable_text,
                            metadata_payload=e.metadata_payload,
                            metadata_fingerprint=e.metadata_fingerprint,
                            content_hash=e.content_hash,
                            embedding_config_id=e.embedding_config_id,
                            catalog_version=e.catalog_version,
                            rules_version=e.rules_version,
                            indexing_state="retired",
                        ),
                        embedding=rec.embedding,
                    )
        self._records = staged

    def search(
        self,
        query_vector: Sequence[float],
        *,
        tenant_id: str,
        source_ids: Sequence[str] | None = None,
        allowed_views: Sequence[str] | None = None,
        allowed_classifications: Sequence[str] | None = None,
        entry_types: Sequence[str] | None = None,
        limit: int = 10,
    ) -> list[SemanticSearchResult]:
        if not tenant_id.strip():
            raise ValueError("يُمنع البحث الدلالي دون تحديد tenant_id (fail-closed).")
        bounded_limit = max(1, min(int(limit), 50))
        allowed_view_set = set(allowed_views) if allowed_views is not None else None
        allowed_cls_set = (
            {
                str(c).strip().lower()
                for c in allowed_classifications
                if str(c).strip() and str(c).strip().lower() != "blacklist"
            }
            if allowed_classifications is not None
            else None
        )
        if allowed_cls_set is not None and not allowed_cls_set:
            return []
        source_set = set(source_ids) if source_ids is not None else None
        type_set = set(entry_types) if entry_types is not None else None

        hits: list[SemanticSearchResult] = []
        for rec in self._records.values():
            e = rec.entry
            if e.tenant_id != tenant_id or e.indexing_state != "indexed":
                continue
            if e.classification.lower() == "blacklist":
                continue
            if allowed_cls_set is not None and e.classification.lower() not in allowed_cls_set:
                continue
            if source_set is not None and e.source_id not in source_set:
                continue
            if type_set is not None and e.entry_type not in type_set:
                continue
            if allowed_view_set is not None and e.entry_type == "view":
                if e.technical_name not in allowed_view_set:
                    continue
            score = _cosine_similarity(query_vector, rec.embedding)
            hits.append(
                SemanticSearchResult(
                    entry_id=e.entry_id,
                    tenant_id=e.tenant_id,
                    source_id=e.source_id,
                    entry_type=e.entry_type,
                    technical_name=e.technical_name,
                    schema_qualified_name=e.schema_qualified_name,
                    label_ar=e.label_ar,
                    description_ar=e.description_ar,
                    classification=e.classification,
                    score=score,
                    metadata_payload=copy.deepcopy(e.metadata_payload),
                )
            )
        hits.sort(key=lambda r: (-r.score, r.entry_id))
        return hits[:bounded_limit]

    def list_active_views(
        self,
        *,
        tenant_id: str,
        source_id: str | None = None,
        allowed_views: Sequence[str] | None = None,
        allowed_classifications: Sequence[str] | None = None,
    ) -> list[SemanticEntry]:
        if not tenant_id.strip():
            raise ValueError("tenant_id مطلوب لقراءة المشاهد المعتمدة من الفهرس.")
        allowed_set = set(allowed_views) if allowed_views is not None else None
        allowed_cls_set = (
            {
                str(c).strip().lower()
                for c in allowed_classifications
                if str(c).strip() and str(c).strip().lower() != "blacklist"
            }
            if allowed_classifications is not None
            else None
        )
        if allowed_cls_set is not None and not allowed_cls_set:
            return []
        views = [
            copy.deepcopy(rec.entry)
            for rec in self._records.values()
            if rec.entry.tenant_id == tenant_id
            and rec.entry.entry_type == "view"
            and rec.entry.indexing_state == "indexed"
            and rec.entry.classification.lower() != "blacklist"
            and (allowed_cls_set is None or rec.entry.classification.lower() in allowed_cls_set)
            and (source_id is None or rec.entry.source_id == source_id)
            and (allowed_set is None or rec.entry.technical_name in allowed_set)
        ]
        views.sort(key=lambda e: (e.technical_name, e.schema_qualified_name))
        return views

    def snapshot_all(self) -> list[IndexedRecord]:
        """أداة فحص للاختبارات للتحقق من الحالة المخزنة فعلياً."""
        return [copy.deepcopy(rec) for rec in self._records.values()]
