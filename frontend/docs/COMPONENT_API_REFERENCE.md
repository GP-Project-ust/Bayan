# مرجع واجهات برمجة المكونات — Bayan Components API

## المكونات العامة في `components/ui/`

| المكون | أهم Props الفعلية | الاستخدام | الملاحظات |
|---|---|---|---|
| `Button` | `variant`, `size`, `loading`, `fullWidth`, `leadingIcon`, `trailingIcon`, وخصائص button القياسية | أوامر الواجهة | الأنواع: primary/secondary/outline/ghost/danger؛ الحجم sm/md/lg |
| `Input` | `label` (مطلوب), `description`, `error`, `startIcon`, `controlSize`, `dir` | مدخلات البيانات | يدعم `aria-invalid` و`aria-describedby` |
| `Select` | `label` (مطلوب), `options` (مطلوب), `placeholder`, `description`, `error` | قوائم اختيار | `options: { value; label; disabled? }[]` |
| `Textarea` | `label` (مطلوب), `description`, `error`, `rows` | نصوص طويلة | دعم الحقل المطلوب وخطأ التحقق |
| `Card` | `title`, `description`, `action`, `footer`، children | بطاقات | يخرج `<section>` |
| `Badge` | `tone`, `icon`، children | شارات الحالة | neutral/success/warning/danger/info |
| `DataTable<T>` | `caption`, `columns`, `rows`, `rowKey`, `emptyMessage` | الجداول | `columns: { key; title; render }[]`، جدول قابل للتمرير |
| `Dialog` | `open`, `onClose`, `title`, `description`, `footer`, children | النوافذ | focus trap + Escape، استخدم نصوص تأكيد واضحة |
| `Drawer` | `open`, `onClose`, `title`, `description`, `footer`, `position`, children | الأدراج | `position`: start/end |
| `Toast` | `title`, `message`, `tone`, `onClose` | تنبيهات | role=alert في حالة الخطر |

## المكونات المتخصصة في `components/bayan/`

| المكون | أهم Props الفعلية | الحدود الوظيفية |
|---|---|---|
| `ChatComposer` | `value`, `onChange`, `onSend`, `suggestions?`, `busy?`, `disabled?`, `onAttach?` | يرسل callback فقط؛ لا ينشئ بث SSE |
| `MessageBubble` | `message`, `copyEnabled?` | يعرض دور رسالة وحالة pending/complete/error |
| `SQLViewer` | `sql`, `canView`, `initiallyExpanded?`, `title?` | للقراءة فقط؛ `canView` ليس صلاحية خادم |
| `CitationCard` | `citation`, `canOpen?`, `onOpen?` | يعرض اسم المصدر ورقم الصفحة؛ يجب التحقق من المصدر بالـAPI |
| `ReportExporter` | `title`, `columns`, `rows`, `onExport?`, `allowExport?` | PDF نافذة طباعة؛ Excel XML؛ CSV فعلي |
| `SmartViewManager` | `views`, `canManage`, `onCreate?`, `onSelect?`, `onToggle?` | تصنيف Public/Masked/Restricted/Blacklist؛ لا يحفظ في قاعدة البيانات |
| `AgentTraceViewer` | `steps`, `requestId?`, `canView?` | يعرض تتبعًا تشغيليًا دون التفكير الداخلي |

## مثال استخدام React / Next.js

```tsx
"use client";
import { useState } from "react";
import { Button, Card, Input, Badge } from "@/components/ui";
import { SQLViewer } from "@/components/bayan";

export function SampleBayanPanel() {
  const [name, setName] = useState("");
  return <Card title="الاستعلام التجريبي" description="نموذج واجهة دون خادم">
    <Input label="اسم التقرير" value={name} onChange={e => setName(e.target.value)} />
    <Badge tone="info">تجريبي</Badge>
    <SQLViewer sql="SELECT COUNT(*) FROM students;" canView={false} />
    <Button onClick={() => window.alert(`مرحبًا ${name}`)}>معاينة</Button>
  </Card>;
}
```

**ملاحظة:** المثال يوضح تركيب المكونات فقط. لا يعني `canView` حماية استعلامات SQL؛ يجب عدم إرسال SQL الحساس إلى عميل غير مخوّل أصلًا.

## طبقة الصفحات (Layouts)

`AppShell`, `ChatLayout`, `AdminLayout`, `PlatformLayout`, `AuthLayout`, `FeatureLayout` ضمن `components/layout`. أدِر الترويسة والتنقل عبر مكون التخطيط المشترك، وليس بصفحات متكررة. بيانات الـMock يجب أن تبقى منفصلة عن API الحقيقي.

## قواعد التسمية

- CSS العام: `--bayan-*` للـtokens، `bui-*` لمكونات ui، و`bayan-*` لمكونات المجال.
- الأدوار البرمجية: employee / manager / it_admin / platform_admin.
- حافظ على `dir=ltr` في SQL والبريد والرموز التقنية، مع إبقاء الواجهة RTL.
