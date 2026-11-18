/**
 * Screen 16 — deterministic academic snapshots for a visual prototype ONLY.
 * Values are fictitious. Do not attribute them to a real institution.
 * Each month is a separate snapshot; never add student counts across months.
 */
export const periodOptions = [
  {id:'2026-08',label:'أغسطس 2026'},
  {id:'2026-09',label:'سبتمبر 2026'},
  {id:'2026-10',label:'أكتوبر 2026'},
] as const;
export type Period = typeof periodOptions[number]['id'];
export type FacultyId = 'engineering'|'medicine'|'commerce'|'science'|'education'|'arts';
export type TrendMetric = 'registered'|'success'|'attendance'|'risk';
export type AnalyticsFilters = {period:Period;faculty:FacultyId|'all';department:string|'all';metric:TrendMetric};
export const initialAnalyticsFilters:AnalyticsFilters = {period:'2026-10',faculty:'all',department:'all',metric:'registered'};
export const faculties = [
 {id:'engineering',label:'الهندسة',departments:[{id:'software',label:'هندسة البرمجيات'},{id:'civil',label:'الهندسة المدنية'}],monthly:[1160,1210,1250],share:0.57},
 {id:'medicine',label:'الطب',departments:[{id:'general-medicine',label:'الطب البشري'},{id:'labs',label:'المختبرات الطبية'}],monthly:[1290,1335,1380],share:0.72},
 {id:'commerce',label:'التجارة',departments:[{id:'accounting',label:'المحاسبة'},{id:'business',label:'إدارة الأعمال'}],monthly:[1015,1065,1100],share:0.52},
 {id:'science',label:'العلوم',departments:[{id:'mathematics',label:'الرياضيات'},{id:'physics',label:'الفيزياء'}],monthly:[820,865,890],share:0.54},
 {id:'education',label:'التربية',departments:[{id:'curriculum',label:'المناهج والتدريس'},{id:'edtech',label:'تقنيات التعليم'}],monthly:[870,925,950],share:0.62},
 {id:'arts',label:'الآداب',departments:[{id:'arabic',label:'اللغة العربية'},{id:'history',label:'التاريخ'}],monthly:[695,725,750],share:0.60},
] as const;
export type AnalyticsRow = {period:Period;faculty:FacultyId;facultyLabel:string;department:string;departmentLabel:string;registered:number;evaluated:number;passed:number;attendance:number;risk:number};
export type AnalyticsSummary = {registered:number;evaluated:number;passed:number;success:number;attendance:number;risk:number;faculties:number;departments:number};
export const metricLabels:Record<TrendMetric,string>={registered:'الطلاب المسجلون',success:'نسبة النجاح',attendance:'معدل الحضور',risk:'طلاب بحاجة إلى متابعة'};
export const metricUnits:Record<TrendMetric,string>={registered:'طالب',success:'%',attendance:'%',risk:'طالب'};
export const ANALYTICS_DISCLAIMER = 'جميع الأرقام والمحاور والملاحظات تدريبية افتراضية، وليست مستخرجة من بيانات الجامعة أو أي نظام فعلي.';

