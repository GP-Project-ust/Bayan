/** Bayan Screen 14 — report-builder form contract and fictional presets.
 * The browser preview never sends requests or creates a backend report.
 */
import type {ReportKind} from "./reports";

export type SourceId="students"|"registrations"|"performance"|"attendance"|"policies";
export type MetricId="students_total"|"students_by_college"|"registrations_total"|"registrations_by_month"|"performance_average"|"performance_by_department"|"attendance_rate"|"absence_total"|"policies_total"|"policies_by_category";
export type GroupId="none"|"college"|"department"|"month";
export type VisibilityId="personal"|"department";
export type ReportStep=1|2|3|4;
export type BuilderForm={
 title:string; objective:string;kind:ReportKind;visibility:VisibilityId;
 sourceIds:SourceId[];metricIds:MetricId[];
 startDate:string;endDate:string;groupBy:GroupId;includeSources:boolean;includeHighlights:boolean;
};
export type ValidationErrors=Partial<Record<"title"|"objective"|"sourceIds"|"metricIds"|"startDate"|"endDate",string>>;
export const sourceCatalog:readonly {id:SourceId;name:string;description:string;classification:"داخلي"|"مقيّد";scope:string}[]=[
 {id:"students",name:"بيانات الطلاب",description:"أعداد الطلاب وتوزيعهم بين الكليات",classification:"داخلي",scope:"عرض ذكي تدريبي"},
 {id:"registrations",name:"سجلات التسجيل",description:"ملخصات التسجيل ومراحله الزمنية",classification:"داخلي",scope:"عرض ذكي تدريبي"},
 {id:"performance",name:"الأداء الأكاديمي",description:"متوسطات الأداء حسب الأقسام",classification:"مقيّد",scope:"عرض ذكي تدريبي"},
 {id:"attendance",name:"الحضور والغياب",description:"اتجاهات الحضور والغياب التجريبية",classification:"مقيّد",scope:"عرض ذكي تدريبي"},
 {id:"policies",name:"المستندات التنظيمية",description:"ملخص أعداد وتصنيفات اللوائح",classification:"داخلي",scope:"فهرس مستندات تجريبي"},
];
export const metricCatalog:readonly {id:MetricId;sourceId:SourceId;label:string;description:string;unit:string}[]=[
 {id:"students_total",sourceId:"students",label:"إجمالي الطلاب",description:"عدد الطلاب في الفترة",unit:"طالب"},
 {id:"students_by_college",sourceId:"students",label:"الطلاب حسب الكلية",description:"مقارنة تجريبية بين الكليات",unit:"طالب"},
 {id:"registrations_total",sourceId:"registrations",label:"إجمالي التسجيلات",description:"عدد سجلات التسجيل",unit:"تسجيل"},
 {id:"registrations_by_month",sourceId:"registrations",label:"التسجيل حسب الشهر",description:"توزيع التسجيل شهريًا",unit:"تسجيل"},
 {id:"performance_average",sourceId:"performance",label:"متوسط الأداء",description:"متوسط تقديري للأداء الأكاديمي",unit:"%"},
 {id:"performance_by_department",sourceId:"performance",label:"الأداء حسب القسم",description:"مقارنة الأداء بين الأقسام",unit:"%"},
 {id:"attendance_rate",sourceId:"attendance",label:"نسبة الحضور",description:"متوسط الحضور",unit:"%"},
 {id:"absence_total",sourceId:"attendance",label:"إجمالي الغياب",description:"مجموع الغياب",unit:"حالة"},
 {id:"policies_total",sourceId:"policies",label:"عدد المستندات",description:"عدد المستندات التنظيمية",unit:"مستند"},
 {id:"policies_by_category",sourceId:"policies",label:"المستندات حسب التصنيف",description:"توزيع المستندات بحسب النوع",unit:"مستند"},
];
export const groupLabels:Record<GroupId,string>={none:"بدون تجميع",college:"حسب الكلية",department:"حسب القسم",month:"حسب الشهر"};
export const visibilityLabels:Record<VisibilityId,string>={personal:"خاص بي",department:"ضمن القسم — عند السماح لاحقًا"};
export const steps=[{number:1 as const,title:"بيانات التقرير",subtitle:"العنوان والهدف والنوع"},{number:2 as const,title:"المصادر والمؤشرات",subtitle:"حدد ما تريد تحليله"},{number:3 as const,title:"الفترة والعرض",subtitle:"نطاق التقرير وخياراته"},{number:4 as const,title:"مراجعة وإنشاء",subtitle:"راجع الإعدادات قبل التأكيد"}];
export const emptyBuilderForm:BuilderForm={title:"",objective:"",kind:"academic",visibility:"personal",sourceIds:[],metricIds:[],startDate:"2026-09-01",endDate:"2026-11-07",groupBy:"college",includeSources:true,includeHighlights:true};
export const sampleTemplate:BuilderForm={title:"توزيع الطلاب حسب الكليات — تقرير تجريبي",objective:"إعداد نموذج تدريبي لعرض توزيع الطلاب بين الكليات خلال الفصل الحالي، مع إجمالي الطلاب ومؤشر المقارنة.",kind:"academic",visibility:"personal",sourceIds:["students"],metricIds:["students_total","students_by_college"],startDate:"2026-09-01",endDate:"2026-11-07",groupBy:"college",includeSources:true,includeHighlights:true};
export const reportKinds:readonly {id:ReportKind;label:string;hint:string}[]=[
 {id:"academic",label:"أكاديمي",hint:"الطلاب والتسجيل والأداء"},
 {id:"operational",label:"تشغيلي",hint:"المهام والحضور والعمليات"},
 {id:"analytical",label:"تحليلي",hint:"المقارنات واكتشاف الاتجاهات"},
 {id:"regulatory",label:"تنظيمي",hint:"اللوائح والمستندات"},
];
const idSet=<T extends string>(values:readonly T[],allowed:readonly T[])=>values.filter((id,i)=>allowed.includes(id)&&values.indexOf(id)===i);
export function sanitizeBuilderForm(value:BuilderForm):BuilderForm{
 const sources=idSet(value.sourceIds,sourceCatalog.map(x=>x.id));
 const metrics=idSet(value.metricIds,metricCatalog.filter(x=>sources.includes(x.sourceId)).map(x=>x.id));
 return {...value,sourceIds:sources,metricIds:metrics};
}
export function selectSource(form:BuilderForm,id:SourceId):BuilderForm{
 const sourceIds=form.sourceIds.includes(id)?form.sourceIds.filter(x=>x!==id):[...form.sourceIds,id];
 return sanitizeBuilderForm({...form,sourceIds});
}
export function selectMetric(form:BuilderForm,id:MetricId):BuilderForm{
 if(!metricCatalog.some(x=>x.id===id&&form.sourceIds.includes(x.sourceId)))return form;
 return {...form,metricIds:form.metricIds.includes(id)?form.metricIds.filter(x=>x!==id):[...form.metricIds,id]};
}
function validDate(text:string):boolean{
 if(!/^\d{4}-\d{2}-\d{2}$/.test(text))return false;
 const date=new Date(`${text}T00:00:00Z`);
 return !Number.isNaN(date.getTime())&&date.toISOString().slice(0,10)===text;
}
export function validateStep(form:BuilderForm,step:ReportStep):ValidationErrors{
 const errors:ValidationErrors={};
 if(step===1){
  if(form.title.trim().length<8||form.title.trim().length>100)errors.title="أدخل عنوانًا بين 8 و100 حرف.";
  if(form.objective.trim().length<20||form.objective.trim().length>500)errors.objective="اكتب هدف التقرير بين 20 و500 حرف.";
 }
 if(step===2){
  if(form.sourceIds.length<1)errors.sourceIds="اختر مصدر بيانات واحدًا على الأقل.";
  if(form.metricIds.length<1||form.metricIds.length>6||form.metricIds.some(id=>!metricCatalog.some(x=>x.id===id&&form.sourceIds.includes(x.sourceId))))errors.metricIds="اختر من 1 إلى 6 مؤشرات تتبع المصادر المختارة.";
 }
 if(step===3){
  if(!validDate(form.startDate))errors.startDate="أدخل تاريخ بداية صحيحًا.";
  if(!validDate(form.endDate))errors.endDate="أدخل تاريخ نهاية صحيحًا.";
  if(!errors.startDate&&!errors.endDate&&form.endDate<form.startDate)errors.endDate="يجب أن يكون تاريخ النهاية بعد تاريخ البداية أو مساويًا له.";
  if(!errors.startDate&&!errors.endDate){const days=(Date.parse(form.endDate)-Date.parse(form.startDate))/86400000;if(days>1095)errors.endDate="يجب ألا يتجاوز النطاق الزمني 3 سنوات.";}
 }
 return errors;
}
export function validateBuilder(form:BuilderForm):ValidationErrors{return {...validateStep(form,1),...validateStep(form,2),...validateStep(form,3)};}
export function allowedMetrics(sourceIds:readonly SourceId[]){return metricCatalog.filter(m=>sourceIds.includes(m.sourceId));}
export function createDemoDraftJson(form:BuilderForm):string{
 if(Object.keys(validateBuilder(form)).length)throw new Error("أكمل جميع الحقول المطلوبة قبل تنزيل المسودة.");
 return JSON.stringify({kind:"bayan-report-builder-demo",version:1,notice:"تكوين تجريبي؛ لا يُنشئ تقريرًا رسميًا ولا يستخدم قاعدة بيانات.",configuration:sanitizeBuilderForm(form)},null,2);
}
