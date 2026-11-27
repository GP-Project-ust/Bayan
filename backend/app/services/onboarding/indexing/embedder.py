"""تكامل حصري مع مصنع التضمين الرسمي ``app.core.qdrant.get_embeddings`` (ADR-005)."""

from __future__ import annotations

import math
import time
from typing import Callable, Sequence

from app.core.config import Settings, get_settings
from app.core.qdrant import get_embeddings

from .fingerprints import build_embedding_config_id


class OfficialEmbeddingService:
    """بوابة التضمين الدلالي لطبقة التهيئة فوق المصنع الرسمي فقط."""

    def __init__(
        self,
        *,
        app_settings: Settings | None = None,
        embed_fn: Callable[[list[str]], list[list[float]]] | None = None,
        batch_size: int = 32,
        max_retries: int = 2,
    ):
        self._settings = app_settings or get_settings()
        self._embed_fn = embed_fn or get_embeddings
        self.batch_size = max(1, int(batch_size))
        self.max_retries = max(0, int(max_retries))

    @property
    def dimensions(self) -> int:
        return int(self._settings.embedding_dimensions)

    @property
    def config_id(self) -> str:
        return build_embedding_config_id(self._settings)

    def embed_texts(self, texts: Sequence[str]) -> list[tuple[float, ...]]:
        """تضمين نصوص وصفية على دفعات مع التحقق الصارم من الأبعاد والقيم."""
        cleaned = [self._normalize_input(text) for text in texts]
        if not cleaned:
            return []

        expected_dims = self.dimensions
        results: list[tuple[float, ...]] = []
        for start in range(0, len(cleaned), self.batch_size):
            batch = cleaned[start : start + self.batch_size]
            vectors = self._call_with_retry(batch)
            if len(vectors) != len(batch):
                raise ValueError(
                    f"عدم تطابق عدد المتجهات: استلمنا {len(vectors)} لعدد {len(batch)} نصاً."
                )
            for idx, vector in enumerate(vectors):
                if len(vector) != expected_dims:
                    raise ValueError(f"طول المتجه {idx} هو {len(vector)} والمتوقع {expected_dims}.")
                floats = tuple(float(v) for v in vector)
                if not all(math.isfinite(v) for v in floats):
                    raise ValueError(f"المتجه {idx} يحتوي على قيم غير منتهية (NaN/Inf).")
                results.append(floats)
        return results

    def _call_with_retry(self, batch: list[str]) -> list[list[float]]:
        last_error: Exception | None = None
        for attempt in range(self.max_retries + 1):
            try:
                return self._embed_fn(batch)
            except ValueError:
                raise
            except Exception as exc:  # pragma: no cover - شبكة Ollama الحية فقط
                last_error = exc
                if attempt < self.max_retries:
                    time.sleep(0.1 * (attempt + 1))
        assert last_error is not None
        raise last_error

    @staticmethod
    def _normalize_input(text: str) -> str:
        normalized = " ".join(str(text or "").split())
        if not normalized:
            raise ValueError("لا يمكن تضمين نص وصفي فارغ.")
        return normalized
