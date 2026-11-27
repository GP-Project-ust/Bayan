"""تقطيع حتمي واعٍ ببنية المواد والفقرات العربية."""

import re
from dataclasses import dataclass

from app.services.ingestion.exceptions import ChunkingError
from app.services.ingestion.identity import canonical_sha256, chunk_identity, sha256_text
from app.services.ingestion.models import DocumentChunk, LoadedDocument
from app.services.ingestion.normalizer import normalize_for_embedding

CHUNKER_ALGORITHM_VERSION = "arabic-sections-v2"
_ARTICLE_START = re.compile(
    r"(?im)^[ \t]*(?P<label>(?:المادة|مادة)\s+[0-9٠-٩]+|Article\s+\d+)\s*[:：]"
)
# فواصل الفقرات تشمل CRLF وCR وحدهما، لأن ملفات Windows تصل من Git أو المحرر
# بـ``\r\n``؛ غياب ذلك كان يدمج فقرات كاملة في مقطع واحد ويسرّب نصاً زائداً
# إلى نتيجة البحث الراجعة للمستخدم.
_LINE_BREAK = r"(?:\r\n|\n|\r)"
_PARAGRAPH_GAP = re.compile(rf"{_LINE_BREAK}[ \t]*{_LINE_BREAK}+")
_BREAK_BOUNDARY = re.compile(r"[.!؟؛;،,]\s+|(?:\r\n|\n+|\r)")
_HEADING = re.compile(r"^(?:#+\s*|الفصل\s+|الباب\s+|القسم\s+|Chapter\s+|Section\s+)", re.I)


@dataclass(frozen=True, slots=True)
class ChunkingConfig:
    """إعداد تقطيع يدخل كاملاً في بصمة جيل الفهرسة."""

    chunk_size: int = 1200
    overlap: int = 120

    def __post_init__(self) -> None:
        if self.chunk_size < 32:
            raise ValueError("chunk_size must be at least 32 characters")
        if self.overlap < 0 or self.overlap >= self.chunk_size:
            raise ValueError("overlap must be non-negative and smaller than chunk_size")

    @property
    def fingerprint(self) -> str:
        return canonical_sha256(
            "chunking-config",
            CHUNKER_ALGORITHM_VERSION,
            self.chunk_size,
            self.overlap,
        )


@dataclass(frozen=True, slots=True)
class _Block:
    text: str
    start: int
    end: int
    section: str
    article_id: str | None


class ArabicDocumentChunker:
    """يحافظ على كل مادة مستقلة ويقسم المواد الطويلة بحدود مستقرة."""

    def __init__(self, config: ChunkingConfig | None = None) -> None:
        self.config = config or ChunkingConfig()

    @property
    def fingerprint(self) -> str:
        return self.config.fingerprint

    def chunk(self, document: LoadedDocument) -> list[DocumentChunk]:
        """إنتاج المقاطع بالترتيب نفسه للمدخل والإعداد نفسيهما."""

        blocks = self._semantic_blocks(document.body_text)
        pieces: list[_Block] = []
        for block in blocks:
            pieces.extend(self._split_long_block(block))

        chunks: list[DocumentChunk] = []
        for chunk_no, piece in enumerate(pieces):
            content = piece.text
            normalized = normalize_for_embedding(content)
            if not normalized:
                continue
            absolute_start = document.body_start_offset + piece.start
            absolute_end = document.body_start_offset + piece.end
            content_hash = sha256_text(content)
            chunk_id = chunk_identity(
                document.version_id,
                self.fingerprint,
                chunk_no,
                absolute_start,
                absolute_end,
                content_hash,
            )
            chunks.append(
                DocumentChunk(
                    chunk_id=chunk_id,
                    chunk_no=chunk_no,
                    content=content,
                    normalized_content=normalized,
                    content_hash=content_hash,
                    embedding_text_hash=sha256_text(normalized),
                    section=piece.section,
                    article_id=piece.article_id,
                    start_offset=absolute_start,
                    end_offset=absolute_end,
                    source_reference=document.source_reference,
                    page_number=None,
                )
            )

        if not chunks:
            raise ChunkingError("لم ينتج المستند أي مقطع نصي صالح")
        return chunks

    def _semantic_blocks(self, text: str) -> list[_Block]:
        matches = list(_ARTICLE_START.finditer(text))
        if matches:
            blocks: list[_Block] = []
            if text[: matches[0].start()].strip():
                blocks.extend(self._paragraph_blocks(text, 0, matches[0].start()))
            for index, match in enumerate(matches):
                end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
                trimmed = self._trim_span(text, match.start(), end)
                if trimmed is None:
                    continue
                start, clean_end = trimmed
                label = match.group("label").strip()
                blocks.append(
                    _Block(
                        text=text[start:clean_end],
                        start=start,
                        end=clean_end,
                        section=label,
                        article_id=label,
                    )
                )
            return blocks
        return self._paragraph_blocks(text, 0, len(text))

    def _paragraph_blocks(self, text: str, start: int, end: int) -> list[_Block]:
        blocks: list[_Block] = []
        cursor = start
        for gap in _PARAGRAPH_GAP.finditer(text, start, end):
            blocks.extend(self._make_paragraph(text, cursor, gap.start()))
            cursor = gap.end()
        blocks.extend(self._make_paragraph(text, cursor, end))
        return blocks

    def _make_paragraph(self, text: str, start: int, end: int) -> list[_Block]:
        trimmed = self._trim_span(text, start, end)
        if trimmed is None:
            return []
        clean_start, clean_end = trimmed
        value = text[clean_start:clean_end]
        first_line = value.splitlines()[0].strip()
        section = (
            first_line if len(first_line) <= 120 and _HEADING.match(first_line) else "نص المستند"
        )
        return [
            _Block(
                text=value,
                start=clean_start,
                end=clean_end,
                section=section,
                article_id=None,
            )
        ]

    def _split_long_block(self, block: _Block) -> list[_Block]:
        if len(block.text) <= self.config.chunk_size:
            return [block]

        pieces: list[_Block] = []
        local_start = 0
        text = block.text
        while local_start < len(text):
            hard_end = min(local_start + self.config.chunk_size, len(text))
            local_end = hard_end
            if hard_end < len(text):
                minimum = local_start + max(1, self.config.chunk_size // 2)
                candidates = [
                    match.end() for match in _BREAK_BOUNDARY.finditer(text, minimum, hard_end)
                ]
                if candidates:
                    local_end = candidates[-1]

            trimmed = self._trim_span(text, local_start, local_end)
            if trimmed is not None:
                clean_start, clean_end = trimmed
                pieces.append(
                    _Block(
                        text=text[clean_start:clean_end],
                        start=block.start + clean_start,
                        end=block.start + clean_end,
                        section=block.section,
                        article_id=block.article_id,
                    )
                )
            if local_end >= len(text):
                break
            next_start = max(local_end - self.config.overlap, local_start + 1)
            local_start = next_start
        return pieces

    @staticmethod
    def _trim_span(text: str, start: int, end: int) -> tuple[int, int] | None:
        while start < end and text[start].isspace():
            start += 1
        while end > start and text[end - 1].isspace():
            end -= 1
        return (start, end) if start < end else None
