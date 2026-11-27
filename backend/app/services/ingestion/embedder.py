"""غلاف دفعي متحقق حول مصنع التضمين الرسمي في ADR-005."""

import math
from collections.abc import Callable, Sequence
from dataclasses import dataclass

from app.core.config import get_settings
from app.core.qdrant import get_embeddings
from app.services.ingestion.exceptions import EmbeddingError, VectorDimensionError
from app.services.ingestion.identity import canonical_sha256

EmbeddingFunction = Callable[[list[str]], list[list[float]]]


@dataclass(frozen=True, slots=True)
class EmbeddingConfig:
    """هوية إعداد التضمين وسلوك الدفعات."""

    provider: str
    model: str
    dimensions: int
    batch_size: int = 32
    max_retries: int = 1

    def __post_init__(self) -> None:
        if self.dimensions <= 0 or self.batch_size <= 0 or self.max_retries < 0:
            raise ValueError("invalid embedding configuration")

    @property
    def fingerprint(self) -> str:
        return canonical_sha256(
            "embedding-config",
            self.provider.strip().lower(),
            self.model.strip(),
            self.dimensions,
        )

    @classmethod
    def from_settings(cls, *, batch_size: int = 32, max_retries: int = 1) -> "EmbeddingConfig":
        settings = get_settings()
        return cls(
            provider=settings.embedding_provider,
            model=settings.embedding_model,
            dimensions=settings.embedding_dimensions,
            batch_size=batch_size,
            max_retries=max_retries,
        )


class OfficialEmbeddingService:
    """التضمين حصراً عبر ``app.core.qdrant.get_embeddings`` مع تحقق العقد."""

    def __init__(
        self,
        config: EmbeddingConfig | None = None,
        embedding_function: EmbeddingFunction | None = None,
    ) -> None:
        self.config = config or EmbeddingConfig.from_settings()
        self._embedding_function = embedding_function or get_embeddings

    @property
    def fingerprint(self) -> str:
        return self.config.fingerprint

    def embed(self, texts: Sequence[str]) -> list[list[float]]:
        """تضمين النصوص على دفعات مع ترتيب ثابت وتحقق الأبعاد والقيم."""

        if not texts:
            return []
        if any(not isinstance(text, str) or not text.strip() for text in texts):
            raise EmbeddingError("لا يمكن تضمين نص فارغ أو غير صالح")

        result: list[list[float]] = []
        for start in range(0, len(texts), self.config.batch_size):
            batch = list(texts[start : start + self.config.batch_size])
            vectors = self._embed_with_retry(batch)
            if len(vectors) != len(batch):
                raise EmbeddingError("أعاد مزود التضمين عدداً غير مطابق من المتجهات")
            for vector in vectors:
                if len(vector) != self.config.dimensions:
                    raise VectorDimensionError("أبعاد متجه التضمين لا تطابق الإعداد الرسمي")
                converted = [float(value) for value in vector]
                if not all(math.isfinite(value) for value in converted):
                    raise EmbeddingError("أعاد مزود التضمين قيماً غير منتهية")
                result.append(converted)
        return result

    def _embed_with_retry(self, batch: list[str]) -> list[list[float]]:
        last_error: Exception | None = None
        for _attempt in range(self.config.max_retries + 1):
            try:
                return self._embedding_function(batch)
            except (EmbeddingError, VectorDimensionError):
                raise
            except Exception as exc:  # noqa: BLE001 — حدود مزود خارجي موحدة هنا
                last_error = exc
        raise EmbeddingError("تعذر إنشاء تضمينات المستند") from last_error
