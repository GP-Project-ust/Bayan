"use client";

import {useMemo,useState} from "react";
import Link from "next/link";
import {
  Activity,ArrowDownToLine,ArrowLeft,ArrowUpLeft,BarChart3,BookOpenCheck,
  CalendarDays,ChevronLeft,ClipboardList,Download,FilterX,GraduationCap,
  Info,Layers3,LockKeyhole,School,ShieldCheck,SlidersHorizontal,
  Sparkles,Table2,TrendingUp,UsersRound,Workflow
} from "lucide-react";
import {ChatLayout} from "@/components/layout";
import {Button,Drawer,Toast} from "@/components/ui";
import {StatePanel} from "@/components/states";
import {DemoAccessProvider,DemoRolePicker,useDemoAccess} from "@/components/access/DemoAccess";
import {
  ANALYTICS_DISCLAIMER,availableDepartments,comparison,departmentBreakdown,
  facultyBreakdown,faculties,filterSnapshot,initialAnalyticsFilters,makeDemoAnalyticsCsv,
  makeDemoAnalyticsRows,metricLabels,metricUnits,periodOptions,previousPeriod,
  summarizeRows,trendFor,type AnalyticsFilters,type AnalyticsRow,type TrendMetric
} from "@/lib/analytics/analytics";

type DeptRow=ReturnType<typeof departmentBreakdown>[number];
type Notice={title:string;message:string;tone:"success"|"info"|"warning"|"danger"};
const number=new Intl.NumberFormat("ar-EG");
const formatNumber=(n:number)=>number.format(n);
const formatPercent=(n:number)=>`${new Intl.NumberFormat("ar-EG",{maximumFractionDigits:1}).format(n)}%`;
const percentString=(value:number|null)=>value===null?"لا توجد فترة سابقة":`${value>0?"+":""}${new Intl.NumberFormat("ar-EG",{maximumFractionDigits:1}).format(value)}%`;
const summaryMetric=(row:ReturnType<typeof summarizeRows>,metric:TrendMetric)=>row[metric];

function Difference({value,invert=false}:{value:number|null;invert?:boolean}){
 const up=value!==null&&value>0,down=value!==null&&value<0;
 const favorable=invert?down:up;
 return <span className={`ban-difference ${value===null?"ban-difference--muted":value===0?"ban-difference--muted":favorable?"ban-difference--good":"ban-difference--alert"}`}>
  {value!==null&&(up?<TrendingUp size={13}/>:down?<TrendingUp className="ban-trend-down" size={13}/>:null)}
  {value===null?"لا توجد مقارنة":`${percentString(value)} عن السابق`}
 </span>;
}

