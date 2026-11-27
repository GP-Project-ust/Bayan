"""استثناءات خط فهرسة المستندات ذات الرسائل الآمنة والقابلة للتصنيف."""


class IngestionError(Exception):
    """الخطأ الأساس لكل أخطاء الفهرسة المتوقعة."""


class DocumentLoadError(IngestionError):
    """فشل آمن أثناء التحقق من ملف المصدر أو قراءته."""


class InvalidDocumentPathError(DocumentLoadError):
    """مسار خارج الجذر المصرح أو ملف غير صالح."""


class UnsupportedDocumentTypeError(DocumentLoadError):
    """نوع ملف غير مدعوم في الإصدار الحالي."""


class DocumentEncodingError(DocumentLoadError):
    """محتوى لا يمكن تفسيره بوصفه UTF-8 صالحاً."""


class EmptyDocumentError(DocumentLoadError):
    """ملف فارغ أو بلا متن قابل للفهرسة."""


class DocumentTooLargeError(DocumentLoadError):
    """حجم الملف يتجاوز الحد المضبوط."""


class DocumentMetadataError(DocumentLoadError):
    """رأس بيانات المستند ناقص أو غير صالح."""


class ChunkingError(IngestionError):
    """تعذر إنتاج مقاطع نصية صالحة وحتمية."""


class EmbeddingError(IngestionError):
    """فشل مصنع التضمين أو أعاد عقداً غير صالح."""


class VectorDimensionError(EmbeddingError):
    """أبعاد متجه لا تطابق إعداد المجموعة."""


class QdrantOperationError(IngestionError):
    """فشل اتصال أو كتابة أو قراءة من Qdrant."""


class CollectionConfigurationError(QdrantOperationError):
    """مجموعة موجودة بإعدادات أبعاد أو مسافة غير متوافقة."""


class IndexVerificationError(QdrantOperationError):
    """لم يمكن إثبات اكتمال الكتابة في Qdrant."""


class RepositoryError(IngestionError):
    """فشل مخزن الحالة المرجعية للمستندات."""


class TenantScopeError(IngestionError):
    """سياق المؤسسة مفقود أو غير صالح أو غير مفوض."""


class TenantIsolationError(IngestionError):
    """اكتُشفت نتيجة تخالف نطاق المؤسسة المطلوب."""


class DocumentNotFoundError(IngestionError):
    """المستند غير موجود داخل النطاق المصرح دون كشف نطاق آخر."""
