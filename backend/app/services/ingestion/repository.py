"""مستودع الحالة المرجعية للفهرسة مع مخطط متوافق مع ERD الأكاديمي.

لا توجد migrations معتمدة لكيانات المستندات في المستودع الرسمي بعد. لذلك
يوفر هذا الملف عقداً قابلاً لاستبدال تطبيقه، وتطبيق SQLite محلياً لصفحة
التطوير والاختبارات. أسماء الجداول والحقول الأساسية تطابق ``documents`` و
``document_versions`` و``document_chunks`` تمهيداً لمحوّل PostgreSQL لاحق.
"""

import sqlite3
import threading
from collections.abc import Iterator
from contextlib import contextmanager
from dataclasses import replace
from pathlib import Path
from typing import Protocol

from app.services.ingestion.exceptions import RepositoryError
from app.services.ingestion.models import DocumentState, StoredChunk


class IngestionRepository(Protocol):
    """العقد الأدنى لدورة حياة الفهرسة دون ربطها بمحرك علائقي بعينه."""

    def get(self, tenant_id: str, document_id: str) -> DocumentState | None:
        """إرجاع الحالة الحالية داخل مؤسسة واحدة فقط."""

    def save_indexed(self, state: DocumentState) -> None:
        """حفظ إصدار ومقاطعه بوصفه الجيل المفهرس الحالي."""

    def list_by_source_directory(
        self,
        source_directory: str,
        tenant_ids: frozenset[str],
    ) -> list[DocumentState]:
        """سرد النطاق المصرح فقط لأغراض مزامنة الحذف الصريح."""

    def mark_withdrawn(self, tenant_id: str, document_id: str) -> None:
        """سحب الإتاحة مع إبقاء المرجع التاريخي."""


class InMemoryIngestionRepository:
    """مستودع معزول سريع لاختبارات الوحدة."""

    def __init__(self) -> None:
        self._states: dict[tuple[str, str], DocumentState] = {}
        self._lock = threading.RLock()

    def get(self, tenant_id: str, document_id: str) -> DocumentState | None:
        with self._lock:
            return self._states.get((tenant_id, document_id))

    def save_indexed(self, state: DocumentState) -> None:
        with self._lock:
            self._states[(state.tenant_id, state.document_id)] = state

    def list_by_source_directory(
        self,
        source_directory: str,
        tenant_ids: frozenset[str],
    ) -> list[DocumentState]:
        with self._lock:
            return sorted(
                (
                    state
                    for state in self._states.values()
                    if state.source_directory == source_directory
                    and state.tenant_id in tenant_ids
                    and state.status != "withdrawn"
                ),
                key=lambda item: (item.tenant_id, item.source_reference),
            )

    def mark_withdrawn(self, tenant_id: str, document_id: str) -> None:
        with self._lock:
            key = (tenant_id, document_id)
            state = self._states.get(key)
            if state is None:
                return
            self._states[key] = replace(state, status="withdrawn")


