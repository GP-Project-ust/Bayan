/** Bayan / Screen 34 — platform-only PREVIEW records; not a real audit trail. */
import {DEMO_ORGANIZATIONS,normalizeArabic,safeCsvCell} from '../organizations/organizations';
import {ONBOARDING_STEPS,allowedTemplates,canComplete,cleanText,onboardingOrgLabel,saveDraft, type DataSourceKind,type OnboardingForm,type ViewTemplate} from '../onboarding/onboarding';

export type RunStatus='completed'|'failed'|'in_progress'|'paused';
export type StageStatus='completed'|'failed'|'in_progress'|'pending';
export type HistoryStage={key:number;name:string;status:StageStatus;durationMs:number|null;note:string};
export type HistoryRun={
 id:string;organizationId:string;organizationName:string;organizationCode:string;
 sector:string;region:string;startedAt:string;finishedAt:string|null;status:RunStatus;
 sources:DataSourceKind[];classification:'internal'|'restricted';views:ViewTemplate[];
 documentPlan:'none'|'sample3'|'sample12';steps:HistoryStage[];
 reason:string|null;origin:'fixture'|'browser';
};
export const HISTORY_DEMO_NOTICE='سجل تدريب توضيحي فقط. الأحداث الافتراضية ليست سجلات تشغيل أو أدلة تدقيق؛ ولا تتم أي معالجة مؤسسية أو اتصالات بالشبكة.';
export const HISTORY_STORAGE_KEY='bayan-onboarding-history-demo-v1';
export const STATUS_LABEL:Record<RunStatus,string>={completed:'اكتملت تجريبيًا',failed:'فشلت المحاكاة',in_progress:'قيد المحاكاة',paused:'متوقفة للمراجعة'};
export const STAGE_STATUS_LABEL:Record<StageStatus,string>={completed:'مكتملة',failed:'فشلت',in_progress:'قيد التنفيذ',pending:'لم تبدأ'};
export const SOURCE_TITLES:Record<DataSourceKind,string>={postgresql:'PostgreSQL',odoo:'Odoo Education',files:'مستندات',api:'REST API'};
export const DEFAULT_HISTORY_FILTERS={query:'',status:'all',organization:'all',stage:'all',from:'',to:'',sort:'newest'} as const;
export type HistoryFilters={query:string;status:'all'|RunStatus;organization:string;stage:string;from:string;to:string;sort:'newest'|'oldest'|'name'};
const RUN_STATUSES:RunStatus[]=['completed','failed','in_progress','paused'];
const SOURCE_KEYS:DataSourceKind[]=['postgresql','odoo','files','api'];
const VIEW_KEYS:ViewTemplate[]=['student_counts','academic_overview','documents_index','service_summary'];
const DOC_PLANS=['none','sample3','sample12'] as const;
const maxLocal=30;
const safeDate=(x:unknown)=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(x)&&!Number.isNaN(Date.parse(x));
const fixtureStage=(status:RunStatus,failedAt=2):HistoryStage[]=>ONBOARDING_STEPS.map((s,i)=>{
 let state:StageStatus='pending';
 if(status==='completed'||i<failedAt)state='completed';
 else if(i===failedAt&&status==='failed')state='failed';
 else if(i===failedAt&&status==='in_progress')state='in_progress';
 return {key:i,name:s.label,status:state,durationMs:state==='completed'?150+i*110:null,note:state==='failed'?'توقفت خطوة تدريبية؛ لم يحدث فشل خدمة حقيقية.':state==='in_progress'?'تقدم توضيحي، دون مهمة خلفية.':state==='completed'?'اجتازت محاكاة المعايير الوصفية.':'لم تبدأ هذه الخطوة في المثال.'};
});
function createFixture(id:string,organizationId:string,startedAt:string,status:RunStatus,failedAt:number,sources:DataSourceKind[],reason:string|null=null):HistoryRun{
 const org=DEMO_ORGANIZATIONS.find(o=>o.id===organizationId)!;
 return {id,organizationId,organizationName:org.name,organizationCode:org.code,sector:org.sector,region:org.region,startedAt,finishedAt:status==='completed'||status==='failed'?new Date(Date.parse(startedAt)+4*60000).toISOString():null,status,sources,classification:'internal',views:sources.includes('postgresql')?['student_counts']:sources.includes('files')?['documents_index']:['service_summary'],documentPlan:sources.includes('files')?'sample3':'none',steps:fixtureStage(status,failedAt),reason,origin:'fixture'};
}
export const DEMO_HISTORY:readonly HistoryRun[]=[
 createFixture('ONB-DEMO-0001','ORG-DEMO-001','2026-11-03T09:15:00.000Z','completed',6,['postgresql','files']),
 createFixture('ONB-DEMO-0002','ORG-DEMO-002','2026-11-06T11:20:00.000Z','in_progress',3,['odoo','files']),
 createFixture('ONB-DEMO-0003','ORG-DEMO-004','2026-11-01T07:55:00.000Z','failed',2,['api'],'لم يجتز مثال فحص وصف المخطط؛ لا يوجد اتصال حقيقي.'),
 createFixture('ONB-DEMO-0004','ORG-DEMO-006','2026-11-05T10:10:00.000Z','paused',2,['postgresql','files'],'تنتظر المسودة مراجعة مستوى الوصول الافتراضي.'),
 createFixture('ONB-DEMO-0005','ORG-DEMO-003','2026-10-28T08:00:00.000Z','completed',6,['odoo','files']),
 createFixture('ONB-DEMO-0006','ORG-DEMO-002','2026-10-31T12:30:00.000Z','failed',4,['odoo','files'],'فشل مثال فحص خطة الفهرسة؛ لم يتعرض Qdrant لعملية.'),
 createFixture('ONB-DEMO-0007','ORG-DEMO-007','2026-10-26T09:10:00.000Z','completed',6,['postgresql']),
 createFixture('ONB-DEMO-0008','ORG-DEMO-008','2026-10-23T06:40:00.000Z','failed',3,['api'],'قالب عرض توضيحي غير متوافق مع تصنيف المصدر.'),
];
export const stageProgress=(run:HistoryRun)=>run.steps.filter(s=>s.status==='completed').length;
export function historyStats(runs:readonly HistoryRun[]){return {total:runs.length,completed:runs.filter(x=>x.status==='completed').length,failed:runs.filter(x=>x.status==='failed').length,attention:runs.filter(x=>x.status==='paused'||x.status==='in_progress').length};}
export function isHistoryId(id:unknown){return typeof id==='string'&&/^ONB-(DEMO-\d{4}|LOCAL-\d{13}-[a-z0-9]{4})$/.test(id);}
export function findHistory(runs:readonly HistoryRun[],id:unknown){return isHistoryId(id)?runs.find(x=>x.id===id)??null:null;}
export function validHistoryDates(filters:Pick<HistoryFilters,'from'|'to'>){
 const valid=(value:string)=>{if(!value)return true;if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const date=new Date(`${value}T00:00:00.000Z`);return !Number.isNaN(date.getTime())&&date.toISOString().slice(0,10)===value;};
 return valid(filters.from)&&valid(filters.to)&&(!filters.from||!filters.to||filters.from<=filters.to);
}
export function filterHistory(runs:readonly HistoryRun[],filters:HistoryFilters){
 if(!validHistoryDates(filters))return [];
 const q=normalizeArabic(filters.query);
 return runs.filter(x=>{
  const hay=normalizeArabic([x.id,x.organizationName,x.organizationCode,x.reason??'',x.sources.map(s=>SOURCE_TITLES[s]).join(' ')].join(' '));
  return (!q||hay.includes(q))&&(filters.status==='all'||x.status===filters.status)&&(filters.organization==='all'||x.organizationId===filters.organization)
   &&(filters.stage==='all'||x.steps[Number(filters.stage)]?.status==='failed'||(filters.stage==='none'&&x.status==='completed'))
   &&(!filters.from||x.startedAt.slice(0,10)>=filters.from)&&(!filters.to||x.startedAt.slice(0,10)<=filters.to);
 }).sort((a,b)=>filters.sort==='name'?a.organizationName.localeCompare(b.organizationName,'ar'):
  filters.sort==='oldest'?a.startedAt.localeCompare(b.startedAt):b.startedAt.localeCompare(a.startedAt));
}
/** Allowlist hydration: local history never stores passwords, secrets, tokens, raw SQL or document contents. */
export function sanitizeBrowserRun(raw:unknown):HistoryRun|null{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return null;
 const x=raw as Record<string,unknown>;
 if(!isHistoryId(x.id)||!(x.id as string).startsWith('ONB-LOCAL-')||x.status!=='completed'||!safeDate(x.startedAt)||!safeDate(x.finishedAt))return null;
 if(typeof x.organizationId!=='string'||typeof x.organizationName!=='string'||x.organizationName.length<3||x.organizationName.length>80)return null;
 if(x.organizationId!=='new'&&!DEMO_ORGANIZATIONS.some(o=>o.id===x.organizationId))return null;
 if(!Array.isArray(x.sources)||x.sources.length>4||x.sources.length===0||!x.sources.every(v=>SOURCE_KEYS.includes(v)))return null;
 const sources=[...new Set(x.sources as DataSourceKind[])];
 const classification=x.classification==='restricted'?'restricted':'internal';
 const rawViews=Array.isArray(x.views)?x.views:[];
 const views=[...new Set(rawViews.filter((v:unknown):v is ViewTemplate=>typeof v==='string'&&(VIEW_KEYS as readonly string[]).includes(v)))].filter(v=>allowedTemplates({sources,classification} as OnboardingForm).includes(v)).slice(0,4);
 if(!views.length)return null;
 const documentPlan=DOC_PLANS.includes(x.documentPlan as (typeof DOC_PLANS)[number])?x.documentPlan as HistoryRun['documentPlan']:'none';
 const txt=(field:string,max=50)=>typeof x[field]==='string'?cleanText(String(x[field])).slice(0,max):'';
 return {id:x.id as string,organizationId:x.organizationId,organizationName:cleanText(x.organizationName),organizationCode:txt('organizationCode',18),sector:txt('sector',30),region:txt('region',40),startedAt:x.startedAt as string,finishedAt:x.finishedAt as string,status:'completed',sources,classification,views,documentPlan,steps:fixtureStage('completed',6),reason:null,origin:'browser'};
}
export function readLocalHistory(storage:{getItem:(key:string)=>string|null}):HistoryRun[]{
 try{const raw=storage.getItem(HISTORY_STORAGE_KEY);if(!raw||raw.length>52000)return [];const value:unknown=JSON.parse(raw);if(!Array.isArray(value))return [];
  return value.slice(0,maxLocal).map(sanitizeBrowserRun).filter((x):x is HistoryRun=>x!==null);
 }catch{return [];}
}
export function appendCompletedHistory(storage:{getItem:(key:string)=>string|null;setItem:(key:string,v:string)=>void},form:OnboardingForm,id:string,when:string){
 if(!isHistoryId(id)||!id.startsWith('ONB-LOCAL-')||!safeDate(when)||!canComplete(form))throw new Error('invalid demonstration completion metadata');
 const raw={id,organizationId:form.organizationId,organizationName:onboardingOrgLabel(form),organizationCode:form.organizationCode,sector:form.sector,region:form.region,startedAt:when,finishedAt:when,status:'completed',sources:form.sources,classification:form.classification,views:form.selectedViews,documentPlan:form.documentPlan};
 const safe=sanitizeBrowserRun(raw);if(!safe)throw new Error('invalid completed demonstration');
 const records=readLocalHistory(storage).filter(x=>x.id!==id);
 const next=[safe,...records].slice(0,maxLocal);
 // Persist only the small allowlisted record properties, never untrusted serialized objects.
 storage.setItem(HISTORY_STORAGE_KEY,JSON.stringify(next.map(({id,organizationId,organizationName,organizationCode,sector,region,startedAt,finishedAt,status,sources,classification,views,documentPlan})=>({id,organizationId,organizationName,organizationCode,sector,region,startedAt,finishedAt,status,sources,classification,views,documentPlan}))));
 return safe;
}
/** Retry deliberately prepares an editable draft, never restarts a remote job. */
export function canPrepareRetry(run:HistoryRun){
 if(!(run.status==='failed'||run.status==='paused'))return false;
 if(run.organizationId==='new')return true;
 return DEMO_ORGANIZATIONS.some(o=>o.id===run.organizationId&&o.status==='onboarding');
}
export function retryDraft(run:HistoryRun):OnboardingForm|null{
 if(!canPrepareRetry(run))return null;
 const form:OnboardingForm={organizationId:run.organizationId,organizationName:run.organizationId==='new'?run.organizationName:'',organizationCode:run.organizationCode,sector:run.sector||'جامعة',region:run.region||'صنعاء',sources:[...run.sources],classification:run.classification,analysisDone:false,selectedViews:[],documentPlan:run.documentPlan,indexingDone:false,acknowledged:false};
 return form;
}
export function prepareRetry(storage:{setItem:(key:string,v:string)=>void},run:HistoryRun){const draft=retryDraft(run);if(!draft)return false;saveDraft(storage,draft);return true;}
export function historyCsv(runs:readonly HistoryRun[]){const rows=[['المعرف','المؤسسة','الحالة','بداية المحاكاة','نهاية المحاكاة','خطوات مكتملة','عدد المصادر','نوع السجل'],...runs.map(x=>[x.id,x.organizationName,STATUS_LABEL[x.status],x.startedAt,x.finishedAt??'—',String(stageProgress(x)),String(x.sources.length),x.origin==='fixture'?'مثال اصطناعي':'محاكاة محفوظة في المتصفح'])];return '\uFEFF'+rows.map(row=>row.map(safeCsvCell).join(',')).join('\r\n');}
