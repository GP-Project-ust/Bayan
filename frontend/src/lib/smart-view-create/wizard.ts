/**
 * BAYAN — Screen 26: creating illustrative Smart View DRAFTS only.
 * No actual SQL, credentials, personal records, network/database access or publication.
 * Source schemas are training fixtures declared in Screen 24.
 */
import {DEMO_SOURCES, normalizeArabic, type DataSource, type SourceClass} from '../data-sources/sources';
import {getSourceSchema, type FieldMeta, type TableMeta} from '../data-sources/details';
import {DEMO_VIEWS, type SmartView} from '../smart-views/views';

export const DRAFT_STORAGE_KEY='bayan.demo.smartviews.drafts.v1';
export const MAX_DRAFTS=12;
export const WIZARD_STEPS=['التعريف والمصدر','الجداول والحقول','التصفية والتصنيف','المعاينة','الحفظ'] as const;
export type WizardStep=1|2|3|4|5;
export type LocalSmartView=SmartView & {tableName:string;filterField:string;filterOperator:FilterOperator;filterValue:FilterSample};
export type DraftClassification=Exclude<SourceClass,'blocked'>;
export type FilterOperator='none'|'eq'|'ne'|'not_null';
export type FilterSample='active'|'approved'|'2026';
export type SmartViewForm={name:string;description:string;sourceId:string;tableName:string;fields:string[];classification:DraftClassification;audience:'مدير المؤسسة'|'الإدارة المصرح لها'|'موظفو المؤسسة';scope:string;filterField:string;filterOperator:FilterOperator;filterValue:FilterSample;acknowledged:boolean};
export const DEFAULT_FORM:SmartViewForm={name:'',description:'',sourceId:'',tableName:'',fields:[],classification:'restricted',audience:'الإدارة المصرح لها',scope:'مؤشرات مجمعة تدريبية',filterField:'',filterOperator:'none',filterValue:'active',acknowledged:false};
export const AUDIENCES:SmartViewForm['audience'][]=['مدير المؤسسة','الإدارة المصرح لها','موظفو المؤسسة'];
export const SCOPES=['مؤشرات مجمعة تدريبية','فهرس وصفي تدريبي','إحصاءات دون بيانات أفراد'] as const;
export const FILTER_SAMPLES:FilterSample[]=['active','approved','2026'];
const level:Record<DraftClassification,number>={public:0,masked:1,restricted:2};
export const classes:DraftClassification[]=['public','masked','restricted'];
const safeIdentifier=(id:string)=>/^[a-z][a-z0-9_]{0,59}$/.test(id);