class SQLiteIngestionRepository:
    """حالة علائقية محلية متينة لبيئة التطوير إلى حين اعتماد migrations.

    يستخدم كل إجراء اتصالاً قصير العمر ومعاملة ``BEGIN IMMEDIATE`` للكتابة،
    ما يمنع تلف الملف عند تزامن خيوط عملية FastAPI الواحدة ويجعل الاستبدال
    الذري للمقاطع قابلاً لإعادة المحاولة.
    """

    _SCHEMA = """
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS documents (
        document_id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        title TEXT NOT NULL,
        document_type TEXT NOT NULL,
        security_level TEXT NOT NULL,
        status TEXT NOT NULL,
        source_path TEXT NOT NULL,
        source_directory TEXT NOT NULL,
        source_reference TEXT NOT NULL,
        current_version_id TEXT,
        current_indexing_key TEXT,
        updated_at TEXT NOT NULL,
        UNIQUE (tenant_id, source_path)
    );
    CREATE INDEX IF NOT EXISTS idx_documents_source_scope
        ON documents (source_directory, tenant_id, status);

    CREATE TABLE IF NOT EXISTS document_versions (
        version_id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL REFERENCES documents(document_id),
        version_no TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_hash TEXT NOT NULL,
        created_at TEXT NOT NULL,
        indexed_at TEXT NOT NULL,
        chunking_fingerprint TEXT NOT NULL,
        embedding_fingerprint TEXT NOT NULL,
        indexing_key TEXT NOT NULL,
        status TEXT NOT NULL,
        UNIQUE (document_id, version_id)
    );
    CREATE INDEX IF NOT EXISTS idx_document_versions_document
        ON document_versions (document_id, status);

    CREATE TABLE IF NOT EXISTS document_chunks (
        chunk_id TEXT PRIMARY KEY,
        version_id TEXT NOT NULL REFERENCES document_versions(version_id),
        chunk_no INTEGER NOT NULL,
        content TEXT NOT NULL,
        normalized_content TEXT NOT NULL,
        content_hash TEXT NOT NULL,
        embedding_text_hash TEXT NOT NULL,
        section TEXT NOT NULL,
        article_id TEXT,
        start_offset INTEGER NOT NULL,
        end_offset INTEGER NOT NULL,
        source_reference TEXT NOT NULL,
        page_no INTEGER,
        qdrant_point_id TEXT NOT NULL,
        point_identity_sha256 TEXT NOT NULL,
        UNIQUE (version_id, chunk_no)
    );
    CREATE INDEX IF NOT EXISTS idx_document_chunks_version
        ON document_chunks (version_id, chunk_no);
    """

    def __init__(self, database_path: str | Path) -> None:
        self.database_path = Path(database_path)
        try:
            self.database_path.parent.mkdir(parents=True, exist_ok=True)
        except OSError as exc:
            raise RepositoryError("تعذر تهيئة مسار مخزن حالة الفهرسة") from exc
        self._lock = threading.RLock()
        self._initialize()

    def get(self, tenant_id: str, document_id: str) -> DocumentState | None:
        try:
            with self._connect() as connection:
                document = connection.execute(
                    """
                    SELECT * FROM documents
                    WHERE tenant_id = ? AND document_id = ?
                    """,
                    (tenant_id, document_id),
                ).fetchone()
                if document is None or document["current_version_id"] is None:
                    return None
                version = connection.execute(
                    "SELECT * FROM document_versions WHERE version_id = ?",
                    (document["current_version_id"],),
                ).fetchone()
                if version is None:
                    raise RepositoryError("الحالة المرجعية للمستند غير مكتملة")
                chunk_rows = connection.execute(
                    """
                    SELECT * FROM document_chunks
                    WHERE version_id = ? ORDER BY chunk_no ASC
                    """,
                    (version["version_id"],),
                ).fetchall()
                return self._to_state(document, version, chunk_rows)
        except RepositoryError:
            raise
        except sqlite3.Error as exc:
            raise RepositoryError("تعذر قراءة حالة فهرسة المستند") from exc

    def save_indexed(self, state: DocumentState) -> None:
        try:
            with self._lock, self._connect() as connection:
                connection.execute("BEGIN IMMEDIATE")
                existing = connection.execute(
                    "SELECT tenant_id, current_version_id FROM documents WHERE document_id = ?",
                    (state.document_id,),
                ).fetchone()
                if existing is not None and existing["tenant_id"] != state.tenant_id:
                    raise RepositoryError("تعارض هوية المستند مع نطاق المؤسسة")

                connection.execute(
                    """
                    INSERT INTO documents (
                        document_id, tenant_id, title, document_type, security_level,
                        status, source_path, source_directory, source_reference,
                        current_version_id, current_indexing_key, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?)
                    ON CONFLICT(document_id) DO UPDATE SET
                        title = excluded.title,
                        document_type = excluded.document_type,
                        security_level = excluded.security_level,
                        status = excluded.status,
                        source_path = excluded.source_path,
                        source_directory = excluded.source_directory,
                        source_reference = excluded.source_reference,
                        updated_at = excluded.updated_at
                    """,
                    (
                        state.document_id,
                        state.tenant_id,
                        state.title,
                        state.document_type,
                        state.security_level,
                        state.status,
                        state.source_path,
                        state.source_directory,
                        state.source_reference,
                        state.indexed_at,
                    ),
                )

                previous_version = existing["current_version_id"] if existing else None
                if previous_version and previous_version != state.version_id:
                    connection.execute(
                        "UPDATE document_versions SET status = 'superseded' WHERE version_id = ?",
                        (previous_version,),
                    )

                connection.execute(
                    """
                    INSERT INTO document_versions (
                        version_id, document_id, version_no, file_path, file_hash,
                        created_at, indexed_at, chunking_fingerprint,
                        embedding_fingerprint, indexing_key, status
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'indexed')
                    ON CONFLICT(version_id) DO UPDATE SET
                        version_no = excluded.version_no,
                        file_path = excluded.file_path,
                        file_hash = excluded.file_hash,
                        indexed_at = excluded.indexed_at,
                        chunking_fingerprint = excluded.chunking_fingerprint,
                        embedding_fingerprint = excluded.embedding_fingerprint,
                        indexing_key = excluded.indexing_key,
                        status = 'indexed'
                    """,
                    (
                        state.version_id,
                        state.document_id,
                        state.version_no,
                        state.source_path,
                        state.file_hash,
                        state.indexed_at,
                        state.indexed_at,
                        state.chunking_fingerprint,
                        state.embedding_fingerprint,
                        state.indexing_key,
                    ),
                )
                connection.execute(
                    "DELETE FROM document_chunks WHERE version_id = ?",
                    (state.version_id,),
                )
                connection.executemany(
                    """
                    INSERT INTO document_chunks (
                        chunk_id, version_id, chunk_no, content, normalized_content,
                        content_hash, embedding_text_hash, section, article_id,
                        start_offset, end_offset, source_reference, page_no,
                        qdrant_point_id, point_identity_sha256
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    [
                        (
                            chunk.chunk_id,
                            state.version_id,
                            chunk.chunk_no,
                            chunk.content,
                            chunk.normalized_content,
                            chunk.content_hash,
                            chunk.embedding_text_hash,
                            chunk.section,
                            chunk.article_id,
                            chunk.start_offset,
                            chunk.end_offset,
                            chunk.source_reference,
                            chunk.page_number,
                            chunk.qdrant_point_id,
                            chunk.point_identity_sha256,
                        )
                        for chunk in state.chunks
                    ],
                )
                connection.execute(
                    """
                    UPDATE documents
                    SET current_version_id = ?, current_indexing_key = ?,
                        status = 'indexed', updated_at = ?
                    WHERE document_id = ? AND tenant_id = ?
                    """,
                    (
                        state.version_id,
                        state.indexing_key,
                        state.indexed_at,
                        state.document_id,
                        state.tenant_id,
                    ),
                )
                connection.commit()
        except RepositoryError:
            raise
        except sqlite3.Error as exc:
            raise RepositoryError("تعذر حفظ حالة فهرسة المستند") from exc

    def list_by_source_directory(
        self,
        source_directory: str,
        tenant_ids: frozenset[str],
    ) -> list[DocumentState]:
        if not tenant_ids:
            return []
        placeholders = ",".join("?" for _ in tenant_ids)
        parameters = [source_directory, *sorted(tenant_ids)]
        try:
            with self._connect() as connection:
                rows = connection.execute(
                    f"""
                    SELECT document_id, tenant_id FROM documents
                    WHERE source_directory = ?
                      AND tenant_id IN ({placeholders})
                      AND status != 'withdrawn'
                    ORDER BY tenant_id, source_reference
                    """,  # noqa: S608 — placeholders only; count comes from trusted set length
                    parameters,
                ).fetchall()
            states = [self.get(row["tenant_id"], row["document_id"]) for row in rows]
            return [state for state in states if state is not None]
        except sqlite3.Error as exc:
            raise RepositoryError("تعذر سرد نطاق مزامنة المستندات") from exc

    def mark_withdrawn(self, tenant_id: str, document_id: str) -> None:
        try:
            with self._lock, self._connect() as connection:
                connection.execute("BEGIN IMMEDIATE")
                row = connection.execute(
                    """
                    SELECT current_version_id FROM documents
                    WHERE tenant_id = ? AND document_id = ?
                    """,
                    (tenant_id, document_id),
                ).fetchone()
                if row is None:
                    connection.rollback()
                    return
                connection.execute(
                    """
                    UPDATE documents SET status = 'withdrawn'
                    WHERE tenant_id = ? AND document_id = ?
                    """,
                    (tenant_id, document_id),
                )
                if row["current_version_id"]:
                    connection.execute(
                        "UPDATE document_versions SET status = 'withdrawn' WHERE version_id = ?",
                        (row["current_version_id"],),
                    )
                connection.commit()
        except sqlite3.Error as exc:
            raise RepositoryError("تعذر تحديث دورة حياة المستند") from exc

    def _initialize(self) -> None:
        try:
            with self._lock, self._connect() as connection:
                connection.executescript(self._SCHEMA)
        except sqlite3.Error as exc:
            raise RepositoryError("تعذر تهيئة مخزن حالة الفهرسة") from exc

    @contextmanager
    def _connect(self) -> Iterator[sqlite3.Connection]:
        """اتصال قصير العمر يُغلق دائماً حتى على مسار الاستثناء.

        ``with sqlite3.Connection`` يعالج المعاملة فقط ولا يغلق المقبض؛ ترك
        الاتصالات مفتوحة كان يبقي ملف SQLite مقفلاً على Windows ويمنع تدوير
        الحالة أو اختبارات العزل من تنظيف مجلدها المؤقت.
        """

        connection = sqlite3.connect(self.database_path, timeout=10)
        try:
            connection.row_factory = sqlite3.Row
            connection.execute("PRAGMA foreign_keys = ON")
            connection.execute("PRAGMA busy_timeout = 10000")
            yield connection
        finally:
            connection.close()

    @staticmethod
    def _to_state(
        document: sqlite3.Row,
        version: sqlite3.Row,
        chunk_rows: list[sqlite3.Row],
    ) -> DocumentState:
        chunks = tuple(
            StoredChunk(
                chunk_id=row["chunk_id"],
                chunk_no=row["chunk_no"],
                content=row["content"],
                normalized_content=row["normalized_content"],
                content_hash=row["content_hash"],
                embedding_text_hash=row["embedding_text_hash"],
                section=row["section"],
                article_id=row["article_id"],
                start_offset=row["start_offset"],
                end_offset=row["end_offset"],
                source_reference=row["source_reference"],
                page_number=row["page_no"],
                qdrant_point_id=row["qdrant_point_id"],
                point_identity_sha256=row["point_identity_sha256"],
            )
            for row in chunk_rows
        )
        return DocumentState(
            document_id=document["document_id"],
            tenant_id=document["tenant_id"],
            title=document["title"],
            document_type=document["document_type"],
            security_level=document["security_level"],
            status=document["status"],
            source_path=document["source_path"],
            source_directory=document["source_directory"],
            source_reference=document["source_reference"],
            version_id=version["version_id"],
            version_no=version["version_no"],
            file_hash=version["file_hash"],
            chunking_fingerprint=version["chunking_fingerprint"],
            embedding_fingerprint=version["embedding_fingerprint"],
            indexing_key=version["indexing_key"],
            indexed_at=version["indexed_at"],
            chunks=chunks,
        )
