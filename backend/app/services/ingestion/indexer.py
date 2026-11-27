"""عمليات Qdrant المجمعة والمقيدة دائماً بسياق المؤسسة."""

from collections.abc import Callable, Iterable, Sequence
from typing import Any, TypeVar

from qdrant_client.http import models as qmodels

from app.core.qdrant import QDRANT_POLICIES_COLLECTION, ensure_collection
from app.services.ingestion.exceptions import (
    CollectionConfigurationError,
    IndexVerificationError,
    QdrantOperationError,
    TenantIsolationError,
    VectorDimensionError,
)
from app.services.ingestion.models import DocumentState, IndexedPoint, SearchHit
from app.services.ingestion.tenant_scope import TenantScope

_T = TypeVar("_T")

# كل حقل يشارك في العزل أو الهوية أو دورة الحياة أو الاستشهاد أو نص النتيجة.
# تحديث الحمولة العامة يجب ألا يستطيع تحويل مقطع داخلي إلى عام، أو استبدال
# نص مرجعي بنص مزيف، أو إدخال نقطة في جيل فهرسة آخر.
_PROTECTED_PAYLOAD_FIELDS = frozenset(
    {
        "tenant",
        "tenant_id",
        "document",
        "document_id",
        "document_identity_sha256",
        "version",
        "version_id",
        "version_no",
        "version_identity_sha256",
        "section",
        "classification",
        "security_level",
        "indexing_status",
        "indexing_key",
        "chunk_id",
        "chunk_no",
        "chunk_identity_sha256",
        "point_identity_sha256",
        "title",
        "text",
        "content",
        "content_hash",
        "embedding_text_hash",
        "file_hash",
        "source_file",
        "source_reference",
        "article_id",
        "page_number",
        "start_offset",
        "end_offset",
        "document_status",
        "status",
        "document_type",
        "chunking_fingerprint",
        "embedding_fingerprint",
        "embedding_provider",
        "embedding_model",
        "embedding_dimensions",
    }
)


