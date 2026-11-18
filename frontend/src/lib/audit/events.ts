/**
 * Screen 28 – demonstration-only, immutable audit events.
 * Values are artificial training fixtures and never fetched from a real tenant.
 * A production service must enforce server-side RBAC, tenant boundaries, retention,
 * tamper-evident storage, redaction and authorized export.
 */
export const AUDIT_ORIGIN = 'نماذج تدقيق تدريبية ثابتة — لا تمثل سجل خادم فعليًا';
export type AuditCategory = 'auth'|'users'|'sources'|'smartviews'|'queries'|'reports'|'security';
export type AuditOutcome = 'success'|'denied'|'failed';
export type AuditEvent = Readonly<{
  id:string; timestamp:string; actorId:string; actor:string;
  category:AuditCategory; action:string; resource:string;
  outcome:AuditOutcome; traceId:string; channel:'واجهة ويب تدريبية'|'عملية تجريبية';
  description:string;
}>;
export const categoryLabels:Record<AuditCategory,string>={
 auth:'تسجيل الدخول',users:'إدارة المستخدمين',sources:'مصادر البيانات',
 smartviews:'العروض الذكية',queries:'الاستعلامات',reports:'التقارير',security:'الأمان والصلاحيات'
};
export const outcomeLabels:Record<AuditOutcome,string>={success:'نجاح',denied:'مرفوض',failed:'فشل'};
export const DEMO_AUDIT_EVENTS:readonly AuditEvent[] = Object.freeze([
 {id:'AUD-DEMO-001',timestamp:'2026-11-07T10:18:00+03:00',actorId:'DEMO-IT-01',actor:'مسؤول تقنية معلومات تجريبي',category:'auth',action:'تسجيل دخول',resource:'جلسة تجريبية',outcome:'success',traceId:'TRACE-DEMO-0001',channel:'واجهة ويب تدريبية',description:'تم تسجيل نشاط دخول افتراضي؛ لا يحتوي السجل على رمز جلسة أو عنوان شبكة.'},
 {id:'AUD-DEMO-002',timestamp:'2026-11-07T09:56:00+03:00',actorId:'DEMO-IT-01',actor:'مسؤول تقنية معلومات تجريبي',category:'users',action:'تغيير دور مستخدم',resource:'حساب تجريبي U-004',outcome:'success',traceId:'TRACE-DEMO-0002',channel:'عملية تجريبية',description:'تغيير تمثيلي لدور حساب اصطناعي؛ لا يتضمن تفاصيل حساب حقيقي.'},
 {id:'AUD-DEMO-003',timestamp:'2026-11-07T09:37:00+03:00',actorId:'DEMO-IT-01',actor:'مسؤول تقنية معلومات تجريبي',category:'smartviews',action:'حفظ مسودة عرض ذكي',resource:'عرض الأقسام التدريبي',outcome:'success',traceId:'TRACE-DEMO-0003',channel:'عملية تجريبية',description:'إجراء محلي توضيحي؛ لا ينشئ VIEW داخل قاعدة البيانات.'},
 {id:'AUD-DEMO-004',timestamp:'2026-11-07T08:52:00+03:00',actorId:'DEMO-MGR-01',actor:'مدير مؤسسة تجريبي',category:'reports',action:'تصدير تقرير',resource:'ملخص توزيع الكليات',outcome:'success',traceId:'TRACE-DEMO-0004',channel:'واجهة ويب تدريبية',description:'تصدير بيانات تدريبية فقط دون الاطلاع على بيانات طلاب حقيقية.'},
 {id:'AUD-DEMO-005',timestamp:'2026-11-07T08:10:00+03:00',actorId:'DEMO-EMP-02',actor:'موظف مؤسسة تجريبي',category:'security',action:'محاولة الوصول إلى مصدر محظور',resource:'مصدر مصنّف محظور',outcome:'denied',traceId:'TRACE-DEMO-0005',channel:'عملية تجريبية',description:'مثال لقرار رفض الوصول وفق مبدأ أقل امتياز؛ لا يكشف اسم المصدر الفعلي.'},
 {id:'AUD-DEMO-006',timestamp:'2026-11-06T16:31:00+03:00',actorId:'DEMO-IT-01',actor:'مسؤول تقنية معلومات تجريبي',category:'sources',action:'اختبار اتصال تجريبي',resource:'مصدر سجلات جامعية اصطناعي',outcome:'success',traceId:'TRACE-DEMO-0006',channel:'عملية تجريبية',description:'تمت محاكاة التحقق محليًا دون الاتصال بشبكة أو قاعدة بيانات.'},
 {id:'AUD-DEMO-007',timestamp:'2026-11-06T15:28:00+03:00',actorId:'DEMO-EMP-01',actor:'موظف مؤسسة تجريبي',category:'queries',action:'طلب بحث دلالي',resource:'فهرس اللوائح التدريبي',outcome:'success',traceId:'TRACE-DEMO-0007',channel:'واجهة ويب تدريبية',description:'حُفظت تسمية العملية فقط؛ لا يسجل النص الخام للسؤال أو المستندات.'},
 {id:'AUD-DEMO-008',timestamp:'2026-11-06T13:02:00+03:00',actorId:'DEMO-IT-02',actor:'مسؤول تقني تجريبي ثانٍ',category:'users',action:'محاولة تعطيل آخر مسؤول',resource:'حساب إداري محمي',outcome:'denied',traceId:'TRACE-DEMO-0008',channel:'عملية تجريبية',description:'مثال رفض إجراء إداري قد يقطع إمكانية إدارة المؤسسة.'},
 {id:'AUD-DEMO-009',timestamp:'2026-11-06T11:44:00+03:00',actorId:'DEMO-IT-01',actor:'مسؤول تقنية معلومات تجريبي',category:'sources',action:'مراجعة تصنيف مصدر',resource:'مستودع اللوائح التجريبي',outcome:'success',traceId:'TRACE-DEMO-0009',channel:'عملية تجريبية',description:'مراجعة توضيحية للتصنيف دون تغيير سياسة الخادم.'},
 {id:'AUD-DEMO-010',timestamp:'2026-11-06T09:10:00+03:00',actorId:'DEMO-EMP-03',actor:'موظف مؤسسة تجريبي ثالث',category:'auth',action:'محاولة تسجيل دخول',resource:'جلسة تجريبية',outcome:'failed',traceId:'TRACE-DEMO-0010',channel:'واجهة ويب تدريبية',description:'فشل دخول اصطناعي؛ لا يحفظ كلمات مرور أو رموز تحقق.'},
 {id:'AUD-DEMO-011',timestamp:'2026-11-05T17:12:00+03:00',actorId:'DEMO-IT-02',actor:'مسؤول تقني تجريبي ثانٍ',category:'smartviews',action:'تعليق عرض ذكي',resource:'عرض نتائج القبول',outcome:'success',traceId:'TRACE-DEMO-0011',channel:'عملية تجريبية',description:'تعليق صوري لعرض تدريب فقط؛ لا تعديل لقاعدة البيانات.'},
 {id:'AUD-DEMO-012',timestamp:'2026-11-05T14:05:00+03:00',actorId:'DEMO-MGR-01',actor:'مدير مؤسسة تجريبي',category:'reports',action:'طلب إنشاء تقرير',resource:'مقارنة مؤشرات الأداء',outcome:'failed',traceId:'TRACE-DEMO-0012',channel:'عملية تجريبية',description:'مثال لفشل معالجة تقرير تدريبي دون إظهار بيانات تفصيلية.'},
 {id:'AUD-DEMO-013',timestamp:'2026-11-05T12:33:00+03:00',actorId:'DEMO-EMP-02',actor:'موظف مؤسسة تجريبي',category:'queries',action:'طلب معاينة SQL',resource:'استعلام وصف بيانات',outcome:'denied',traceId:'TRACE-DEMO-0013',channel:'واجهة ويب تدريبية',description:'المثال يوضح رفض رؤية تفاصيل SQL لمستخدم غير مخوّل.'},
 {id:'AUD-DEMO-014',timestamp:'2026-11-05T11:17:00+03:00',actorId:'DEMO-IT-01',actor:'مسؤول تقنية معلومات تجريبي',category:'users',action:'تنشيط حساب',resource:'حساب تجريبي U-008',outcome:'success',traceId:'TRACE-DEMO-0014',channel:'عملية تجريبية',description:'حدث تنشيط تخيلي؛ لا تتضمن الواجهة بيانات هوية أشخاص فعليين.'},
 {id:'AUD-DEMO-015',timestamp:'2026-11-04T16:50:00+03:00',actorId:'DEMO-IT-01',actor:'مسؤول تقنية معلومات تجريبي',category:'security',action:'عرض مصفوفة الصلاحيات',resource:'الأدوار المؤسسية',outcome:'success',traceId:'TRACE-DEMO-0015',channel:'واجهة ويب تدريبية',description:'حدث قراءة توضيحي لمصفوفة الدور؛ دون تعديل قواعد RBAC.'},
 {id:'AUD-DEMO-016',timestamp:'2026-11-04T10:21:00+03:00',actorId:'DEMO-IT-02',actor:'مسؤول تقني تجريبي ثانٍ',category:'sources',action:'تعطيل مصدر مؤقتًا',resource:'مصدر مؤسسي اصطناعي',outcome:'success',traceId:'TRACE-DEMO-0016',channel:'عملية تجريبية',description:'تغيير حالة تدريبية لا يوقف خدمات واقعية.'},
 {id:'AUD-DEMO-017',timestamp:'2026-11-03T13:04:00+03:00',actorId:'DEMO-MGR-01',actor:'مدير مؤسسة تجريبي',category:'reports',action:'معاينة تقرير',resource:'مؤشرات الحضور الافتراضية',outcome:'success',traceId:'TRACE-DEMO-0017',channel:'واجهة ويب تدريبية',description:'الاطلاع على محتوى تقرير افتراضي وليس تقرير مؤسسة حقيقية.'},
 {id:'AUD-DEMO-018',timestamp:'2026-11-02T08:42:00+03:00',actorId:'DEMO-IT-01',actor:'مسؤول تقنية معلومات تجريبي',category:'security',action:'مراجعة رفض وصول',resource:'سياسة أمن المؤسسة التدريبية',outcome:'success',traceId:'TRACE-DEMO-0018',channel:'عملية تجريبية',description:'مثال تتبع مراجعة لقرار رفض وصول دون بيانات حساسة.'}
]);
export type AuditFilters = Readonly<{query:string;category:AuditCategory|'all';outcome:AuditOutcome|'all';actorId:string;from:string;to:string}>;
export const DEFAULT_AUDIT_FILTERS:AuditFilters={query:'',category:'all',outcome:'all',actorId:'all',from:'',to:''};
export function normalizeArabicSearch(text:string):string{
 return text.normalize('NFKC').replace(/[\u064b-\u065f\u0670]/g,'').replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').replace(/ـ/g,'').trim().toLowerCase();
}
export function filterAuditEvents(events:readonly AuditEvent[],filters:AuditFilters):AuditEvent[]{
 const query=normalizeArabicSearch(filters.query);
 // Reject an invalid, reversed range instead of allowing accidental broad exports.
 if((filters.from&&!/^\d{4}-\d{2}-\d{2}$/.test(filters.from))||(filters.to&&!/^\d{4}-\d{2}-\d{2}$/.test(filters.to))||(filters.from&&filters.to&&filters.from>filters.to))return [];
 return events.filter(event=>{
  const day=event.timestamp.slice(0,10);
  if(filters.category!=='all'&&event.category!==filters.category)return false;
  if(filters.outcome!=='all'&&event.outcome!==filters.outcome)return false;
  if(filters.actorId!=='all'&&event.actorId!==filters.actorId)return false;
  if(filters.from&&day<filters.from)return false;
  if(filters.to&&day>filters.to)return false;
  const values=[event.id,event.actor,event.actorId,event.action,event.resource,event.traceId,event.description,categoryLabels[event.category],outcomeLabels[event.outcome]].join(' ');
  return !query||normalizeArabicSearch(values).includes(query);
 }).sort((a,b)=>b.timestamp.localeCompare(a.timestamp));
}
export function auditStats(events:readonly AuditEvent[]){return {
 total:events.length,
 success:events.filter(x=>x.outcome==='success').length,
 denied:events.filter(x=>x.outcome==='denied').length,
 failed:events.filter(x=>x.outcome==='failed').length,
};}
export function resolveAuditEvent(id:string|null|undefined,events:readonly AuditEvent[]=DEMO_AUDIT_EVENTS){
 if(!id||!/^AUD-DEMO-\d{3}$/.test(id))return null;
 return events.find(event=>event.id===id)??null;
}
/** Prevent formula evaluation when exported CSV is opened in spreadsheets. */
export function escapeAuditCsvCell(value:string):string{
 const safe=/^[\s]*[=+\-@\t\r]/.test(value)?`'${value}`:value;
 return `"${safe.replaceAll('"','""')}"`;
}
export function createAuditCsv(events:readonly AuditEvent[]):string{
 const headings=['المعرف','التاريخ','الفاعل','معرف الفاعل','الفئة','العملية','المورد','النتيجة','معرف التتبع'];
 const rows=events.map(event=>[event.id,event.timestamp,event.actor,event.actorId,categoryLabels[event.category],event.action,event.resource,outcomeLabels[event.outcome],event.traceId]);
 return '\uFEFF'+[headings,...rows].map(row=>row.map(escapeAuditCsvCell).join(',')).join('\r\n')+'\r\n';
}
