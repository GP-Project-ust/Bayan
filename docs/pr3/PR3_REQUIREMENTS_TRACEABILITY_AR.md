# مصفوفة تتبع متطلبات PR-3

## مفتاح الحالات

- **COMPLETE AND VERIFIED**: تنفيذ ودليل اختبار منفذ.
- **IMPLEMENTED BUT UNVERIFIED**: تنفيذ بلا تحقق حي مطلوب.
- **PARTIALLY IMPLEMENTED**: جزء صالح مع اعتماد مؤجل موثق.
- **NOT IMPLEMENTED**: خارج التنفيذ الحالي.
- **FAILED**: تحقق منفذ وفشل.
- **BLOCKED**: مانع بيئي أو عقد فريق.

## مصفوفة Issue #7 وPR-3

| ID | المصدر والمتطلب | ملف/رمز التنفيذ | الاختبار/الدليل | النتيجة |
|---|---|---|---|---|
| PR3-01 | Issue #7: قراءة اللوائح الخمس TXT | `loader.py:TxtDocumentLoader`, `pipeline.py:sync_directory` | `test_official_documents.py` + `test_dev_indexer.py` | **COMPLETE AND VERIFIED** — 5 ملفات CRLF |
| PR3-02 | حزمة قابلة لإعادة الاستخدام | `services/ingestion/__init__.py` وكل الوحدات | استيراد وتشغيل 62 اختباراً | **COMPLETE AND VERIFIED** |
| PR3-03 | تقطيع عربي حتمي | `chunker.py:ArabicDocumentChunker` v2 | `test_loader_and_chunker.py` + CRLF/LF official | **COMPLETE AND VERIFIED** |
| PR3-04 | المصنع الرسمي | `embedder.py:OfficialEmbeddingService` | `test_identity_and_embeddings.py`, `test_qdrant_factory.py` | **COMPLETE AND VERIFIED** |
| PR3-05 | `bayan_policies` وCosine | `indexer.py:ensure_compatible_collection` | mismatch أبعاد + Distance tests | **COMPLETE AND VERIFIED** local-mode |
| PR3-06 | هويات SHA-256/UUID | `identity.py` | identity tests + payload assertions | **COMPLETE AND VERIFIED** |
| PR3-07 | حمولة قديمة + أكاديمية كاملة | `pipeline.py:_prepare_points` | official/pipeline payload tests | **COMPLETE AND VERIFIED** |
| PR3-08 | Incremental skip | `pipeline.py:_is_unchanged` | repeated run tests | **COMPLETE AND VERIFIED** |
| PR3-09 | منع التكرار | IDs + `upsert` + generation retirement | 65 مقطعاً بعد إعادة التشغيل | **COMPLETE AND VERIFIED** |
| PR3-10 | ملف معدل/إصدار جديد/config متغير | `ingest_document`, `_prepare_vectors` | incremental tests | **COMPLETE AND VERIFIED** |
| PR3-11 | حذف/سحب مصرح | `sync_directory(retire_missing)`, `withdraw` | removal/empty-scope/repeated tests | **COMPLETE AND VERIFIED** |
| PR3-12 | تعافي الانقطاع وعدم محو القديم | staged/ready + reconciliation | partial upsert/repository/delete tests | **COMPLETE AND VERIFIED** |
| PR3-13 | عزل المستأجرين | `TenantScope`, مرشحات `indexer.py` | `test_tenant_isolation.py` | **COMPLETE AND VERIFIED** |
| PR3-14 | اختبار A/B السلبي الإلزامي | نفس السابق | بحث متطابق + read/update/delete/withdraw/missing scope | **COMPLETE AND VERIFIED** |
| PR3-15 | ربط endpoint القائم بلا تعديل الواجهة | `dev_indexer.py` | 20 اختبار endpoint ناجحاً + صفحة HTML كما هي | **COMPLETE AND VERIFIED** local-mode |
| PR3-16 | CI بلا AI خارجي | mock + in-memory Qdrant | 62 اختبار ingestion | **COMPLETE AND VERIFIED** محلياً؛ CI الرسمي لم يُشغل |
| PR3-17 | نص البحث مرجعي لا يثق بحمولة Qdrant | `pipeline.py:_authoritative_payload` | `test_search_returns_repository_text...` | **COMPLETE AND VERIFIED** |
| PR3-18 | تقاعد/سحب كل تصنيفات المستند نفسها | `indexer.py:_document_filter(include_all_classifications=True)` | classification downgrade + unknown residue tests | **COMPLETE AND VERIFIED** |
| PR3-19 | هوية مؤسسة Unicode آمنة | `tenant_scope.py:validate_tenant_id` | NFC + zero-width/bidi/control tests | **COMPLETE AND VERIFIED** |
| PR3-20 | حدود endpoint منقحة | `dev_indexer.py` | 422/409/503 + missing-dir sanitization tests | **COMPLETE AND VERIFIED** |
| PR3-21 | اتساق CRLF/LF | `chunker.py` v2 + official copies | `test_official_crlf_sources...` | **COMPLETE AND VERIFIED** |

## التتبع الأكاديمي

