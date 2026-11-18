/**
 * Screen 23 — entirely local demo configuration.
 * Deliberately does not model, accept, store or transmit credentials.
 * Only .example.invalid example hosts can be used.
 */
import type {DataSource,SourceClass,SourceType} from './sources';
import {DEMO_SOURCES,normalizeArabic} from './sources';

export const CREATED_SOURCES_KEY='bayan.demo.sources.created.v1';
export const MAX_CREATED_SOURCES=15;
export const demoOwners=['إدارة تقنية المعلومات','شؤون الطلاب','القبول والتسجيل','إدارة الجودة','وحدة التخطيط','الموارد البشرية'] as const;
export const demoScopes=['النطاق الأكاديمي','شؤون الطلاب','الإدارة والموارد','المستندات واللوائح','مؤشرات المؤسسة'] as const;
export const demoPurposes=['الاستعلامات الأكاديمية','الفهرسة الدلالية','التقارير والتحليلات','المعلومات التشغيلية'] as const;
export const demoTypes:SourceType[]=['postgres','odoo','mysql','files','api'];
export const demoClasses:SourceClass[]=['public','masked','restricted','blocked'];
export type ConnectionWizard={name:string;type:SourceType;owner:string;scope:string;purpose:string;host:string;port:string;classification:SourceClass;acknowledged:boolean};
export const DEFAULT_WIZARD:ConnectionWizard={name:'',type:'postgres',owner:demoOwners[0],scope:demoScopes[0],purpose:demoPurposes[0],host:'db-training.example.invalid',port:'5432',classification:'restricted',acknowledged:false};
export const DEFAULT_PORT:Record<SourceType,string>={postgres:'5432',mysql:'3306',odoo:'443',api:'443',files:''};
export type WizardStep=1|2|3|4|5;
export type Validation={valid:boolean;errors:Record<string,string>};

