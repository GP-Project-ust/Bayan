/** Frontend-only fixtures and pure state/filtering helpers for Bayan Screen 05.
 * Dates, identity, alerts and destinations below are EXAMPLES, never live data.
 */
export type NotificationCategory = "reports" | "documents" | "security" | "administration" | "system";
export type NotificationPriority = "normal" | "important" | "urgent";
export type ReadFilter = "all" | "unread" | "read";

export interface BayanNotification {
  id: string;
  title: string;
  summary: string;
  details: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  source: string;
  timeLabel: string;
  isRead: boolean;
  destination?: string;
  actionLabel?: string;
}

export const categories: Record<NotificationCategory, string> = {
  reports: "التقارير",
  documents: "المستندات",
  security: "الأمان",
  administration: "الإدارة",
  system: "النظام",
};

export const priorities: Record<NotificationPriority, string> = {
  normal: "عادي",
  important: "مهم",
  urgent: "عاجل",
};

// This fixture is deliberately frozen in time, explicitly marked as a demo in the UI.
export const demoNotifications: BayanNotification[] = [
  { id:"bn-101", title:"تقرير أداء الأقسام جاهز", summary:"اكتمل إعداد التقرير التجريبي للفصل الدراسي.", details:"أكمل وكيل التقارير إنشاء ملخص توضيحي يتضمن مؤشرات أداء الأقسام، ويمكن معاينته من مركز التقارير. هذا التنبيه لا يرتبط بتقرير فعلي.", category:"reports", priority:"normal", source:"وكيل التقارير", timeLabel:"7 نوفمبر 2026 · 10:45 ص", isRead:false, destination:"/reports", actionLabel:"فتح مركز التقارير" },
  { id:"bn-102", title:"تنبيه بخصوص صلاحية الوصول", summary:"يتطلب استعراض أحد مصادر البيانات صلاحية إضافية.", details:"حاول حساب تجريبي الوصول إلى مصدر مصنّف كمقيّد. يجب مراجعة الأذونات لدى مسؤول المؤسسة. لا يُمثل هذا التنبيه حادثة أمنية فعلية.", category:"security", priority:"urgent", source:"نظام الصلاحيات", timeLabel:"7 نوفمبر 2026 · 10:15 ص", isRead:false, destination:"/profile", actionLabel:"عرض صلاحيات الحساب" },
  { id:"bn-103", title:"إضافة مستند إلى الفهرس الدلالي", summary:"أُدرجت نسخة توضيحية من دليل شؤون الطلاب.", details:"جرت محاكاة عملية فهرسة المستند وإتاحته للبحث الدلالي، مع الاحتفاظ باسم المستند ومراجع الصفحات لأغراض العرض فقط.", category:"documents", priority:"normal", source:"فهرس المستندات", timeLabel:"7 نوفمبر 2026 · 09:40 ص", isRead:false, destination:"/sources", actionLabel:"فتح المكتبة" },
  { id:"bn-104", title:"مراجعة تعديل دور مستخدم", summary:"يوجد طلب تجريبي لمراجعة تعديل الصلاحيات.", details:"استُخدم نموذج توضيحي لطلب تغيير دور مستخدم مؤسسي. يوصى بمراجعة السياسة والتأكد من مصدر التفويض قبل اعتماد أي تغيير حقيقي.", category:"administration", priority:"important", source:"إدارة المستخدمين", timeLabel:"7 نوفمبر 2026 · 09:05 ص", isRead:false, destination:"/admin/users", actionLabel:"فتح إدارة المستخدمين" },
  { id:"bn-105", title:"تحديث حالة الخدمة", summary:"الخدمات التجريبية في حالة طبيعية ضمن المعاينة.", details:"يوضح هذا التنبيه كيف تظهر إشعارات صحة خدمات نظام بيان. لا يستعلم التطبيق الحالي عن خادم أو قاعدة بيانات أو خدمات AI.", category:"system", priority:"normal", source:"مراقبة النظام", timeLabel:"6 نوفمبر 2026 · 04:20 م", isRead:true, destination:"/platform/health", actionLabel:"عرض حالة الخدمات" },
  { id:"bn-106", title:"تقرير الإحصاءات جاهز للمعاينة", summary:"تم تجهيز نموذج تقرير إحصاءات القبول.", details:"يمكن مشاهدة مثال على تنسيق التقرير ومؤشراته وطريقة تصديره. البيانات المعروضة داخل النظام بيانات جامعية تجريبية.", category:"reports", priority:"normal", source:"وكيل التحليل", timeLabel:"6 نوفمبر 2026 · 02:10 م", isRead:true, destination:"/reports", actionLabel:"عرض التقارير" },
  { id:"bn-107", title:"تحديث سياسة البيانات الحساسة", summary:"تذكير تجريبي بتصنيف Public وMasked وRestricted.", details:"توضح هذه العينة ضرورة مراجعة سياسات عرض حقول البيانات والتمييز بين البيانات العامة والمقنّعة والمقيّدة. لا يُجري هذا الإشعار تغييرات على الصلاحيات.", category:"security", priority:"important", source:"سياسات البيانات", timeLabel:"6 نوفمبر 2026 · 11:30 ص", isRead:false, destination:"/admin/smart-views", actionLabel:"فتح العروض الذكية" },
  { id:"bn-108", title:"مراجعة نتائج فهرسة مستند", summary:"توجد ملاحظات شكلية ضمن مثال الفهرسة.", details:"الرسالة مثال لحالة تحتاج إلى مراجعة صفحات المستند وتنسيق البيانات الوصفية، دون وجود عملية فهرسة حقيقية قيد التنفيذ.", category:"documents", priority:"normal", source:"الاسترجاع الدلالي", timeLabel:"5 نوفمبر 2026 · 01:20 م", isRead:true, destination:"/sources", actionLabel:"مراجعة المستندات" },
  { id:"bn-109", title:"إنشاء عرض ذكي جديد", summary:"أُضيف نموذج عرض خاص بإحصاءات التسجيل.", details:"تنبيه افتراضي يظهر بعد إعداد Smart View مؤسسي. يجب أن يتحقق الخادم من الأذونات ومن صلاحية مصدر البيانات عند التنفيذ الفعلي.", category:"administration", priority:"normal", source:"العروض الذكية", timeLabel:"5 نوفمبر 2026 · 10:00 ص", isRead:true, destination:"/admin/smart-views", actionLabel:"العروض الذكية" },
  { id:"bn-110", title:"مراجعة سجل تدقيق", summary:"أُضيفت أمثلة جديدة لأحداث الاستخدام.", details:"يُظهر المثال متى يرسل النظام إشعارًا لمسؤول المؤسسة لمراجعة نشاط إداري. لا يحتوي على سجلات حقيقية لأي مستخدم.", category:"system", priority:"important", source:"سجل التدقيق", timeLabel:"4 نوفمبر 2026 · 03:45 م", isRead:false, destination:"/admin/audit", actionLabel:"فتح سجل التدقيق" },
  { id:"bn-111", title:"اكتمال تصدير تقرير", summary:"انتهى تصدير نموذج PDF بنجاح.", details:"هذا مثال لرسالة تأكيد تصدير تقرير. لا يوجد ملف صادر فعليًا وراء هذا الإشعار التجريبي.", category:"reports", priority:"normal", source:"مركز التصدير", timeLabel:"4 نوفمبر 2026 · 11:10 ص", isRead:true, destination:"/reports", actionLabel:"عرض التقارير" },
];

