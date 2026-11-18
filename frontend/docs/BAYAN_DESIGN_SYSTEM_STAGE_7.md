# المرحلة السابعة من سبع مراحل — التوثيق والاختبارات

## النطاق المنجز

1. كتالوج QA من **72 حالة قبول** يشمل **42 شاشة** و**7 حالات استخدام** و6 حالات خطأ/اتصال، و8 وصول/تجاوب، و5 أمن/أدوار، و4 مطابقة بصرية.
2. صفحة تفاعلية `/design-system/quality` لفلترة الحالات، قراءة المعايير، تسجيل نتيجة الاختبار اليدوي، كتابة ملاحظات، وحفظها في `localStorage` داخل نفس المتصفح وتصدير JSON.
3. مرجع مركزي لنظام التصميم، وواجهات المكونات، ومصفوفة قبول، وخطة وصول، وبروتوكول مطابقة بصرية، وبوابة إصدار، وتسليم Backend.
4. فحوص عقود آلية على كتالوج المسارات، وتغطية المتطلبات، ومراجع الصور، وألوان الهوية. يتوفر اختبار متصفح اختياري بواسطة Playwright.

## الملفات الجديدة

- `app/design-system/quality/{page.tsx,playground.tsx,quality.css}`
- `lib/quality/checklist.json`
- `docs/DESIGN_SYSTEM_HANDBOOK.md`, `docs/COMPONENT_API_REFERENCE.md`, `docs/QA_ACCEPTANCE_MATRIX.md`
- `docs/ACCESSIBILITY_TEST_PLAN.md`, `docs/VISUAL_REGRESSION_PROTOCOL.md`
- `docs/INTEGRATION_HANDOFF.md`, `docs/RELEASE_READINESS_CHECKLIST.md`
- `scripts/verify-stage7.mjs`, `tests/contracts/quality.test.mjs`
- `playwright.config.ts`, `tests/e2e/bayan-ui.spec.ts`

## التشغيل والتحقق

```bash
npm install
npm run check:stage7  # فحوص عقود بنيوية مستقلة عن توافر حزم Next.js
npm run lint          # tsc --noEmit
npm run build         # بناء Next.js
npx playwright install chromium
npm run test:e2e      # Smoke / keyboard / responsive checks
npm run dev
```

ثم افتح `http://localhost:3000/design-system/quality`.

## حدود النتائج

- اختبارات العقود البنيوية لا تثبت نجاح بناء Next.js أو عدم وجود أخطاء Run-time.
- حالات الجودة تبدأ كلها `not_run`، وحتى عند وضع `passed` فهي نتيجة مسجلة يدويًا محليًا فقط، لا نتيجة أداة موثوقة أو backend.
- اختبار التصاميم الأصلية بالبكسل لم يُنفذ ويجب إجراؤه على متصفح فعلي.
- لا توجد مصادقة أو API حقيقي؛ لا يمكن إثبات أمن الإنتاج عبر هذا التسليم.
- وجود 42 شاشة في الكتالوج لا يعني تنفيذها كـ42 شاشة مستقلة مكتملة.

## مرحلة العمل التالية بعد Design System

وفق أولوية P0: تطبيق صفحات تسجيل الدخول والجلسة والمحادثة والبحث الدلالي والتقارير والإدارة الأساسية بشكل منفصل، مع اعتماد دورة واجهة → حالات → API → اختبار وظيفي → قبول بصري، ثم المجموعات P1 وP2. لا تُغيّر التصميمات المعتمدة دون موافقة المستخدم.
