/**
 * BAYAN — Screen 24. Documentation-only, fictional metadata fixtures.
 * Nothing here was discovered from PostgreSQL, Odoo, Qdrant or a network.
 */
import type {DataSource,SourceClass} from './sources';
import {DEMO_SOURCES,simulateConnectionCheck} from './sources';

export type FieldMeta={name:string;kind:string;classification:SourceClass;description:string};
export type TableMeta={name:string;label:string;fields:FieldMeta[];rowCountLabel:string};
export type SmartViewMeta={id:string;name:string;scope:string;state:'illustrative'|'planned';columns:string[]};
export type DemoSchema={tables:TableMeta[];smartViews:SmartViewMeta[];note:string};
export type ReviewReason='classification'|'schema'|'connection'|'smartviews';
export type LocalReview={sourceId:string;reason:ReviewReason;status:'pending';updatedAt:string};

export const SOURCE_REVIEW_STORAGE_KEY='bayan.demo.sources.reviews.v1';
export const REVIEW_REASONS:Record<ReviewReason,string>={
 classification:'مراجعة تصنيف الوصول',schema:'تدقيق أسماء الجداول والحقول',connection:'مراجعة جاهزية الاتصال',smartviews:'مراجعة العروض الذكية المرتبطة'
};
const field=(name:string,kind:string,classification:SourceClass,description:string):FieldMeta=>({name,kind,classification,description});
const table=(name:string,label:string,fields:FieldMeta[]):TableMeta=>({name,label,fields,rowCountLabel:'غير متاح — بنية تمثيلية'});
const schemas:Record<string,DemoSchema>={
 'SRC-001':{
  note:'أسماء الجداول والحقول أمثلة تعليمية مفترضة ولا تعبّر عن مخطط PostgreSQL فعلي.',
  tables:[
   table('students','بيانات الطلاب',[field('student_id','UUID','restricted','معرّف داخلي افتراضي'),field('college_id','UUID','restricted','ارتباط بالكلية'),field('enrollment_status','VARCHAR','masked','حالة التسجيل دون بيانات شخصية'),field('full_name','VARCHAR','blocked','حقل توضيحي غير متاح في المحاكاة')]),
   table('colleges','الكليات',[field('college_id','UUID','restricted','المعرّف'),field('college_name','VARCHAR','public','اسم الكلية')]),
   table('enrollments','القيد والتسجيل',[field('enrollment_id','UUID','restricted','معرّف القيد'),field('term','VARCHAR','public','الفصل الدراسي'),field('student_id','UUID','blocked','معرّف حساس محجوب')])
  ],
  smartViews:[{id:'SV-DEMO-01',name:'عرض إحصاء التسجيل',scope:'تجميع حسب الكلية دون معرّفات أفراد',state:'illustrative',columns:['college_name','registered_count']},{id:'SV-DEMO-02',name:'ملخص التوزيع الأكاديمي',scope:'مقاييس مجمعة للمدير',state:'planned',columns:['term','faculty','total']}]
 },
 'SRC-002':{
  note:'نموذج تخطيطي للتكامل مع Odoo Education، دون استكشاف حقول حقيقي.',
  tables:[table('student_services','خدمات الطلاب',[field('service_id','INTEGER','restricted','معرّف طلب'),field('service_type','VARCHAR','public','نوع الخدمة'),field('requester_id','INTEGER','blocked','بيانات شخصية محظورة للعرض')]),table('academic_requests','الطلبات الأكاديمية',[field('request_id','INTEGER','restricted','معرّف الطلب'),field('request_status','VARCHAR','masked','الحالة'),field('requested_at','DATE','public','تاريخ الطلب')])],
  smartViews:[{id:'SV-DEMO-03',name:'ملخص الطلبات',scope:'عدد الطلبات حسب الحالة فقط',state:'planned',columns:['request_status','count']}]
 },
 'SRC-003':{
  note:'مجموعات الملفات هنا أقسام تدريبية وليست جداول SQL حقيقية.',
  tables:[table('document_index','فهرس المستندات',[field('document_id','UUID','restricted','معرّف المستند'),field('title','TEXT','public','عنوان الدليل'),field('access_level','VARCHAR','restricted','مستوى الوصول'),field('page_count','INTEGER','public','عدد الصفحات')])],smartViews:[]
 },
 'SRC-004':{
  note:'أمثلة لمسميات البيانات فقط؛ لا يُعرض محتوى متعلق بالموظفين أو الرواتب.',
  tables:[table('departments','الأقسام',[field('department_id','INTEGER','restricted','معرّف القسم'),field('department_name','VARCHAR','public','اسم القسم')])],smartViews:[]
 },
 'SRC-005':{
  note:'واجهة API توضيحية؛ اسم المجموعة ليس مسار API حقيقيًا.',
  tables:[table('metric_catalog','فهرس المؤشرات',[field('metric_code','VARCHAR','public','رمز المؤشر'),field('period','VARCHAR','public','الفترة'),field('aggregate_value','DECIMAL','masked','قيمة مجمعة حسب ضوابط المؤسسة')])],smartViews:[{id:'SV-DEMO-04',name:'ملخص مؤشرات الإدارة',scope:'مؤشرات تجميعية',state:'planned',columns:['period','metric_code','aggregate_value']}]
 },
 'SRC-006':{
  note:'مخطط تدريبي للقبول دون أي سجلات أشخاص.',
  tables:[table('admission_summary','ملخص القبول',[field('year','INTEGER','public','السنة'),field('faculty_code','VARCHAR','public','رمز الكلية'),field('accepted_count','INTEGER','masked','عدد مقبولين مجمع')])],smartViews:[]
 },
 'SRC-008':{
  note:'تمثيل وصفي لمستودع أدلة، لا نتائج فهرسة فعلية.',
  tables:[table('service_guides','الأدلة الإرشادية',[field('guide_id','UUID','restricted','معرّف الوثيقة'),field('title','TEXT','public','العنوان'),field('version','VARCHAR','public','رقم النسخة')])],smartViews:[]
 }
};
export const EMPTY_DEMO_SCHEMA:DemoSchema={tables:[],smartViews:[],note:'لم تُقرأ بنية هذا المصدر من أي خادم. لا توجد جداول أو عروض ذكية مؤكدة.'};
export function normalizeSourceId(raw:string|null|undefined):string|null{
 if(raw==null||raw==='')return null;
 const id=raw.trim();return /^(?:SRC-\d{3}|SRC-DEMO-[0-9a-z-]{6,45})$/i.test(id)?id:null;
}
export function findDemoSource(items:ReadonlyArray<DataSource>,requestedId:string|null|undefined):DataSource|null{
 const id=normalizeSourceId(requestedId);if(!id)return null;return items.find(x=>x.id===id)||null;
}
export function getSourceSchema(source:DataSource):DemoSchema{
 if(source.classification==='blocked')return EMPTY_DEMO_SCHEMA;
 // User-created records have no verified schema and must not inherit a fixture.
 if(source.id.startsWith('SRC-DEMO-'))return EMPTY_DEMO_SCHEMA;
 return schemas[source.id]||EMPTY_DEMO_SCHEMA;
}
export function aggregateClassification(tables:ReadonlyArray<TableMeta>){
 const levels=['public','masked','restricted','blocked'] as const;
 return levels.map(level=>({level,count:tables.reduce((sum,t)=>sum+t.fields.filter(f=>f.classification===level).length,0)}));
}
export function sourceDetailSummary(source:DataSource){
 const sample=getSourceSchema(source);
 return {sampleTables:sample.tables.length,sampleFields:sample.tables.reduce((sum,t)=>sum+t.fields.length,0),sampleViews:sample.smartViews.length,probe:simulateConnectionCheck(source)};
}
export function restoreReviews(raw:unknown):Record<string,LocalReview>{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return {};
 const reviews:Record<string,LocalReview>={};
 for(const [id,value] of Object.entries(raw).slice(0,50)){
  if(!normalizeSourceId(id)||!value||typeof value!=='object'||Array.isArray(value))continue;
  const v=value as Partial<LocalReview>;
  if(v.sourceId!==id||v.status!=='pending'||!Object.hasOwn(REVIEW_REASONS,v.reason??''))continue;
  if(typeof v.updatedAt!=='string'||v.updatedAt.length>40||!/^\d{4}-\d{2}-\d{2}T/.test(v.updatedAt))continue;
  reviews[id]={sourceId:id,reason:v.reason as ReviewReason,status:'pending',updatedAt:v.updatedAt};
 }
 return reviews;
}
export function makeReview(source:DataSource,reason:ReviewReason,now:string):LocalReview{
 if(source.classification==='blocked')throw new Error('المصدر المحظور لا يقبل طلب مراجعة في المحاكاة.');
 if(!Object.hasOwn(REVIEW_REASONS,reason))throw new Error('سبب المراجعة غير معروف');
 if(!/^\d{4}-\d{2}-\d{2}T/.test(now)||now.length>40)throw new Error('تاريخ غير صالح');
 return {sourceId:source.id,reason,status:'pending',updatedAt:now};
}
export function sourceActivity(source:DataSource):Array<{title:string;detail:string;kind:'info'|'warning'}>{
 if(source.id.startsWith('SRC-DEMO-'))return [{title:'إنشاء سجل محلي',detail:'أُضيف هذا المصدر في المتصفح. لم يتم تسجيل حدث تدقيق على الخادم.',kind:'info'}];
 return [
 {title:'تجهيز بيانات وصفية',detail:'مثال للتصميم؛ لم يُسترجع أي مخطط قاعدة بيانات.',kind:'info'},
 {title:'مراجعة حالة اتصال نموذجية',detail:source.lastCheck+' — مؤشرات اصطناعية لا تمثل فحصًا فعليًا.',kind:source.status==='attention'?'warning':'info'}
 ];
}
export const sourceDetailsFixturesCount=DEMO_SOURCES.filter(s=>s.classification!=='blocked').length;