/** Only static demonstrative schemas are eligible; new local sources have no verified schema. */
export function eligibleSources(all:ReadonlyArray<DataSource>=DEMO_SOURCES):DataSource[]{
 return all.filter(s=>s.id.startsWith('SRC-')&&!s.id.startsWith('SRC-DEMO-')&&s.classification!=='blocked'&&s.status!=='disabled'&&getSourceSchema(s).tables.some(t=>safeFields(t).length>0));
}
/** Sensitive 'restricted' or 'blocked' columns never enter new draft selection. */
export function safeFields(table:TableMeta):FieldMeta[]{
 return table.fields.filter(f=>(f.classification==='public'||f.classification==='masked')&&safeIdentifier(f.name));
}
export function availableTables(source:DataSource|undefined):TableMeta[]{
 if(!source||!eligibleSources([source]).length)return [];
 return getSourceSchema(source).tables.filter(t=>safeIdentifier(t.name)&&safeFields(t).length>0);
}
export function getRequiredClass(source:DataSource,fields:ReadonlyArray<FieldMeta>):DraftClassification{
 if(source.classification==='blocked')throw new Error('مصدر محظور');
 const min=fields.reduce((maximum,field)=>Math.max(maximum,field.classification==='blocked'?level.restricted:level[field.classification as DraftClassification]),level[source.classification]);
 return classes.find(c=>level[c]===min)||'restricted';
}
export function clampClassification(requested:DraftClassification,min:DraftClassification):DraftClassification{
 return level[requested]<level[min]?min:requested;
}
export function findContext(form:SmartViewForm,sources:ReadonlyArray<DataSource>=DEMO_SOURCES){
 const source=eligibleSources(sources).find(s=>s.id===form.sourceId);
 const table=availableTables(source).find(t=>t.name===form.tableName);
 const available=table?safeFields(table):[];
 const picked=available.filter(f=>form.fields.includes(f.name));
 return {source,table,available,picked};
}
export type Validation={valid:boolean;errors:Record<string,string>};
export function validateWizardStep(step:WizardStep,form:SmartViewForm,sources:ReadonlyArray<DataSource>=DEMO_SOURCES,existing:ReadonlyArray<SmartView>=DEMO_VIEWS):Validation{
 const errors:Record<string,string>={};
 const {source,table,available,picked}=findContext(form,sources);
 if(step===1){
  const title=form.name.trim();
  if(title.length<5||title.length>70||/[<>\\{}]/.test(title))errors.name='اسم العرض يجب أن يتكون من 5 إلى 70 حرفًا دون رموز برمجية.';
  if(existing.some(v=>normalizeArabic(v.name)===normalizeArabic(title)))errors.name='اسم العرض موجود مسبقًا في قائمة المعاينة.';
  if(form.description.trim().length<12||form.description.trim().length>220)errors.description='أدخل وصفًا توضيحيًا من 12 إلى 220 حرفًا.';
  if(!source)errors.sourceId='اختر مصدرًا تدريبيًا غير محظور وله بنية توضيحية.';
 }
 if(step===2){
  if(!source||!table)errors.tableName='اختر جدولًا توضيحيًا من المصدر المحدد.';
  if(form.fields.length===0||form.fields.length>8||new Set(form.fields).size!==form.fields.length||picked.length!==form.fields.length)errors.fields='اختر من حقل واحد إلى 8 حقول مصرح بها دون تكرار.';
 }
 if(step===3){
  if(!source||!table||!picked.length)errors.fields='أكمل المصدر والحقول قبل التصنيف.';
  else if(level[form.classification]<level[getRequiredClass(source,picked)])errors.classification='لا يمكن خفض التصنيف دون مستوى المصدر والحقول.';
  if(!AUDIENCES.includes(form.audience))errors.audience='اختر جمهورًا من القائمة المتاحة.';
  if(!SCOPES.some(s=>s===form.scope))errors.scope='اختر نطاقًا توضيحيًا من القائمة.';
  if(!['none','eq','ne','not_null'].includes(form.filterOperator))errors.filterOperator='اختر عامل تصفية معروفًا.';
  if(form.filterOperator!=='none'){
   if(!picked.some(f=>f.name===form.filterField))errors.filterField='حقل التصفية يجب أن يكون ضمن الحقول المختارة.';
   if(form.filterOperator!=='not_null'&&!FILTER_SAMPLES.includes(form.filterValue))errors.filterValue='اختر قيمة اختبار رمزية من القائمة فقط.';
  }
 }
 if(step===4){
  if(!form.acknowledged)errors.acknowledged='يجب تأكيد أن التعريف مسودة توضيحية دون نشر أو تنفيذ.';
 }
 if(step===5){
  for(const number of [1,2,3,4] as WizardStep[]){Object.assign(errors,validateWizardStep(number,form,sources,existing).errors);}
 }
 return {valid:Object.keys(errors).length===0,errors};
}
export function validateAll(form:SmartViewForm,sources:ReadonlyArray<DataSource>=DEMO_SOURCES,existing:ReadonlyArray<SmartView>=DEMO_VIEWS):Validation{
 return validateWizardStep(5,form,sources,existing);
}
/** Display-only contract. Deliberately no SQL text or untrusted literal values. */
export function buildDraftDescriptor(form:SmartViewForm){
 const context=findContext(form);
 if(!context.source||!context.table||!validateAll(form).valid)throw new Error('تعريف العرض غير صالح للمعاينة.');
 return {illustrative:true,publishable:false,status:'draft',sourceId:context.source.id,table:context.table.name,
  selectedFields:[...form.fields],minimumClassification:getRequiredClass(context.source,context.picked),classification:form.classification,
  audience:form.audience,scope:form.scope,
  filter:form.filterOperator==='none'?null:{field:form.filterField,operator:form.filterOperator,value:'parameter-only'},
  security:'No execution; server must apply RBAC, tenant isolation and masking.'};
}
export function illustrativeSql(form:SmartViewForm):string|null{
 const {source,table,picked}=findContext(form);
 if(!source||!table||!picked.length||!(['postgres','mysql'] as string[]).includes(source.type))return null;
 if(!form.fields.every(name=>picked.some(f=>f.name===name)))return null;
 const quote=(name:string)=>`"${name}"`;
 const predicate=form.filterOperator==='none'?'':`\nWHERE ${quote(form.filterField)} ${form.filterOperator==='not_null'?'IS NOT NULL':form.filterOperator==='ne'?'<> :filter_value':'= :filter_value'}`;
 return `-- تصور غير قابل للتنفيذ / NO QUERY EXECUTION\nSELECT ${form.fields.map(quote).join(', ')}\nFROM ${quote(table.name)}${predicate};`;
}
export function makeLocalDraft(form:SmartViewForm,id:string,sources:ReadonlyArray<DataSource>=DEMO_SOURCES,existing:ReadonlyArray<SmartView>=DEMO_VIEWS):LocalSmartView{
 if(!/^SV-DRAFT-[a-z0-9]{8}$/.test(id))throw new Error('معرّف المسودة غير صالح');
 if(!validateAll(form,sources,existing).valid)throw new Error('لا يمكن حفظ تعريف غير صالح');
 const {source}=findContext(form,sources);
 if(!source)throw new Error('مصدر غير متاح');
 return {id,name:form.name.trim(),description:form.description.trim(),sourceId:source.id,classification:form.classification,
  status:'draft',kind:'proposal',fields:[...form.fields],scope:form.scope,audience:form.audience,
  lastUpdated:new Date().toISOString().slice(0,10),owner:source.owner,tableName:form.tableName,filterField:form.filterField,filterOperator:form.filterOperator,filterValue:form.filterValue};
}
/** Only allowlisted source IDs, fixed schema fields, safe names, and all-draft status may persist. */
export function restoreLocalDrafts(raw:unknown,sources:ReadonlyArray<DataSource>=DEMO_SOURCES):LocalSmartView[]{
 if(!Array.isArray(raw))return [];
 const clean:LocalSmartView[]=[];
 for(const item of raw.slice(0,MAX_DRAFTS)){
  if(!item||typeof item!=='object'||Array.isArray(item))continue;
  const row=item as Partial<LocalSmartView>;
  if(typeof row.id!=='string'||!/^SV-DRAFT-[a-z0-9]{8}$/.test(row.id)||clean.some(v=>v.id===row.id))continue;
  if(typeof row.name!=='string'||row.name.trim().length<5||row.name.length>70||/[<>\\{}]/.test(row.name))continue;
  if(typeof row.description!=='string'||row.description.length<12||row.description.length>220)continue;
  if(typeof row.sourceId!=='string')continue;
  const source=eligibleSources(sources).find(s=>s.id===row.sourceId);if(!source)continue;
  if(!Array.isArray(row.fields)||!row.fields.length||row.fields.length>8||!row.fields.every(x=>typeof x==='string')||new Set(row.fields).size!==row.fields.length)continue;
  const available=availableTables(source);
  const table=available.find(t=>t.name===row.tableName&&row.fields!.every(x=>safeFields(t).some(f=>f.name===x)));
  if(!table)continue;
  if(row.classification!=='public'&&row.classification!=='masked'&&row.classification!=='restricted')continue;
  const selected=safeFields(table).filter(f=>row.fields!.includes(f.name));
  if(level[row.classification]<level[getRequiredClass(source,selected)])continue;
  if(row.status!=='draft'||row.kind!=='proposal'||!AUDIENCES.includes(row.audience as SmartViewForm['audience']))continue;
  if(!['none','eq','ne','not_null'].includes(row.filterOperator||''))continue;
  if(!FILTER_SAMPLES.includes(row.filterValue as FilterSample))continue;
  if(row.filterOperator!=='none'&&!row.fields.some(f=>f===row.filterField))continue;
  if(row.filterOperator==='none'&&row.filterField!=='')continue;
  if(!SCOPES.some(s=>s===row.scope)||typeof row.owner!=='string'||row.owner!==source.owner)continue;
  if(typeof row.lastUpdated!=='string'||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(row.lastUpdated))continue;
  if([...DEMO_VIEWS,...clean].some(v=>normalizeArabic(v.name)===normalizeArabic(row.name!)))continue;
  clean.push({id:row.id,name:row.name.trim(),description:row.description.trim(),sourceId:source.id,
   classification:row.classification,status:'draft',kind:'proposal',fields:[...row.fields],scope:row.scope!,audience:row.audience!,lastUpdated:row.lastUpdated,owner:source.owner,tableName:table.name,filterField:row.filterField||'',filterOperator:row.filterOperator as FilterOperator,filterValue:row.filterValue as FilterSample});
 }
 return clean;
}
export function addLocalDraft(current:ReadonlyArray<LocalSmartView>,newItem:LocalSmartView):LocalSmartView[]{
 if(current.length>=MAX_DRAFTS)throw new Error('تم بلوغ الحد الأقصى للمسودات المحلية.');
 if(current.some(x=>x.id===newItem.id||normalizeArabic(x.name)===normalizeArabic(newItem.name)))throw new Error('المعرف أو الاسم مستخدم في مسودة أخرى.');
 return [...current,newItem];
}
