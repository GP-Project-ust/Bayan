# بيان — نظام التصميم، المرحلة الرابعة (4/7)

## الهدف
إنشاء مكونات واجهات متخصصة لنظام «بيان» فوق Design Tokens للمرحلة الأولى، ومكتبة UI للمرحلة الثانية، وتخطيطات المرحلة الثالثة، مع إبقاء الشاشتين المرجعيتين `/` و`/admin` كما هما.

**النطاق:** واجهة أمامية React/Next.js فقط، بدون اتصال بخدمات SQL أو RAG أو Odoo أو Qdrant أو المصادقة. كل بيانات التجربة افتراضية. المكونات موثَّقة وقابلة لإعادة الاستخدام وربط Backend لاحقًا.

## المكونات السبعة

| المكون | المصدر | السلوك | مدخلات التكامل لاحقًا |
|---|---|---|---|
| ChatComposer | `components/bayan/ChatComposer.tsx` | رسالة عربية، اقتراحات، إرسال، إرفاق اختياري | `onSend` و`onAttach` |
| MessageBubble | `components/bayan/MessageBubble.tsx` | رسائل المستخدم/المساعد، وقت، حالة ونسخ | `ChatMessageData` |
| SQLViewer | `components/bayan/SQLViewer.tsx` | طي وفتح SQL للقراءة فقط، نسخ، إخفاء عند عدم التفويض | `sql`, `canView` |
| CitationCard | `components/bayan/CitationCard.tsx` | اسم المستند والصفحة والمقتطف، فتح التفاصيل | `DocumentCitation`, `onOpen` |
| ReportExporter | `components/bayan/ReportExporter.tsx` | CSV، Excel XML، الطباعة/الحفظ PDF، أو استدعاء خلفي | `columns`, `rows`, `onExport` |
| SmartViewManager | `components/bayan/SmartViewManager.tsx` | بحث وتصنيف أمني وتفعيل محلي؛ منع إجراءات الإدارة دون صلاحية | `SmartViewData[]`, `canManage`, callbacks |
| AgentTraceViewer | `components/bayan/AgentTraceViewer.tsx` | مراحل الوكلاء، الحالات، مدد التشغيل والتفاصيل التشغيلية | `AgentTraceStepData[]`, `canView` |

> طبقة Smart Views هنا **واجهة إدارة** فقط، وليست إنشاء SQL Views في قاعدة البيانات. `AgentTraceViewer` يعرض الأحداث التشغيلية، ولا يتضمن استدلالات النماذج الداخلية.

## تجربة التشغيل

```bash
npm install
npm run check:stage4
npm run lint
npm run build
npm run dev
```

افتح: `http://localhost:3000/design-system/bayan-components`

الشاشتان المرجعيتان ما زالتا: `/` و`/admin`.

### اختبارات تفاعلية مقترحة

1. اكتب سؤالاً، أو اختر اقتراحًا؛ ستظهر رسالة المستخدم وحالة انتظار تجريبية، ثم اضغط «إكمال المعالجة التجريبية».
2. افتح وأغلق `SQLViewer`، وجرّب نسخ SQL، ثم أزل خيار المحاكاة المتقدمة لرؤية حالة حجب العرض.
3. افتح تفاصيل مصدر RAG توضيحي وتحقق من عرض الاسم ورقم الصفحة.
4. صدّر تقريرًا تجريبيًا CSV، ثم Excel XML وافتح الملف ببرنامج Excel، واستخدم PDF لفتح نافذة الطباعة.
5. ابحث في العروض الذكية، صفِّ النتائج حسب المستوى الأمني، بدّل الحالة وأضف عرضًا تجريبيًا.
6. افتح تفاصيل خطوة في مسار الوكلاء، وراجع الحالات والمدة.
7. اختبر زر الرجوع والتنقل بـRTL وباستخدام لوحة المفاتيح، وعلى عرضَي 1448 و390 بكسل.

## عقد التكامل مع الخادم (لاحقًا)

- **المحادثة**: ربط `onSend` بمسار المحادثة الفعلي. عند اعتماد SSE تُحدَّث الرسائل تدريجيًا؛ التطبيق الحالي ليس SSE.
- **SQL**: يجب على Backend فحص RBAC قبل إعادة الاستعلام. حجب المكون في React ليس حماية أمنية.
- **الاستشهادات**: يجب اشتقاق `documentTitle`, `page`, `excerpt` من metadata للفهرس الدلالي، لا من نص مولد أو قيم افتراضية.
- **التقارير**: عند توافر API للتصدير مرر `onExport` لاستخدام الخدمة. تصدير Excel الحالي ملف XML متوافق وليس `.xlsx`؛ PDF يستخدم طباعة متصفح.
- **العروض الذكية**: استبدل الحالة المحلية بعمليات API مع مصادقة وتفويض على مستوى الخادم. استخدم التصنيفات الأربع `Public`, `Masked`, `Restricted`, `Blacklist` طبقًا للتصميم.
- **تتبع الوكلاء**: اربط الأحداث التشغيلية المسجلة فقط، مع إخفاء أسرار الاتصال والمعرّفات الحساسة. لا تعرض سلسلة التفكير الداخلية للنموذج.
- **الأمان**: تجنب عرض محتوى ممنوع في البيانات المرسلة إلى المتصفح أصلاً، حتى لو أخفته بصريًا.

## مثال React

```tsx
"use client";
import { useState } from "react";
import { ChatComposer, SQLViewer, type ChatMessageData } from "@/components/bayan";

export function BayanChatExample() {
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  return <>
    <ChatComposer value={draft} onChange={setDraft} onSend={text => {
      setMessages(old => [...old, { id: `${old.length + 1}`, role: "user", text }]);
      setDraft("");
    }}/>
    <SQLViewer sql="SELECT COUNT(*) FROM smart_view_students;" canView={false}/>
  </>;
}
```

## ملفات التصميم المحمية

لم يُقصد تعديل `app/globals.css` أو `components/ChatView.tsx` أو `components/AdminDashboard.tsx` أو صور المراجع. أنماط هذه المرحلة معزولة في `components/bayan/bayan.css` و`app/design-system/bayan-components/showcase.css`.

## حدود التحقق

التحقق الهيكلي وقراءة صياغة الملفات لا يثبتان جاهزية الإنتاج. أجرِ `npm run lint` و`npm run build` واختبارات التفاعل البصري محليًا بعد تثبيت الحزم؛ لا يُعدّ أي تفاعل تجريبي تنفيذًا للخدمات الخلفية.
