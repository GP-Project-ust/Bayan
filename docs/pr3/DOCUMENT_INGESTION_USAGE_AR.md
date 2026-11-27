# دليل استخدام فهرسة المستندات — PR-3

## 1. المتطلبات

- Python 3.11+ واعتماديات `backend/requirements.txt`.
- للاختبار المعزول: لا يلزم Docker أو AI خارجي.
- للتشغيل الحي: Qdrant على `QDRANT_URL`.
- الافتراضي: `EMBEDDING_PROVIDER=mock`، حتمي وبلا شبكة.

لا يدعم Sprint 1 إلا ملفات `.txt` بترميز UTF-8 وعقد الرأس:

```text
المستند: <العنوان>
الإصدار: <الإصدار>
التصنيف: عام | داخلي | سري
المستأجر: <معرف المؤسسة>

المادة 1: ...
```

## 2. صفحة وأطراف التطوير الحالية

```bash
# من جذر المستودع بعد توفر Docker
make infra
make backend-dev
```

- الصفحة: `GET /dev/indexer`
- الحالة: `GET /dev/indexer/status`
- الفهرسة: `POST /dev/indexer/ingest`
- البحث: `POST /dev/indexer/search`

مثال بحث:

```json
{
  "query": "كم غرامة التأخير في السداد؟",
  "tenant": "جامعة العلوم والتكنولوجيا",
  "top_k": 5
}
```

`tenant` بقي اختيارياً في Pydantic schema لتوافق العقد السلكي القديم، لكنه
إلزامي عند التنفيذ الأمني؛ غيابه أو كونه مسافات فقط أو احتواءه محارف غير مرئية
يعيد `422` ولا ينفذ بحثاً عاماً. يُطبَّع بNFC وتُوحَّد مسافاته قبل الاستخدام.

`query` يُقلَّم من الطرفين، والاستعلام الذي لا يبقى منه حرفان غير مسافتين يعيد
`422` قبل التضمين. الاستجابة تعيد النص والتصنيف والاستشهاد من Repository، لا من
حمولة Qdrant؛ العبث بحمولة Qdrant لا يغير ما يظهر في الصفحة.

استجابة الفهرسة تحافظ على الحقول القديمة:

```json
{
  "files": 5,
  "chunks": 65,
  "collection": "bayan_policies",
  "embedding_provider": "mock",
  "embedding_model": "bge-m3",
  "embedding_dimensions": 1024
}
```

وتضيف عدادات: `indexed_files`, `skipped_files`, `retired_files`,
`embedded_chunks`, `reused_embeddings`, `upserted_chunks`, `retired_chunks`.

اللوائح الخمس الرسمية تنتج 65 مقطعاً بتوزيع `[14, 14, 12, 12, 13]`. التشغيل
الثاني يعيد `skipped_files=5` و`embedded_chunks=0` و`upserted_chunks=0` مع بقاء
`points_count=65`. صفحة `/dev/indexer` وHTML لم يتغيرا؛ الربط الجديد داخلي.

## 3. الاستخدام البرمجي

```python
from pathlib import Path

from app.core.qdrant import get_qdrant_client
from app.services.ingestion.pipeline import build_ingestion_pipeline
from app.services.ingestion.repository import SQLiteIngestionRepository
from app.services.ingestion.tenant_scope import TenantScope

repository = SQLiteIngestionRepository(Path(".ingestion/document_state.sqlite3"))
pipeline = build_ingestion_pipeline(
    qdrant_client=get_qdrant_client(),
    repository=repository,
)

stats = pipeline.sync_directory("../database/documents_demo")
hits = pipeline.search(
    TenantScope.public_only("جامعة العلوم والتكنولوجيا"),
    "غرامة التأخير",
    top_k=5,
)
```

لا تُنشئ تطبيقاً آخر لمصنع embeddings؛ `build_ingestion_pipeline()` يبني
`OfficialEmbeddingService` فوق `app.core.qdrant.get_embeddings()`.

## 4. مزامنة الحذف المصرح