const demoRows:AnalyticsRow[]=[];
for(const [monthIndex,month] of periodOptions.entries()) {
  faculties.forEach((faculty,facultyIndex)=> {
    const total=faculty.monthly[monthIndex];
    const first=Math.round(total*faculty.share);
    faculty.departments.forEach((dept,deptIndex)=>{
      const registered=deptIndex===0?first:total-first;
      const evaluated=Math.round(registered*(0.80+((facultyIndex+monthIndex+deptIndex)%4)*0.035));
      const passed=Math.min(evaluated,Math.round(evaluated*(0.75+facultyIndex*0.014+deptIndex*0.025+monthIndex*0.011)));
      const attendance=74+facultyIndex*1.7+monthIndex*2.2+deptIndex*1.9;
      const risk=Math.round(registered*(0.07+((facultyIndex+deptIndex+monthIndex)%3)*0.009));
      demoRows.push({period:month.id,faculty:faculty.id,facultyLabel:faculty.label,department:dept.id,departmentLabel:dept.label,registered,evaluated,passed,attendance,risk});
    });
  });
}
export function makeDemoAnalyticsRows():AnalyticsRow[]{return demoRows.map(row=>({...row}));}
export function availableDepartments(faculty:AnalyticsFilters['faculty']){
  return faculties.filter(f=>faculty==='all'||f.id===faculty).flatMap(f=>f.departments.map(d=>({id:d.id,label:d.label,faculty:f.label})));
}
export function filterSnapshot(rows:readonly AnalyticsRow[],period:Period,faculty:AnalyticsFilters['faculty']='all',department='all'){
 return rows.filter(row=>row.period===period&&(faculty==='all'||row.faculty===faculty)&&(department==='all'||row.department===department));
}
export function summarizeRows(rows:readonly AnalyticsRow[]):AnalyticsSummary{
 const registered=rows.reduce((a,r)=>a+r.registered,0);
 const evaluated=rows.reduce((a,r)=>a+r.evaluated,0);
 const passed=rows.reduce((a,r)=>a+r.passed,0);
 const risk=rows.reduce((a,r)=>a+r.risk,0);
 return {registered,evaluated,passed,risk,
   success:evaluated?Math.round(passed/evaluated*1000)/10:0,
   attendance:registered?Math.round(rows.reduce((a,r)=>a+r.attendance*r.registered,0)/registered*10)/10:0,
   faculties:new Set(rows.map(r=>r.faculty)).size,departments:new Set(rows.map(r=>r.department)).size};
}
export function previousPeriod(period:Period):Period|null{
 const index=periodOptions.findIndex(p=>p.id===period);return index>0?periodOptions[index-1].id:null;
}
export function comparison(current:number,previous:number|null){
 if(previous===null||previous===0)return null;
 return Math.round((current-previous)/previous*1000)/10;
}
export function trendFor(rows:readonly AnalyticsRow[],filters:AnalyticsFilters){
 return periodOptions.filter(p=>p.id<=filters.period).map(period=>{
  const snapshot=summarizeRows(filterSnapshot(rows,period.id,filters.faculty,filters.department));
  return {period:period.id,label:period.label,registered:snapshot.registered,success:snapshot.success,attendance:snapshot.attendance,risk:snapshot.risk};
 });
}
export function facultyBreakdown(rows:readonly AnalyticsRow[]){
 return faculties.map(f=>({id:f.id,label:f.label,registered:rows.filter(r=>r.faculty===f.id).reduce((acc,r)=>acc+r.registered,0)})).filter(f=>f.registered>0);
}
export function departmentBreakdown(rows:readonly AnalyticsRow[]){
 return rows.map(row=>({id:row.department,label:row.departmentLabel,faculty:row.facultyLabel,registered:row.registered,success:row.evaluated?Math.round(row.passed/row.evaluated*1000)/10:0,attendance:Math.round(row.attendance*10)/10,risk:row.risk})).sort((a,b)=>b.registered-a.registered);
}
/** CSV guarded against spreadsheet formula injection. Counts are a SINGLE snapshot. */
export function safeCsvCell(value:string|number){
 const raw=String(value);const safe=/^[\s\uFEFF]*[=+@\-\t\r]/.test(raw)?`'${raw}`:raw;
 return `"${safe.replaceAll('"','""')}"`;
}
export function makeDemoAnalyticsCsv(rows:readonly AnalyticsRow[],period:Period){
 const p=periodOptions.find(item=>item.id===period)?.label??period;
 const data:(string|number)[][]=[
  ['بيان — لوحة التحليلات — بيانات تجريبية غير رسمية'],[ANALYTICS_DISCLAIMER],['الفترة',p],[],
  ['الكلية','القسم','الطلاب المسجلون','الخاضعون للتقييم','الناجحون','معدل الحضور (%)','بحاجة إلى متابعة'],
  ...rows.map(r=>[r.facultyLabel,r.departmentLabel,r.registered,r.evaluated,r.passed,Math.round(r.attendance*10)/10,r.risk])
 ];
 return '\uFEFF'+data.map(line=>line.map(safeCsvCell).join(',')).join('\r\n')+'\r\n';
}
