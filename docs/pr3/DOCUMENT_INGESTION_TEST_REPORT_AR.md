# تقرير اختبار فهرسة المستندات — PR-3

## تحقق النقل إلى المشروع الأساسي `C:\Bayan` — 27 نوفمبر 2026

شُغّلت الاختبارات من `C:\Bayan\backend` باستخدام بيئة المشروع نفسه على فرع `feature/smart-onboarding-integration`:

| التحقق في الوجهة | النتيجة |
|---|---|
| `python -m pytest tests/test_ingestion tests/test_dev_indexer.py -ra` | 82 ناجحاً؛ تخطّى اختبار واحد خادم Qdrant الشبكي لعدم توفره. |
| `python -m pytest -ra` للخلفية كاملة، بما فيها التهيئة الذكية | 195 ناجحاً؛ 6 متخطاة (خادم Qdrant وقاعدة الجامعة التجريبية). |
| `ruff check` على حزمة الفهرسة ونقاطها واختباراتها | نجح. |

استعمل اختبار القبول لوائح **الوجهة**: نتج 65 مقطعاً من خمسة ملفات، ولم يُنشئ التشغيل الثاني تضمينات أو نقاطاً جديدة. تحققت الاختبارات من النص المرجعي ومن استبعاد مستند المؤسسة الأخرى والمستند الداخلي من البحث العام. استُخدم Qdrant داخل الذاكرة وتضمين `mock`، ولم تُختبر جودة `bge-m3` الحية. بقيت بصمات ملفات الواجهة وصفحة الفهرسة الثابتة مطابقة لما كانت عليه قبل النقل.

**الأقسام التالية سجل اختبار فرع المصدر قبل النقل.**

## 1. البيئة

| العنصر | القيمة |
|---|---|
| النظام | Windows |
| Python المحلي | 3.12.10؛ CI المستهدف 3.11 |
| Qdrant للاختبارات | `QdrantClient(":memory:")`، لا شبكة |
| Embeddings | `mock` حتمي من المصنع الرسمي |
| أبعاد اختبارات الحزمة | 16 بعداً في harness معزول |
| أبعاد `/dev/indexer` | 1024 من `EMBEDDING_DIMENSIONS` الافتراضي |
| Docker | غير مثبت على الجهاز الحالي |
| Qdrant server حي | غير متاح؛ `localhost:6333` مغلق |
| Ollama/bge-m3 حي | غير متاح؛ `localhost:11434` مغلق |
| PostgreSQL حي | غير متاح؛ `localhost:5432/5433` مغلق |

أُنشئت `backend/.venv` محلياً؛ لم يثبت شيء على مستوى النظام ولم تُعدّل
`requirements.txt`.

## 2. نتائج الاختبارات المنفذة

### حزمة PR-3 المعزولة

```bash
python -m pytest tests/test_ingestion -ra
```

النتيجة: **62 passed، 0 failed، 0 skipped** في 1.86 ثانية.

### PR-3 مع تكامل `/dev/indexer`

```bash
python -m pytest tests/test_ingestion tests/test_dev_indexer.py -ra
```

النتيجة: **82 passed، 0 failed، 1 skipped** من أصل 83 اختباراً مجمّعاً في
16.47 ثانية. الاختبار المتخطى هو فئة Qdrant server الحية الوحيدة، ويعلن
سببه صراحة (`make infra`).

### Lint

```bash
python -m ruff check app tests
```

النتيجة: **All checks passed**.

### Regression كامل

جمعت Pytest **170 اختباراً**. كان اتصال صحة PostgreSQL في baseline بلا
`connect_timeout` ويتعلق محلياً عند غياب الخدمة؛ أُعيد التشغيل دون تعديل الكود
مع `DATABASE_URL` إلى منفذ loopback مغلق و`connect_timeout=1`:

```powershell
$env:DATABASE_URL='postgresql://bayan:bayan@127.0.0.1:1/bayan?connect_timeout=1'
python -m pytest -ra
```

