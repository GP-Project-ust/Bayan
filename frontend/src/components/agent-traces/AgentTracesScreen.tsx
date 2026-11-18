'use client';

import {useMemo,useState} from 'react';
import Link from 'next/link';
import {
 Activity,AlertTriangle,ArrowLeft,Bot,CalendarDays,CheckCircle2,ChevronLeft,
 ClipboardCopy,Clock3,Download,Eye,FilterX,Info,LockKeyhole,Search,
 ShieldAlert,ShieldCheck,SlidersHorizontal,Workflow,XCircle
} from 'lucide-react';
import {AdminLayout} from '@/components/layout';
import {Button,Drawer,Toast} from '@/components/ui';
import {StatePanel} from '@/components/states';
import {DemoAccessProvider,DemoRolePicker,useDemoAccess} from '@/components/access/DemoAccess';
import {
 TRACE_DEMO_NOTICE,DEMO_AGENT_TRACES,DEFAULT_TRACE_FILTERS,
 agentLabels,kindLabels,traceStatuses,stepStatuses,filterTraces,traceStats,
 invalidTraceRange,resolveTraceId,safeTraceReference,createTraceCsv,
 type AgentName,type AgentTrace,type TraceStatus,type StepStatus,type TraceKind,type TraceFilters
} from '@/lib/agent-traces/traces';

