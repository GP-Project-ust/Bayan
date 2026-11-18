/** Screen 33 — platform onboarding UI demo. No connection or server operations. */
import { DEMO_ORGANIZATIONS } from '../organizations/organizations';

export type DataSourceKind = 'postgresql' | 'odoo' | 'files' | 'api';
export type ViewTemplate = 'student_counts' | 'academic_overview' | 'documents_index' | 'service_summary';
export type OnboardingStage = 0 | 1 | 2 | 3 | 4 | 5;
export type OnboardingForm = {
 organizationId:string; organizationName:string; organizationCode:string; sector:string;region:string;
 sources:DataSourceKind[]; classification:'internal'|'restricted';
 analysisDone:boolean; selectedViews:ViewTemplate[]; documentPlan:'none'|'sample3'|'sample12';
 indexingDone:boolean; acknowledged:boolean;
};
export const ONBOARDING_DEMO_NOTICE = 'محاكاة تعليمية فقط: لا تُنشأ مؤسسة، ولا يُفحص مخطط حقيقي، ولا تُنشر عروض أو تُفهرس وثائق، ولا تُرسل طلبات إلى الخادم.';
export const ONBOARDING_STEPS = [
 {label:'المؤسسة',caption:'تحديد المؤسسة وبياناتها'},
 {label:'المصادر',caption:'اختيار مصادر البيانات'},
 {label:'تحليل المخطط',caption:'محاكاة قراءة البنية'},
 {label:'العروض الذكية',caption:'قوالب مسموحة فقط'},
 {label:'المستندات',caption:'خطة فهرسة تجريبية'},
 {label:'المراجعة',caption:'فحص الجاهزية والاعتماد'},
] as const;
export const SOURCE_LABELS:Record<DataSourceKind,string>={postgresql:'PostgreSQL — قاعدة بيانات',odoo:'Odoo Education — نظام أكاديمي',files:'مستودع وثائق تجريبي',api:'REST API — خدمة وصفية'};
export const VIEW_LABELS:Record<ViewTemplate,string>={student_counts:'إحصاء أعداد الطلاب',academic_overview:'ملخص الأداء الأكاديمي',documents_index:'فهرس المستندات',service_summary:'ملخص الخدمات التشغيلية'};
export const VIEW_DESCRIPTION:Record<ViewTemplate,string>={student_counts:'أعداد مجمّعة فقط بلا بيانات تعريف شخصية',academic_overview:'مؤشرات وصفية على مستوى الكلية',documents_index:'فهارس وعناوين مرجعية دون محتوى مقيد',service_summary:'بيانات تشغيل الخدمة دون أسرار اتصال'};
export const VIEW_CLASSIFICATION:Record<ViewTemplate,'internal'|'restricted'>={student_counts:'internal',academic_overview:'restricted',documents_index:'internal',service_summary:'internal'};
export const DEFAULT_ONBOARDING_FORM:OnboardingForm={organizationId:'ORG-DEMO-006',organizationName:'',organizationCode:'',sector:'جامعة',region:'صنعاء',sources:['postgresql','files'],classification:'internal',analysisDone:false,selectedViews:[],documentPlan:'sample3',indexingDone:false,acknowledged:false};
export function cleanText(value:string){return String(value).trim().replace(/\s+/g,' ');}
export function onboardingOrgLabel(form:OnboardingForm){return form.organizationId==='new'?cleanText(form.organizationName):DEMO_ORGANIZATIONS.find(x=>x.id===form.organizationId)?.name??'غير محددة';}
export function validOrganization(form:OnboardingForm){
 if(form.organizationId!=='new')return DEMO_ORGANIZATIONS.some(x=>x.id===form.organizationId&&x.status==='onboarding');
 return cleanText(form.organizationName).length>=3&&cleanText(form.organizationName).length<=80&&/^[A-Z][A-Z0-9-]{2,17}$/.test(form.organizationCode.trim())&&cleanText(form.sector).length>=2&&cleanText(form.region).length>=2;
}
export function allowedTemplates(form:OnboardingForm):ViewTemplate[]{
 const kinds=form.sources;
 const available:ViewTemplate[]=[];
 if(kinds.includes('postgresql')||kinds.includes('odoo'))available.push('student_counts','academic_overview');
 if(kinds.includes('files'))available.push('documents_index');
 if(kinds.includes('api'))available.push('service_summary');
 // Restricted templates are not exposed when access is internal; source classification cannot be downgraded.
 return available.filter(x=>VIEW_CLASSIFICATION[x]==='internal'||form.classification==='restricted');
}
export function schemaPreview(form:OnboardingForm){
 if(!form.analysisDone)return [];
 const rows: {entity:string;columns:string;note:string}[]=[];
 if(form.sources.includes('postgresql'))rows.push({entity:'students_aggregate',columns:'college, total_count',note:'أمثلة أعمدة مجمّعة'});
 if(form.sources.includes('odoo'))rows.push({entity:'academic_metrics',columns:'department, pass_rate',note:'مخطط افتراضي لا يتصل بـOdoo'});
 if(form.sources.includes('files'))rows.push({entity:'document_metadata',columns:'title, category, page_count',note:'أسماء حقول فقط، دون وثائق'});
 if(form.sources.includes('api'))rows.push({entity:'service_summary',columns:'service, status',note:'وصف تدريب للخدمات'});
 return rows;
}
export function validateStage(stage:OnboardingStage,form:OnboardingForm):string|null{
 switch(stage){
  case 0:return validOrganization(form)?null:'اختر مؤسسة تجريبية قيد التهيئة، أو أدخل اسمًا ورمزًا صحيحين لمؤسسة جديدة.';
  case 1:return form.sources.length>0&&form.sources.every(x=>x in SOURCE_LABELS)?null:'اختر مصدر بيانات واحدًا على الأقل.';
  case 2:return form.analysisDone?null:'يجب تشغيل محاكاة تحليل المخطط قبل المتابعة.';
  case 3:return form.selectedViews.length>0&&form.selectedViews.every(x=>allowedTemplates(form).includes(x))?null:'اختر عرضًا ذكيًا واحدًا على الأقل من القوالب المسموحة.';
  case 4:return form.indexingDone?null:'أكمل محاكاة خطة الفهرسة أو تجاوزها عند عدم وجود مستندات.';
  case 5:return form.acknowledged?null:'أكّد فهمك أن الإجراءات تجريبية ولا تنشئ أي موارد حقيقية.';
 }
}
export function readiness(form:OnboardingForm){return ONBOARDING_STEPS.slice(0,5).map((s,i)=>({label:s.label,passed:validateStage(i as OnboardingStage,form)===null}));}
export function canComplete(form:OnboardingForm){return readiness(form).every(x=>x.passed)&&validateStage(5,form)===null;}
export const DRAFT_KEY='bayan-onboarding-draft-demo-v1';
const kinds=Object.keys(SOURCE_LABELS) as DataSourceKind[];
const views=Object.keys(VIEW_LABELS) as ViewTemplate[];
/** Strictly hydrate known metadata keys; do not accept unknown serialized secrets. */
export function sanitizeDraft(input:unknown):OnboardingForm|null{
 if(!input||typeof input!=='object'||Array.isArray(input))return null;
 const x=input as Record<string,unknown>;
 if(typeof x.organizationId!=='string'||!Array.isArray(x.sources)||x.sources.length>4||!x.sources.every(v=>kinds.includes(v)))return null;
 const organizationId=x.organizationId;
 if(organizationId!=='new'&&!DEMO_ORGANIZATIONS.some(o=>o.id===organizationId))return null;
 const val=(k:string,max=80)=>typeof x[k]==='string'?String(x[k]).slice(0,max):'';
 const sources=[...new Set(x.sources as DataSourceKind[])];
 const classification=x.classification==='restricted'?'restricted':'internal';
 const selectedViews=Array.isArray(x.selectedViews)?[...new Set(x.selectedViews.filter((v:unknown):v is ViewTemplate=>typeof v==='string'&&(views as readonly string[]).includes(v)))].slice(0,4):[];
 const doc=x.documentPlan==='none'||x.documentPlan==='sample12'?x.documentPlan:'sample3';
 const candidate:OnboardingForm={organizationId,organizationName:val('organizationName'),organizationCode:val('organizationCode',18),sector:val('sector',30),region:val('region',40),sources,classification,analysisDone:x.analysisDone===true,selectedViews,documentPlan:doc,indexingDone:x.indexingDone===true,acknowledged:false};
 candidate.selectedViews=candidate.selectedViews.filter(v=>allowedTemplates(candidate).includes(v));
 return candidate;
}
export function saveDraft(storage:{setItem:(key:string,value:string)=>void},form:OnboardingForm){
 const safe={organizationId:form.organizationId,organizationName:cleanText(form.organizationName),organizationCode:form.organizationCode,sector:form.sector,region:form.region,sources:form.sources,classification:form.classification,analysisDone:form.analysisDone,selectedViews:form.selectedViews,documentPlan:form.documentPlan,indexingDone:form.indexingDone};
 storage.setItem(DRAFT_KEY,JSON.stringify(safe));
}
export function loadDraft(storage:{getItem:(key:string)=>string|null}):OnboardingForm|null{
 try{const value=storage.getItem(DRAFT_KEY);if(!value||value.length>6000)return null;return sanitizeDraft(JSON.parse(value));}catch{return null;}
}
export function completionSummary(form:OnboardingForm){
 return {mode:'DEMO_ONLY',organization:onboardingOrgLabel(form),sources:form.sources.map(x=>SOURCE_LABELS[x]),views:form.selectedViews.map(x=>VIEW_LABELS[x]),documentPlan:form.documentPlan,classification:form.classification,executedRequests:0,createdDatabaseObjects:0};
}