النتيجة: **164 passed، 0 failed، 6 skipped، exit code 0** في 136.70 ثانية.
الاختبارات الستة المتخطاة هي فقط اختبارات Qdrant/PostgreSQL الحية التي تعلن
سببها؛ لا يوجد فشل مخفي.

## 3. مصفوفة التغطية

| المجال | الدليل | النتيجة |
|---|---|---|
| UTF-8 عربي ومختلط وBOM | `test_loader_and_chunker.py` | PASS |
| فارغ/ترميز/امتداد/مسار/traversal/حجم | الملف نفسه | PASS |
| تطبيع غير هدّام | الملف نفسه | PASS |
| مواد/ترتيب/offsets/long split/overlap | الملف نفسه | PASS |
| فواصل فقرات CRLF وCR | `test_crlf_paragraph_gaps_are_split_without_merging` | PASS |
| SHA-256 وUUID وفصل tenant/document/version | `test_identity_and_embeddings.py` | PASS |
| المصنع الرسمي والحتمية والدفعات والأبعاد | الملف نفسه + `test_qdrant_factory.py` | PASS |
| أول تشغيل وتخطي غير المتغير | `test_pipeline_incremental.py` | PASS |
| تعديل جزئي وإعادة استخدام المتجه | الملف نفسه | PASS |
| إصدار جديد/config جديد | الملف نفسه | PASS |
| إزالة وسحب مصرحان | الملف نفسه | PASS |
| فشل دفعة وفشل Repository والتعافي | الملف نفسه | PASS |
| Collection mismatch في الأبعاد أو Distance | الملف نفسه | PASS |
| تقاعد كل تصنيفات المستند ومنها بقايا غير معروفة | `test_failed_classification_downgrade...` و`test_withdraw_removes...` | PASS |
| عدم إعادة عدّ المستند المسحوب مرتين | `test_repeated_retire_missing...` | PASS |
| نص مرجعي بعد العبث بحمولة Qdrant | `test_search_returns_repository_text...` | PASS |
| إسقاط مرشح قديم بتصنيف غير مصرح | `test_public_search_skips_stale_public_copy...` | PASS |
| Tenant search الفعلي A/B | `test_tenant_isolation.py` | PASS |
| قراءة/تحديث/حذف cross-tenant | الملف نفسه | PASS |
| Missing tenant fail-closed | الملف نفسه + `test_dev_indexer.py` | PASS |
| Classification filtering | `test_tenant_isolation.py` | PASS |
| حماية حقول العزل والهوية والنص ودورة الحياة | `test_lifecycle_identity_and_text_payload_fields...` | PASS |
| Unicode bidi/zero-width/control في هوية المؤسسة | `test_tenant_identity_rejects...` | PASS |
| NFC وتوحيد المسافات في هوية المؤسسة | `test_tenant_identity_normalizes...` | PASS |
| العقود القديمة والجديدة للحمولة | `test_official_documents.py` + endpoint | PASS |
| اللوائح الرسمية الخمس | `test_official_documents.py` | PASS: 5 ملفات / 65 مقطعاً |
| استعلام مسافات فقط | `test_search_rejects_whitespace_only_query` | PASS: 422 |
| مستأجر فارغ أو غير مرئي | `test_search_rejects_blank_or_invisible_tenant` | PASS: 422 |
| فشل Qdrant/التضمين/فحص المجموعة | اختبارات endpoint | PASS: 503 منقحة |
| تسريب مسار الخادم عند غياب المجلد | `test_ingest_missing_documents_directory...` | PASS: لا مسار في الاستجابة |

## 4. نتائج الفهرسة المعزولة الفعلية

باستخدام اللوائح الخمس الرسمية وmock embeddings وQdrant local-mode:

