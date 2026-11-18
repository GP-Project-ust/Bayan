/**
 * Screen 17 - deterministic DEMONSTRATION ONLY. There is no trained model,
 * anomaly service, risk score, SQL query, or live institutional data here.
 * Observed values come from screen 16's fictitious monthly snapshots.
 * Comparison baselines and percentage changes are invented fixtures.
 */
import {makeDemoAnalyticsRows,periodOptions,safeCsvCell,type AnalyticsRow,type FacultyId,type Period} from '../analytics/analytics';

export type OutlierMetric='attendance'|'success'|'registered'|'risk';
export type Severity='critical'|'high'|'medium'|'low';
export type ReviewStatus='new'|'reviewing'|'reviewed';
export type Outlier={
 id:string;period:Period;faculty:FacultyId;facultyLabel:string;department:string;departmentLabel:string;
 metric:OutlierMetric;metricLabel:string;observed:number;baseline:number;deltaPct:number;
 severity:Severity;status:ReviewStatus;reason:string;recommendation:string;
};
export type OutlierFilters={period:Period|'all';faculty:FacultyId|'all';department:string;metric:OutlierMetric|'all';severity:Severity|'all';status:ReviewStatus|'all';search:string};
export const initialOutlierFilters:OutlierFilters={period:'2026-10',faculty:'all',department:'all',metric:'all',severity:'all',status:'all',search:''};
export const OUTLIERS_DISCLAIMER='هذه حالات مصطنعة لأغراض تصميم الواجهة واختبارها. القيم المرصودة مأخوذة من بيانات التحليلات الافتراضية، وخطوط الأساس والانحرافات محددة يدويًا؛ لم يُنفّذ اكتشاف إحصائي أو تحليل آلي حقيقي.';
export const metricNames:Record<OutlierMetric,string>={attendance:'معدل الحضور',success:'نسبة النجاح',registered:'الطلاب المسجلون',risk:'الطلاب بحاجة إلى متابعة'};
export const severityNames:Record<Severity,string>={critical:'حرجة',high:'مرتفعة',medium:'متوسطة',low:'منخفضة'};
export const statusNames:Record<ReviewStatus,string>={new:'جديدة',reviewing:'قيد المراجعة',reviewed:'تمت المراجعة'};
export const severityOrder:Record<Severity,number>={critical:4,high:3,medium:2,low:1};

// The change is an intentionally authored fixture, not a data-science estimate.
const seeds:{id:string;period:Period;faculty:FacultyId;department:string;metric:OutlierMetric;change:number;status:ReviewStatus}[]=[
 {id:'OUT-101',period:'2026-10',faculty:'engineering',department:'software',metric:'attendance',change:-18.8,status:'new'},
 {id:'OUT-102',period:'2026-10',faculty:'engineering',department:'civil',metric:'success',change:-18.9,status:'new'},
 {id:'OUT-103',period:'2026-10',faculty:'medicine',department:'general-medicine',metric:'risk',change:39.8,status:'reviewing'},
 {id:'OUT-104',period:'2026-10',faculty:'medicine',department:'labs',metric:'attendance',change:-9.5,status:'new'},
 {id:'OUT-105',period:'2026-10',faculty:'commerce',department:'accounting',metric:'success',change:-16.4,status:'new'},
 {id:'OUT-106',period:'2026-10',faculty:'commerce',department:'business',metric:'risk',change:31.0,status:'reviewing'},
 {id:'OUT-107',period:'2026-10',faculty:'science',department:'mathematics',metric:'registered',change:-21.5,status:'new'},
 {id:'OUT-108',period:'2026-10',faculty:'science',department:'physics',metric:'attendance',change:-8.3,status:'reviewed'},
 {id:'OUT-109',period:'2026-10',faculty:'education',department:'curriculum',metric:'success',change:-12.7,status:'new'},
 {id:'OUT-110',period:'2026-10',faculty:'education',department:'edtech',metric:'risk',change:28.4,status:'reviewing'},
 {id:'OUT-111',period:'2026-10',faculty:'arts',department:'arabic',metric:'attendance',change:-12.3,status:'new'},
 {id:'OUT-112',period:'2026-10',faculty:'arts',department:'history',metric:'success',change:-9.4,status:'reviewed'},
 {id:'OUT-113',period:'2026-09',faculty:'engineering',department:'software',metric:'success',change:-12.8,status:'reviewed'},
 {id:'OUT-114',period:'2026-09',faculty:'medicine',department:'labs',metric:'risk',change:24.7,status:'reviewing'},
 {id:'OUT-115',period:'2026-09',faculty:'commerce',department:'accounting',metric:'attendance',change:-10.2,status:'reviewed'},
 {id:'OUT-116',period:'2026-09',faculty:'arts',department:'history',metric:'registered',change:-7.9,status:'new'},
 {id:'OUT-117',period:'2026-08',faculty:'science',department:'physics',metric:'success',change:-15.6,status:'reviewed'},
 {id:'OUT-118',period:'2026-08',faculty:'education',department:'curriculum',metric:'attendance',change:-8.5,status:'reviewed'},
];

