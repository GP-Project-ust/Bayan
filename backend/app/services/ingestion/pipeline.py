"""تنسيق التحميل والتقطيع والتضمين والفهرسة التزايدية."""

import threading
from datetime import datetime, timezone
from pathlib import Path

from app.core.logging import logger
from app.services.ingestion.chunker import ArabicDocumentChunker, ChunkingConfig
from app.services.ingestion.embedder import EmbeddingConfig, OfficialEmbeddingService
from app.services.ingestion.exceptions import (
    DocumentNotFoundError,
    EmptyDocumentError,
    IngestionError,
    InvalidDocumentPathError,
    TenantIsolationError,
    TenantScopeError,
)
from app.services.ingestion.identity import indexing_identity, point_identity
from app.services.ingestion.indexer import QdrantDocumentIndex
from app.services.ingestion.loader import TxtDocumentLoader
from app.services.ingestion.models import (
    DocumentChunk,
    DocumentState,
    IndexedPoint,
    IngestionStats,
    LoadedDocument,
    SearchHit,
    StoredChunk,
)
from app.services.ingestion.repository import IngestionRepository
from app.services.ingestion.tenant_scope import TenantScope, validate_tenant_id

_LOCKS_GUARD = threading.Lock()
_DOCUMENT_LOCKS: dict[tuple[str, str], threading.RLock] = {}