الوضع الافتراضي لا يسحب ملفاً اختفى من المجلد:

```python
pipeline.sync_directory(root)  # لا حذف
```

السحب يحتاج تفويضاً صريحاً:

```python
pipeline.sync_directory(
    root,
    retire_missing=True,
    authorized_tenants=frozenset({"Tenant A"}),
)
```

- يجب أن يكون المجلد موجوداً.
- تُحمّل كل الملفات الحالية بنجاح قبل أي سحب.
- وجود مستأجر غير مصرح داخل المجلد يرفض العملية.
- المجلد الفارغ يسحب الكل فقط مع العلم والنطاق الصريحين أعلاه.
- حالة المستند ومراجعه التاريخية تبقى `withdrawn` في Repository.
- السحب يزيل كل نقاط المستند داخل مؤسسته، بما فيها بقايا تصنيف سابق أو تالف.
- تكرار المزامنة بعد السحب لا يعيد عدّ المستند المسحوب؛ `retired_files=0`.
- التقاعد بعد تحديث التصنيف لا يترك جيل التصنيف القديم قابلاً للاسترجاع.

## 5. التضمين الحقيقي المحلي

وفق ADR-005:

```dotenv
EMBEDDING_PROVIDER=ollama
EMBEDDING_MODEL=bge-m3
EMBEDDING_DIMENSIONS=1024
EMBEDDING_BASE_URL=http://localhost:11434
```

ثم:

```bash
make llm
```

إذا كانت `bayan_policies` موجودة بأبعاد أو Distance مختلفة، يرفض الخط العملية
ويترك المجموعة كما هي. لا حذف ولا recreation تلقائي.

## 6. تشغيل الاختبارات

```bash
cd backend
python -m pytest tests/test_ingestion tests/test_dev_indexer.py -ra
python -m ruff check app tests
```

النتيجة المحلية الموثقة: **82 passed، 1 skipped** (والحزمة وحدها 62 passed)،
و**164 passed، 6 skipped** في الانحدار الكامل. الاختبارات تستخدم mock embeddings
وQdrant local-mode. فئة الاختبار الحي في `test_dev_indexer.py` تتخطى تلقائياً
إذا غابت خدمة Qdrant.

## 7. أخطاء متوقعة

| الحالة | السلوك |
|---|---|
| TXT خارج الجذر أو `../` | رفض قبل القراءة |
| Encoding غير UTF-8 | `DocumentEncodingError` / HTTP 422 |
| مستند فارغ أو رأس ناقص | رفض بلا فهرسة جزئية |
| Tenant مفقود/فارغ/غير مرئي في البحث | HTTP 422 قبل التضمين |
| استعلام مسافات فقط | HTTP 422 |
| مجموعة غير متوافقة في الأبعاد أو Distance | HTTP 409 بلا حذف أو recreation |
| Qdrant غير متاح أو فشل فحص المجموعة | HTTP 503 برسالة منقحة |
| مزود التضمين غير متاح | HTTP 503 برسالة منقحة |
| مجلد المستندات مفقود | HTTP 500 برسالة عامة؛ لا مسار مطلق في الاستجابة |
| فشل Repository | HTTP 500؛ لا نجاح زائف |
| فشل تقاعد قديم بعد نجاح الجديد | خطأ معلن؛ البحث العام يبقى آمناً وتعيد المحاولة التنظيف |

## 8. الانتقال للإنتاج

قبل استخدام الخط خارج `/dev/indexer` يلزم:

1. Adapter PostgreSQL مع migrations معتمدة لكيانات الجداول 4-41/42/43.
2. اشتقاق `TenantScope` من membership مصادق، لا من JSON العميل، مع توحيد هوية
   المؤسسة على مستوى الكتالوج لمنع الحروف المتشابهة بصرياً.
3. ربط التصنيفات بقدرات `documents.read/documents.manage`.
4. تدقيق عمليات الرفع والفشل والسحب في `audit_logs`.
5. ربط خدمة RAG بالواجهة القابلة لإعادة الاستخدام دون تعديل منطق الوكيل في PR-3.
