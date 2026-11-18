/**
 * BAYAN — Screen 25: Smart Views management, illustrative UI fixtures ONLY.
 * This module contains no real SQL, database connections, credentials or PII.
 * The initial four fixtures align with the SmartView examples in
 * lib/data-sources/details.ts. Additional entries are explicitly proposals.
 */
import {normalizeArabic, type DataSource, type SourceClass} from '../data-sources/sources';

export type SmartViewStatus='active'|'paused'|'draft';
export type SmartViewKind='illustrative'|'proposal';
export type SmartView={
 id:string; name:string; description:string;sourceId:string; classification:Exclude<SourceClass,'blocked'>;
 status:SmartViewStatus;kind:SmartViewKind;fields:readonly string[];scope:string;audience:string;
 lastUpdated:string; owner:string;
};
export type ViewFilters={query:string;sourceId:string;status:'all'|SmartViewStatus;classification:'all'|SmartView['classification'];kind:'all'|SmartViewKind};
export const VIEW_STORAGE_KEY='bayan.demo.smartviews.state.v1';
export const DEFAULT_VIEW_FILTERS:ViewFilters={query:'',sourceId:'all',status:'all',classification:'all',kind:'all'};
export const VIEW_STATUS_LABELS:Record<SmartViewStatus,string>={active:'نشط — تجريبي',paused:'موقوف محليًا',draft:'مسودة / مقترح'};
export const VIEW_KIND_LABELS:Record<SmartViewKind,string>={illustrative:'عرض توضيحي',proposal:'مسودة مقترحة فقط'};
export const VIEW_CLASS_LABELS:Record<SmartView['classification'],string>={public:'عام',masked:'محجوب جزئيًا',restricted:'مقيّد'};

