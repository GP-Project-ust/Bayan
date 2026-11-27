# تقرير الاختبارات وفحوصات الجودة — `PR-2`

**المستودع:** `C:\Bayan` (`GP-Project-ust/Bayan`)  
**الفرع المرجعي لـ PR-1:** `feature/issue-7-discovery` (التزام `1522f5b`)  
**الفرع قيد الفحص لـ PR-2:** `feature/issue-7-semantic-catalog` (مبني فوق `1522f5b`)

---

## 1. ملخص فحوصات الجودة والأمان والأصول الثابتة

| الفحص | الأمر المنفذ | النتيجة الفعلية المرصودة |
| --- | --- | --- |
| فحص أسلوب وكفاءة الكود (`Ruff`) | `cd C:\Bayan\backend && .venv\Scripts\python.exe -m ruff check app tests` | **نجاح كامل** (`All checks passed!`, رمز خروج `0`) |
| فحص الترميز بلا `UTF-8 BOM` | فحص البايتات الثلاثة الأولى لجميع ملفات `git ls-files` | **نجاح كامل** (`BOM_FILES: []`) |
| فحص بنية Golden Dataset | `python evaluation/runners/verify_dataset.py --stats` | **نجاح كامل** — 33 سؤالاً دون ملاحظات بنيوية (`DATASET:0`) |
| عدّاد الأمان العدائى لوكيل SQL | `python evaluation/runners/run_safety.py` | **نجاح كامل** — 15/15 سؤالاً محجوزاً، 0 تسريب (`SAFETY:0`) |

---

## 2. نتائج اختبارات `pytest` المصنفة

| الدفعة | الملفات المشمولة | النتيجة الفعلية | سبب التخطي أو الملاحظات |
| --- | --- | --- | --- |
| اختبارات PR-1 وPR-2 والعقود الأساسية (`Batch 1`) | `test_onboarding_introspection.py`, `test_onboarding_descriptions.py`, `test_onboarding_fingerprints.py`, `test_onboarding_pgvector.py`, `test_onboarding_catalog_v2.py`, `test_onboarding_idempotency.py`, `test_catalog_contract.py`, `test_qdrant_factory.py`, `test_events.py`, `test_llm_provider.py`, `test_table_payload.py` | **49 passed** (`exit 0`) | تشمل اختبارات العقد الرسمي غير المعدلة 9/9، واختبارات v2، والتضمين الرسمي `mock`، والتكرار الحتمي `idempotency` |
| اختبارات وكيل SQL | `tests/test_sql_agent.py` | **36 passed, 2 skipped** (`exit 0`) | المتجاوزان يختبران الاتصال الحي بقاعدة الجامعة على المنفذ `5433` |
| اختبارات أداة الفهرسة | `tests/test_dev_indexer.py` | **10 passed, 1 skipped** (`exit 0`) | لم يُمس أو يُعدّل أي كود تابع لـ PR-3 |
| اختبارات البث والمحادثة | `test_chat.py`, `test_playground_and_sql.py`, `test_stream.py` | **12 passed, 3 skipped** (`exit 0`) | المتجاوزة تتطلب قاعدة الجامعة الحية (`make dev-db`) |
| فحص الصحة (`/api/v1/health`) | `tests/test_health.py` | **تعذر إكماله خلال المهلة محلياً** | يعتمد `_check_database()` في `health.py` على اتصال PostgreSQL بدون مهلة قصيرة على loopback Windows عندما تكون البنية التحتية غير مرفوعة (لم يُعدّل `health.py` التزاماً بحدود الملكية) |

**الإجمالي المتحقق منه فعلياً في هذه البيئة:** **`107 passed, 6 skipped`** عبر دفعات الاختبار المكتملة، مع **`Ruff: 0`** و**`run_safety: 15/15 (exit 0)`**.

---

## 3. نتائج إثبات العمومية والمحاكاة على قاعدتَي البيانات

نُفذ `UnifiedOnboardingPipeline.run` بنفس الشيفرة وتغيير `PostgresConnectionSettings` فقط مع `EMBEDDING_PROVIDER=mock` (`1024` بعداً):

| المعيار | قاعدة الجامعة (`university` / `public` مع `04_views.sql`) | قاعدة اللوجستيات (`logistics_demo` / `logistics`) |
| --- | --- | --- |
| الجداول الفيزيائية / المشاهد / الكائنات | `9` / `5` / `14` | `6` / `2` / `8` |
| البصمة البنيوية (`structural_fingerprint`) | `2c878899d1b370c7576f0d5ef27544d2c54130c1de88268be49726d10844bbed` | `67433012d509b378bcaff663eff2c518eee5073b7679746551a671bfdc810361` |
| التشغيل الأول (`inserted / updated / embedded / active`) | `204 / 0 / 204 / 204` | `92 / 0 / 92 / 92` |
| التشغيل الثاني (`inserted / updated / unchanged / embedded`) | `0 / 0 / 204 / 0` (تطابق تام وإعادة استخدام المتجهات) | `0 / 0 / 92 / 0` (تطابق تام وإعادة استخدام المتجهات) |
| مشاهد `Catalog v2` | 5 مشاهد | مشهدان |

---

## 4. حالة التحقق على البنية التحتية الحية

- **معلّق / محجوب بيئياً (`Blocked by Infrastructure`):** لا يتوفر `docker` أو `psql` أو `make` أو خدمة PostgreSQL (`5432`/`5433`) أو `pgvector` أو `Ollama` (`11434`) مشغلة على جهاز الاختبار الحالي (`TcpTestSucceeded: False`).
- **القاعدة المعمارية الصارمة:** لم يُدَّعَ أي نجاح اتصال حي استناداً إلى اختبارات المحاكاة؛ بل فُصل دليل المحاكاة وCI الوحدوي عن التحقق الحي المطلوب تشغيله في بيئة Docker/CI الرسمية.