- الملفات: 5، وكلها UTF-8 بأسطر CRLF.
- المقاطع: 65، والتوزيع `[14, 14, 12, 12, 13]`.
- المستأجر A: 4 مستندات و52 مقطعاً (40 `عام` + 12 `داخلي`).
- المستأجر B: مستند واحد و13 مقطعاً `عام`.
- التصنيفات: 4 مستندات `عام` (53 مقطعاً) ومستند واحد `داخلي` (12 مقطعاً).
- التشغيل الأول: 65 embedded و65 upserted.
- التشغيل الثاني: 5 skipped، و0 embedded، و0 upserted.
- العدد بعد الإعادة: 65؛ لا تضاعف.
- `page_number`: `null` لجميع TXT.
- كل مقطع يثبت أن `source_text[start_offset:end_offset] == payload["text"]`.
- نسخ LF من الملفات الخمس أنتجت المقاطع المطابقة بعد التطبيع، بلا فرق في
  العدد أو الأقسام أو المواد.
- البحث العام في اختبارات المستأجر A لم يعِد مستند `داخلي` واحداً.
- البحث العام في المستأجر B أعاد مقاطعه فقط.

هذه **ليست** نتيجة Qdrant server أو bge-m3 حي؛ إنها Local-mode + mock حقيقيان
داخل مكتبة Qdrant والمصنع الرسمي.

## 5. أدلة التحصين الجديدة

| السيناريو | ما أُثبت |
|---|---|
| العبث بـ`text`/`content`/`section`/`content_hash` في Qdrant بعد الفهرسة | البحث يعيد النص والاستشهاد من Repository؛ الحقول الإضافية غير الحساسة تبقى |
| تحويل حمولة مقطع داخلي إلى `عام` في Qdrant دون تغيير Repository | البحث العام يسقطه بلا استثناء، والسياق المفوض يعيد تصنيفه المرجعي |
| فشل تقاعد جيل `داخلي` بعد ترقيته إلى `عام` | البحث العام يبقى آمناً، وإعادة المحاولة تنهي تقاعد الجيل القديم |
| بقايا تصنيف غير معروف لنفس المستند | السحب يحذف كل نقاط المستند داخل المؤسسة |
| إعادة `retire_missing` مرتين | المرة الثانية `0` مستندات مسحوبة، لا عدّ مكرر |
| محاولة تعديل `indexing_status` أو `chunk_id` أو `text` عبر تحديث حمولة عام | `TenantIsolationError` قبل أي كتابة |
| هوية مؤسسة بها zero-width/bidi/سطر جديد/NUL | `TenantScopeError` وHTTP 422 |
| استعلام مسافات فقط | Pydantic 422 قبل التضمين |
| مجموعة بأبعاد أو Distance مختلفة | HTTP 409 بلا حذف أو إعادة إنشاء |
| فشل Qdrant أو التضمين أو فحص المجموعة | HTTP 503 برسالة منقحة بلا تفاصيل داخلية |
| مجلد مستندات مفقود | HTTP 500 برسالة عامة؛ المسار المطلق في السجل فقط |

## 6. الاختبارات الحية المحجوبة

| الاختبار | الحالة | المانع الدقيق |
|---|---|---|
| Qdrant server + endpoint | BLOCKED | أمر `docker` غير موجود؛ `localhost:6333` غير متاح |
| bge-m3 عبر Ollama | BLOCKED | Docker/Ollama غير متاح، ولم يُثبت برنامج نظامي |
| PostgreSQL university live regressions | BLOCKED محلياً | Docker و`make dev-db` غير متاحين |
| Repository PostgreSQL | NOT IMPLEMENTED | كيانات/migrations المنصة غير موجودة في baseline وتحتاج اعتماد الفريق |

لا تُستنتج جودة semantic فعلية من mock؛ mock يثبت العقود والحتمية والعزل فقط.
كما أن اختبار Qdrant server الحي في CI لم يُشغل من هذا الجهاز، ويبقى مطلوباً
قبل وصف النتيجة بأنها إنتاجية.
