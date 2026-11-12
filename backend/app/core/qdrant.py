"""مصنع Qdrant والتضمين — البوابة الوحيدة في بيان لمستودع المتجهات والتضمين (ADR-005).

قاعدة دستورية توازي مصنع النماذج (ADR-002): لا يستورد أي وكيل أو خدمة
عميل Qdrant أو SDK تضمين مباشرة — الجميع يمر من هنا:

  - get_qdrant_client() — عميل وحيد مشترك من إعدادات QDRANT_URL
  - get_embeddings(texts) — تضمين دفعي عبر EMBEDDING_PROVIDER (mock | ollama)
  - ensure_collection() — تجهيز مجموعة بقياس جيب التمام (cosine)

المزوّدون:
  mock   — افتراضي التطوير وCI: متجهات حتمية من SHA-256 بلا أي اتصال
           (نفس النص ← نفس المتجه دائمًا — قابلة للاختبار والفهرسة)
  ollama — bge-m3 المحلي (1024 بعداً) عبر /api/embed — بلا مفاتيح
"""

import hashlib
from functools import lru_cache

import httpx
from qdrant_client import QdrantClient
from qdrant_client.http import models as qmodels

from app.core.config import get_settings

# مجموعة لوائح وسياسات الجامعة — الاسم المعتمد في كل بيان (الفصل الرابع §4)
QDRANT_POLICIES_COLLECTION = "bayan_policies"


@lru_cache
def get_qdrant_client() -> QdrantClient:
    """عميل Qdrant وحيد مشترك لعملية التشغيل — من إعدادات QDRANT_URL."""
    return QdrantClient(url=get_settings().qdrant_url, timeout=5)


def _mock_vector(text: str, dimensions: int) -> list[float]:
    """متجه حتمي من SHA-256: نفس النص ← نفس المتجه دائمًا (بلا أي اتصال).

    الغرض وحده يهم في mock: أبعاد صحيحة + حتمية + قيم محدودة (finite) دائمًا
    وتوزيع متنوع بما يكفي لتمييز النصوص المختلفة في الاختبارات وفهرسة التطوير —
    ليست جودة دلالية. تُشتت القيم من أعداد صحيحة (لا من تفسير بايتات كأعمدة
    عائمة — فهي قد تنتج NaN/inf فترفضها Qdrant).
    """
    values: list[float] = []
    seed = hashlib.sha256(text.encode("utf-8")).digest()
    counter = 0
    while len(values) < dimensions:
        block = hashlib.sha256(seed + counter.to_bytes(4, "big")).digest()
        for offset in range(0, len(block), 8):
            chunk = int.from_bytes(block[offset : offset + 8], "big")
            values.append((chunk / 2**64) * 2.0 - 1.0)  # في [-1, 1) دائمًا
        counter += 1
    vector = values[:dimensions]
    norm = sum(v * v for v in vector) ** 0.5 or 1.0
    return [v / norm for v in vector]


def get_embeddings(texts: list[str]) -> list[list[float]]:
    """تضمين دفعة نصوص عبر مزوّد الإعدادات — يعيد متجهاً لكل نص بترتيبه.

    الضمانات: عدد المتجهات == عدد النصوص، وطول كل متجه == EMBEDDING_DIMENSIONS،
    وmock حتمي تماماً (نفس المدخلات ← نفس المخرجات).
    """
    settings = get_settings()
    provider = settings.embedding_provider.strip().lower()
    dimensions = settings.embedding_dimensions

    if provider == "mock":
        return [_mock_vector(text, dimensions) for text in texts]

    if provider == "ollama":
        base = (settings.embedding_base_url or settings.ollama_base_url).rstrip("/")
        response = httpx.post(
            f"{base}/api/embed",
            json={"model": settings.embedding_model, "input": texts},
            timeout=60,
        )
        response.raise_for_status()
        embeddings = response.json().get("embeddings", [])
        if len(embeddings) != len(texts):
            raise ValueError(
                f"المزوّد أعاد {len(embeddings)} متجهاً لـ {len(texts)} نصاً — عدد غير متطابق"
            )
        for i, vector in enumerate(embeddings):
            if len(vector) != dimensions:
                raise ValueError(
                    f"المتجه {i} بطول {len(vector)} والمتوقع {dimensions} "
                    f"(راجع EMBEDDING_DIMENSIONS واسم النموذج EMBEDDING_MODEL)"
                )
        return [list(map(float, vector)) for vector in embeddings]

    raise ValueError(
        f"مزوّد تضمين غير مدعوم: {provider!r} (المعتمد: mock / ollama)"
    )


def ensure_collection(
    client: QdrantClient,
    name: str = QDRANT_POLICIES_COLLECTION,
    dimensions: int | None = None,
) -> bool:
    """تجهيز مجموعة إن لم توجد (قياس cosine) — يعيد True إن أُنشئت الآن.

    idempotent: استدعاؤها المتكرر آمن — لا تعيد الإنشاء ولا ترفع خطأ.
    """
    dims = dimensions if dimensions is not None else get_settings().embedding_dimensions
    if client.collection_exists(name):
        return False
    client.create_collection(
        collection_name=name,
        vectors_config=qmodels.VectorParams(size=dims, distance=qmodels.Distance.COSINE),
    )
    return True
