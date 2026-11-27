# تقرير التقسية والقبول النهائي لـ `PR-2` (`Sprint 1 — Issue #7`)

**تاريخ الاعتماد والمراجعة:** 2026-11-25  
**المستودع الرسمي المعزول محلياً:** `C:\Bayan` (`https://github.com/GP-Project-ust/Bayan`)  
**الفرعان المكدّسان:**
- أساس PR-1: `feature/issue-7-discovery` (`1522f5b` فوق `dev@5022a84`)
- تنفيذ وتقسية PR-2: `feature/issue-7-semantic-catalog` (فوق `1522f5b`)

---

## 1. التعديلات التقسية المنفذة على PR-2

### أ. تقسية المشهدين الجامعيين في [`database/university_demo/04_views.sql`](file:///C:/Bayan/database/university_demo/04_views.sql)
1. **إلغاء `DROP VIEW ... CASCADE`:** أُزيلت عبارتا `DROP VIEW IF EXISTS ... CASCADE` بالكامل واستُعيض عنهما بـ `CREATE OR REPLACE VIEW` داخل معاملة آمنة، لمنع أي إسقاط متسلسل غير مقصود لمشاهد أو صلاحيات تابعة لاحقاً.
2. **صحة التجميع المالي ومعالجة `NULL` والربط:**
   - في `v_student_financial_status`: تحويل ربط `op_course` و`op_batch` إلى `LEFT JOIN` اتساقاً مع [03_views_and_reader.sql](file:///C:/Bayan/database/university_demo/03_views_and_reader.sql)، والتجميع عبر `s.id`، وحماية `f.amount` و`f.paid_amount` بـ `COALESCE(..., 0)`، ومعالجة `has_overdue` عبر `COALESCE(BOOL_OR(f.state = 'متأخر'), FALSE)` حتى لا يعود `NULL` للطلاب بلا سطور رسوم.
   - في `v_program_financial_summary`: فصل التجميع على مستوى الطالب أولاً عبر CTE (`student_totals`) ثم ربطه بـ `op_course` و`op_batch` بشرط `st.batch_id = b.id AND st.course_id = c.id`، مما يمنع تضاعف الربط (fanout) عند تعدد الأقساط ويجعل `students_with_outstanding` يحسب عدد الطلاب بدقة (`WHERE st.outstanding > 0 OR st.has_pending_state`).
3. **التصنيف الأمني لـ `v_student_financial_status`:** وُثق في `COMMENT ON VIEW` وفي [`UNIVERSITY_VIEWS_JUSTIFICATION_AR.md`](file:///C:/Bayan/docs/onboarding/UNIVERSITY_VIEWS_JUSTIFICATION_AR.md) أن هذا المشهد يحمل تصنيف **`restricted`** لربطه هوية الطالب الفردية (`roll_number`, `student_name`) بالمبالغ والمتأخرات (مع حذف `email` و`phone`)، بينما يبقى `v_program_financial_summary` بتصنيف **`public`** مجمّعاً بلا أفراد.

### ب. فرض حدود الصلاحية والتصنيف والعزل في الفهرس و`Catalog v2`
- **الإسناد الدلالي والتصنيف ([builder.py](file:///C:/Bayan/backend/app/services/onboarding/indexing/builder.py)):** أُضيفت `_infer_default_classification` لتصنيف المشاهد/الكائنات المالية الفردية تلقائياً كـ `restricted` عند غياب التخصيص، مع بقاء المشاهد المجمّعة `public`.
- **عزل المستودع والبحث ([repository.py](file:///C:/Bayan/backend/app/services/onboarding/indexing/repository.py) و[search.py](file:///C:/Bayan/backend/app/services/onboarding/indexing/search.py)):** إضافة `allowed_classifications` في `search` و`list_active_views` مع استبعاد دائم لـ `'blacklist'` حتى لو مُررت في المعامل، ومنع البحث إذا كان `tenant_id` فارغاً.
- **تحصين مزود `Catalog v2` ([models.py](file:///C:/Bayan/backend/app/services/onboarding/catalog/models.py) و[adapter.py](file:///C:/Bayan/backend/app/services/onboarding/catalog/adapter.py)):** التحقق من `tenant_id` في المُنشئ، وتقاطع `allowed_views` مع `allowed_views_scope` لمنع أي تصعيد نطاق، وفحص مزدوج في الذاكرة للمستأجر والمصدر ونوع الكائن (`view` حصراً) والتصنيف.
- **العقد المجمد:** لم يُمس [`sql_catalog.py`](file:///C:/Bayan/backend/app/agents/sql_catalog.py) أو [`test_catalog_contract.py`](file:///C:/Bayan/backend/tests/test_catalog_contract.py)، وبقي مقترح `CATALOG_PROVIDER=static_v1|semantic_v2` موثقاً فقط دون تفعيل.

### ج. فصل قاعدة المنصة وسلامة التزامن والمعاملات والأمر الموحد
- **فصل قاعدة المنصة عن قاعدة العميل ([pipeline.py](file:///C:/Bayan/backend/app/services/onboarding/pipeline.py)):** أُضيفت `_assert_platform_source_separation` لمنع توجيه `DATABASE_URL` (`pgvector`) إلى قاعدة بيانات المصدر نفسها (`ODOO_DB_*`).
- **التزامن والاسترداد المعاملاتي ([repository.py](file:///C:/Bayan/backend/app/services/onboarding/indexing/repository.py)):** إضافة قفل التزامن الاستشاري `SELECT pg_advisory_xact_lock(hashtext(%s))` على مستوى المعاملة لكل `(tenant_id, source_id)` داخل `PgVectorSemanticRepository.apply_changes`، مع التراجع الكامل (`rollback`) عند أي فشل، وتشغيل التضمين قبل الحفظ المعاملاتي بحيث لا تتأثر البيانات المخزنة أو تُؤرشف سجلات سليمة عند فشل التضمين.
- **إصلاح مسار التشغيل في [`Makefile`](file:///C:/Bayan/Makefile#L84-L85):** تعديل هدف `onboarding` ليعمل من جذر المستودع مع `PYTHONPATH=backend` (بما يقرأ `.env` الجذري ويجد `backend/.venv` على كلٍ من Linux وWindows Git Bash) بدل `cd backend && $(PY_RUN)` التي كانت تكسر المسار النسبي عند وجود `backend/.venv`.

---

## 2. أدلة الاختبار الفعلي بعد آخر تعديل

| الفحص | الأمر والبيئة | النتيجة الفعلية المرصودة |
| --- | --- | --- |
| فحص الجودة `Ruff` | `.venv\Scripts\python.exe -m ruff check app tests` | **`All checks passed!`** (`RUFF:0`) |
| اختبارات الانحدار الشاملة (16 ملفاً: PR-1 + PR-2 + العقد المجمد + Qdrant + الأحداث + المزوّد + وكيل SQL + الفاحص + المحادثة + البث) | `pytest tests/test_onboarding_*.py tests/test_catalog_contract.py tests/test_qdrant_factory.py tests/test_events.py tests/test_llm_provider.py tests/test_table_payload.py tests/test_sql_agent.py tests/test_dev_indexer.py tests/test_chat.py tests/test_playground_and_sql.py tests/test_stream.py -q` | **`107 passed, 6 skipped`** (`ALL_REGRESSION:0`)؛ المتجاوزة الـ 6 هي اختبارات قاعدة الجامعة الحية (`make dev-db` غير مشغّلة) |
| فحص Golden Dataset (`evaluation/runners/verify_dataset.py --stats`) | `backend\.venv\Scripts\python.exe evaluation\runners\verify_dataset.py --stats` | **33 سؤالاً سليماً بنيوياً** (`DATASET:0`) |
| فحص الأمان العدائى (`evaluation/runners/run_safety.py`) | من تشغيل التحقق السابق لعدم تعديل وكيل SQL | **15/15 محجوز، 0 تسريب** (`SAFETY:0`) |
| فحص UTF-8 BOM | فحص جميع ملفات Git | **`BOM: []`** |
| تشغيل CLI من الجذر على Windows (`PYTHONPATH=backend`) | `$env:PYTHONPATH="backend"; backend\.venv\Scripts\python.exe -m app.services.onboarding.cli --help` | يعرض الخيارات الكاملة بنجاح |
| `tests/test_health.py` (مشكلة قائمة دون تعديل) | فحص نقطة `/api/v1/health` في [health.py](file:///C:/Bayan/backend/app/api/v1/endpoints/health.py) | يتوقف محلياً على Windows بمهلة اتصال TCP الطويلة عندما تكون خدمة PostgreSQL (`5432`) متوقفة لأن `get_platform_engine()` لا يمرر `connect_timeout` قصيراً؛ وُثّقت الملاحظة دون تعديل الملف المملوك للفريق |

---

## 3. التنسيق المعلق ومخرجات الالتزامات (`Git`)

1. **التحقق الحي عبر البنية التحتية (معلّق — يتطلب التنسيق مع وكيل البنية التحتية المستقل ومقيّم `Golden Dataset`):**
   - تنفيذ `01_schema.sql`, `02_seed.py`, `03_views_and_reader.sql`, `04_views.sql` و`logistics_demo` على خادم `PostgreSQL 16` حي.
   - التحقق الحي من `pgvector` و`Ollama bge-m3` وتشغيل `verify_dataset.py --dsn ...` على الأسئلة الذهبية.
   - العائق البيئي المؤكد: غياب `Docker` و`psql` و`make` وخدمات PostgreSQL (`5432`/`5433`) وOllama (`11434`) في بيئة Windows الحالية.
2. **فصل التزامات Git (`feature/issue-7-discovery` و`feature/issue-7-semantic-catalog`):**
   - `1522f5b` على `feature/issue-7-discovery`: أساس PR-1 فقط (17 ملفاً).
   - `e1a5da6` + التزام التقسية على `feature/issue-7-semantic-catalog`: تنفيذ وتقسية PR-2 كاملةً، قابلة للمراجعة منفصلة عن PR-1 ودون أي تعارض مع مسارات PR-3 أو العقود المجمدة.

---

## 4. الحكم النهائي لحالة الجاهزية

| النطاق | الحالة النهائية |
| --- | --- |
| أساس PR-1 + تقسية PR-2 (الوحدات، المنطق، الأمان، العقد المجمد، Ruff، الاختبارات الآلية بـ Mock/InMemory) | **جاهز للمراجعة (`COMPLETE AND VERIFIED WITH MOCK/UNIT TESTS`)** |
| التحقق الحي (PostgreSQL، pgvector، bge-m3، `04_views.sql` الحية، و`verify_dataset --dsn`) | **معلّق بسبب غياب البنية التحتية المحلية (`PENDING LIVE INFRASTRUCTURE & EVALUATION COORDINATION`)** |
| التفعيل الافتراضي لـ `Catalog v2` في الإنتاج | **مؤجّل لحين اعتماد مالك العقد وتنفيذ التحقق الحي (`AWAITING TEAM APPROVAL`)** |
