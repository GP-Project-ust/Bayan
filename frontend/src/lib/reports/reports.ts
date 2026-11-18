/** Screen 13 — fictional reports for UI demonstration only. No backend, database, or metrics service. */
export type ReportKind="academic"|"operational"|"analytical"|"regulatory";
export type ReportStatus="ready"|"processing"|"failed"|"draft";
export type ReportSort="newest"|"oldest"|"title";
export type ReportKindFilter=ReportKind|"all";
export type ReportStatusFilter=ReportStatus|"all";
export type ReportMonthFilter="all"|"2026-11"|"2026-10"|"2026-09";
export type ReportFilters={query:string;kind:ReportKindFilter;status:ReportStatusFilter;month:ReportMonthFilter;sort:ReportSort};
export type ReportMetric={label:string;value:string;unit?:string};
export type ReportDataRow={label:string;value:number;unit:string};
export interface DemoReport {
  id:string;title:string;description:string;kind:ReportKind;status:ReportStatus;
  createdAt:string;owner:string;period:string;source:string;classification:"داخلي"|"مقيّد";
  metrics:ReportMetric[];rows:ReportDataRow[];note:string;
}
export const reportKindLabels:Record<ReportKind,string>={academic:"أكاديمي",operational:"تشغيلي",analytical:"تحليلي",regulatory:"تنظيمي"};
export const reportStatusLabels:Record<ReportStatus,string>={ready:"جاهز",processing:"قيد الإنشاء",failed:"تعذّر الإنشاء",draft:"مسودة"};
export const initialReportFilters:ReportFilters={query:"",kind:"all",status:"all",month:"all",sort:"newest"};
const samples:DemoReport[]=[
 {id:"rep-101",title:"توزيع الطلاب حسب الكليات — مثال تدريبي",description:"ملخص توضيحي لأعداد الطلاب وتوزيعهم بين الكليات.",kind:"academic",status:"ready",createdAt:"2026-11-06",owner:"إدارة القبول والتسجيل",period:"الفصل الأول 2026",source:"عرض الطلاب — مصدر تدريبي",classification:"داخلي",metrics:[{label:"إجمالي الطلاب",value:"6,320"},{label:"الكليات",value:"6"},{label:"متوسط الكلية",value:"1,053"}],rows:[{label:"الهندسة",value:1250,unit:"طالب"},{label:"الطب",value:1380,unit:"طالب"},{label:"التجارة",value:1100,unit:"طالب"},{label:"العلوم",value:890,unit:"طالب"},{label:"التربية",value:950,unit:"طالب"},{label:"الآداب",value:750,unit:"طالب"}],note:"الأرقام والجهات خيالية؛ لم يُنفّذ استعلام SQL حقيقي."},
 {id:"rep-102",title:"الأداء الأكاديمي للأقسام — مثال تدريبي",description:"مؤشرات توضيحية لمتوسط الأداء الأكاديمي بين الأقسام.",kind:"analytical",status:"ready",createdAt:"2026-11-05",owner:"مكتب التخطيط",period:"الفصل الأول 2026",source:"ملخص أداء الأقسام — مصدر تدريبي",classification:"مقيّد",metrics:[{label:"الأقسام",value:"4"},{label:"متوسط الأداء",value:"82%"}],rows:[{label:"تقنية المعلومات",value:89,unit:"%"},{label:"الإدارة",value:81,unit:"%"},{label:"الرياضيات",value:79,unit:"%"},{label:"اللغة العربية",value:79,unit:"%"}],note:"هذه النسب أمثلة لواجهة العرض، ولا تصف أي جهة حقيقية."},
 {id:"rep-103",title:"متابعة الغياب والحضور — مثال تدريبي",description:"تقرير تجريبي ما زال في مرحلة الإنشاء الافتراضية.",kind:"operational",status:"processing",createdAt:"2026-11-04",owner:"شؤون الطلاب",period:"نوفمبر 2026",source:"سجل الحضور — مصدر تدريبي",classification:"مقيّد",metrics:[],rows:[],note:"حالة الإنشاء توضيحية، ولا توجد عملية جارية على الخادم."},
 {id:"rep-104",title:"مراجعة الطلبات الإدارية — مثال تدريبي",description:"مقارنة بسيطة لعدد الطلبات المنجزة والمتأخرة.",kind:"operational",status:"ready",createdAt:"2026-11-03",owner:"الشؤون الإدارية",period:"أكتوبر 2026",source:"طلبات الخدمات — مصدر تدريبي",classification:"داخلي",metrics:[{label:"إجمالي الطلبات",value:"420"},{label:"المنجزة",value:"360"}],rows:[{label:"منجزة",value:360,unit:"طلب"},{label:"قيد المتابعة",value:42,unit:"طلب"},{label:"متأخرة",value:18,unit:"طلب"}],note:"القيم المستخدمة تدريبية فقط."},
 {id:"rep-105",title:"مؤشرات اللوائح والإجراءات — مثال تدريبي",description:"ملخص مبدئي لتصنيفات المستندات التنظيمية.",kind:"regulatory",status:"draft",createdAt:"2026-11-01",owner:"مكتب الجودة",period:"2026",source:"مكتبة اللوائح — مصدر تدريبي",classification:"داخلي",metrics:[],rows:[],note:"مسودة توضيحية لم يُنشأ لها تقرير نهائي."},
 {id:"rep-106",title:"تحليل حركة التسجيل — مثال تدريبي",description:"اتجاه افتراضي لطلبات التسجيل في ثلاث فترات.",kind:"analytical",status:"ready",createdAt:"2026-10-29",owner:"القبول والتسجيل",period:"2026",source:"سجلات التسجيل — مصدر تدريبي",classification:"داخلي",metrics:[{label:"المسجلون",value:"2,940"},{label:"الفترات",value:"3"}],rows:[{label:"أغسطس",value:780,unit:"طالب"},{label:"سبتمبر",value:1040,unit:"طالب"},{label:"أكتوبر",value:1120,unit:"طالب"}],note:"اتجاه مصطنع لأغراض التصميم."},
 {id:"rep-107",title:"الملخص الشهري للأقسام — مثال تدريبي",description:"ملخص خيالي للمهام المنجزة حسب القسم.",kind:"operational",status:"ready",createdAt:"2026-10-24",owner:"إدارة المتابعة",period:"أكتوبر 2026",source:"مهام الأقسام — مصدر تدريبي",classification:"داخلي",metrics:[{label:"الأقسام",value:"4"},{label:"المهام",value:"125"}],rows:[{label:"التسجيل",value:43,unit:"مهمة"},{label:"القبول",value:35,unit:"مهمة"},{label:"الأرشفة",value:27,unit:"مهمة"},{label:"الاستعلامات",value:20,unit:"مهمة"}],note:"النتائج أمثلة افتراضية فقط."},
 {id:"rep-108",title:"تحليل المتطلبات الأكاديمية — مثال تدريبي",description:"محاكاة لتقرير لم تكتمل معالجته.",kind:"academic",status:"failed",createdAt:"2026-10-18",owner:"وحدة الأنظمة",period:"2026",source:"عرض المقررات — مصدر تدريبي",classification:"مقيّد",metrics:[],rows:[],note:"رسالة الفشل المعروضة هي حالة تدريبية، ولا يوجد خطأ خادم فعلي."},
 {id:"rep-109",title:"الالتزام بالمواعيد — مثال تدريبي",description:"تحليل افتراضي لمواعيد تنفيذ الأنشطة.",kind:"analytical",status:"ready",createdAt:"2026-10-12",owner:"مكتب الجودة",period:"أكتوبر 2026",source:"سجل الأنشطة — مصدر تدريبي",classification:"داخلي",metrics:[{label:"الأنشطة",value:"90"}],rows:[{label:"في الموعد",value:71,unit:"نشاط"},{label:"بعد الموعد",value:19,unit:"نشاط"}],note:"لا يوجد اتصال بسجلات تدقيق فعلية."},
 {id:"rep-110",title:"مراجعة مصادر المعرفة — مثال تدريبي",description:"نموذج تقرير للتصنيفات وحالة مراجعة الوثائق.",kind:"regulatory",status:"draft",createdAt:"2026-09-30",owner:"إدارة المعرفة",period:"الربع الثالث 2026",source:"المستندات — مصدر تدريبي",classification:"داخلي",metrics:[],rows:[],note:"هذه مسودة لم تُنشأ فعليًا."},
 {id:"rep-111",title:"مقارنة التسجيل السنوية — مثال تدريبي",description:"مقارنة افتراضية بين عامين دراسيين.",kind:"academic",status:"ready",createdAt:"2026-09-22",owner:"التخطيط الأكاديمي",period:"2025-2026",source:"الطلاب — مصدر تدريبي",classification:"داخلي",metrics:[{label:"عام المقارنة",value:"2"}],rows:[{label:"2025",value:5400,unit:"طالب"},{label:"2026",value:6320,unit:"طالب"}],note:"أرقام مقارنة توضيحية، وليست تاريخًا فعليًا."},
 {id:"rep-112",title:"مراجعة طلبات التقارير — مثال تدريبي",description:"محاكاة لقائمة تقارير قيد التوليد.",kind:"operational",status:"processing",createdAt:"2026-09-18",owner:"مركز التقارير",period:"سبتمبر 2026",source:"سجل الطلبات — مصدر تدريبي",classification:"داخلي",metrics:[],rows:[],note:"حالة الانتظار تدريبية فقط."}
];
export function makeDemoReports():DemoReport[]{return samples.map(report=>({...report,metrics:report.metrics.map(m=>({...m})),rows:report.rows.map(r=>({...r}))}));}
export function normalizeReportSearch(text:string):string {return text.normalize("NFKD").replace(/[\u064B-\u065F\u0670]/g,"").replace(/[أإآ]/g,"ا").replace(/ة/g,"ه").replace(/ى/g,"ي").replace(/ـ/g,"").toLocaleLowerCase("ar").trim();}
export function filterReports(items:readonly DemoReport[],filters:ReportFilters):DemoReport[]{
 const search=normalizeReportSearch(filters.query);
 const out=items.filter(item=>(!search||normalizeReportSearch([item.title,item.description,item.owner,item.source,item.id].join(" ")).includes(search))
   &&(filters.kind==="all"||item.kind===filters.kind)&&(filters.status==="all"||item.status===filters.status)
   &&(filters.month==="all"||item.createdAt.startsWith(filters.month)));
 return [...out].sort((a,b)=>filters.sort==="title"?a.title.localeCompare(b.title,"ar"):filters.sort==="oldest"?a.createdAt.localeCompare(b.createdAt):b.createdAt.localeCompare(a.createdAt));
}
export function reportStats(items:readonly DemoReport[]){return {total:items.length,ready:items.filter(r=>r.status==="ready").length,processing:items.filter(r=>r.status==="processing").length,needsAttention:items.filter(r=>r.status==="failed"||r.status==="draft").length};}
export function canDownloadReport(report:DemoReport,exportAuthorized:boolean){return report.status==="ready"&&exportAuthorized&&report.rows.length>0;}
/** Escape CSV injection and quotes; values are fictional and safe for a local file only. */
export function csvCell(value:string|number){const raw=String(value);const safe=/^[\s\uFEFF]*[=+@\-\t\r]/.test(raw)?`'${raw}`:raw;return `"${safe.replaceAll('"','""')}"`;}
export function makeDemoReportCsv(report:DemoReport){
 if(report.status!=="ready"||!report.rows.length)throw new Error("التقرير غير جاهز للتصدير");
 const table=[["نظام بيان — بيانات تجريبية غير رسمية"],["عنوان التقرير",report.title],["الفترة",report.period],["المصدر",report.source],[],["المؤشر","القيمة","الوحدة"],...report.rows.map(r=>[r.label,String(r.value),r.unit])];
 return "\uFEFF"+table.map(row=>row.map(csvCell).join(",")).join("\r\n")+"\r\n";
}
