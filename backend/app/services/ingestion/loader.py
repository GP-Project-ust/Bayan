"""محمل TXT آمن للوثائق الرسمية التجريبية."""

from pathlib import Path

from app.services.ingestion.exceptions import (
    DocumentEncodingError,
    DocumentMetadataError,
    DocumentTooLargeError,
    EmptyDocumentError,
    InvalidDocumentPathError,
    UnsupportedDocumentTypeError,
)
from app.services.ingestion.identity import (
    document_identity,
    sha256_bytes,
    version_identity,
)
from app.services.ingestion.models import (
    SUPPORTED_SECURITY_LEVELS,
    DocumentMetadata,
    LoadedDocument,
)
from app.services.ingestion.tenant_scope import validate_tenant_id

_HEADER_FIELDS = {
    "المستند": "title",
    "الإصدار": "version_no",
    "التصنيف": "security_level",
    "المستأجر": "tenant_id",
}


class TxtDocumentLoader:
    """تحميل UTF-8 فقط ضمن جذر مصرح وبحد حجم مضبوط."""

    def __init__(self, max_file_size_bytes: int = 2 * 1024 * 1024) -> None:
        if max_file_size_bytes <= 0:
            raise ValueError("max_file_size_bytes must be positive")
        self.max_file_size_bytes = max_file_size_bytes

    def load(self, path: str | Path, *, source_root: str | Path) -> LoadedDocument:
        """قراءة ملف TXT والتحقق منه واستخراج رأسه دون تعديل المصدر."""

        root = self._resolve_root(source_root)
        candidate = Path(path)
        if not candidate.is_absolute():
            candidate = root / candidate

        try:
            resolved = candidate.resolve(strict=True)
        except (OSError, RuntimeError) as exc:
            raise InvalidDocumentPathError("ملف المستند غير موجود أو غير قابل للقراءة") from exc

        if not resolved.is_relative_to(root) or not resolved.is_file():
            raise InvalidDocumentPathError("مسار المستند خارج الجذر المصرح")
        if resolved.suffix.lower() != ".txt":
            raise UnsupportedDocumentTypeError("الإصدار الحالي يدعم ملفات TXT فقط")

        try:
            size = resolved.stat().st_size
        except OSError as exc:
            raise InvalidDocumentPathError("تعذر فحص ملف المستند") from exc
        if size > self.max_file_size_bytes:
            raise DocumentTooLargeError("حجم ملف المستند يتجاوز الحد المسموح")
        if size == 0:
            raise EmptyDocumentError("ملف المستند فارغ")

        try:
            raw_bytes = resolved.read_bytes()
        except OSError as exc:
            raise InvalidDocumentPathError("تعذر قراءة ملف المستند") from exc
        if len(raw_bytes) > self.max_file_size_bytes:
            raise DocumentTooLargeError("حجم ملف المستند يتجاوز الحد المسموح")

        try:
            source_text = raw_bytes.decode("utf-8-sig")
        except UnicodeDecodeError as exc:
            raise DocumentEncodingError("يجب أن يكون ترميز المستند UTF-8 صالحاً") from exc
        if "\x00" in source_text:
            raise DocumentEncodingError("يتضمن المستند محارف ثنائية غير صالحة")
        if not source_text.strip():
            raise EmptyDocumentError("ملف المستند لا يحتوي نصاً قابلاً للفهرسة")

        header, body_start = self._parse_header(source_text)
        body = source_text[body_start:]
        if not body.strip():
            raise EmptyDocumentError("المستند لا يحتوي متناً بعد رأس البيانات")

        tenant_id = validate_tenant_id(header["tenant_id"])
        security_level = header["security_level"].strip()
        if security_level not in SUPPORTED_SECURITY_LEVELS:
            raise DocumentMetadataError("تصنيف المستند غير معتمد")

        metadata = DocumentMetadata(
            tenant_id=tenant_id,
            title=self._required_text(header["title"], "عنوان المستند"),
            version_no=self._required_text(header["version_no"], "إصدار المستند"),
            security_level=security_level,
        )
        source_reference = resolved.relative_to(root).as_posix()
        file_hash = sha256_bytes(raw_bytes)
        document_id = document_identity(tenant_id, source_reference)
        version_id = version_identity(document_id, metadata.version_no, file_hash)
        return LoadedDocument(
            path=resolved,
            source_root=root,
            source_reference=source_reference,
            raw_bytes=raw_bytes,
            source_text=source_text,
            body_text=body,
            body_start_offset=body_start,
            file_hash=file_hash,
            document_id=document_id,
            version_id=version_id,
            metadata=metadata,
        )

    @staticmethod
    def _resolve_root(source_root: str | Path) -> Path:
        try:
            root = Path(source_root).resolve(strict=True)
        except (OSError, RuntimeError) as exc:
            raise InvalidDocumentPathError("مجلد المستندات غير موجود") from exc
        if not root.is_dir():
            raise InvalidDocumentPathError("جذر المستندات ليس مجلداً صالحاً")
        return root

    @staticmethod
    def _parse_header(source_text: str) -> tuple[dict[str, str], int]:
        header: dict[str, str] = {}
        cursor = 0
        body_start: int | None = None

        for raw_line in source_text.splitlines(keepends=True):
            stripped = raw_line.strip()
            next_cursor = cursor + len(raw_line)
            if not stripped:
                if header:
                    body_start = next_cursor
                    break
                cursor = next_cursor
                continue

            key, separator, value = stripped.replace("：", ":", 1).partition(":")
            target = _HEADER_FIELDS.get(key.strip()) if separator else None
            if target is None:
                body_start = cursor
                break
            if target in header:
                raise DocumentMetadataError("يتضمن رأس المستند حقلاً مكرراً")
            header[target] = value.strip()
            cursor = next_cursor

        if body_start is None:
            body_start = cursor
        missing = set(_HEADER_FIELDS.values()) - header.keys()
        if missing:
            raise DocumentMetadataError("رأس المستند لا يتضمن جميع الحقول الإلزامية")
        return header, body_start

    @staticmethod
    def _required_text(value: str, label: str) -> str:
        cleaned = value.strip()
        if not cleaned or len(cleaned) > 250:
            raise DocumentMetadataError(f"{label} مفقود أو غير صالح")
        return cleaned