class QdrantDocumentIndex:
    """واجهة Qdrant وحيدة لخط المستندات، بمنع البحث غير المقيد."""

    def __init__(
        self,
        client: Any,
        *,
        dimensions: int,
        collection_name: str = QDRANT_POLICIES_COLLECTION,
        upsert_batch_size: int = 64,
        max_retries: int = 1,
    ) -> None:
        if dimensions <= 0 or upsert_batch_size <= 0 or max_retries < 0:
            raise ValueError("invalid Qdrant index configuration")
        self.client = client
        self.dimensions = dimensions
        self.collection_name = collection_name
        self.upsert_batch_size = upsert_batch_size
        self.max_retries = max_retries

    def ensure_compatible_collection(self) -> bool:
        """إنشاء المجموعة عند غيابها والتحقق من إعداد الموجودة دون حذفها."""

        try:
            created = ensure_collection(
                self.client,
                name=self.collection_name,
                dimensions=self.dimensions,
            )
            info = self.client.get_collection(self.collection_name)
            vectors = info.config.params.vectors
            size = getattr(vectors, "size", None)
            distance = getattr(vectors, "distance", None)
            distance_value = getattr(distance, "value", str(distance)).lower()
            if size != self.dimensions or distance_value != "cosine":
                raise CollectionConfigurationError(
                    "إعداد مجموعة bayan_policies غير متوافق؛ لن تُحذف أو يعاد إنشاؤها تلقائياً"
                )
            return created
        except CollectionConfigurationError:
            raise
        except Exception as exc:  # noqa: BLE001 — توحيد حد خدمة Qdrant
            raise QdrantOperationError("تعذر تجهيز مجموعة فهرسة المستندات") from exc

    def has_complete_generation(self, scope: TenantScope, state: DocumentState) -> bool:
        """إثبات أن جميع نقاط الحالة الحالية فقط موجودة وجاهزة للبحث."""

        if state.status != "indexed":
            return False
        try:
            if not self.client.collection_exists(self.collection_name):
                return False
        except Exception as exc:  # noqa: BLE001
            raise QdrantOperationError("تعذر فحص مجموعة فهرسة المستندات") from exc

        expected = {chunk.qdrant_point_id for chunk in state.chunks}
        if not expected:
            return False
        query_filter = self._document_filter(
            scope,
            state.document_id,
            indexing_key=state.indexing_key,
            indexing_status="ready",
        )
        actual = {str(record.id) for record in self._scroll(query_filter, with_vectors=False)}
        return actual == expected

    def fetch_vectors(
        self,
        scope: TenantScope,
        document_id: str,
        point_ids: Sequence[str],
    ) -> dict[str, list[float]]:
        """قراءة متجهات نقاط معلومة عبر فلتر المؤسسة والمستند وHasId."""

        vectors: dict[str, list[float]] = {}
        for batch in _batches(point_ids, 128):
            query_filter = self._document_filter(scope, document_id, point_ids=batch)
            for record in self._scroll(query_filter, with_vectors=True):
                vector = record.vector
                if not isinstance(vector, list) or len(vector) != self.dimensions:
                    continue
                vectors[str(record.id)] = [float(value) for value in vector]
        return vectors

    def stage_points(self, points: Sequence[IndexedPoint]) -> None:
        """رفع جيل جديد بحالة staged؛ البحث لا يراه قبل التفعيل."""

        for point in points:
            if len(point.vector) != self.dimensions:
                raise VectorDimensionError("أبعاد نقطة Qdrant لا تطابق المجموعة")
        for batch in _batches(points, self.upsert_batch_size):
            structs = [
                qmodels.PointStruct(
                    id=point.point_id,
                    vector=point.vector,
                    payload={**point.payload, "indexing_status": "staged"},
                )
                for point in batch
            ]
            self._write(
                lambda structs=structs: self.client.upsert(
                    collection_name=self.collection_name,
                    points=structs,
                    wait=True,
                ),
                "تعذر رفع دفعة مقاطع إلى Qdrant",
            )

    def verify_generation(
        self,
        scope: TenantScope,
        document_id: str,
        indexing_key: str,
        point_ids: Iterable[str],
        *,
        status: str,
    ) -> None:
        """التحقق الفعلي من اكتمال جيل قبل تغيير حالة القديم."""

        expected = set(point_ids)
        query_filter = self._document_filter(
            scope,
            document_id,
            indexing_key=indexing_key,
            indexing_status=status,
        )
        actual = {str(record.id) for record in self._scroll(query_filter, with_vectors=False)}
        if actual != expected:
            raise IndexVerificationError("لم يكتمل التحقق من نقاط جيل الفهرسة الجديد")

    def activate_generation(
        self,
        scope: TenantScope,
        document_id: str,
        indexing_key: str,
    ) -> int:
        """تفعيل نقاط staged داخل نطاق المؤسسة والمستند والجيل فقط."""

        query_filter = self._document_filter(
            scope,
            document_id,
            indexing_key=indexing_key,
            indexing_status="staged",
        )
        count = self._count(query_filter)
        if count:
            self._write(
                lambda: self.client.set_payload(
                    collection_name=self.collection_name,
                    payload={"indexing_status": "ready"},
                    points=query_filter,
                    wait=True,
                ),
                "تعذر تفعيل جيل الفهرسة الجديد",
            )
        return count

    def retire_other_generations(
        self,
        scope: TenantScope,
        document_id: str,
        current_indexing_key: str,
    ) -> int:
        """حذف كل أجيال المستند نفسه داخل المؤسسة بعد نجاح الجيل الحالي.

        الفلتر هنا بالـ``tenant_id`` والـ``document_id`` فقط، لأن معرف المستند
        مشتق من المؤسسة والمسار. لذلك لا يلزم أن يحمل الجيل القديم التصنيف
        الحالي؛ وقد يكون تصنيفه قديماً أو حتى غير معروف بعد تعرض الحمولة للعبث.
        لا يمكن أن يتجاوز الحذف حدود المؤسسة لأنه لا يطابق مستنداً آخر.
        """

        query_filter = self._document_filter(
            scope,
            document_id,
            excluded_indexing_key=current_indexing_key,
            include_all_classifications=True,
        )
        return self._delete_filter(query_filter, "تعذر تقاعد مقاطع الإصدار السابق")

    def cleanup_staged_generation(
        self,
        scope: TenantScope,
        document_id: str,
        indexing_key: str,
    ) -> int:
        """تنظيف نقاط تحضير غير قابلة للبحث بعد فشل قابل لإعادة المحاولة."""

        query_filter = self._document_filter(
            scope,
            document_id,
            indexing_key=indexing_key,
            indexing_status="staged",
        )
        return self._delete_filter(query_filter, "تعذر تنظيف جيل فهرسة غير مكتمل")

    def withdraw_document(self, scope: TenantScope, document_id: str) -> int:
        """إزالة كل نقاط المستند داخل مؤسسته بغض النظر عن تصنيفاتها.

        تفويض السحب يُفحص في طبقة pipeline مقابل الحالة المرجعية قبل الوصول
        إلى هنا. ثم يجب ألا تبقى بقايا تصنيف قديم أو تالف لنفس المستند.
        """

        return self._delete_filter(
            self._document_filter(
                scope,
                document_id,
                include_all_classifications=True,
            ),
            "تعذر سحب نقاط المستند",
        )

    def search(
        self,
        scope: TenantScope,
        query_vector: list[float],
        *,
        top_k: int = 5,
    ) -> list[SearchHit]:
        """بحث لا يقبل غياب TenantScope ويطبق الفلتر داخل Qdrant."""

        if not isinstance(scope, TenantScope):
            raise TenantIsolationError("البحث دون سياق مؤسسة ممنوع")
        if len(query_vector) != self.dimensions:
            raise VectorDimensionError("أبعاد متجه البحث لا تطابق المجموعة")
        if top_k < 1 or top_k > 100:
            raise ValueError("top_k must be between 1 and 100")

        query_filter = self._scope_filter(scope, indexing_status="ready")
        try:
            response = self.client.query_points(
                collection_name=self.collection_name,
                query=query_vector,
                query_filter=query_filter,
                limit=top_k,
                with_payload=True,
            )
        except Exception as exc:  # noqa: BLE001
            raise QdrantOperationError("تعذر البحث في فهرس المستندات") from exc

        hits: list[SearchHit] = []
        for point in response.points:
            payload = dict(point.payload or {})
            if payload.get("tenant_id") != scope.tenant_id:
                raise TenantIsolationError("أعاد Qdrant نتيجة خارج نطاق المؤسسة")
            if payload.get("security_level") not in scope.allowed_security_levels:
                raise TenantIsolationError("أعاد Qdrant تصنيفاً خارج نطاق التفويض")
            hits.append(
                SearchHit(
                    point_id=str(point.id),
                    score=float(point.score),
                    payload=payload,
                )
            )
        return hits

    def count(self, scope: TenantScope) -> int:
        """إحصاء جاهز للبحث داخل مؤسسة وتصنيفات مفوضة فقط."""

        return self._count(self._scope_filter(scope, indexing_status="ready"))

    def get_points(self, scope: TenantScope, point_ids: Sequence[str]) -> list[dict[str, Any]]:
        """وصول مباشر آمن للنقاط عبر فلتر HasId داخل Qdrant."""

        records: list[dict[str, Any]] = []
        for batch in _batches(point_ids, 128):
            query_filter = self._scope_filter(scope, point_ids=batch)
            for record in self._scroll(query_filter, with_vectors=False):
                records.append({"id": str(record.id), "payload": dict(record.payload or {})})
        return records

    def update_points_payload(
        self,
        scope: TenantScope,
        point_ids: Sequence[str],
        payload: dict[str, Any],
    ) -> int:
        """تحديث حقول إضافية فقط؛ كل حقول العزل والهوية والنص محمية."""

        if _PROTECTED_PAYLOAD_FIELDS.intersection(payload):
            raise TenantIsolationError(
                "لا يجوز تعديل حقول العزل أو الهوية أو دورة الحياة أو النص عبر تحديث حمولة"
            )
        query_filter = self._scope_filter(scope, point_ids=point_ids)
        count = self._count(query_filter)
        if count:
            self._write(
                lambda: self.client.set_payload(
                    collection_name=self.collection_name,
                    payload=payload,
                    points=query_filter,
                    wait=True,
                ),
                "تعذر تحديث حمولة النقاط",
            )
        return count

    def delete_points(self, scope: TenantScope, point_ids: Sequence[str]) -> int:
        """حذف مباشر مقيد بخادم Qdrant نفسه، لا بترشيح لاحق للنتائج."""

        return self._delete_filter(
            self._scope_filter(scope, point_ids=point_ids),
            "تعذر حذف نقاط المستند",
        )

    def _scope_filter(
        self,
        scope: TenantScope,
        *,
        point_ids: Sequence[str] | None = None,
        indexing_status: str | None = None,
    ) -> qmodels.Filter:
        if not isinstance(scope, TenantScope):
            raise TenantIsolationError("سياق المؤسسة إلزامي لكل عملية Qdrant")
        must: list[Any] = [
            qmodels.FieldCondition(
                key="tenant_id",
                match=qmodels.MatchValue(value=scope.tenant_id),
            ),
            _security_condition(scope.allowed_security_levels),
        ]
        if point_ids is not None:
            must.append(qmodels.HasIdCondition(has_id=list(point_ids)))
        if indexing_status is not None:
            must.append(
                qmodels.FieldCondition(
                    key="indexing_status",
                    match=qmodels.MatchValue(value=indexing_status),
                )
            )
        return qmodels.Filter(must=must)

    def _document_filter(
        self,
        scope: TenantScope,
        document_id: str,
        *,
        indexing_key: str | None = None,
        indexing_status: str | None = None,
        excluded_indexing_key: str | None = None,
        point_ids: Sequence[str] | None = None,
        include_all_classifications: bool = False,
    ) -> qmodels.Filter:
        if include_all_classifications:
            # عمليات دورة الحياة تقتصر على المؤسسة والمستند، لا على تصنيف
            # الجيل الحالي، كي تُنظّف بقايا التصنيفات السابقة كاملة.
            if not isinstance(scope, TenantScope):
                raise TenantIsolationError("سياق المؤسسة إلزامي لكل عملية Qdrant")
            must: list[Any] = [
                qmodels.FieldCondition(
                    key="tenant_id",
                    match=qmodels.MatchValue(value=scope.tenant_id),
                )
            ]
            if point_ids is not None:
                must.append(qmodels.HasIdCondition(has_id=list(point_ids)))
            if indexing_status is not None:
                must.append(
                    qmodels.FieldCondition(
                        key="indexing_status",
                        match=qmodels.MatchValue(value=indexing_status),
                    )
                )
        else:
            base = self._scope_filter(
                scope,
                point_ids=point_ids,
                indexing_status=indexing_status,
            )
            must = list(base.must or [])
        must.append(
            qmodels.FieldCondition(
                key="document_id",
                match=qmodels.MatchValue(value=document_id),
            )
        )
        if indexing_key is not None:
            must.append(
                qmodels.FieldCondition(
                    key="indexing_key",
                    match=qmodels.MatchValue(value=indexing_key),
                )
            )
        must_not: list[Any] = []
        if excluded_indexing_key is not None:
            must_not.append(
                qmodels.FieldCondition(
                    key="indexing_key",
                    match=qmodels.MatchValue(value=excluded_indexing_key),
                )
            )
        return qmodels.Filter(must=must, must_not=must_not or None)

    def _scroll(self, query_filter: qmodels.Filter, *, with_vectors: bool) -> list[Any]:
        records: list[Any] = []
        offset: Any = None
        try:
            while True:
                page, offset = self.client.scroll(
                    collection_name=self.collection_name,
                    scroll_filter=query_filter,
                    limit=256,
                    offset=offset,
                    with_payload=True,
                    with_vectors=with_vectors,
                )
                records.extend(page)
                if offset is None:
                    return records
        except Exception as exc:  # noqa: BLE001
            raise QdrantOperationError("تعذر قراءة نقاط فهرس المستندات") from exc

    def _count(self, query_filter: qmodels.Filter) -> int:
        try:
            return int(
                self.client.count(
                    collection_name=self.collection_name,
                    count_filter=query_filter,
                    exact=True,
                ).count
            )
        except Exception as exc:  # noqa: BLE001
            raise QdrantOperationError("تعذر إحصاء نقاط فهرس المستندات") from exc

    def _delete_filter(self, query_filter: qmodels.Filter, error_message: str) -> int:
        count = self._count(query_filter)
        if count:
            self._write(
                lambda: self.client.delete(
                    collection_name=self.collection_name,
                    points_selector=query_filter,
                    wait=True,
                ),
                error_message,
            )
        return count

    def _write(self, operation: Callable[[], _T], error_message: str) -> _T:
        last_error: Exception | None = None
        for _attempt in range(self.max_retries + 1):
            try:
                return operation()
            except Exception as exc:  # noqa: BLE001 — عملية idempotent محدودة المحاولات
                last_error = exc
        raise QdrantOperationError(error_message) from last_error


def _security_condition(levels: frozenset[str]) -> qmodels.FieldCondition:
    ordered = sorted(levels)
    if len(ordered) == 1:
        match: Any = qmodels.MatchValue(value=ordered[0])
    else:
        match = qmodels.MatchAny(any=ordered)
    return qmodels.FieldCondition(key="security_level", match=match)


def _batches(values: Sequence[_T], size: int) -> Iterable[Sequence[_T]]:
    for start in range(0, len(values), size):
        yield values[start : start + size]