| ID | المرجع | التنفيذ | الاختبار | النتيجة |
|---|---|---|---|---|
| UC-02 | Search Documents، مصدر/صفحة/مقطع | title/section/article/text/source_reference و`page_number=null` لـTXT | official payload/search tests | **COMPLETE AND VERIFIED** ضمن ingestion/retrieval؛ توليد إجابة RAG خارج الملكية |
| FR-16 | بحث Qdrant آمن | `DocumentIngestionPipeline.search`, server-side filters | tenant/classification tests | **COMPLETE AND VERIFIED** |
| FR-18 | مصدر قابل للتتبع | offsets + identities + source reference + original content | loader/chunker/official slice tests | **COMPLETE AND VERIFIED** لبيانات الاستشهاد؛ صياغة RAG خارج الملكية |
| FR-19 | فهرسة تلقائية عند التهيئة | pipeline + `/dev/indexer/ingest` | five official fixtures | **COMPLETE AND VERIFIED** لنقطة التطوير؛ onboarding العام خارج PR-3 |
| FR-20 | تضمين متعدد اللغات | المصنع الرسمي ADR-005، `bge-m3` config | mock Arabic/mixed tests | **IMPLEMENTED BUT UNVERIFIED** لجودة bge-m3 الحية |
| T4-41 | `documents` | `repository.py` schema/model | SQLite persistence test | **PARTIALLY IMPLEMENTED** — متوافق محلياً، PostgreSQL migration غير معتمد |
| T4-42 | `document_versions` | `repository.py` | version/restart tests | **PARTIALLY IMPLEMENTED** للسبب نفسه |
| T4-43 | `document_chunks` | `repository.py` | offsets/point/reference tests | **PARTIALLY IMPLEMENTED** للسبب نفسه |
| T4-47 | Qdrant payload | `_prepare_points` | official required-payload assertions | **COMPLETE AND VERIFIED** |
| §4.5 | tenant + classification قبل retrieval ثم PostgreSQL validation | Qdrant filter + Repository validation | negative security tests | **COMPLETE AND VERIFIED** ضمن السياق المتاح |

## متطلبات الجودة والأمان الإضافية

| ID | المتطلب | التنفيذ/الدليل | النتيجة |
|---|---|---|---|
| SEC-PATH | traversal/extension/encoding/size/empty | Loader + 10+ حالات اختبار | **COMPLETE AND VERIFIED** |
| SEC-CLASS | عدم كشف restricted لغير المفوض | classification filter + public-only endpoint | **COMPLETE AND VERIFIED** للقيم الرسمية الحالية؛ RBAC الكامل **PARTIALLY IMPLEMENTED** |
| SEC-UNICODE | منع انتحال هوية المؤسسة بمحارف غير مرئية | NFC + whitespace + رفض Cf/Cc/Cs/Co/Cn/Zl/Zp | **COMPLETE AND VERIFIED**؛ confusables تحتاج طبقة مصادقة |
| SEC-PAYLOAD | عدم الثقة بنص/تصنيف Qdrant عند الإرجاع | `_authoritative_payload` + مرشح قديم يُسقط | **COMPLETE AND VERIFIED** |
| SEC-IDENTITY-FIELDS | حماية العزل والهوية والنص من تحديث عام | `_PROTECTED_PAYLOAD_FIELDS` | **COMPLETE AND VERIFIED** |
| SEC-LIFECYCLE | تقاعد/سحب لا يترك بقايا تصنيف | فلتر tenant+document lifecycle | **COMPLETE AND VERIFIED** |
| SEC-ENDPOINT | أخطاء منقحة وعدم كشف المسارات/التفاصيل | 422/409/503 + logging فقط | **COMPLETE AND VERIFIED** |
| REL-COLLECTION | لا recreation عند mismatch | صريح في `ensure_compatible_collection` | **COMPLETE AND VERIFIED** |
| REL-FAILURE | لا نجاح زائف عند failure | Exceptions + staged + tests | **COMPLETE AND VERIFIED** |
| REL-SQLITE | إغلاق اتصالات SQLite وتناسق withdrawn | context manager + InMemory filter | **COMPLETE AND VERIFIED** |
| PERF-BATCH | batch embedding/upsert | embedder/indexer | batching tests | **COMPLETE AND VERIFIED** |
| PERF-MEMORY | bounded source | 2 MiB default + batches | unit tests | **COMPLETE AND VERIFIED** |
| LIVE-QDRANT | خدمة Qdrant حقيقية | test class موجود | **BLOCKED** — Docker/Qdrant غير متاح |
| LIVE-BGE | Ollama bge-m3 | المصنع جاهز | **BLOCKED** — Ollama غير متاح |
| PG-PROD | PostgreSQL مصدر الحقيقة | Protocol جاهز، لا migration | **PARTIALLY IMPLEMENTED** |
| AUTH-PROD | tenant من هوية موثوقة | موثق؛ endpoint dev فقط | **NOT IMPLEMENTED** في baseline/PR-3 |
| AUDIT-PROD | تسجيل رفع/فشل/سحب | logging منقح فقط | **PARTIALLY IMPLEMENTED**؛ جدول audit غير موجود |
| REGRESSION | كل backend | 170 collected: 164 passed، 6 live skipped، exit 0 | **COMPLETE AND VERIFIED** محلياً مع ضبط connect timeout بيئي؛ CI الرسمي باقٍ |

لا توجد حالة **FAILED** مخفية في الاختبارات المنفذة؛ القيود أعلاه مصنفة بحسب
الدليل المتاح دون نسب إنجاز مختلقة. عدد اختبارات PR-3 المجمّعة 83: 82 ناجحاً
وواحد Qdrant حي متخطى.
