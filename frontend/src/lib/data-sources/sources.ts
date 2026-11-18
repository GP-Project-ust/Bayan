/**
 * BAYAN — Screen 22 fixtures and pure utilities. This data is fictional.
 * No credentials, URLs of actual institutions, or real network checks here.
 */
export type SourceType='postgres'|'odoo'|'mysql'|'files'|'api';
export type SourceStatus='connected'|'attention'|'pending'|'disabled';
export type SourceClass='public'|'masked'|'restricted'|'blocked';
export type DataSource={id:string;name:string;type:SourceType;owner:string;scope:string;status:SourceStatus;classification:SourceClass;endpoint:string;lastCheck:string;collections:number;description:string;isDemo:true};
export type SourceFilters={query:string;type:'all'|SourceType;status:'all'|SourceStatus;classification:'all'|SourceClass;order:'name'|'status'};
export const sourceTypeLabels:Record<SourceType,string>={postgres:'PostgreSQL',odoo:'Odoo Education',mysql:'MySQL',files:'مخزن مستندات',api:'واجهة API'};
export const sourceStatusLabels:Record<SourceStatus,string>={connected:'جاهز في المحاكاة',attention:'بحاجة مراجعة',pending:'بانتظار الإعداد',disabled:'معطّل محليًا'};
export const sourceClassLabels:Record<SourceClass,string>={public:'عام',masked:'محجوب جزئيًا',restricted:'مقيّد',blocked:'محظور'};
export const DEFAULT_FILTERS:SourceFilters={query:'',type:'all',status:'all',classification:'all',order:'name'};
export const DEMO_SOURCES:ReadonlyArray<DataSource>=[
 {id:'SRC-001',name:'قاعدة البيانات الأكاديمية',type:'postgres',owner:'إدارة تقنية المعلومات',scope:'نظام التسجيل',status:'connected',classification:'restricted',endpoint:'db-academic.example.invalid:5432',lastCheck:'فحص توضيحي 06-11-2026',collections:18,description:'بيانات الأكاديميات والتسجيل — سجل تدريبي لا يتصل بأي قاعدة فعلية.',isDemo:true},
 {id:'SRC-002',name:'نظام شؤون الطلاب',type:'odoo',owner:'شؤون الطلاب',scope:'Odoo Education',status:'attention',classification:'masked',endpoint:'odoo-students.example.invalid',lastCheck:'فحص توضيحي 05-11-2026',collections:11,description:'مصدر ERP تدريبي؛ لا يوجد تكامل Odoo فعلي في هذه الشاشة.',isDemo:true},
 {id:'SRC-003',name:'مستودع اللوائح التنظيمية',type:'files',owner:'الشؤون القانونية',scope:'لوائح وسياسات',status:'connected',classification:'public',endpoint:'storage-policy.example.invalid',lastCheck:'فحص توضيحي 04-11-2026',collections:6,description:'مصدر ملفات تعليمي يمثّل فهرسة اللوائح والمستندات.',isDemo:true},
 {id:'SRC-004',name:'قاعدة بيانات شؤون الموظفين',type:'mysql',owner:'الموارد البشرية',scope:'الموارد البشرية',status:'pending',classification:'restricted',endpoint:'hr-db.example.invalid:3306',lastCheck:'لم يُنفّذ فحص',collections:9,description:'بيانات الموارد البشرية تمثيل تجريبي وتحتاج اعتماد مستويات الوصول.',isDemo:true},
 {id:'SRC-005',name:'بوابة الإحصاءات الداخلية',type:'api',owner:'وحدة التخطيط',scope:'مؤشرات إدارية',status:'attention',classification:'masked',endpoint:'api-metrics.example.invalid',lastCheck:'فحص توضيحي 03-11-2026',collections:4,description:'واجهة خدمة تمثيلية للاختبار البصري فقط.',isDemo:true},
 {id:'SRC-006',name:'مخزن بيانات القبول',type:'postgres',owner:'القبول والتسجيل',scope:'القبول',status:'connected',classification:'restricted',endpoint:'admission.example.invalid:5432',lastCheck:'فحص توضيحي 02-11-2026',collections:7,description:'مصدر افتراضي لبيانات التسجيل والقبول، مصنف مقيّد.',isDemo:true},
 {id:'SRC-007',name:'بيانات اختبارات محظورة',type:'mysql',owner:'إدارة الأمن',scope:'أمن معلومات',status:'disabled',classification:'blocked',endpoint:'[محجوب بموجب السياسة]',lastCheck:'غير متاح',collections:0,description:'مصدر محظور في المحاكاة؛ لا يتاح فحصه أو قراءة محتوياته.',isDemo:true},
 {id:'SRC-008',name:'مستودع أدلة الخدمات',type:'files',owner:'إدارة الجودة',scope:'إجراءات وأدلة',status:'pending',classification:'public',endpoint:'guides.example.invalid',lastCheck:'بانتظار إعداد',collections:5,description:'مستندات إرشادية افتراضية لمعاينة تصنيف المصادر.',isDemo:true}
];
export const SOURCE_STORAGE_KEY='bayan.demo.sources.status.v1';
export function normalizeArabic(input:string):string{return input.normalize('NFKC').toLowerCase().replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').replace(/[\u064b-\u065f]/g,'').trim();}
export function filterSources(items:ReadonlyArray<DataSource>,filters:SourceFilters):DataSource[]{
 const q=normalizeArabic(filters.query);
 const filtered=items.filter(source=>(filters.type==='all'||source.type===filters.type)&&(filters.status==='all'||source.status===filters.status)&&(filters.classification==='all'||source.classification===filters.classification)&&(!q||normalizeArabic([source.name,source.owner,source.scope,source.id,sourceTypeLabels[source.type]].join(' ')).includes(q)));
 return [...filtered].sort((a,b)=>filters.order==='name'?a.name.localeCompare(b.name,'ar'):sourceStatusLabels[a.status].localeCompare(sourceStatusLabels[b.status],'ar'));
}
export function sourceStats(items:ReadonlyArray<DataSource>){return {total:items.length,connected:items.filter(s=>s.status==='connected').length,attention:items.filter(s=>s.status==='attention').length,restricted:items.filter(s=>s.classification==='restricted'||s.classification==='blocked').length};}
/** Strict restore: only known fixture IDs, and only the locally disabled flag. */
export function restoreSourceFlags(raw:unknown):Record<string,boolean>{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return {};
 const obj=raw as Record<string,unknown>;const clean:Record<string,boolean>={};
 for(const s of DEMO_SOURCES){if(s.classification==='blocked')continue;if(typeof obj[s.id]==='boolean')clean[s.id]=obj[s.id] as boolean;}
 return clean;
}
export function withLocalFlags(flags:Record<string,boolean>):DataSource[]{return DEMO_SOURCES.map(s=>({ ...s,status:s.classification==='blocked'?'disabled':flags[s.id]===true?'disabled':s.status }));}
export type ProbeResult={kind:'sample-connected'|'sample-review'|'sample-pending'|'unavailable';title:string;description:string};
/** This function never attempts a network connection; it is an illustrative sample. */
export function simulateConnectionCheck(source:DataSource):ProbeResult{
 if(source.classification==='blocked'||source.status==='disabled')return {kind:'unavailable',title:'المحاكاة غير متاحة',description:'المصدر معطّل أو محظور. لم يحدث أي اتصال.'};
 if(source.status==='connected')return {kind:'sample-connected',title:'مثال لنتيجة اتصال سليمة',description:'هذه نتيجة افتراضية مأخوذة من بيانات العرض؛ لم يُرسل أي طلب إلى قاعدة بيانات.'};
 if(source.status==='attention')return {kind:'sample-review',title:'مثال لنتيجة تتطلب مراجعة',description:'يمكن إظهار تحذير عند تعذّر تحقق الاتصال. لم تُنفذ محاولة شبكة.'};
 return {kind:'sample-pending',title:'المصدر لم يكتمل إعداده',description:'يجب استكمال تكوين المصدر قبل اختبار الاتصال الحقيقي مستقبلًا.'};
}
export function canToggleDemoSource(s:DataSource){return s.classification!=='blocked';}