class DocumentIngestionPipeline:
    """خط حتمي قابل لإعادة المحاولة ولا يستبدل الجيل القديم قبل تجهيز الجديد."""

    def __init__(
        self,
        *,
        loader: TxtDocumentLoader,
        chunker: ArabicDocumentChunker,
        embedder: OfficialEmbeddingService,
        index: QdrantDocumentIndex,
        repository: IngestionRepository,
    ) -> None:
        self.loader = loader
        self.chunker = chunker
        self.embedder = embedder
        self.index = index
        self.repository = repository

    def ingest_path(self, path: str | Path, *, source_root: str | Path) -> IngestionStats:
        """تحميل وفهرسة ملف واحد مع اشتقاق ملكيته من رأس موثوق المصدر."""

        document = self.loader.load(path, source_root=source_root)
        self.index.ensure_compatible_collection()
        return self.ingest_document(document)

    def ingest_document(self, document: LoadedDocument) -> IngestionStats:
        """فهرسة مستند محقق أو تخطيه إذا ثبتت سلامة الجيل الحالي."""

        scope = TenantScope.for_ingestion(
            document.metadata.tenant_id,
            document.metadata.security_level,
        )
        lock = _document_lock(scope.tenant_id, document.document_id)
        with lock:
            current = self.repository.get(scope.tenant_id, document.document_id)
            operation_scope = TenantScope(
                tenant_id=scope.tenant_id,
                allowed_security_levels=frozenset(
                    {
                        document.metadata.security_level,
                        *([current.security_level] if current is not None else []),
                    }
                ),
            )
            if self._is_unchanged(document, current):
                assert current is not None
                if self.index.has_complete_generation(scope, current):
                    # التقاعد يشمل كل تصنيفات المستند نفسه داخل المؤسسة؛
                    # document_id مشتق من المؤسسة والمسار، لكن جيلاً قديماً قد
                    # يحمل تصنيفاً سابقاً غير موجود في سياق التشغيل الحالي.
                    retired = self.index.retire_other_generations(
                        TenantScope.trusted_all(scope.tenant_id),
                        document.document_id,
                        current.indexing_key,
                    )
                    return IngestionStats(
                        files=1,
                        chunks=len(current.chunks),
                        skipped_files=1,
                        retired_chunks=retired,
                    )

            chunks = self.chunker.chunk(document)
            indexing_key = indexing_identity(
                document.version_id,
                self.chunker.fingerprint,
                self.embedder.fingerprint,
            )
            vectors, embedded_count, reused_count = self._prepare_vectors(
                operation_scope,
                document,
                chunks,
                current,
            )
            points, stored_chunks = self._prepare_points(
                document,
                chunks,
                vectors,
                indexing_key,
            )
            point_ids = [point.point_id for point in points]
            saved = False
            try:
                self.index.stage_points(points)
                self.index.verify_generation(
                    scope,
                    document.document_id,
                    indexing_key,
                    point_ids,
                    status="staged",
                )
                state = self._build_state(
                    document,
                    stored_chunks,
                    indexing_key,
                )
                self.repository.save_indexed(state)
                saved = True
                self.index.activate_generation(scope, document.document_id, indexing_key)
                self.index.verify_generation(
                    scope,
                    document.document_id,
                    indexing_key,
                    point_ids,
                    status="ready",
                )
                # بعد حفظ الحالة وتفعيل الجيل الجديد والتحقق منه، صار المستند
                # مرجعياً في المستودع. التقاعد الكامل يمنع بقاء نسخة مصنفة
                # سابقاً (مثلاً داخلي -> عام) قابلة للاسترجاع في سياق آخر.
                retired = self.index.retire_other_generations(
                    TenantScope.trusted_all(scope.tenant_id),
                    document.document_id,
                    indexing_key,
                )
            except Exception:
                # الجيل القديم يظل ready. الجيل الجديد staged غير مرئي للبحث.
                try:
                    self.index.cleanup_staged_generation(
                        scope,
                        document.document_id,
                        indexing_key,
                    )
                except IngestionError as cleanup_error:
                    logger.warning(
                        "تعذر تنظيف جيل فهرسة غير مكتمل للمستند %s: %s",
                        document.document_id[:12],
                        type(cleanup_error).__name__,
                    )
                if saved:
                    logger.warning(
                        "حُفظت الحالة المرجعية قبل اكتمال تفعيل Qdrant؛ ستُصالح عند الإعادة"
                    )
                raise

            return IngestionStats(
                files=1,
                chunks=len(chunks),
                indexed_files=1,
                embedded_chunks=embedded_count,
                reused_embeddings=reused_count,
                upserted_chunks=len(points),
                retired_chunks=retired,
            )

    def sync_directory(
        self,
        source_root: str | Path,
        *,
        retire_missing: bool = False,
        authorized_tenants: frozenset[str] | None = None,
    ) -> IngestionStats:
        """مزامنة TXT بعد تحميل الجميع بنجاح، والحذف يتطلب تفويضاً صريحاً."""

        try:
            root = Path(source_root).resolve(strict=True)
        except (OSError, RuntimeError) as exc:
            raise InvalidDocumentPathError("مجلد المستندات غير متاح") from exc
        if not root.is_dir():
            raise InvalidDocumentPathError("جذر المستندات ليس مجلداً")

        files = sorted(path for path in root.glob("*.txt") if path.is_file())
        if retire_missing:
            if not authorized_tenants:
                raise TenantScopeError("سحب المستندات المفقودة يتطلب نطاق مؤسسات صريحاً")
            normalized_tenants = frozenset(validate_tenant_id(item) for item in authorized_tenants)
        else:
            normalized_tenants = frozenset()
        if not files and not retire_missing:
            raise EmptyDocumentError("لا توجد مستندات TXT في النطاق المحدد")

        # التحميل الكامل أولاً يمنع تفسير فشل ملف أو مجلد مؤقت بوصفه حذفاً.
        documents = [self.loader.load(path, source_root=root) for path in files]
        if retire_missing:
            unexpected = {
                document.metadata.tenant_id
                for document in documents
                if document.metadata.tenant_id not in normalized_tenants
            }
            if unexpected:
                raise TenantScopeError("يتضمن مجلد المزامنة مؤسسة خارج النطاق المصرح")

        self.index.ensure_compatible_collection()
        stats = IngestionStats()
        for document in documents:
            stats.merge(self.ingest_document(document))

        if retire_missing:
            found_ids = {document.document_id for document in documents}
            states = self.repository.list_by_source_directory(str(root), normalized_tenants)
            for state in states:
                if state.document_id in found_ids:
                    continue
                scope = TenantScope.trusted_all(state.tenant_id)
                retired_chunks = self.withdraw(scope, state.document_id)
                stats.retired_files += 1
                stats.retired_chunks += retired_chunks
        return stats

    def search(
        self,
        scope: TenantScope,
        query: str,
        *,
        top_k: int = 5,
    ) -> list[SearchHit]:
        """بحث متجهي ثم إعادة نص مرجعي من المستودع لا من حمولة Qdrant.

        حمولة Qdrant قد تكون قديمة أو تعرضت للعبث. لذلك تُستخدم فقط لاختيار
        المرشحين، بينما يأتي النص والتصنيف والاستشهاد من الحالة المرجعية
        الحالية. أي مرشح لا يطابقها يُسقط بصمت (fail closed) بدل كسر البحث
        كله أو إعادة محتوى غير موثوق.
        """

        if not isinstance(scope, TenantScope):
            raise TenantIsolationError("البحث دون سياق مؤسسة ممنوع")
        if not isinstance(query, str) or not query.strip():
            raise ValueError("query must not be empty")
        if not 1 <= top_k <= 100:
            raise ValueError("top_k must be between 1 and 100")
        vector = self.embedder.embed([query.strip()])[0]
        candidates = self.index.search(scope, vector, top_k=min(top_k * 3, 100))
        verified: list[SearchHit] = []
        state_cache: dict[str, DocumentState | None] = {}
        for hit in candidates:
            document_id = str(hit.payload.get("document_id", ""))
            if not document_id:
                continue
            if document_id not in state_cache:
                state_cache[document_id] = self.repository.get(scope.tenant_id, document_id)
            state = state_cache[document_id]
            if state is None or state.status != "indexed":
                continue
            if state.tenant_id != scope.tenant_id:
                continue
            # مرشح قديم بتصنيف لم يعد مصرحاً به لهذا السياق: أُسقط ولا يُرفع
            # استثناء، كي لا يتحول وجود بقايا فهرسة إلى تعطيل البحث كله.
            if state.security_level not in scope.allowed_security_levels:
                continue
            if hit.payload.get("version_id") != state.version_id:
                continue
            if hit.payload.get("indexing_key") != state.indexing_key:
                continue
            stored = {chunk.qdrant_point_id: chunk for chunk in state.chunks}.get(hit.point_id)
            if stored is None or hit.payload.get("chunk_id") != stored.chunk_id:
                continue
            if hit.payload.get("security_level") != state.security_level:
                logger.warning(
                    "حمولة Qdrant لا تطابق التصنيف المرجعي للمستند %s؛ سيُستخدم المصدر المرجعي",
                    document_id[:12],
                )
            authoritative = self._authoritative_payload(hit.payload, state, stored)
            verified.append(
                SearchHit(
                    point_id=stored.qdrant_point_id,
                    score=hit.score,
                    payload=authoritative,
                )
            )
            if len(verified) >= top_k:
                break
        return verified

    def withdraw(self, scope: TenantScope, document_id: str) -> int:
        """سحب مستند مفوض وإبقاء سجلاته العلائقية التاريخية."""

        if not isinstance(scope, TenantScope):
            raise TenantIsolationError("سياق المؤسسة إلزامي لسحب المستند")
        state = self.repository.get(scope.tenant_id, document_id)
        if state is None:
            raise DocumentNotFoundError("المستند غير موجود داخل النطاق المصرح")
        # التفويض يُفحص على الحالة المرجعية أولاً. بعدها يجوز تنظيف كل أجيال
        # المستند نفسه داخل المؤسسة، بما فيها بقايا تصنيف قديم لم يُقاعد سابقاً.
        scope.require_level(state.security_level)
        retired = self.index.withdraw_document(
            TenantScope.trusted_all(scope.tenant_id),
            document_id,
        )
        self.repository.mark_withdrawn(scope.tenant_id, document_id)
        return retired

    def _authoritative_payload(
        self,
        original: dict,
        state: DocumentState,
        chunk: StoredChunk,
    ) -> dict:
        """دمج حمولة Qdrant مع الحقول المرجعية الحاسمة من المستودع.

        تُحفظ الحقول الإضافية غير المعروفة كما هي للتوافق، لكن كل حقل يشارك
        في العزل أو الهوية أو الاستشهاد أو نص النتيجة يُستبدل بقيمة المستودع.
        """

        payload = dict(original)
        payload.update(
            {
                # حقول العقد القديم المعتمدة في Issue #7.
                "tenant": state.tenant_id,
                "document": state.title,
                "version": state.version_no,
                "section": chunk.section,
                "classification": state.security_level,
                "text": chunk.content,
                "source_file": state.source_reference,
                # حقول الفصل الرابع والتحقق المرجعي.
                "tenant_id": state.tenant_id,
                "document_id": state.document_id,
                "version_id": state.version_id,
                "chunk_id": chunk.chunk_id,
                "page_number": chunk.page_number,
                "security_level": state.security_level,
                "title": state.title,
                "document_type": state.document_type,
                "document_status": state.status,
                "version_no": state.version_no,
                "chunk_no": chunk.chunk_no,
                "content": chunk.content,
                "article_id": chunk.article_id,
                "start_offset": chunk.start_offset,
                "end_offset": chunk.end_offset,
                "source_reference": chunk.source_reference,
                "file_hash": state.file_hash,
                "content_hash": chunk.content_hash,
                "embedding_text_hash": chunk.embedding_text_hash,
                "document_identity_sha256": state.document_id,
                "version_identity_sha256": state.version_id,
                "chunk_identity_sha256": chunk.chunk_id,
                "point_identity_sha256": chunk.point_identity_sha256,
                "chunking_fingerprint": state.chunking_fingerprint,
                "embedding_fingerprint": state.embedding_fingerprint,
                "embedding_provider": self.embedder.config.provider,
                "embedding_model": self.embedder.config.model,
                "embedding_dimensions": self.embedder.config.dimensions,
                "indexing_key": state.indexing_key,
                "indexing_status": "ready",
            }
        )
        return payload

    def _is_unchanged(
        self,
        document: LoadedDocument,
        current: DocumentState | None,
    ) -> bool:
        return bool(
            current
            and current.status == "indexed"
            and current.file_hash == document.file_hash
            and current.version_id == document.version_id
            and current.chunking_fingerprint == self.chunker.fingerprint
            and current.embedding_fingerprint == self.embedder.fingerprint
            and current.security_level == document.metadata.security_level
        )

    def _prepare_vectors(
        self,
        scope: TenantScope,
        document: LoadedDocument,
        chunks: list[DocumentChunk],
        current: DocumentState | None,
    ) -> tuple[dict[str, list[float]], int, int]:
        reusable: dict[str, list[float]] = {}
        if current and current.embedding_fingerprint == self.embedder.fingerprint:
            old_vectors = self.index.fetch_vectors(
                scope,
                document.document_id,
                [chunk.qdrant_point_id for chunk in current.chunks],
            )
            for old_chunk in current.chunks:
                vector = old_vectors.get(old_chunk.qdrant_point_id)
                if vector is not None:
                    reusable.setdefault(old_chunk.embedding_text_hash, vector)

        vectors: dict[str, list[float]] = {}
        missing: list[DocumentChunk] = []
        for chunk in chunks:
            vector = reusable.get(chunk.embedding_text_hash)
            if vector is None:
                missing.append(chunk)
            else:
                vectors[chunk.chunk_id] = vector

        embedded = self.embedder.embed([chunk.normalized_content for chunk in missing])
        for chunk, vector in zip(missing, embedded, strict=True):
            vectors[chunk.chunk_id] = vector
        return vectors, len(missing), len(chunks) - len(missing)

    def _prepare_points(
        self,
        document: LoadedDocument,
        chunks: list[DocumentChunk],
        vectors: dict[str, list[float]],
        indexing_key: str,
    ) -> tuple[list[IndexedPoint], tuple[StoredChunk, ...]]:
        points: list[IndexedPoint] = []
        stored: list[StoredChunk] = []
        metadata = document.metadata
        for chunk in chunks:
            point_sha, point_id = point_identity(chunk.chunk_id, self.embedder.fingerprint)
            source_reference = f"{chunk.source_reference}#{chunk.article_id or chunk.chunk_no}"
            payload = {
                # حقول التوافق المعتمدة في Issue #7 والواجهة الحالية.
                "tenant": metadata.tenant_id,
                "document": metadata.title,
                "version": metadata.version_no,
                "section": chunk.section,
                "classification": metadata.security_level,
                "text": chunk.content,
                "source_file": document.source_reference,
                # الحقول القانونية في تصميم الفصل الرابع.
                "tenant_id": metadata.tenant_id,
                "document_id": document.document_id,
                "version_id": document.version_id,
                "chunk_id": chunk.chunk_id,
                "page_number": chunk.page_number,
                "security_level": metadata.security_level,
                # التتبع والتزايدية والاستشهاد دون اختلاق رقم صفحة.
                "title": metadata.title,
                "document_type": metadata.document_type,
                "document_status": metadata.status,
                "version_no": metadata.version_no,
                "chunk_no": chunk.chunk_no,
                "content": chunk.content,
                "article_id": chunk.article_id,
                "start_offset": chunk.start_offset,
                "end_offset": chunk.end_offset,
                "source_reference": source_reference,
                "file_hash": document.file_hash,
                "content_hash": chunk.content_hash,
                "embedding_text_hash": chunk.embedding_text_hash,
                "document_identity_sha256": document.document_id,
                "version_identity_sha256": document.version_id,
                "chunk_identity_sha256": chunk.chunk_id,
                "point_identity_sha256": point_sha,
                "chunking_fingerprint": self.chunker.fingerprint,
                "embedding_fingerprint": self.embedder.fingerprint,
                "embedding_provider": self.embedder.config.provider,
                "embedding_model": self.embedder.config.model,
                "embedding_dimensions": self.embedder.config.dimensions,
                "indexing_key": indexing_key,
            }
            points.append(
                IndexedPoint(
                    point_id=point_id,
                    point_identity_sha256=point_sha,
                    vector=vectors[chunk.chunk_id],
                    payload=payload,
                )
            )
            stored.append(
                StoredChunk(
                    chunk_id=chunk.chunk_id,
                    chunk_no=chunk.chunk_no,
                    content=chunk.content,
                    normalized_content=chunk.normalized_content,
                    content_hash=chunk.content_hash,
                    embedding_text_hash=chunk.embedding_text_hash,
                    section=chunk.section,
                    article_id=chunk.article_id,
                    start_offset=chunk.start_offset,
                    end_offset=chunk.end_offset,
                    source_reference=source_reference,
                    page_number=chunk.page_number,
                    qdrant_point_id=point_id,
                    point_identity_sha256=point_sha,
                )
            )
        return points, tuple(stored)

    def _build_state(
        self,
        document: LoadedDocument,
        chunks: tuple[StoredChunk, ...],
        indexing_key: str,
    ) -> DocumentState:
        return DocumentState(
            document_id=document.document_id,
            tenant_id=document.metadata.tenant_id,
            title=document.metadata.title,
            document_type=document.metadata.document_type,
            security_level=document.metadata.security_level,
            status="indexed",
            source_path=str(document.path),
            source_directory=str(document.source_root),
            source_reference=document.source_reference,
            version_id=document.version_id,
            version_no=document.metadata.version_no,
            file_hash=document.file_hash,
            chunking_fingerprint=self.chunker.fingerprint,
            embedding_fingerprint=self.embedder.fingerprint,
            indexing_key=indexing_key,
            indexed_at=datetime.now(timezone.utc).isoformat(),
            chunks=chunks,
        )


def build_ingestion_pipeline(
    *,
    qdrant_client: object,
    repository: IngestionRepository,
    chunk_size: int = 1200,
    overlap: int = 120,
    embedding_batch_size: int = 32,
) -> DocumentIngestionPipeline:
    """مصنع ربط افتراضي يستخدم مصانع المشروع الرسمية ولا ينشئ بديلاً لها."""

    embedding_config = EmbeddingConfig.from_settings(batch_size=embedding_batch_size)
    embedder = OfficialEmbeddingService(config=embedding_config)
    return DocumentIngestionPipeline(
        loader=TxtDocumentLoader(),
        chunker=ArabicDocumentChunker(ChunkingConfig(chunk_size=chunk_size, overlap=overlap)),
        embedder=embedder,
        index=QdrantDocumentIndex(
            qdrant_client,
            dimensions=embedding_config.dimensions,
        ),
        repository=repository,
    )


def _document_lock(tenant_id: str, document_id: str) -> threading.RLock:
    key = (tenant_id, document_id)
    with _LOCKS_GUARD:
        return _DOCUMENT_LOCKS.setdefault(key, threading.RLock())
