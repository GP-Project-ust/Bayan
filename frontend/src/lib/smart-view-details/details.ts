/**
 * BAYAN — Screen 27. Pure, deterministic presentation/test helpers.
 * No DB, SQL execution, network calls, credentials or real student records.
 */
import {type DataSource, type SourceClass} from '../data-sources/sources';
import {getSourceSchema} from '../data-sources/details';
import {type LocalSmartView, safeFields} from '../smart-view-create/wizard';
import {type SmartView, type SmartViewStatus} from '../smart-views/views';

export type DetailView=SmartView|LocalSmartView;
export type DetailCheck={id:string;label:string;result:'pass'|'warning'|'blocked';detail:string};
export type PreviewRow=Record<string,string>;
export type DetailPreview={illustrative:true;noExecution:true;noPublication:true;viewId:string;sourceId:string;status:SmartViewStatus;table:string|null;fields:string[];classification:SmartView['classification'];scope:string;audience:string;filter:null|{field:string;operator:string;value:'parameter-only'};schemaOrigin:'training-fixture-only'};
export type DetailSimulation={checks:DetailCheck[];rows:PreviewRow[];verdict:'review'|'valid-training-example'|'blocked';message:string};
const identifiers=/^[a-z][a-z0-9_]{0,59}$/;
const classificationOrder:Record<SourceClass,number>={public:0,masked:1,restricted:2,blocked:3};
const sampleValues:Record<string,[string,string]>={
 college_name:['كلية افتراضية أ','كلية افتراضية ب'],registered_count:['120 (افتراضي)','95 (افتراضي)'],
 term:['2026-1 (افتراضي)','2026-2 (افتراضي)'],faculty:['كلية افتراضية أ','كلية افتراضية ب'],total:['120','95'],
 request_status:['قيد المراجعة','مكتمل'],count:['18','34'],period:['2026-10','2026-11'],
 metric_code:['MET-A','MET-B'],aggregate_value:['62','79'],year:['2026','2025'],
 faculty_code:['FAC-A','FAC-B'],accepted_count:['35','47'],title:['دليل توضيحي أ','دليل توضيحي ب'],
 version:['1.0','2.0'],page_count:['12','18'],enrollment_status:['نشط','معلق'],
 service_type:['خدمة أ','خدمة ب'],request_status_code:['ST-A','ST-B'],requested_at:['2026-10','2026-11']
};