function TrendChart({rows,metric}:{rows:ReturnType<typeof trendFor>;metric:TrendMetric}){
 const values=rows.map(r=>r[metric]);
 const minRaw=Math.min(...values),maxRaw=Math.max(...values);
 const delta=Math.max(1,maxRaw-minRaw);
 const bottom=Math.max(0,minRaw-delta*.48),top=maxRaw+delta*.48;
 const left=42,right=612,topY=24,bottomY=206;
 const points=values.map((value,i)=>{
  const x=rows.length===1?(left+right)/2:left+i*(right-left)/(rows.length-1);
  const y=bottomY-(value-bottom)/(top-bottom)*(bottomY-topY);
  return {x,y,value};
 });
 const line=points.map(p=>`${p.x},${p.y}`).join(" ");
 const fill=points.length>1?`${left},${bottomY} ${line} ${right},${bottomY}`:"";
 const format=(value:number)=>metric==="success"||metric==="attendance"?formatPercent(value):formatNumber(value);
 const ticks=[0,1,2,3].map(i=>top-(top-bottom)*i/3);
 return <div className="ban-chart-container" data-testid="analytics-trend-chart">
   <svg className="ban-trend-svg" viewBox="0 0 650 240" role="img" aria-label={`مخطط اتجاه ${metricLabels[metric]} عبر ${rows.length} أشهر تدريبية`} preserveAspectRatio="xMidYMid meet">
    <defs><linearGradient id="ban-area" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#00a6b2" stopOpacity=".23"/><stop offset="1" stopColor="#00a6b2" stopOpacity=".015"/></linearGradient></defs>
    {ticks.map((v,i)=>{const y=topY+i*(bottomY-topY)/3;return <g key={i}><line x1={left} x2={right} y1={y} y2={y} stroke="#dbe8f3" strokeDasharray="5 6"/><text x={left-12} y={y+4} fontSize="12" fill="#7794a8" textAnchor="end">{format(Math.round(v*10)/10)}</text></g>;})}
    {fill&&<polygon points={fill} fill="url(#ban-area)"/>}
    {points.length>1&&<polyline points={line} fill="none" stroke="#00a6b2" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round"/>}
    {points.map((point,i)=><g key={rows[i].period}><circle cx={point.x} cy={point.y} r="7" fill="#fff" stroke="#008e9b" strokeWidth="3"/><title>{`${rows[i].label}: ${format(point.value)}`}</title><text x={point.x} y={point.y-16} fontSize="13" fontWeight="bold" fill="#0d3a54" textAnchor="middle">{format(point.value)}</text></g>)}
   </svg>
   <div className="ban-chart-axis" aria-hidden="true">{rows.map(r=><span key={r.period}>{r.label}</span>)}</div>
   <table className="ban-visually-hidden"><caption>القيم التي يمثلها المخطط</caption><thead><tr><th>الشهر</th><th>{metricLabels[metric]}</th></tr></thead><tbody>{rows.map(r=><tr key={r.period}><td>{r.label}</td><td>{format(r[metric])}</td></tr>)}</tbody></table>
  </div>;
}

function AnalyticsBody(){
 const {can}=useDemoAccess();
 const canView=can("analytics.view"),canExport=can("reports.export");
 const rows=useMemo(()=>makeDemoAnalyticsRows(),[]);
 const [filters,setFilters]=useState<AnalyticsFilters>(initialAnalyticsFilters);
 const [sort,setSort]=useState<"registered"|"success"|"risk">("registered");
 const [selected,setSelected]=useState<DeptRow|null>(null);
 const [notice,setNotice]=useState<Notice|null>(null);
 const available=useMemo(()=>availableDepartments(filters.faculty),[filters.faculty]);
 const activeRows=useMemo(()=>filterSnapshot(rows,filters.period,filters.faculty,filters.department),[rows,filters]);
 const active=useMemo(()=>summarizeRows(activeRows),[activeRows]);
 const previous=previousPeriod(filters.period);
 const prev=useMemo(()=>previous?summarizeRows(filterSnapshot(rows,previous,filters.faculty,filters.department)):null,[rows,previous,filters.faculty,filters.department]);
 const trend=useMemo(()=>trendFor(rows,filters),[rows,filters]);
 const facultiesData=useMemo(()=>facultyBreakdown(activeRows),[activeRows]);
 const breakdown=useMemo(()=>departmentBreakdown(activeRows),[activeRows]);
 const sorted=useMemo(()=>[...breakdown].sort((a,b)=>b[sort]-a[sort]),[breakdown,sort]);
 const maxFaculty=Math.max(1,...facultiesData.map(f=>f.registered));
 const maxDepartment=Math.max(1,...breakdown.map(f=>f.registered));
 const periodText=periodOptions.find(p=>p.id===filters.period)?.label??filters.period;
 const previousText=periodOptions.find(p=>p.id===previous)?.label??"—";
 const reset=()=>{setFilters(initialAnalyticsFilters);setSort("registered");};
 const setFilter=<K extends keyof AnalyticsFilters>(key:K,value:AnalyticsFilters[K])=>setFilters(f=>({...f,[key]:value}));
 const stats:[string,string,number,number|null,boolean,typeof UsersRound][]=[
  ["الطلاب المسجلون", "لقطة الشهر المحدد",active.registered,prev?comparison(active.registered,prev.registered):null,false,UsersRound],
  ["نسبة النجاح", "من الخاضعين للتقييم",active.success,prev?comparison(active.success,prev.success):null,false,GraduationCap],
  ["معدل الحضور", "مرجح بأعداد المسجلين",active.attendance,prev?comparison(active.attendance,prev.attendance):null,false,Activity],
  ["بحاجة إلى متابعة", "عدد تقديري في اللقطة",active.risk,prev?comparison(active.risk,prev.risk):null,true,BookOpenCheck],
 ];
 function exportCsv(){
  if(!canView||!canExport)return;
  const csv=makeDemoAnalyticsCsv(activeRows,filters.period);
  const blob=new Blob([csv],{type:"text/csv;charset=utf-8"});
  const url=URL.createObjectURL(blob);
  const link=document.createElement("a");link.href=url;link.download=`bayan-demo-analytics-${filters.period}.csv`;
  document.body.append(link);link.click();link.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1000);
  setNotice({title:"تم تنزيل ملف CSV تجريبي",message:"بيانات الملف افتراضية وتمثل لقطة شهرية واحدة، ولم تُستخرج من قاعدة بيانات.",tone:"success"});
 }
 return <div className="ban" data-testid="analytics-screen" dir="rtl">
  <nav className="ban-breadcrumb" aria-label="مسار التنقل"><Link href="/">الرئيسية</Link><ChevronLeft size={15}/><Link href="/reports">التقارير</Link><ChevronLeft size={15}/><span aria-current="page">لوحة التحليلات</span></nav>
  <header className="ban-hero"><div><span className="ban-eyebrow"><Sparkles size={17}/> التحليلات المؤسسية الذكية</span><h1>لوحة التحليلات ومؤشرات الأداء</h1><p>استكشف مؤشرات التسجيل والحضور والنجاح والتوزيع الأكاديمي، وقارن الفترات والجهات في نموذج تفاعلي.</p><div className="ban-hero-tags"><span><ShieldCheck size={15}/> عرض وفق الصلاحيات</span><span><CalendarDays size={15}/> مقارنة الفترات</span><span><School size={15}/> حسب الكلية والقسم</span></div></div><div className="ban-hero-art" aria-hidden="true"><BarChart3 size={82}/><i/></div></header>
  <div className="ban-disclaimer" role="note"><Info size={21}/><p><strong>عرض تجريبي غير رسمي:</strong> {ANALYTICS_DISCLAIMER} لم يُنفّذ أي استعلام SQL أو تحليل عبر الوكلاء أو اتصال بخادم FastAPI.</p></div>
  <section className="ban-role"><span><LockKeyhole size={18}/> الصلاحيات هنا محاكاة للعرض فقط، والحماية الفعلية يجب أن تطبّق في الخادم.</span><DemoRolePicker id="ban-role-picker"/></section>
  {!canView?<div className="ban-locked" data-testid="analytics-forbidden"><StatePanel state="forbidden" title="لا تملك صلاحية عرض تحليلات المؤسسة" description="في نموذج بيان، تظهر التحليلات لمدير المؤسسة. محدد الدور أعلاه تجريبي ولا يمنح صلاحيات حقيقية."/><Link href="/reports">العودة إلى مركز التقارير <ArrowLeft size={16}/></Link></div>:<>
    <section className="ban-panel ban-filters" aria-label="فلاتر التحليلات"><div className="ban-section-header"><div><h2><SlidersHorizontal size={20}/> نطاق التحليل</h2><p>تؤثر المرشحات على جميع البطاقات والرسوم والجداول.</p></div><div className="ban-actions"><button type="button" className="ban-link-button" onClick={reset}><FilterX size={17}/> إعادة ضبط</button><Button variant="outline" leadingIcon={<Download size={16}/>} disabled={!canExport} onClick={exportCsv}>تنزيل CSV تجريبي</Button></div></div>
     <div className="ban-filter-grid"><label><span>الشهر المرجعي</span><select aria-label="الشهر المرجعي" value={filters.period} onChange={e=>setFilter("period",e.target.value as AnalyticsFilters["period"])}>{periodOptions.map(p=><option key={p.id} value={p.id}>{p.label}</option>)}</select></label>
      <label><span>الكلية</span><select aria-label="الكلية" value={filters.faculty} onChange={e=>setFilters(f=>({...f,faculty:e.target.value as AnalyticsFilters["faculty"],department:"all"}))}><option value="all">جميع الكليات</option>{faculties.map(f=><option key={f.id} value={f.id}>{f.label}</option>)}</select></label>
      <label><span>القسم الأكاديمي</span><select aria-label="القسم الأكاديمي" value={filters.department} onChange={e=>setFilter("department",e.target.value)}><option value="all">جميع الأقسام</option>{available.map(d=><option key={d.id} value={d.id}>{d.label}</option>)}</select></label>
      <div className="ban-selected-period"><CalendarDays size={20}/><span>الفترة المعروضة</span><strong>{periodText}</strong></div>
     </div></section>
    <section className="ban-kpis" aria-label="مؤشرات الأداء الرئيسية" data-testid="analytics-kpis">{stats.map(([label,subtitle,value,change,invert,Icon],index)=><article className="ban-kpi" key={label}><div className="ban-kpi-icon"><Icon size={23}/></div><div className="ban-kpi-text"><p>{label}</p><strong>{index===1||index===2?formatPercent(value):formatNumber(value)}</strong><small>{subtitle}</small><Difference value={change} invert={invert}/></div></article>)}</section>
    <div className="ban-main-grid"><section className="ban-panel ban-trend-card" aria-labelledby="ban-trend-title"><div className="ban-section-header"><div><h2 id="ban-trend-title"><TrendingUp size={21}/> اتجاه المؤشرات</h2><p>المؤشرات شهرية، ولا تُجمع أعداد الطلاب عبر الأشهر.</p></div><label className="ban-trend-metric"><span>المؤشر</span><select aria-label="مؤشر الاتجاه" value={filters.metric} onChange={e=>setFilter("metric",e.target.value as TrendMetric)}>{Object.entries(metricLabels).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label></div><div className="ban-trend-top"><strong>{filters.metric==="success"||filters.metric==="attendance"?formatPercent(summaryMetric(active,filters.metric)):formatNumber(summaryMetric(active,filters.metric))}</strong><span>{metricLabels[filters.metric]} · {periodText}</span></div><TrendChart rows={trend} metric={filters.metric}/><div className="ban-chart-footnote"><Info size={16}/> المقارنة مع {previous?previousText:"فترة سابقة غير متاحة"}، والقيم توضيحية.</div></section>
    <section className="ban-panel ban-faculties" aria-labelledby="ban-faculty-title"><div className="ban-section-header"><div><h2 id="ban-faculty-title"><School size={21}/> التوزيع حسب الكلية</h2><p>عدد الطلاب في الشهر المحدد.</p></div><span className="ban-tiny-pill">{formatNumber(active.faculties)} كليات</span></div><div className="ban-faculty-bars">{facultiesData.map((f,i)=><div className="ban-faculty-row" key={f.id}><div><strong>{f.label}</strong><b>{formatNumber(f.registered)}</b></div><div className="ban-faculty-track"><span className={`ban-faculty-fill ban-faculty-fill--${i%4}`} style={{width:`${Math.max(2,f.registered/maxFaculty*100)}%`}}/></div></div>)}{!facultiesData.length&&<p>لا توجد كليات ضمن الفلتر.</p>}</div><div className="ban-faculty-summary"><Layers3 size={18}/><span><b>{formatNumber(active.registered)}</b> طالبًا ضمن {formatNumber(active.departments)} قسمًا في نطاق العرض.</span></div></section></div>
    <section className="ban-panel ban-department" aria-labelledby="ban-departments-title"><div className="ban-section-header"><div><h2 id="ban-departments-title"><Table2 size={21}/> تفاصيل الأقسام</h2><p>يمكنك فتح أي قسم لمعاينة أرقامه التدريبية ضمن الفترة المحددة.</p></div><div className="ban-actions"><label className="ban-sort"><span>الترتيب حسب</span><select aria-label="ترتيب الأقسام" value={sort} onChange={e=>setSort(e.target.value as typeof sort)}><option value="registered">عدد المسجلين</option><option value="success">نسبة النجاح</option><option value="risk">بحاجة إلى متابعة</option></select></label><Link className="ban-report-link" href="/reports"><ClipboardList size={16}/> مركز التقارير <ArrowUpLeft size={15}/></Link></div></div>
      <div className="ban-table-wrapper"><table className="ban-table" data-testid="analytics-departments-table"><thead><tr><th>القسم</th><th>الكلية</th><th>المسجلون</th><th>مقارنة الحجم</th><th>نسبة النجاح</th><th>الحضور</th><th>بحاجة إلى متابعة</th><th>التفاصيل</th></tr></thead><tbody>{sorted.map(row=><tr key={row.id}><td><strong>{row.label}</strong></td><td>{row.faculty}</td><td className="ban-numeric">{formatNumber(row.registered)}</td><td><div className="ban-table-bar" aria-label={`يمثل ${formatNumber(row.registered)} طالبًا`}><span style={{width:`${Math.max(2,row.registered/maxDepartment*100)}%`}}/></div></td><td className="ban-numeric">{formatPercent(row.success)}</td><td className="ban-numeric">{formatPercent(row.attendance)}</td><td className="ban-numeric">{formatNumber(row.risk)}</td><td><button type="button" className="ban-row-action" onClick={()=>setSelected(row)} aria-label={`تفاصيل ${row.label}`}>عرض <ArrowLeft size={14}/></button></td></tr>)}</tbody><tfoot><tr><td colSpan={2}>الإجمالي للشهر المحدد</td><td>{formatNumber(active.registered)}</td><td>—</td><td>{formatPercent(active.success)}</td><td>{formatPercent(active.attendance)}</td><td>{formatNumber(active.risk)}</td><td>—</td></tr></tfoot></table></div><p className="ban-table-note">نسب النجاح والحضور إجمالية مرجحة وليست مجموع نسب الأقسام. الأعداد تخص شهرًا واحدًا فقط.</p></section>
    <section className="ban-bottom"><div><Workflow size={19}/><p><strong>ملاحظات تحليلية تجريبية:</strong> عدد المسجلين في {periodText} هو {formatNumber(active.registered)}؛ مقارنة الفترة السابقة: {prev?percentString(comparison(active.registered,prev.registered)):"غير متاحة"}. جميع القيم مصطنعة للتجربة.</p></div><div className="ban-bottom-links"><Link href="/analytics/outliers">استكشاف القيم الشاذة <ArrowLeft size={16}/></Link><Link href="/reports/detail?report=rep-101">مثال التقرير الأكاديمي <ArrowLeft size={16}/></Link></div></section>
   </>}
   <Drawer open={Boolean(selected)} onClose={()=>setSelected(null)} title={selected?`تفاصيل قسم ${selected.label}`:"تفاصيل القسم"} description="تفاصيل مؤشر تدريبي ضمن لقطة الشهر المختار"><div className="ban-drawer-metrics">{selected&&<><div><small>الكلية</small><strong>{selected.faculty}</strong></div><div><small>الفترة</small><strong>{periodText}</strong></div><div><small>المسجلون</small><strong>{formatNumber(selected.registered)}</strong></div><div><small>نسبة النجاح</small><strong>{formatPercent(selected.success)}</strong></div><div><small>معدل الحضور</small><strong>{formatPercent(selected.attendance)}</strong></div><div><small>بحاجة إلى متابعة</small><strong>{formatNumber(selected.risk)}</strong></div></>}</div><p className="ban-drawer-note">هذه بيانات مولدة للاختبار البصري فقط ولا تصف قسمًا حقيقيًا.</p></Drawer>
   {notice&&<div className="ban-toast"><Toast {...notice} onClose={()=>setNotice(null)}/></div>}
 </div>;
}
export function AnalyticsScreen(){return <DemoAccessProvider initialRole="manager"><ChatLayout variant="feature"><AnalyticsBody/></ChatLayout></DemoAccessProvider>;}
