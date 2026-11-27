# الحفظ وقواعد البيانات وعزل قاعدة المنصة عن قواعد العملاء

## 1. مستودعات حفظ حالة التهيئة (`persistence/repository.py`)

توفر المنصة ثلاثة خيارات عبر الواجهة الموحدة `OnboardingStateRepository` مع فحص رقم النسخة التفاؤلي (`ConcurrentStateUpdateError`):
1. **`PostgresOnboardingStateRepository`:** يحفظ في جداول `onboarding_workflow_state` و`onboarding_organizations` داخل قاعدة بيانات المنصة الرسمية (`DATABASE_URL`) فقط، باستخدام معاملات ذرية (`FOR UPDATE`) وفحص تعارض الإصدار.
2. **`InMemoryOnboardingStateRepository`:** وضع الذاكرة السريع للاختبارات والتشغيل المؤقت.
3. **`JsonOnboardingStateRepository`:** مستودع تطوير محلي بكتابة ذرية (`mkstemp` + `fsync` + `os.replace`) معزول تماماً عن الإنتاج ولا يحمل أي بيانات تاريخية مسبقة.

## 2. فصل الأسرار وقواعد البيانات

- تمر دالة `_strip_transient_secrets` على كل لقطة قبل الحفظ لحذف أي مفاتيح `password` أو `dsn` أو `secret`.
- تفرض `connectors/scanner.py` اتصال قراءة فقط (`transaction_read_only=on` لـ PostgreSQL، و`mode=ro` + `PRAGMA query_only = ON` لـ SQLite داخل `BAYAN_SQLITE_ROOT`).
- تُكتب جداول الفهرس المتجهي (`pgvector`) وجداول حالة التهيئة داخل قاعدة بيانات المنصة فقط، ولا تمس قاعدة العميل المصدر بأي كتابة.

## 3. تشغيل الفهرسة الدلالية

- في `BAYAN_ENV=production` يستخدم مسار التهيئة `PgVectorSemanticRepository` مع `DATABASE_URL` تلقائياً؛ لا يعود إلى فهرس الذاكرة عند غياب خدمة PostgreSQL أو فشلها.
- في التطوير والاختبارات يستخدم مستودع الذاكرة افتراضياً، ويمكن اختيار pgvector صراحةً عبر `BAYAN_ONBOARDING_USE_PGVECTOR=1`.
- هذا الإعداد لا يفعّل `Catalog v2` في وكيل SQL؛ يبقى `CATALOG_PROVIDER=legacy` حتى اعتماد التبديل وفق عقد الكتالوج المجمد.