export const DEMO_VIEWS:ReadonlyArray<SmartView>=[
 {id:'SV-DEMO-01',name:'عرض إحصاء التسجيل',description:'مؤشرات إجمالية لعدد المسجلين حسب الكلية دون كشف معرّفات الطلاب.',sourceId:'SRC-001',classification:'masked',status:'active',kind:'illustrative',fields:['college_name','registered_count'],scope:'إجمالي المسجلين حسب الكلية',audience:'الإدارة المصرح لها',lastUpdated:'2026-11-06',owner:'إدارة تقنية المعلومات'},
 {id:'SV-DEMO-02',name:'ملخص التوزيع الأكاديمي',description:'تصور مقترح لتوزيع التسجيل حسب الكلية والفصل الدراسي.',sourceId:'SRC-001',classification:'restricted',status:'draft',kind:'illustrative',fields:['term','faculty','total'],scope:'تجميعات فصلية عامة',audience:'مدير المؤسسة',lastUpdated:'2026-11-05',owner:'إدارة تقنية المعلومات'},
 {id:'SV-DEMO-03',name:'ملخص الطلبات',description:'ملخص طلبات شؤون الطلاب حسب الحالة دون بيانات أصحاب الطلبات.',sourceId:'SRC-002',classification:'masked',status:'draft',kind:'illustrative',fields:['request_status','count'],scope:'عدد الطلبات حسب الحالة',audience:'الإدارة المصرح لها',lastUpdated:'2026-11-05',owner:'شؤون الطلاب'},
 {id:'SV-DEMO-04',name:'ملخص مؤشرات الإدارة',description:'مؤشرات تخطيط مؤسسي مجمعة تُعرض بعد تدقيق الوصول.',sourceId:'SRC-005',classification:'masked',status:'draft',kind:'illustrative',fields:['period','metric_code','aggregate_value'],scope:'مقاييس دورية مجمعة',audience:'مدير المؤسسة',lastUpdated:'2026-11-04',owner:'وحدة التخطيط'},
 {id:'SV-PROPOSAL-01',name:'مقترح: القبول حسب الكلية',description:'فكرة عرض للتسجيل والقبول لا ترتبط بمخطط منشور.',sourceId:'SRC-006',classification:'masked',status:'draft',kind:'proposal',fields:['year','faculty_code','accepted_count'],scope:'تجميعات سنوية',audience:'مدير المؤسسة',lastUpdated:'2026-11-03',owner:'القبول والتسجيل'},
 {id:'SV-PROPOSAL-02',name:'مقترح: دليل الخدمات',description:'مقترح للفهرسة الوصفية لأدلة الخدمات دون محتوى حساس.',sourceId:'SRC-008',classification:'public',status:'draft',kind:'proposal',fields:['title','version'],scope:'عناوين ووصف المستندات',audience:'موظفو المؤسسة',lastUpdated:'2026-11-03',owner:'إدارة الجودة'},
 {id:'SV-PROPOSAL-03',name:'مقترح: فهرس اللوائح',description:'مخطط أولي لعرض عناوين اللوائح المسموح بها فقط.',sourceId:'SRC-003',classification:'public',status:'draft',kind:'proposal',fields:['title','page_count'],scope:'بيانات وصفية للوثائق',audience:'موظفو المؤسسة',lastUpdated:'2026-11-02',owner:'الشؤون القانونية'}
];
/** Only the published demonstration fixture may be paused and reactivated locally. */
export function canToggleView(view:SmartView,source:DataSource|undefined):boolean{
 return !!source && view.kind==='illustrative' && view.id==='SV-DEMO-01' && source.classification!=='blocked' && source.status!=='disabled' && (view.status==='active'||view.status==='paused');
}
export function restoreViewStates(raw:unknown):Record<string,'active'|'paused'>{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return {};
 const value=(raw as Record<string,unknown>)['SV-DEMO-01'];
 return value==='active'||value==='paused'?{'SV-DEMO-01':value}:{};
}
export function applyViewStates(views:ReadonlyArray<SmartView>,overrides:Record<string,'active'|'paused'>):SmartView[]{
 return views.map(view=>view.id==='SV-DEMO-01'&&(overrides[view.id]==='active'||overrides[view.id]==='paused')?{...view,status:overrides[view.id]}:view);
}
export function filterSmartViews(items:ReadonlyArray<SmartView>,filters:ViewFilters,sourceNames:Readonly<Record<string,string>>):SmartView[]{
 const q=normalizeArabic(filters.query);
 return items.filter(item=>{
  if(filters.sourceId!=='all'&&item.sourceId!==filters.sourceId)return false;
  if(filters.status!=='all'&&item.status!==filters.status)return false;
  if(filters.classification!=='all'&&item.classification!==filters.classification)return false;
  if(filters.kind!=='all'&&item.kind!==filters.kind)return false;
  if(!q)return true;
  return normalizeArabic([item.name,item.description,item.id,item.sourceId,sourceNames[item.sourceId]||'',item.fields.join(' ')].join(' ')).includes(q);
 });
}
export function viewStats(items:ReadonlyArray<SmartView>){return {total:items.length,active:items.filter(v=>v.status==='active').length,draft:items.filter(v=>v.status==='draft').length,restricted:items.filter(v=>v.classification==='restricted'||v.classification==='masked').length};}
export function findSmartView(id:string|null|undefined,items:ReadonlyArray<SmartView>):SmartView|null{
 if(!id||!/^(SV-DEMO-0[1-4]|SV-PROPOSAL-0[1-3])$/.test(id))return null;
 return items.find(v=>v.id===id)||null;
}
/** Never publish views based on blocked sources and never show blocked columns. */
export function visibleSmartViews(items:ReadonlyArray<SmartView>,sources:ReadonlyArray<DataSource>):SmartView[]{
 return items.filter(view=>{const source=sources.find(s=>s.id===view.sourceId);return !!source && source.classification!=='blocked' && view.fields.length>0 && view.fields.every(field=>/^[a-z][a-z0-9_]{0,59}$/.test(field));});
}
export function buildViewReview(view:SmartView){return {name:view.name,sourceId:view.sourceId,fields:[...view.fields],classification:view.classification,scope:view.scope,status:view.status,illustrative:true};}