export function validateDemoHost(host:string):boolean{
 const h=host.trim().toLowerCase();
 return h.length<=120&&/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*example\.invalid$/.test(h);
}
export function validateStep(step:WizardStep,form:ConnectionWizard,existing:ReadonlyArray<DataSource>=DEMO_SOURCES):Validation{
 const errors:Record<string,string>={};
 if(step===1){
  const name=form.name.trim();
  if(name.length<4||name.length>70||/[\n\r<>@\\/]|:\/\//.test(name))errors.name='اسم المصدر يجب أن يتراوح بين 4 و70 حرفًا، دون روابط أو بيانات اعتماد.';
  if(existing.some(item=>normalizeArabic(item.name)===normalizeArabic(name)))errors.name='اسم المصدر موجود مسبقًا في القائمة التجريبية.';
  if(!demoTypes.includes(form.type))errors.type='نوع مصدر غير مدعوم.';
  if(!demoOwners.includes(form.owner as typeof demoOwners[number]))errors.owner='اختر جهة من الجهات التجريبية.';
  if(!demoPurposes.includes(form.purpose as typeof demoPurposes[number]))errors.purpose='اختر غرضًا من القائمة.';
 }
 if(step===2){
  if(!validateDemoHost(form.host))errors.host='يُسمح فقط بنطاقات تدريبية منتهية بـ example.invalid. لا تدخل عنوان خادم حقيقي.';
  if(form.type!=='files'&&(!/^\d{1,5}$/.test(form.port.trim())||Number(form.port)<1||Number(form.port)>65535))errors.port='أدخل رقم منفذ صحيحًا بين 1 و65535.';
 }
 if(step===3){
  if(!demoScopes.includes(form.scope as typeof demoScopes[number]))errors.scope='اختر نطاقًا تجريبيًا معروفًا.';
  if(!demoClasses.includes(form.classification))errors.classification='التصنيف المحدد غير صالح.';
  if(!form.acknowledged)errors.acknowledged='يجب الإقرار بأن البيانات تجريبية وأنه لم يحدث أي اتصال فعلي.';
 }
 return {valid:Object.keys(errors).length===0,errors};
}
export function validateAll(form:ConnectionWizard,existing:ReadonlyArray<DataSource>=DEMO_SOURCES):Validation{
 return [1,2,3].reduce<Validation>((sum,s)=>{const item=validateStep(s as WizardStep,form,existing);return {valid:sum.valid&&item.valid,errors:{...sum.errors,...item.errors}};},{valid:true,errors:{}});
}
export function demonstrationProbe(form:ConnectionWizard){
 const check=validateAll(form);
 if(!check.valid)return {ok:false,title:'الإعداد غير مكتمل',detail:'أكمل البيانات المطلوبة قبل متابعة محاكاة التحقق.'};
 if(form.classification==='blocked')return {ok:true,title:'تم التحقق من قواعد الإدخال',detail:'المصدر محظور؛ سيُحفظ معطّلًا في القائمة التجريبية. لم يُجرَ أي اتصال.'};
 return {ok:true,title:'اكتملت محاكاة التحقق من الإعدادات',detail:'تم فحص صيغة الحقول محليًا فقط. لم يتصل المتصفح بخادم أو قاعدة بيانات.'};
}
export function createDemoSource(form:ConnectionWizard,id:string):DataSource{
 const checked=validateAll(form);
 if(!checked.valid)throw new Error('إعدادات المصدر غير صالحة');
 if(!/^SRC-DEMO-[0-9a-z-]{6,45}$/i.test(id))throw new Error('معرّف غير صالح');
 return {id,name:form.name.trim(),type:form.type,owner:form.owner,scope:form.scope,status:form.classification==='blocked'?'disabled':'pending',classification:form.classification,endpoint:form.host.trim().toLowerCase()+(form.type==='files'?'':`:${Number(form.port)}`),lastCheck:'مراجعة نموذجية فقط — لا اتصال',collections:0,description:`مصدر تجريبي لغرض ${form.purpose}. لا يحتوي على بيانات اعتماد ولا اتصال فعلي.`,isDemo:true};
}
/** Restore only allowlisted, valid fields — no secrets, URLs or arbitrary properties. */
export function restoreCreatedSources(input:unknown):DataSource[]{
 if(!Array.isArray(input))return [];
 const out:DataSource[]=[];
 for(const raw of input.slice(0,MAX_CREATED_SOURCES)){
  if(!raw||typeof raw!=='object')continue;
  const x=raw as Record<string,unknown>;
  if(typeof x.id!=='string'||!/^SRC-DEMO-[0-9a-z-]{6,45}$/i.test(x.id)||out.some(item=>item.id===x.id))continue;
  if(typeof x.name!=='string'||x.name.length<4||x.name.length>70||/[\n\r<>@\\/]/.test(x.name))continue;
  if(!demoTypes.includes(x.type as SourceType)||!demoClasses.includes(x.classification as SourceClass))continue;
  if(!demoOwners.includes(x.owner as typeof demoOwners[number])||!demoScopes.includes(x.scope as typeof demoScopes[number]))continue;
  if(typeof x.endpoint!=='string'||x.endpoint.length>128)continue;
  const ep=x.endpoint;const parts=ep.split(':');const host=parts[0];
  const isFiles=x.type==='files';
  if(!validateDemoHost(host)||parts.length!==(isFiles?1:2))continue;
  if(!isFiles&&(!/^\d{1,5}$/.test(parts[1])||Number(parts[1])<1||Number(parts[1])>65535))continue;
  const classification=x.classification as SourceClass;
  out.push({id:x.id,name:x.name.trim(),type:x.type as SourceType,owner:x.owner as string,scope:x.scope as string,status:classification==='blocked'?'disabled':'pending',classification,endpoint:ep,lastCheck:'مراجعة نموذجية فقط — لا اتصال',collections:0,description:'مصدر مضاف محليًا للتجربة فقط. لا توجد بيانات اعتماد أو اتصالات حقيقية.',isDemo:true});
 }
 return out;
}
export function saveCreatedSource(current:ReadonlyArray<DataSource>,entry:DataSource):DataSource[]{
 if(current.length>=MAX_CREATED_SOURCES)throw new Error(`الحد الأقصى ${MAX_CREATED_SOURCES} مصادر تجريبية إضافية.`);
 if(current.some(s=>s.id===entry.id||normalizeArabic(s.name)===normalizeArabic(entry.name)))throw new Error('المصدر مسجل مسبقًا.');
 return [...current,entry];
}
