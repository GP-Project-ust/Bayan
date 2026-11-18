/**
 * Bayan — Screen 32: platform operator preview fixtures ONLY.
 * No real tenant content, credentials, user lists, source schemas or auth tokens.
 * This module deliberately exposes operational metadata, not institutional data.
 */
export type OrganizationStatus='active'|'onboarding'|'paused';
export type ServiceKey='chat'|'documents'|'reports'|'analytics';
export type OnboardingState='complete'|'in_progress'|'not_started'|'attention';
export interface Organization {
 id:string;name:string;code:string;sector:string;region:string;
 status:OrganizationStatus;onboarding:OnboardingState;
 services:ServiceKey[];createdAt:string;lastSeenAt:string|null;
 description:string;
}
export type OrganizationFilters={query:string;status:'all'|OrganizationStatus;sector:string;service:'all'|ServiceKey;sort:'name'|'recent'|'oldest'};
export const DEMO_NOTICE='بيانات مؤسسات اصطناعية للمعاينة فقط؛ لا توجد اتصالات أو إدارة فعلية للمؤسسات.';
export const STATUS_LABELS:Record<OrganizationStatus,string>={active:'نشطة',onboarding:'قيد التهيئة',paused:'موقوفة'};
export const ONBOARDING_LABELS:Record<OnboardingState,string>={complete:'مكتملة',in_progress:'قيد التنفيذ',not_started:'لم تبدأ',attention:'تحتاج متابعة'};
export const SERVICE_LABELS:Record<ServiceKey,string>={chat:'المساعد الذكي',documents:'البحث الدلالي',reports:'التقارير',analytics:'التحليلات'};
export const DEMO_ORGANIZATIONS:readonly Organization[]=[
 {id:'ORG-DEMO-001',name:'جامعة الأفق التجريبية',code:'HORIZON-DEMO',sector:'جامعة',region:'صنعاء',status:'active',onboarding:'complete',services:['chat','documents','reports','analytics'],createdAt:'2026-07-12',lastSeenAt:'2026-11-06',description:'مؤسسة جامعية افتراضية لعرض إدارة المستأجرين دون بيانات طلاب أو موظفين.'},
 {id:'ORG-DEMO-002',name:'معهد الريادة التدريبي الافتراضي',code:'LEAD-DEMO',sector:'معهد',region:'عدن',status:'onboarding',onboarding:'in_progress',services:['chat','documents'],createdAt:'2026-09-14',lastSeenAt:null,description:'معهد افتراضي يختبر مراحل تهيئة المنصة فقط.'},
 {id:'ORG-DEMO-003',name:'جامعة المعرفة الافتراضية',code:'KNOWLEDGE-DEMO',sector:'جامعة',region:'تعز',status:'active',onboarding:'complete',services:['chat','documents','reports'],createdAt:'2026-05-26',lastSeenAt:'2026-11-05',description:'بيانات وصفية تدريبية لمؤسسة تعليمية دون معلومات تشغيلية حساسة.'},
 {id:'ORG-DEMO-004',name:'مركز الابتكار الأكاديمي التجريبي',code:'INNOVATION-DEMO',sector:'مركز',region:'حضرموت',status:'paused',onboarding:'attention',services:['chat'],createdAt:'2026-06-03',lastSeenAt:'2026-10-29',description:'مثال على مؤسسة موقوفة في واجهة محاكاة، دون تعطيل أي خدمة حقيقية.'},
 {id:'ORG-DEMO-005',name:'كلية المستقبل الافتراضية',code:'FUTURE-DEMO',sector:'كلية',region:'إب',status:'active',onboarding:'complete',services:['chat','documents','reports'],createdAt:'2026-08-19',lastSeenAt:'2026-11-07',description:'كلية توضيحية لعرض حالة الخدمات والمعلومات العامة فقط.'},
 {id:'ORG-DEMO-006',name:'الأكاديمية الوطنية التجريبية',code:'ACADEMY-DEMO',sector:'أكاديمية',region:'الحديدة',status:'onboarding',onboarding:'not_started',services:[],createdAt:'2026-10-25',lastSeenAt:null,description:'مثال لمؤسسة مسجلة ولم تبدأ التهيئة بعد.'},
 {id:'ORG-DEMO-007',name:'مركز البحوث الافتراضي',code:'RESEARCH-DEMO',sector:'مركز',region:'صنعاء',status:'active',onboarding:'complete',services:['chat','documents','analytics'],createdAt:'2026-04-11',lastSeenAt:'2026-11-06',description:'مركز افتراضي مع عدد من الخدمات المفعلة ضمن بيانات العرض.'},
 {id:'ORG-DEMO-008',name:'المعهد التقني التجريبي',code:'TECH-DEMO',sector:'معهد',region:'ذمار',status:'paused',onboarding:'complete',services:['chat','reports'],createdAt:'2026-03-04',lastSeenAt:'2026-10-21',description:'سجل تجريبي لاختبار التصفية بين الحالات.'},
] as const;
export const DEFAULT_ORG_FILTERS:OrganizationFilters={query:'',status:'all',sector:'all',service:'all',sort:'recent'};
export const SECTORS=[...new Set(DEMO_ORGANIZATIONS.map(x=>x.sector))];
export function normalizeArabic(input:string):string{return String(input).normalize('NFKC').replace(/[\u064B-\u065F\u0670]/g,'').replace(/[أإآٱ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').toLocaleLowerCase('ar').trim();}
export function isValidOrgId(value:unknown):value is string{return typeof value==='string'&&/^ORG-DEMO-\d{3}$/.test(value);}
export function findOrganization(id:unknown,orgs:readonly Organization[]=DEMO_ORGANIZATIONS){return isValidOrgId(id)?orgs.find(o=>o.id===id)??null:null;}
export function filterOrganizations(orgs:readonly Organization[],filters:OrganizationFilters):Organization[]{
 const q=normalizeArabic(filters.query);
 const filtered=orgs.filter(o=>{
  const text=normalizeArabic([o.name,o.code,o.sector,o.region,o.id].join(' '));
  return (!q||text.includes(q))&&(filters.status==='all'||o.status===filters.status)&&(filters.sector==='all'||o.sector===filters.sector)&&(filters.service==='all'||o.services.includes(filters.service));
 });
 return filtered.sort((a,b)=>filters.sort==='name'?a.name.localeCompare(b.name,'ar'):filters.sort==='oldest'?a.createdAt.localeCompare(b.createdAt):b.createdAt.localeCompare(a.createdAt));
}
export function organizationStats(orgs:readonly Organization[]){return {total:orgs.length,active:orgs.filter(o=>o.status==='active').length,onboarding:orgs.filter(o=>o.status==='onboarding').length,paused:orgs.filter(o=>o.status==='paused').length};}
/** Status changes are local demo metadata only. Do not use this as an API state transition. */
export function previewChangeStatus(org:Organization,next:OrganizationStatus):{ok:boolean;reason:string;value:Organization}{
 if(org.status===next)return {ok:false,reason:'حالة المؤسسة محدّثة مسبقًا.',value:org};
 if(org.status==='onboarding'||next==='onboarding')return {ok:false,reason:'حالة التهيئة تُدار من معالج التهيئة، ولا يمكن تغييرها من هذه الصفحة.',value:org};
 return {ok:true,reason:'تم تغيير حالة العرض محليًا فقط.',value:{...org,status:next}};
}
const STORAGE_KEY='bayan-platform-organizations-status-demo-v1';
export function readDemoStatuses(storage:{getItem:(key:string)=>string|null}|null):Record<string,OrganizationStatus>{
 if(!storage)return {};
 try{
  const raw=storage.getItem(STORAGE_KEY);if(!raw||raw.length>10000)return {};
  const data:unknown=JSON.parse(raw);if(!data||typeof data!=='object'||Array.isArray(data))return {};
  const known=DEMO_ORGANIZATIONS.filter(o=>o.status!=='onboarding');const result:Record<string,OrganizationStatus>={};
  for(const o of known){const value=(data as Record<string,unknown>)[o.id];if(value==='active'||value==='paused')result[o.id]=value;}
  return result;
 }catch{return {};}
}
export function applyDemoStatuses(orgs:readonly Organization[],statuses:Record<string,OrganizationStatus>){return orgs.map(o=>o.status==='onboarding'?o:{...o,status:statuses[o.id]??o.status});}
export function writeDemoStatuses(storage:{setItem:(key:string,value:string)=>void},orgs:readonly Organization[]):void{
 const value:Object=Object.fromEntries(orgs.filter(o=>o.status!=='onboarding').map(o=>[o.id,o.status]));storage.setItem(STORAGE_KEY,JSON.stringify(value));
}
/** CSV escaping protects spreadsheets from formula execution. No tenant records beyond platform metadata. */
export function safeCsvCell(value:unknown){const s=String(value??'');const safe=/^[\s]*[=+\-@\t\r]/.test(s)?`'${s}`:s;return `"${safe.replace(/"/g,'""')}"`;}
export function organizationsCsv(orgs:readonly Organization[]){const rows=[['المعرف','المؤسسة','النوع','المنطقة','الحالة','مرحلة التهيئة','عدد الخدمات'],...orgs.map(o=>[o.id,o.name,o.sector,o.region,STATUS_LABELS[o.status],ONBOARDING_LABELS[o.onboarding],String(o.services.length)])];return '\uFEFF'+rows.map(row=>row.map(safeCsvCell).join(',')).join('\r\n');}