type Notice={title:string;message:string;tone:'success'|'warning'|'danger'|'info'};
const dateFormatter=new Intl.DateTimeFormat('ar',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Riyadh'});
const numberFormatter=new Intl.NumberFormat('ar-EG');
const AGENTS:AgentName[]=['Supervisor','SQL','RAG','Analyst','Reporter'];
const KINDS:TraceKind[]=['data','documents','report','mixed'];
const STATUSES:TraceStatus[]=['success','failed','denied','running'];
const statusIcons={success:CheckCircle2,failed:XCircle,denied:ShieldAlert,running:Clock3} as const;
function Status({status}:{status:TraceStatus|StepStatus}){
 const Icon=status==='skipped'?Clock3:statusIcons[status];
 return <span className={`bat-status bat-status--${status}`}><Icon size={14}/>{stepStatuses[status]}</span>;
}
function formatMs(value:number|null){return value===null?'—':`${numberFormatter.format(value)} ms`;}
function TraceSteps({trace}:{trace:AgentTrace}){
 const [expanded,setExpanded]=useState<Record<string,boolean>>({});
 return <ol className="bat-steps" aria-label="خطوات التنفيذ التشغيلية الاصطناعية">{trace.steps.map((step,i)=><li className={`bat-step bat-step--${step.status}`} key={step.id}>
  <span className="bat-step-number">{i+1}</span><div className="bat-step-content"><button type="button" className="bat-step-toggle" aria-expanded={!!expanded[step.id]} onClick={()=>setExpanded(old=>({...old,[step.id]:!old[step.id]}))}>
   <span><strong>{agentLabels[step.agent]}</strong><small lang="en" dir="ltr">{step.agent}</small><span className="bat-step-label">{step.label}</span></span>
   <span className="bat-step-meta"><Status status={step.status}/><small>{formatMs(step.durationMs)}</small></span>
  </button>{expanded[step.id]&&<p className="bat-step-description">{step.summary}</p>}</div>
 </li>)}</ol>;
}
function Detail({trace,onCopy}:{trace:AgentTrace;onCopy:(text:string)=>void}){
 return <div className="bat-detail" data-testid="agent-trace-detail">
  <p className="bat-detail-notice"><Info size={18}/>{TRACE_DEMO_NOTICE}</p>
  <div className="bat-detail-heading"><strong>{trace.description}</strong><Status status={trace.status}/></div>
  <dl className="bat-detail-grid"><div><dt>معرّف التنفيذ</dt><dd dir="ltr">{trace.id}</dd></div><div><dt>نوع المهمة</dt><dd>{kindLabels[trace.kind]}</dd></div><div><dt>وقت البدء</dt><dd>{dateFormatter.format(new Date(trace.startedAt))}</dd></div><div><dt>مدة التنفيذ</dt><dd>{formatMs(trace.durationMs)}</dd></div></dl>
  <h3><Workflow size={20}/> تسلسل الوكلاء</h3>
  <TraceSteps trace={trace}/>
  <div className="bat-detail-actions"><Button size="sm" variant="outline" onClick={()=>onCopy(safeTraceReference(trace))} leadingIcon={<ClipboardCopy size={15}/>}>نسخ المرجع</Button>
   <Link href={`/admin/agent-traces/details?id=${encodeURIComponent(trace.id)}`}>فتح الصفحة الكاملة <ArrowLeft size={15}/></Link>{trace.auditEventId?<Link href={`/admin/audit/details?id=${encodeURIComponent(trace.auditEventId)}`}>فتح حدث التدقيق التدريبي <ArrowLeft size={15}/></Link>:<span>لا يوجد حدث تدقيق مرتبط بهذه العينة</span>}
  </div>
  <p className="bat-detail-privacy"><LockKeyhole size={17}/> لا تظهر استفسارات المستخدمين الخام أو الاستعلامات التنفيذية أو المحتوى الخاص بالمستندات أو التفكير الداخلي للنموذج.</p>
 </div>;
}
function Main(){
 const {can}=useDemoAccess();const allowed=can('traces.view');
 const [filters,setFilters]=useState<TraceFilters>(DEFAULT_TRACE_FILTERS);
 const [selectedId,setSelectedId]=useState<string|null>(null);
 const [notice,setNotice]=useState<Notice|null>(null);
 const [page,setPage]=useState(1);
 const results=useMemo(()=>filterTraces(DEMO_AGENT_TRACES,filters),[filters]);
 const stats=useMemo(()=>traceStats(DEMO_AGENT_TRACES),[]);
 const selected=resolveTraceId(selectedId);
 const invalid=invalidTraceRange(filters);
 const pages=Math.max(1,Math.ceil(results.length/6));
 const visiblePage=Math.min(page,pages);
 const shown=results.slice((visiblePage-1)*6,visiblePage*6);
 function update<K extends keyof TraceFilters>(key:K,value:TraceFilters[K]){setFilters(old=>({...old,[key]:value}));setPage(1);}
 function clear(){setFilters(DEFAULT_TRACE_FILTERS);setPage(1);}
 async function copy(value:string){try{if(!navigator.clipboard?.writeText)throw new Error('Clipboard');await navigator.clipboard.writeText(value);setNotice({title:'نُسخ المرجع التجريبي',message:'يحتوي على معلومات وصفية غير حساسة فقط.',tone:'success'});}catch{setNotice({title:'تعذّر النسخ',message:'قد يلزم السماح باستخدام الحافظة.',tone:'warning'});}}
 function download(){
  if(!allowed||!results.length||invalid)return;
  try{const blob=new Blob([createTraceCsv(results)],{type:'text/csv;charset=utf-8;'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='bayan-agent-traces-demo.csv';document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);setNotice({title:'تم تصدير البيانات التدريبية',message:`يتضمن الملف ${numberFormatter.format(results.length)} عملية اصطناعية فقط.`,tone:'success'});}catch{setNotice({title:'تعذّر التصدير',message:'لم تُرسل أي بيانات إلى خادم.',tone:'danger'});}
 }
 return <div className="ban bat" dir="rtl" data-testid="agent-traces-screen">
  <nav className="ban-breadcrumb" aria-label="مسار التنقل"><Link href="/admin">لوحة الإدارة</Link><ChevronLeft size={15}/><Link href="/admin/audit">سجل التدقيق</Link><ChevronLeft size={15}/><span aria-current="page">تتبع الوكلاء</span></nav>
  <header className="ban-hero bat-hero"><div><span className="ban-eyebrow"><Workflow size={17}/> الرقابة · UC-06</span><h1>تتبّع تنفيذ الوكلاء</h1><p>مراجعة مسارات التشغيل ومدد المعالجة ونتائج الوكلاء الخمسة، عبر ملخصات تشغيلية آمنة ومصرّح بها.</p><div className="ban-hero-tags"><span><Bot size={14}/> خمسة وكلاء</span><span><ShieldCheck size={14}/> ملخصات تشغيلية</span><span><LockKeyhole size={14}/> دون استدلال داخلي</span></div></div><div className="ban-hero-art" aria-hidden="true"><Workflow size={76}/><i/></div></header>
  <div className="ban-disclaimer" role="note"><Info size={18}/><span><strong>{TRACE_DEMO_NOTICE}</strong> يمكن معاينة حالات «قيد التنفيذ» دون وجود عملية حقيقية تعمل في الخلفية.</span></div>
  <div className="ban-role"><span><ShieldCheck size={17}/> تتبع المؤسسة متاح لمسؤول تقنية المعلومات في المحاكاة؛ لا يرث مسؤول المنصة صلاحية بيانات المؤسسات.</span><DemoRolePicker id="agent-traces-role-picker"/></div>
  {!allowed?<section className="ban-locked" data-testid="agent-traces-forbidden"><StatePanel state="forbidden" title="لا تملك صلاحية تتبع وكلاء المؤسسة" description="يجب التحقق من الدور والمؤسسة على مستوى FastAPI قبل إرجاع أي تفاصيل تشغيلية."/><Link href="/admin">العودة إلى لوحة الإدارة <ArrowLeft size={16}/></Link></section>:<>
  <section className="bat-stats" aria-label="مؤشرات التتبع التجريبية">{[
   {label:'عمليات التنفيذ',value:stats.total,icon:Workflow,kind:'total'},
   {label:'ناجحة',value:stats.success,icon:CheckCircle2,kind:'success'},
   {label:'فاشلة أو مرفوضة',value:stats.failed+stats.denied,icon:AlertTriangle,kind:'failed'},
   {label:'قيد التنفيذ (محاكاة)',value:stats.running,icon:Clock3,kind:'running'}
  ].map(({label,value,icon:Icon,kind})=><article key={kind} className={`bat-stat bat-stat--${kind}`}><span><Icon size={22}/></span><div><small>{label}</small><strong>{numberFormatter.format(value)}</strong><p>بيانات تجريبية ثابتة</p></div></article>)}</section>
  <section className="ban-panel bat-panel" aria-labelledby="bat-events-title">
   <div className="ban-section-header"><div><h2 id="bat-events-title"><Workflow size={20}/> سجل عمليات التنفيذ</h2><p>ابحث عن معرّف أو نوع معالجة أو اسم وكيل، وحدد الحالة لعرض الخطوات.</p></div><div className="ban-actions"><Button variant="primary" size="sm" disabled={!results.length||invalid} onClick={download} leadingIcon={<Download size={16}/>}>تصدير CSV تجريبي</Button></div></div>
   <div className="bat-filters">
    <label><span><Search size={15}/> بحث</span><input type="search" aria-label="البحث في عمليات الوكلاء" value={filters.query} placeholder="المعرّف، الوكيل، نوع العملية..." onChange={e=>update('query',e.target.value)}/></label>
    <label><span>الحالة</span><select aria-label="تصفية حالة التتبع" value={filters.status} onChange={e=>update('status',e.target.value as TraceFilters['status'])}><option value="all">كل الحالات</option>{STATUSES.map(s=><option key={s} value={s}>{traceStatuses[s]}</option>)}</select></label>
    <label><span>نوع الطلب</span><select aria-label="تصفية نوع الطلب" value={filters.kind} onChange={e=>update('kind',e.target.value as TraceFilters['kind'])}><option value="all">كل الأنواع</option>{KINDS.map(k=><option key={k} value={k}>{kindLabels[k]}</option>)}</select></label>
    <label><span>الوكيل</span><select aria-label="تصفية الوكيل" value={filters.agent} onChange={e=>update('agent',e.target.value as TraceFilters['agent'])}><option value="all">كل الوكلاء</option>{AGENTS.map(a=><option value={a} key={a}>{agentLabels[a]} · {a}</option>)}</select></label>
    <label><span><CalendarDays size={15}/> من تاريخ</span><input type="date" aria-label="بداية فترة التتبع" value={filters.from} max={filters.to||undefined} onChange={e=>update('from',e.target.value)}/></label>
    <label><span>إلى تاريخ</span><input type="date" aria-label="نهاية فترة التتبع" value={filters.to} min={filters.from||undefined} onChange={e=>update('to',e.target.value)}/></label>
   </div>
   {invalid&&<p className="bat-error" role="alert">نطاق التاريخ غير صالح؛ تحقق من صيغة التاريخ وترتيبه.</p>}
   <div className="bat-toolbar"><span><SlidersHorizontal size={16}/> {numberFormatter.format(results.length)} تنفيذًا مطابقًا</span><button type="button" onClick={clear}><FilterX size={16}/> إعادة ضبط المرشحات</button></div>
   {!shown.length?<div className="bat-empty" role="status"><Search size={30}/><strong>لا توجد عمليات مطابقة</strong><p>جرّب إزالة بعض المرشحات أو مراجعة نطاق التاريخ.</p><Button variant="outline" size="sm" onClick={clear}>عرض جميع العمليات</Button></div>:<div className="bat-scroll" role="region" aria-label="جدول مسارات الوكلاء قابل للتمرير أفقيًا" tabIndex={0}><table className="bat-table"><caption className="bat-sr-only">مسارات تنفيذ اصطناعية لأغراض الاختبار</caption><thead><tr><th>وقت البدء</th><th>معرّف التنفيذ</th><th>نوع المهمة</th><th>المسار التشغيلي</th><th>المدة</th><th>الحالة</th><th>التفاصيل</th></tr></thead><tbody>{shown.map(t=><tr key={t.id}><td>{dateFormatter.format(new Date(t.startedAt))}</td><td><code dir="ltr">{t.id}</code></td><td><strong>{kindLabels[t.kind]}</strong><small>{t.description}</small></td><td><span className="bat-path" dir="ltr">{t.steps.map(s=>s.agent).join(' → ')}</span></td><td>{formatMs(t.durationMs)}</td><td><Status status={t.status}/></td><td><button type="button" className="bat-view" aria-label={`عرض تفاصيل التتبع ${t.id}`} onClick={()=>setSelectedId(t.id)}><Eye size={16}/> التفاصيل</button><Link className="bat-full-link" aria-label={`فتح الصفحة الكاملة للتتبع ${t.id}`} href={`/admin/agent-traces/details?id=${encodeURIComponent(t.id)}`}>صفحة كاملة <ArrowLeft size={14}/></Link></td></tr>)}</tbody></table></div>}
   <div className="bat-pagination"><span>صفحة {numberFormatter.format(visiblePage)} من {numberFormatter.format(pages)}</span><div><Button variant="outline" size="sm" disabled={visiblePage<=1} onClick={()=>setPage(n=>Math.max(n-1,1))}>السابق</Button><Button variant="outline" size="sm" disabled={visiblePage>=pages} onClick={()=>setPage(n=>Math.min(n+1,pages))}>التالي</Button></div></div>
  </section>
  <section className="bat-guidance"><article className="ban-panel"><h2><ShieldCheck size={20}/> البيانات المتاحة للمراجعة</h2><p>معرّف تنفيذ مصطنع، ووكلاء مشاركون، ومدة إجمالية ومدد خطوات، وملخص نتيجة أو خطأ لا يحتوي على تفاصيل حساسة.</p></article><article className="ban-panel"><h2><LockKeyhole size={20}/> البيانات المحجوبة</h2><p>لا أسئلة مستخدمين خام، ولا محتوى وثائق، ولا SQL تنفيذي، ولا أسرار، ولا استدلال داخلي للنموذج. تتطلب البيانات الحقيقية سياسات RBAC وعزل المؤسسة من الخادم.</p></article></section>
  </>}
  <Drawer open={!!selected&&allowed} onClose={()=>setSelectedId(null)} title="تفاصيل مسار الوكلاء" description="سجل اصطناعي للعرض والتدريب فقط" footer={<Button variant="outline" size="sm" onClick={()=>setSelectedId(null)}>إغلاق</Button>}>
   {selected&&<Detail key={selected.id} trace={selected} onCopy={v=>void copy(v)}/>}
  </Drawer>
  {notice&&<div className="bat-toast"><Toast {...notice} onClose={()=>setNotice(null)}/></div>}
 </div>;
}
export function AgentTracesScreen(){return <AdminLayout variant="feature"><DemoAccessProvider initialRole="it_admin"><Main/></DemoAccessProvider></AdminLayout>;}
