# دليل نظام تصميم «بيان» — Bayan Design System v1.0

**نوع الوثيقة:** المرجع الرئيسي لنظام التصميم والواجهات، إصدار 7/7.  
**الحالة:** مكتبة Frontend تجريبية؛ ليست نظامًا إنتاجيًا، ولم يكتمل ربط خدمات الخلفية.  
**مرجع الهوية:** `design-references/chat-reference.png` و`design-references/admin-reference.png`، كما في تصميمَي الفصل 4.7.2.  
**التقنية:** Next.js App Router + React + TypeScript + CSS Design Tokens + Lucide.  
**نطاق العمل:** 42 شاشة مسجلة في كتالوج المشروع، لكن الشاشات الفرعية في هذه النسخة تُعرض عبر نماذج أولية مشتركة، وليست كلها تطبيقات مستقلة مكتملة.

## خريطة صفحات نظام التصميم

| المرحلة | الصفحة | مرجع الكود | الغرض |
|---|---|---|---|
| 1. الهوية البصرية | `/design-system` | `styles/bayan-tokens.css` و`lib/bayan-tokens.ts` | ألوان، خط، مسافات، حدود، ظل |
| 2. المكونات العامة | `/design-system/components` | `components/ui/` | أزرار، حقول، بطاقات، جداول، Dialog وDrawer وToast |
| 3. هياكل الصفحات | `/design-system/layouts` | `components/layout/` | AppShell وChatLayout وAdminLayout وPlatformLayout وAuthLayout |
| 4. مكونات بيان | `/design-system/bayan-components` | `components/bayan/` | الرسائل، SQL، المراجع، التصدير، Smart Views، تتبع الوكلاء |
| 5. الحالات والصلاحيات | `/design-system/states-permissions` | `components/states/` و`lib/access/policy.ts` | حالات HTTP وتجربة أدوار المستخدمين |
| 6. التجاوب والوصول | `/design-system/responsive` | `styles/bayan-responsive.css` | نماذج عرض 390 و768 و1280 بكسل |
| 7. الجودة والقبول | `/design-system/quality` | `lib/quality/checklist.json` | معايير قبول، تسجيل نتائج يدوية وتصدير JSON |

## قواعد الهوية المعتمدة

- الألوان المرجعية: Navy `#0A2342`، Turquoise `#00A6B2`، App Background `#F5F9FD`، Card `#FFFFFF`.
- النص الأساسي `#122B48`، الحدود `#DCE7F2`، مع ألوان Semantic مستقلة للنجاح والتحذير والخطأ.
- Cairo مفضل، مع بدائل عربية؛ ليس مضمّنًا كملف خط في هذا الأرشيف ويجب توفيره قانونيًا ضمن بيئة التطوير إن أريد التطابق الطباعي.
- الاتجاه العام `html[dir=rtl][lang=ar]`؛ SQL والعناوين التقنية تتبع `dir=ltr` داخل مكوناتها فقط.
- التباعد بمضاعفات 4px، التحكم بأحجام 36/44/52px، والزوايا حسب tokens الثابتة.
- تقرر **عدم تغيير** CSS الأصلي أو التصميم المرجعي للشاشتين؛ تدرج الانتقال إلى المكونات الموحدة بعد اعتماد المطابقة بالمتصفح.

## منهج بناء أي شاشة جديدة

1. حدد كيان الشاشة في `lib/screen-catalog.json` (المسار، الوصف، الأولوية، الأدوار).
2. حدد رحلة الاستخدام UC المقابلة، وحقول API المتاحة فعلًا؛ لا تفترض أن كل مسار في الخطة منفذ خلفيًا.
3. اختر Layout المناسب، وأضف المكونات من `components/ui` و`components/bayan` دون نسخ CSS جديد عشوائي.
4. عالج الحالات: loading، streaming، success، empty، invalid، forbidden، unauthorized، rate-limit، server-error، offline.
5. أضف حالة قبول/سيناريو في `lib/quality/checklist.json`، واختبر RTL و390/768/1280 وTab/Escape.
6. لا تعتمد على إخفاء زر في الواجهة لحماية البيانات؛ يجب فرض سياسة الوصول على خادم FastAPI والمصادر الفعلية.
7. قارن لقطة الشاشة المرجعية عند 1448×1086 بكسل ثم وافق على أي اختلاف مقصود.
8. وثق أي تغيّر عبر طلب مراجعة (PR) مع صورة Before/After وسيناريو QA.

## قواعد المحافظة على الخصوصية والتجريبية

- بيانات الطلاب والمستخدمين والمصادر والنتائج داخل المعاينة افتراضية فقط.
- لا تتضمن لوحة تتبع الوكلاء سلسلة التفكير الداخلية؛ يُسمح بسجلات تشغيلية مختصرة مصرح بها.
- PDF في نموذج Exporter هو نافذة طباعة؛ Excel هو XML وليس XLSX، وCSV ملف فعلي. لا تعرضهما بخلاف ذلك.
- قائمة الصلاحيات في `lib/access/policy.ts` لأغراض العرض التجريبي وليست تحققًا من جلسة أو مؤسسة.
- يظل إثبات المصادقة وحماية SQL وتصفية المستندات وفق الدور وtenant مطلوبًا لدى Backend.

## التحقق والتسليم

- تحقق مستقل عن npm: `npm run check:stage4`, `check:stage5`, `check:stage6`, `check:stage7`.
- تحقق بعد التثبيت: `npm run lint && npm run build`.
- فحص browser فعلي: `npx playwright install chromium` ثم `npm run test:e2e`.
- سجل يدوي: `/design-system/quality`، جميع الاختبارات تبدأ بحالة **لم يُختبر**.
- متطلبات الإنتاج غير المحققة مبينة في `docs/RELEASE_READINESS_CHECKLIST.md`.

> لا تُعد اكتمال المراحل السبع إتمامًا لبناء الشاشات الـ42 أو التكامل مع النظام الخلفي أو شهادة امتثال لإمكانية الوصول.
