/**
 * Bayan Screen 36 — offline, deterministic mock of platform operational health.
 * THESE VALUES ARE SYNTHETIC. This module issues no network calls and is not
 * evidence of real infrastructure availability, current time, or tenant data.
 */
export const HEALTH_NOTICE = 'جميع الحالات والأزمنة والتنبيهات بيانات اصطناعية للعرض فقط، وليست قراءات مباشرة من الخدمات.';
export const HEALTH_SCOPE = 'مسؤول المنصة يراجع حالة الخدمات العامة فقط؛ لا تعرض هذه الشاشة محتويات بيانات المؤسسات أو أسرار الاتصال.';
export type HealthState = 'healthy'|'degraded'|'down'|'maintenance';
export type ServiceGroup = 'api'|'database'|'orchestration'|'ai'|'workers';
export type Severity = 'critical'|'warning'|'info';
export type AlertState = 'open'|'resolved';
export type HealthTimeRange = 'day'|'week'|'month';
export interface ServiceSample {
  id:string;name:string;subTitle:string;group:ServiceGroup;state:HealthState;
  description:string;lastCheck:string;checkAgeMinutes:number;responsibility:string;
  checks:readonly boolean[];notes:string;dependencies:readonly string[];
}
export interface HealthAlert {
 id:string;serviceId:string;severity:Severity;state:AlertState;title:string;description:string;
 ageMinutes:number;displayedAt:string;correlationId:string;
}
export interface HealthFilters {query:string;group:ServiceGroup|'all';state:HealthState|'all';}
export interface AlertFilters {query:string;severity:Severity|'all';state:AlertState|'all';range:HealthTimeRange;}
export const GROUP_LABELS:Record<ServiceGroup,string>={api:'واجهات البرمجة',database:'البيانات والفهرسة',orchestration:'تنسيق الوكلاء',ai:'النماذج اللغوية',workers:'خدمات المعالجة'};
export const STATE_LABELS:Record<HealthState,string>={healthy:'جاهزة (تجريبي)',degraded:'أداء متراجع (تجريبي)',down:'متعذرة (تجريبي)',maintenance:'صيانة (تجريبي)'};
export const SEVERITY_LABELS:Record<Severity,string>={critical:'حرج',warning:'تحذير',info:'معلومة'};
export const ALERT_STATE_LABELS:Record<AlertState,string>={open:'قيد المتابعة',resolved:'مغلَق (تجريبيًا)'};
export const SERVICE_SAMPLES:readonly ServiceSample[]=[
 {id:'SVC-DEMO-API',name:'FastAPI',subTitle:'بوابة الـBackend',group:'api',state:'healthy',description:'واجهة الوصول المؤسسية للطلبات والخدمات.',lastCheck:'09:40 (مثال)',checkAgeMinutes:4,responsibility:'بوابة API',checks:[true,true,true,true,true,true,true,true,true,true,true,true],notes:'لا يعني هذا التأكيد توفر نقطة Health حقيقية في بيئة المستخدم.',dependencies:['PostgreSQL','LangGraph']},
 {id:'SVC-DEMO-PG',name:'PostgreSQL',subTitle:'مخزن البيانات العلاقية',group:'database',state:'healthy',description:'مخزن بيانات النظام المؤسسي في التصور المعماري.',lastCheck:'09:39 (مثال)',checkAgeMinutes:5,responsibility:'المخزن العلاقي',checks:[true,true,true,true,true,true,true,true,true,true,true,true],notes:'المؤشر ليس نتيجة اتصال قاعدة بيانات حقيقي.',dependencies:[]},
 {id:'SVC-DEMO-QDR',name:'Qdrant',subTitle:'الفهرس الدلالي',group:'database',state:'degraded',description:'خدمة فهرسة المتجهات واسترجاع المقاطع الدلالية.',lastCheck:'09:38 (مثال)',checkAgeMinutes:6,responsibility:'البحث الدلالي',checks:[true,true,true,false,true,true,false,true,true,true,true,false],notes:'المثال يتضمن تباطؤًا افتراضيًا دون قياس حقيقي لزمن الاستجابة.',dependencies:[]},
 {id:'SVC-DEMO-LG',name:'LangGraph',subTitle:'تنسيق الوكلاء الخمسة',group:'orchestration',state:'healthy',description:'تنسيق Supervisor وSQL وRAG وAnalyst وReporter.',lastCheck:'09:38 (مثال)',checkAgeMinutes:6,responsibility:'تنسيق العمليات',checks:[true,true,true,true,true,true,true,true,true,true,false,true],notes:'لا يتم تنفيذ أي وكيل أو استخراج تتبع حقيقي.',dependencies:['FastAPI','PostgreSQL','Qdrant']},
 {id:'SVC-DEMO-REDIS',name:'Redis',subTitle:'تخزين مؤقت ومهام',group:'workers',state:'healthy',description:'خدمة تخزين مؤقت اختيارية في هذا التصور التدريبي.',lastCheck:'09:37 (مثال)',checkAgeMinutes:7,responsibility:'تسريع الخدمات',checks:[true,true,true,true,true,true,true,true,true,true,true,true],notes:'وجود Redis في هذا العرض لا يثبت تشغيله ضمن الـBackend الفعلي.',dependencies:[]},
 {id:'SVC-DEMO-OLLAMA',name:'Ollama',subTitle:'تشغيل نماذج محلية',group:'ai',state:'down',description:'مثال لخادم نماذج محلي غير متاح في هذه البيانات الوهمية.',lastCheck:'09:36 (مثال)',checkAgeMinutes:8,responsibility:'الاستدلال المحلي',checks:[true,true,true,false,false,true,false,false,false,false,false,false],notes:'تعذّر الاتصال هنا سيناريو تمثيلي، وليس بلاغ انقطاع حقيقي.',dependencies:[]},
 {id:'SVC-DEMO-RPT',name:'Reporter Worker',subTitle:'إنشاء التقارير',group:'workers',state:'degraded',description:'معالجة تصدير التقارير والمخرجات في التصور المستقبلي.',lastCheck:'09:35 (مثال)',checkAgeMinutes:9,responsibility:'توليد التقارير',checks:[true,true,false,true,true,true,true,false,true,true,true,false],notes:'المعالج المقترح ليس نقطة خدمة Backend مؤكدة.',dependencies:['FastAPI','PostgreSQL']},
 {id:'SVC-DEMO-INDEX',name:'Document Indexer',subTitle:'فهرسة المستندات',group:'workers',state:'maintenance',description:'سير عمل استخراج النص والتقسيم والفهرسة في المثال.',lastCheck:'09:30 (مثال)',checkAgeMinutes:14,responsibility:'إعداد الوثائق',checks:[true,true,true,true,true,true,true,false,false,false,false,false],notes:'الصيانة اصطناعية، ولا تعني إيقاف خدمة حقيقية.',dependencies:['Qdrant']},
];
export const ALERT_SAMPLES:readonly HealthAlert[]=[
 {id:'ALT-DEMO-001',serviceId:'SVC-DEMO-OLLAMA',severity:'critical',state:'open',title:'تعذّر خدمة النموذج المحلي',description:'سيناريو اصطناعي لفشل الوصول إلى خدمة نموذج.',ageMinutes:12,displayedAt:'09:32 (مثال)',correlationId:'HEALTH-DEMO-0001'},
 {id:'ALT-DEMO-002',serviceId:'SVC-DEMO-QDR',severity:'warning',state:'open',title:'تباطؤ خدمة الفهرس الدلالي',description:'مؤشر تدريبي لتراجع الجاهزية.',ageMinutes:26,displayedAt:'09:18 (مثال)',correlationId:'HEALTH-DEMO-0002'},
 {id:'ALT-DEMO-003',serviceId:'SVC-DEMO-RPT',severity:'warning',state:'open',title:'تأخير افتراضي لمعالجة التقارير',description:'حدث توضيحي لمنع اعتبار التقارير جاهزة.',ageMinutes:38,displayedAt:'09:06 (مثال)',correlationId:'HEALTH-DEMO-0003'},
 {id:'ALT-DEMO-004',serviceId:'SVC-DEMO-INDEX',severity:'info',state:'open',title:'صيانة تدريبية لمسار الفهرسة',description:'ملاحظة عن توقف مخطط في مثال التشغيل.',ageMinutes:65,displayedAt:'08:39 (مثال)',correlationId:'HEALTH-DEMO-0004'},
 {id:'ALT-DEMO-005',serviceId:'SVC-DEMO-LG',severity:'info',state:'resolved',title:'تعافٍ افتراضي لمسار الوكلاء',description:'مثال لحدث أُغلق بعد فحص توضيحي.',ageMinutes:112,displayedAt:'07:52 (مثال)',correlationId:'HEALTH-DEMO-0005'},
 {id:'ALT-DEMO-006',serviceId:'SVC-DEMO-API',severity:'warning',state:'resolved',title:'تأخر طلب توضيحي إلى بوابة API',description:'تنبيه محفوظ للأغراض التدريبية.',ageMinutes:230,displayedAt:'05:54 (مثال)',correlationId:'HEALTH-DEMO-0006'},
 {id:'ALT-DEMO-007',serviceId:'SVC-DEMO-PG',severity:'info',state:'resolved',title:'عودة مخزن البيانات إلى الحالة الاعتيادية',description:'مثال على حدث سابق أُغلق.',ageMinutes:1400,displayedAt:'أمس (مثال)',correlationId:'HEALTH-DEMO-0007'},
 {id:'ALT-DEMO-008',serviceId:'SVC-DEMO-QDR',severity:'warning',state:'resolved',title:'تراجع افتراضي في الاسترجاع',description:'حدث وهمي لفحص الاسترجاع الدلالي.',ageMinutes:1800,displayedAt:'أمس (مثال)',correlationId:'HEALTH-DEMO-0008'},
 {id:'ALT-DEMO-009',serviceId:'SVC-DEMO-REDIS',severity:'info',state:'resolved',title:'إعادة فحص التخزين المؤقت',description:'حدث صيانة تدريبي سابق.',ageMinutes:3500,displayedAt:'قبل يومين (مثال)',correlationId:'HEALTH-DEMO-0009'},
 {id:'ALT-DEMO-010',serviceId:'SVC-DEMO-RPT',severity:'warning',state:'resolved',title:'محاولة تصدير تدريبية متأخرة',description:'تنبيه وهمي غير متصل بتقرير حقيقي.',ageMinutes:12500,displayedAt:'قبل 9 أيام (مثال)',correlationId:'HEALTH-DEMO-0010'},
 {id:'ALT-DEMO-011',serviceId:'SVC-DEMO-OLLAMA',severity:'critical',state:'resolved',title:'انقطاع افتراضي قديم',description:'عينة للتصفية الشهرية دون استنتاجات حالية.',ageMinutes:25000,displayedAt:'قبل 17 يومًا (مثال)',correlationId:'HEALTH-DEMO-0011'},
];
export const DEFAULT_HEALTH_FILTERS:HealthFilters={query:'',group:'all',state:'all'};
export const DEFAULT_ALERT_FILTERS:AlertFilters={query:'',severity:'all',state:'all',range:'day'};
export const normArabic=(v:string)=>v.normalize('NFKC').toLocaleLowerCase('ar').normalize('NFD').replace(/[\u064b-\u065f\u0670]/g,'').replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').trim();
export function getService(id:string|null|undefined,items:readonly ServiceSample[]=SERVICE_SAMPLES):ServiceSample|null{return id&&/^SVC-DEMO-[A-Z0-9-]+$/.test(id)?items.find(x=>x.id===id)??null:null;}
export function getAlert(id:string|null|undefined):HealthAlert|null{return id&&/^ALT-DEMO-\d{3}$/.test(id)?ALERT_SAMPLES.find(x=>x.id===id)??null:null;}
export function filterServices(filters:HealthFilters,items:readonly ServiceSample[]=SERVICE_SAMPLES):ServiceSample[]{const q=normArabic(filters.query);return items.filter(s=>(filters.group==='all'||s.group===filters.group)&&(filters.state==='all'||s.state===filters.state)&&(!q||normArabic([s.name,s.subTitle,s.id,s.description,GROUP_LABELS[s.group],STATE_LABELS[s.state]].join(' ')).includes(q)));}
export function filterAlerts(filters:AlertFilters,items:readonly HealthAlert[]=ALERT_SAMPLES):HealthAlert[]{const q=normArabic(filters.query);const max=filters.range==='day'?1440:filters.range==='week'?10080:43200;return items.filter(a=>a.ageMinutes<=max&&(filters.severity==='all'||a.severity===filters.severity)&&(filters.state==='all'||a.state===filters.state)&&(!q||normArabic([a.id,a.title,a.description,a.correlationId,getService(a.serviceId)?.name??''].join(' ')).includes(q)));}
export function healthStats(items:readonly ServiceSample[]=SERVICE_SAMPLES){return {total:items.length,healthy:items.filter(x=>x.state==='healthy').length,attention:items.filter(x=>x.state==='degraded'||x.state==='down').length,maintenance:items.filter(x=>x.state==='maintenance').length};}
export function sampleHealthCheck(service:ServiceSample){return {serviceId:service.id,result:service.state,checkedLocally:true,networkRequests:0,notice:'محاكاة محلية فورية — لم يُرسل أي طلب إلى الخدمة.',message:service.state==='healthy'?'الحالة الافتراضية جاهزة':service.state==='degraded'?'الحالة الافتراضية تحتاج مراجعة':service.state==='down'?'الخدمة غير متاحة في السيناريو التدريبي':'محاكاة الصيانة مستمرة'} as const;}
function escapeCsv(value:string|number){let s=String(value).replace(/\r|\n/g,' ').trim();if(/^[\s]*[=+@-]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';}
export function healthCsv(items:readonly ServiceSample[]=SERVICE_SAMPLES){const rows=[['المعرّف','اسم الخدمة','المجموعة','حالة تجريبية','آخر فحص تمثيلي','وصف']];for(const s of items)rows.push([s.id,s.name,GROUP_LABELS[s.group],STATE_LABELS[s.state],s.lastCheck,s.description]);return '\ufeff'+rows.map(row=>row.map(escapeCsv).join(',')).join('\r\n');}
export function alertsCsv(items:readonly HealthAlert[]=ALERT_SAMPLES){const rows=[['المعرّف','الخدمة','الأهمية','الحالة','العنوان','وقت تمثيلي','مرجع']];for(const a of items)rows.push([a.id,getService(a.serviceId)?.name??'غير متوفر',SEVERITY_LABELS[a.severity],ALERT_STATE_LABELS[a.state],a.title,a.displayedAt,a.correlationId]);return '\ufeff'+rows.map(r=>r.map(escapeCsv).join(',')).join('\r\n');}