/** Keep the new screen independent of locale/date libraries. Search Arabic terms with light normalization. */
export function normalizeSearch(value: string): string {
  return value.toLocaleLowerCase().normalize("NFKC").replace(/[\u064B-\u065F\u0670]/g, "").replace(/ـ/g, "").trim();
}

export function filterNotifications(items: readonly BayanNotification[], options: {
  readFilter: ReadFilter; category: NotificationCategory | "all"; query: string;
}): BayanNotification[] {
  const query = normalizeSearch(options.query);
  return items.filter((item) => {
    if (options.readFilter === "unread" && item.isRead) return false;
    if (options.readFilter === "read" && !item.isRead) return false;
    if (options.category !== "all" && item.category !== options.category) return false;
    if (!query) return true;
    return normalizeSearch([item.title,item.summary,item.details,item.source,categories[item.category]].join(" ")).includes(query);
  });
}

export function setNotificationRead(items: readonly BayanNotification[], id: string, isRead: boolean): BayanNotification[] {
  return items.map((item) => item.id === id ? { ...item, isRead } : item);
}
export function markAllRead(items: readonly BayanNotification[]): BayanNotification[] {
  return items.map((item) => item.isRead ? item : { ...item, isRead:true });
}
export function notificationStats(items: readonly BayanNotification[]) {
  return {
    total: items.length,
    unread: items.filter((item) => !item.isRead).length,
    important: items.filter((item) => !item.isRead && item.priority !== "normal").length,
    reports: items.filter((item) => item.category === "reports").length,
  };
}