export function normalizeViewId(value:string|null|undefined):string|null{
 if(!value)return null;
 return /^(?:SV-DEMO-0[1-4]|SV-PROPOSAL-0[1-3]|SV-DRAFT-[a-z0-9]{8})$/.test(value)?value:null;
}
export function findDetailView(requestedId:string|null|undefined,all:ReadonlyArray<DetailView>):DetailView|null{
 const id=normalizeViewId(requestedId);
 return id?all.find(v=>v.id===id)||null:null;
}
export function isSavedDraft(view:DetailView):view is LocalSmartView{
 return view.id.startsWith('SV-DRAFT-')&&'tableName' in view;
}
/** A training table is not a discovered DB schema. Demonstration fixture views are never marked as verified. */
export function schemaForDraft(view:DetailView,source:DataSource|undefined){
 if(!source||source.classification==='blocked'||source.status==='disabled'||!isSavedDraft(view))return null;
 const table=getSourceSchema(source).tables.find(t=>t.name===view.tableName);
 if(!table)return null;
 const allowed=new Set(safeFields(table).map(x=>x.name));
 return view.fields.length>0&&view.fields.every(f=>allowed.has(f))?table:null;
}
export function buildDetailPreview(view:DetailView,source:DataSource|undefined):DetailPreview|null{
 if(!source||source.id!==view.sourceId||source.classification==='blocked'||source.status==='disabled'||!view.fields.length||!view.fields.every(f=>identifiers.test(f)))return null;
 const draft=isSavedDraft(view);
 if(draft&&!schemaForDraft(view,source))return null;
 return {illustrative:true,noExecution:true,noPublication:true,viewId:view.id,sourceId:source.id,status:view.status,
  table:draft?view.tableName:null,fields:[...view.fields],classification:view.classification,scope:view.scope,audience:view.audience,
  filter:draft&&view.filterOperator!=='none'?{field:view.filterField,operator:view.filterOperator,value:'parameter-only'}:null,
  schemaOrigin:'training-fixture-only'};
}
/** Sample rows are synthetic strings only, and never generated for unknown fields/sources. */
export function syntheticRows(view:DetailView,source:DataSource|undefined):PreviewRow[]{
 const definition=buildDetailPreview(view,source);
 if(!definition||!view.fields.every(f=>Object.hasOwn(sampleValues,f)))return [];
 if(classificationOrder[view.classification]<classificationOrder[source!.classification])return [];
 return [0,1].map(i=>Object.fromEntries(view.fields.map(field=>[field,sampleValues[field][i]])));
}
export function runLocalInspection(view:DetailView,source:DataSource|undefined):DetailSimulation{
 const checks:DetailCheck[]=[];
 const active=!!source&&source.id===view.sourceId&&source.classification!=='blocked'&&source.status!=='disabled';
 checks.push({id:'source',label:'إتاحة المصدر',result:active?'pass':'blocked',detail:active?'مصدر تدريبي معروف وغير محظور في النموذج المحلي.':'المصدر مفقود أو محظور أو معطّل في هذا المتصفح.'});
 const allowed=active&&!!buildDetailPreview(view,source);
 checks.push({id:'structure',label:'بنية التعريف',result:allowed?'pass':'blocked',detail:allowed?'معرّفات الحقول آمنة في المعاينة، وبنية المسودة مطابقة للأمثلة التدريبية عند توفرها.':'لا يمكن معاينة تعريف يحتوي على حقول أو جدول غير مسموح بهما.'});
 const safeClassification=active&&classificationOrder[view.classification]>=classificationOrder[source!.classification];
 checks.push({id:'classification',label:'التصنيف الأمني',result:safeClassification?'pass':'warning',detail:safeClassification?'تصنيف العرض لا يقل عن تصنيف مصدره في المثال.':'يلزم رفع مستوى تصنيف العرض أو تدقيق المصدر قبل أي نشر حقيقي.'});
 checks.push({id:'publication',label:'النشر والتنفيذ',result:'warning',detail:'لم يُنشر العرض ولم يُنفذ SQL أو استدعاء Backend. الفحص محلي وصفي فقط.'});
 const rows=allowed&&safeClassification?syntheticRows(view,source):[];
 const blocked=checks.some(c=>c.result==='blocked');
 return {checks,rows,verdict:blocked?'blocked':safeClassification?'valid-training-example':'review',message:blocked?'توقفت المعاينة بسبب قيد أمن أو بنية غير صالحة.':safeClassification?'اجتاز التعريف قواعد المعاينة المحلية فقط، دون اتصال أو نشر.':'تحتاج البيانات الوصفية إلى مراجعة التصنيف قبل الاستخدام.'};
}
/** Non-executable and strictly allowlisted SQL-shaped documentation for saved training drafts only. */
export function illustrativeDraftQuery(view:DetailView,source:DataSource|undefined):string|null{
 const table=schemaForDraft(view,source);
 if(!table||!isSavedDraft(view)||!source||!['postgres','mysql'].includes(source.type))return null;
 const quote=(id:string)=>`"${id}"`;
 if(!view.fields.every(field=>identifiers.test(field)))return null;
 const predicates:Record<string,string>={none:'',eq:'= :parameter',ne:'<> :parameter',not_null:'IS NOT NULL'};
 if(!Object.hasOwn(predicates,view.filterOperator))return null;
 if(view.filterOperator!=='none'&&!view.fields.includes(view.filterField))return null;
 const where=view.filterOperator==='none'?'':`\nWHERE ${quote(view.filterField)} ${predicates[view.filterOperator]}`;
 return `-- ILLUSTRATIVE ONLY — NO SQL EXECUTION\n-- NOT a real database VIEW\nSELECT ${view.fields.map(quote).join(', ')}\nFROM ${quote(table.name)}${where};`;
}
/** For copy/export: deliberately contains no credentials, row data or SQL text. */
export function safeDetailDescriptor(view:DetailView,source:DataSource|undefined){
 const preview=buildDetailPreview(view,source);
 return preview?{...preview,sourceName:source!.name,description:view.description,owner:view.owner,generatedBy:'BAYAN FRONTEND — FICTIONAL METADATA ONLY'}:null;
}
