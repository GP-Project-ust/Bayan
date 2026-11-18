'use client';

import {useState,type ReactNode} from 'react';
import Link from 'next/link';
import {
 Activity,ArrowLeft,BookLock,CheckCircle2,ChevronDown,ChevronLeft,ChevronUp,
 ClipboardCopy,Clock3,FileSearch,Info,LockKeyhole,ShieldAlert,ShieldCheck,
 Workflow,XCircle,AlertTriangle,CalendarClock,Route,Timer,Layers3
} from 'lucide-react';
import {AdminLayout} from '@/components/layout';
import {Button,Toast} from '@/components/ui';
import {StatePanel} from '@/components/states';
import {DemoAccessProvider,DemoRolePicker,useDemoAccess} from '@/components/access/DemoAccess';
import {TRACE_DEMO_NOTICE,agentLabels,kindLabels,stepStatuses,traceStatuses,type TraceStep,type TraceStatus,type StepStatus} from '@/lib/agent-traces/traces';
import {traceDetailState,findTraceDetail,traceNeighbors,traceDetailTabs,traceTimeline,traceSummary,explainStep,safeTraceDetailReference,type TraceDetailTab} from '@/lib/agent-trace-details/detail';

type Notice={title:string;message:string;tone:'success'|'warning'|'danger'|'info'};
const dateFormat=new Intl.DateTimeFormat('ar',{dateStyle:'long',timeStyle:'medium',timeZone:'Asia/Riyadh'});
const num=new Intl.NumberFormat('ar-EG');
function duration(value:number|null){return value===null?'— غير مكتملة':`${num.format(value)} مللي ثانية`;}
function TraceBadge({status}:{status:TraceStatus|StepStatus}){
 const Icon=status==='success'?CheckCircle2:status==='failed'?XCircle:status==='denied'?ShieldAlert:status==='running'?Clock3:Timer;
 return <span className={`btd-badge btd-badge--${status}`}><Icon size={15}/>{stepStatuses[status]}</span>;
}
function Stat({icon:Icon,label,value}:{icon:typeof Activity;label:string;value:string}){
 return <article className="btd-stat"><span><Icon size={20}/></span><div><small>{label}</small><strong>{value}</strong></div></article>;
}
function InfoItem({label,value,code=false}:{label:string;value:string;code?:boolean}){
 return <div className="btd-info-item"><dt>{label}</dt><dd dir={code?'ltr':undefined} className={code?'btd-code':''}>{value}</dd></div>;
}
function TimelineStep({step,index,startMs,endMs,share,open,onToggle}:{step:TraceStep;index:number;startMs:number|null;endMs:number|null;share:number|null;open:boolean;onToggle:()=>void}){
 return <li className={`btd-timeline-item btd-timeline-item--${step.status}`} data-testid={`trace-step-${step.id}`}>
  <span className="btd-step-index" aria-hidden="true">{num.format(index+1)}</span>
  <div className="btd-step-body">
   <button type="button" className="btd-step-toggle" aria-expanded={open} aria-controls={`btd-step-${step.id}`} onClick={onToggle}>
    <span className="btd-step-main"><span className="btd-agent-icon"><Workflow size={18}/></span><span><strong>{agentLabels[step.agent]}</strong><small lang="en" dir="ltr">{step.agent}</small><span className="btd-step-label">{step.label}</span></span></span>
    <span className="btd-step-extra"><TraceBadge status={step.status}/><span>{step.durationMs===null?'المدة غير متاحة':duration(step.durationMs)}</span>{open?<ChevronUp size={17}/>:<ChevronDown size={17}/>}</span>
   </button>
   <div id={`btd-step-${step.id}`} hidden={!open} className="btd-step-expanded"><p>{step.summary}</p><p className="btd-step-explanation"><Info size={15}/>{explainStep(step)}</p>
    <div className="btd-time-readouts"><span>بداية تسلسلية: <strong>{startMs===null?'—':`${num.format(startMs)} ms`}</strong></span><span>نهاية تسلسلية: <strong>{endMs===null?'—':`${num.format(endMs)} ms`}</strong></span><span>الحصة من المدد المعروفة: <strong>{share===null?'—':`${num.format(share)}%`}</strong></span></div>
    {share!==null&&<div role="img" aria-label={`نسبة الخطوة من المدد المسجلة ${share}%`} className="btd-step-meter"><span style={{width:`${share}%`}}/></div>}
   </div>
  </div>
 </li>;
}
function Details({requestedId}:{requestedId:string|null}){
 const {can}=useDemoAccess();const allowed=can('traces.view');
 const state=traceDetailState(requestedId);
 const trace=allowed&&state==='found'?findTraceDetail(requestedId):null;
 const summary=trace?traceSummary(trace):null;
 const timeline=trace?traceTimeline(trace):[];
 const neighbors=trace?traceNeighbors(trace.id):null;
 const [tab,setTab]=useState<TraceDetailTab>('overview');
 const [expanded,setExpanded]=useState<string[]>([]);
 const [notice,setNotice]=useState<Notice|null>(null);
 const stepsOpen=trace?expanded.filter(id=>trace.steps.some(s=>s.id===id)):[];
 async function copy(value:string){
  try{if(!navigator.clipboard?.writeText)throw Error('clipboard');await navigator.clipboard.writeText(value);setNotice({title:'نُسخ المرجع التجريبي',message:'يتضمن معلومات تشغيلية وصفية فقط.',tone:'success'});}
  catch{setNotice({title:'تعذّر النسخ',message:'اسمح للمتصفح باستخدام الحافظة، أو انسخ النص من الشاشة.',tone:'warning'});}
 }
 return <div className="ban bat btd" dir="rtl" data-testid="agent-trace-detail-screen">
  <nav className="ban-breadcrumb" aria-label="مسار التنقل"><Link href="/admin">لوحة الإدارة</Link><ChevronLeft size={15}/><Link href="/admin/agent-traces">تتبع الوكلاء</Link><ChevronLeft size={15}/><span aria-current="page">تفاصيل التنفيذ</span></nav>
  <header className="ban-hero bat-hero"><div><span className="ban-eyebrow"><Workflow size={17}/> الرقابة والتتبّع · UC-06</span><h1>تفاصيل مسار تنفيذ الوكلاء</h1><p>خطوات المعالجة ومؤشرات الزمن والنتائج التشغيلية المصرّح بها، بدون كشف معلومات النموذج الداخلية.</p><div className="ban-hero-tags"><span><ShieldCheck size={14}/> للقراءة فقط</span><span><Route size={14}/> مسار الوكلاء</span><span><LockKeyhole size={14}/> بيانات منقّحة</span></div></div><div className="ban-hero-art" aria-hidden="true"><Workflow size={75}/><i/></div></header>
  <div className="ban-disclaimer" role="note"><Info size={18}/><span><strong>{TRACE_DEMO_NOTICE}</strong> لا يوجد بث مباشر أو استعلامات تشغيل حقيقية أو سجلات خادم في هذه الشاشة.</span></div>
  <div className="ban-role"><span><ShieldCheck size={17}/> يعرض مسؤول تقنية المعلومات مسارات مؤسسته فقط في المحاكاة؛ يجب تنفيذ التحقق الحقيقي على الخادم.</span><DemoRolePicker id="agent-trace-details-role-picker"/></div>
  {!allowed?<section data-testid="agent-trace-details-forbidden" className="ban-locked"><StatePanel state="forbidden" title="غير مصرح بعرض تفاصيل هذا التنفيذ" description="لا تمنح صلاحية إدارة المنصة حق مراجعة مسارات مؤسسة أخرى تلقائيًا. يجب التحقق من النطاق في Backend."/><Link href="/admin/agent-traces">العودة إلى عمليات التنفيذ <ArrowLeft size={16}/></Link></section>:
   !trace||!summary?<section data-testid={`agent-trace-details-${state}`} className="ban-locked"><StatePanel state={state==='invalid'?'error':'empty'} title={state==='missing'?'لم تحدد معرّف التنفيذ':state==='invalid'?'معرّف التنفيذ غير صالح':'لم يُعثر على التنفيذ'} description="اختر معرّفًا من السجل التدريبي. لا يجري البحث في بيانات حقيقية أو مسارات خارج القائمة المسموحة."/><Link href="/admin/agent-traces">العودة إلى سجل الوكلاء <ArrowLeft size={16}/></Link></section>:<>
   <section className="ban-panel btd-header-card" aria-label="بطاقة مسار التنفيذ"><span className="btd-primary-icon"><Workflow size={27}/></span><div className="btd-header-title"><small>مسار تنفيذ تدريبي</small><h2>{trace.description}</h2><div className="btd-header-meta"><code dir="ltr">{trace.id}</code><span><CalendarClock size={15}/>{dateFormat.format(new Date(trace.startedAt))}</span><TraceBadge status={trace.status}/></div></div><div className="btd-actions"><Button size="sm" variant="outline" leadingIcon={<ClipboardCopy size={15}/>} onClick={()=>void copy(safeTraceDetailReference(trace))}>نسخ مرجع التنفيذ</Button><Link href="/admin/agent-traces"><ArrowLeft size={15}/> سجل العمليات</Link></div></section>
   <section className="btd-stats" aria-label="مؤشرات المسار"><Stat icon={Timer} label="المدة الإجمالية" value={duration(trace.durationMs)}/><Stat icon={Layers3} label="الخطوات" value={num.format(summary.steps)}/><Stat icon={CheckCircle2} label="خطوات ناجحة" value={num.format(summary.completed)}/><Stat icon={AlertTriangle} label="فشل أو رفض" value={num.format(summary.failed)}/></section>
   <section className="ban-panel btd-main"><div className="btd-tabs" role="tablist" aria-label="أقسام تفاصيل تتبع الوكلاء">{traceDetailTabs.map(t=><button key={t.id} type="button" id={`btd-tab-${t.id}`} role="tab" aria-selected={tab===t.id} aria-controls="btd-tab-panel" className={tab===t.id?'active':''} onClick={()=>setTab(t.id)}>{t.label}</button>)}</div>
    <div id="btd-tab-panel" className="btd-panel" role="tabpanel" aria-labelledby={`btd-tab-${tab}`}>
     {tab==='overview'&&<div className="btd-two-column"><section className="btd-section"><h3><Activity size={20}/> ملخص المسار</h3><p className="btd-paragraph">{trace.description} — هذه حالة تشغيل اصطناعية توضح مسار المعالجة دون معلومات حقيقية.</p><dl className="btd-info-grid"><InfoItem label="معرّف التنفيذ" value={trace.id} code/><InfoItem label="نوع الطلب" value={kindLabels[trace.kind]}/><InfoItem label="وقت البدء" value={dateFormat.format(new Date(trace.startedAt))}/><InfoItem label="المدة الإجمالية" value={duration(trace.durationMs)}/><InfoItem label="نتيجة التنفيذ" value={traceStatuses[trace.status]}/><InfoItem label="عدد الوكلاء المشاركين" value={num.format(summary.agents.length)}/></dl></section><aside className="btd-section btd-soft"><h3><Route size={20}/> الوكلاء المشاركون</h3><div className="btd-agent-list">{summary.agents.map((name,i)=><span key={name}><b>{num.format(i+1)}</b>{name}</span>)}</div><p>قد يتغير مسار المعالجة حسب نوع المهمة؛ الخطوات المتجاوزة لم تُنفّذ.</p><Link href="/admin/agent-traces">عرض بقية عمليات التنفيذ <ArrowLeft size={15}/></Link></aside></div>}
     {tab==='timeline'&&<section className="btd-section"><div className="btd-section-header"><div><h3><Workflow size={20}/> الخط الزمني للخطوات</h3><p>الترتيب والمدد مشتقة من بيانات الاختبار. لا تمثل أوقات بدء حقيقية لكل وكيل.</p></div><div className="btd-expand-actions"><button type="button" onClick={()=>setExpanded(trace.steps.map(s=>s.id))}>توسيع الكل</button><button type="button" onClick={()=>setExpanded([])}>طيّ الكل</button></div></div><ol className="btd-timeline">{timeline.map((item,index)=><TimelineStep key={item.id} step={item.step} index={index} startMs={item.startMs} endMs={item.endMs} share={item.share} open={stepsOpen.includes(item.id)} onToggle={()=>setExpanded(old=>old.includes(item.id)?old.filter(x=>x!==item.id):[...old,item.id])}/>)}</ol><div className="btd-note"><Info size={16}/> لا تُحسب مدة للخطوات التي لم تبدأ أو ما زالت «قيد التنفيذ»؛ ولا يجري تقدير أوقات غير متاحة.</div></section>}
     {tab==='diagnostics'&&<div className="btd-two-column"><section className="btd-section"><h3><FileSearch size={20}/> خلاصة النتيجة</h3><div className="btd-diagnostic"><TraceBadge status={trace.status}/><strong>{trace.status==='success'?'اكتملت جميع خطوات المسار المقررة في العينة':trace.status==='denied'?'توقف المسار بفعل قيد صلاحية توضيحي':trace.status==='failed'?'تعثر المسار في خطوة تشغيلية تجريبية':'تظهر حالة تنفيذ ثابتة للعرض فقط'}</strong><p>{trace.status==='running'?'لا توجد عملية حية ولا متابعة تلقائية للتحديث.':'تستند النتيجة إلى بيانات تشغيل تدريبية، وليست سجلًّا فعليًا.'}</p></div><dl className="btd-info-grid"><InfoItem label="الخطوات الناجحة" value={String(summary.completed)}/><InfoItem label="الخطوات الفاشلة أو المرفوضة" value={String(summary.failed)}/><InfoItem label="المتجاوزة" value={String(summary.skipped)}/><InfoItem label="قيد التنفيذ" value={String(summary.running)}/></dl></section><aside className="btd-section btd-soft"><h3><BookLock size={20}/> ارتباط التدقيق</h3>{summary.auditEventId?<><p>يتوفر حدث تدقيق تدريبي مرتبط بهذه العينة، ويمكن فتحه للمراجعة.</p><code dir="ltr" className="btd-inline-code">{summary.auditEventId}</code><Link href={`/admin/audit/details?id=${encodeURIComponent(summary.auditEventId)}`}><ArrowLeft size={16}/> فتح تفاصيل حدث التدقيق</Link></>:<p>لا يوجد حدث تدقيق مرتبط بهذه العينة. لن ننشئ حدثًا افتراضيًا اعتمادًا على معرّف التنفيذ.</p>}</aside></div>}
     {tab==='privacy'&&<section className="btd-section"><h3><LockKeyhole size={20}/> ضوابط الخصوصية وسلامة السجلات</h3><div className="btd-privacy-grid"><article><LockKeyhole size={22}/><strong>منع كشف الأسرار</strong><p>لا كلمات مرور أو رموز جلسات أو مفاتيح وصول أو اتصالات حساسة.</p></article><article><ShieldAlert size={22}/><strong>حجب المحتوى الداخلي</strong><p>لا أسئلة خام أو محتوى مستندات أو استدلال داخلي للنماذج أو نص SQL التنفيذي.</p></article><article><ShieldCheck size={22}/><strong>عزل المؤسسات</strong><p>تتحقق خدمات FastAPI مستقبلًا من هوية المستخدم ودوره ونطاق المؤسسة لكل طلب.</p></article><article><Activity size={22}/><strong>الاعتماد والتتبع</strong><p>السجل التدريبي ليس مصدرًا معتمدًا للمراقبة أو التدقيق. تحتاج النسخة الحقيقية إلى سجل موثوق.</p></article></div></section>}
    </div>
   </section>
   <nav className="btd-neighbors" aria-label="التنقل بين مسارات التنفيذ التدريبية"><span>{neighbors?.previous?<Link href={`/admin/agent-traces/details?id=${neighbors.previous}`}><ChevronLeft size={15}/> التنفيذ السابق</Link>:<span className="btd-disabled">لا يوجد تنفيذ سابق</span>}</span><Link href="/admin/agent-traces">العودة إلى تتبع الوكلاء</Link><span>{neighbors?.next?<Link href={`/admin/agent-traces/details?id=${neighbors.next}`}>التنفيذ التالي <ChevronLeft size={15}/></Link>:<span className="btd-disabled">لا يوجد تنفيذ تالٍ</span>}</span></nav>
   <footer className="btd-footer"><Info size={18}/> لا تمثل هذه الصفحة مراقبة مباشرة. لا تتصل بـLangGraph أو PostgreSQL أو Qdrant، ولا تعرض الاستدلال الداخلي للنموذج.</footer>
  </>}
  {notice&&<div className="bat-toast"><Toast {...notice} onClose={()=>setNotice(null)}/></div>}
 </div>;
}
export function AgentTraceDetailsScreen({requestedId}:{requestedId:string|null}){
 return <AdminLayout variant="feature"><DemoAccessProvider initialRole="it_admin"><Details key={requestedId??'missing'} requestedId={requestedId}/></DemoAccessProvider></AdminLayout>;
}