function round1(n:number){return Math.round(n*10)/10;}
export function severityFromDeviation(pct:number):Severity{
 const a=Math.abs(pct);
 return a>=25?'critical':a>=15?'high':a>=9?'medium':'low';
}
export function observedMetric(row:AnalyticsRow,metric:OutlierMetric):number{
 if(metric==='success')return row.evaluated?round1(row.passed/row.evaluated*100):0;
 if(metric==='attendance')return round1(row.attendance);
 return row[metric];
}
export function formatValue(value:number,metric:OutlierMetric):string{
 const pretty=new Intl.NumberFormat('ar-EG',{maximumFractionDigits:1}).format(value);
 return metric==='success'||metric==='attendance'?`${pretty}%`:`${pretty} طالب`;
}
export function makeDemoOutliers(rows:readonly AnalyticsRow[]=makeDemoAnalyticsRows()):Outlier[]{
 return seeds.map(seed=>{
  const row=rows.find(r=>r.period===seed.period&&r.faculty===seed.faculty&&r.department===seed.department);
  if(!row)throw new Error(`Unmatched demo department for ${seed.id}`);
  const observed=observedMetric(row,seed.metric);
  const rawBaseline=observed/(1+seed.change/100);
  const baseline=seed.metric==='registered'||seed.metric==='risk'?Math.max(1,Math.round(rawBaseline)):round1(rawBaseline);
  const deltaPct=round1((observed-baseline)/baseline*100);
  const severity=severityFromDeviation(deltaPct);
  const reason=seed.metric==='risk'?'عدد الحالات التي تحتاج متابعة أعلى من المرجع الافتراضي.':seed.metric==='registered'?'عدد المسجلين أقل من المرجع الافتراضي.':seed.metric==='attendance'?'معدل الحضور أدنى من المرجع الافتراضي.':'نسبة النجاح أدنى من المرجع الافتراضي.';
  const recommendation=seed.metric==='risk'?'مراجعة الحالات ضمن بيانات المؤسسة المصرح بها قبل اتخاذ أي قرار.':seed.metric==='registered'?'مراجعة تغيّر التسجيل ومدى صحة البيانات المصدرية.':seed.metric==='attendance'?'مراجعة سجلات الحضور وفترة المقارنة أولًا.':'مقارنة نتائج التقييم والتحقق من اكتمال السجلات.';
  return {id:seed.id,period:seed.period,faculty:row.faculty,facultyLabel:row.facultyLabel,department:row.department,departmentLabel:row.departmentLabel,metric:seed.metric,metricLabel:metricNames[seed.metric],observed,baseline,deltaPct,severity,status:seed.status,reason,recommendation};
 });
}
export function normalizeArabic(input:string){return input.normalize('NFKC').replace(/[\u064B-\u065F\u0670]/g,'').replace(/[إأآٱ]/g,'ا').replace(/ى/g,'ي').toLocaleLowerCase('ar').trim();}
export function filterOutliers(rows:readonly Outlier[],f:OutlierFilters):Outlier[]{
 const query=normalizeArabic(f.search);
 return rows.filter(r=>(f.period==='all'||r.period===f.period)
  &&(f.faculty==='all'||r.faculty===f.faculty)
  &&(f.department==='all'||r.department===f.department)
  &&(f.metric==='all'||r.metric===f.metric)
  &&(f.severity==='all'||r.severity===f.severity)
  &&(f.status==='all'||r.status===f.status)
  &&(!query||normalizeArabic([r.id,r.facultyLabel,r.departmentLabel,r.metricLabel,r.reason].join(' ')).includes(query)))
  .sort((a,b)=>severityOrder[b.severity]-severityOrder[a.severity]||b.period.localeCompare(a.period)||a.id.localeCompare(b.id));
}
export function summarizeOutliers(rows:readonly Outlier[]){return {total:rows.length,critical:rows.filter(r=>r.severity==='critical').length,high:rows.filter(r=>r.severity==='high').length,pending:rows.filter(r=>r.status!=='reviewed').length,reviewed:rows.filter(r=>r.status==='reviewed').length};}
export function makeDemoOutlierCsv(rows:readonly Outlier[]):string{
 const lines:(string|number)[][]=[
  ['بيان — حالات شاذة افتراضية — للاختبار فقط'],[OUTLIERS_DISCLAIMER],[],
  ['الرقم','الفترة','الكلية','القسم','المؤشر','المرجع التجريبي','القيمة في البيانات التجريبية','الانحراف (%)','الخطورة','حالة المراجعة'],
  ...rows.map(r=>[r.id,periodOptions.find(p=>p.id===r.period)?.label??r.period,r.facultyLabel,r.departmentLabel,r.metricLabel,r.baseline,r.observed,r.deltaPct,severityNames[r.severity],statusNames[r.status]])
 ];
 return '\uFEFF'+lines.map(line=>line.map(safeCsvCell).join(',')).join('\r\n')+'\r\n';
}
