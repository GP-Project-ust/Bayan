'use client';

import {useState} from 'react';
import Link from 'next/link';
import {
 Activity,ArrowLeft,CalendarClock,CheckCircle2,ChevronLeft,ClipboardCopy,
 Clock3,Database,FileSearch,Info,KeyRound,LockKeyhole,NotebookText,
 ScrollText,ShieldAlert,ShieldCheck,UserRound,Workflow,XCircle
} from 'lucide-react';
import {AdminLayout} from '@/components/layout';
import {Button,Toast} from '@/components/ui';
import {StatePanel} from '@/components/states';
import {DemoAccessProvider,DemoRolePicker,useDemoAccess} from '@/components/access/DemoAccess';
import {AUDIT_ORIGIN,categoryLabels,outcomeLabels,type AuditEvent,type AuditOutcome} from '@/lib/audit/events';
import {resolveTraceId} from '@/lib/agent-traces/traces';
import {
 auditEventSummary,auditNeighbors,detailTabs,eventDetailState,findAuditEvent,
 shareableAuditReference,traceDetailAvailability,type AuditDetailTab
} from '@/lib/audit/details';
import {ORGANIZATION_ROUTES,buildAgentTraceDetailUrl,buildAuditDetailUrl} from '@/lib/routes';

type Notice={title:string;message:string;tone:'success'|'warning'|'danger'|'info'};
const dateTime=new Intl.DateTimeFormat('ar',{dateStyle:'long',timeStyle:'medium',timeZone:'Asia/Riyadh'});
function OutcomeChip({value}:{value:AuditOutcome}){
 const Icon=value==='success'?CheckCircle2:value==='denied'?ShieldAlert:XCircle;
 return <span className={`bad-outcome bad-outcome--${value}`}><Icon size={17}/>{outcomeLabels[value]}</span>;
}
function InfoRow({label,value,code=false}:{label:string;value:string;code?:boolean}){
 return <div className="bad-info-row"><dt>{label}</dt><dd dir={code?'ltr':undefined} className={code?'bad-mono':''}>{value}</dd></div>;
}
function DetailsBody({requestedId}:{requestedId:string|null}){
 const {can}=useDemoAccess();
 const allowed=can('audit.view');
 const [tab,setTab]=useState<AuditDetailTab>('overview');
 const [notice,setNotice]=useState<Notice|null>(null);
 const state=eventDetailState(requestedId);
 const event=state==='found'?findAuditEvent(requestedId):null;
 const neighbors=event?auditNeighbors(event.id):null;
 const trace=event?traceDetailAvailability(event):null;
 const summary=event?auditEventSummary(event):null;
 async function copyText(text:string){
  try{
   if(!navigator.clipboard?.writeText)throw new Error('Clipboard unavailable');
   await navigator.clipboard.writeText(text);
   setNotice({title:'تم نسخ المرجع التدريبي',message:'لم تُرسل أي بيانات إلى شبكة أو خادم.',tone:'success'});
  }catch{setNotice({title:'تعذّر النسخ',message:'تحقق من سماح المتصفح بالوصول إلى الحافظة.',tone:'warning'});}
 }
 return <div className="ban bad" dir="rtl" data-testid="audit-detail-screen">
   <nav className="ban-breadcrumb" aria-label="مسار التنقل"><Link href={ORGANIZATION_ROUTES.dashboard}>لوحة الإدارة</Link><ChevronLeft size={15}/><Link href={ORGANIZATION_ROUTES.audit}>سجل التدقيق</Link><ChevronLeft size={15}/><span aria-current="page">تفاصيل الحدث</span></nav>
   <header className="ban-hero bad-hero"><div><span className="ban-eyebrow"><FileSearch size={17}/> الرقابة · UC-06</span><h1>تفاصيل حدث التدقيق</h1><p>عرض بيانات الحدث والفاعل والنتيجة ومعرّف التتبع دون تعديل السجل أو كشف معلومات حساسة.</p><div className="ban-hero-tags"><span><ShieldCheck size={14}/> للقراءة فقط</span><span><Workflow size={14}/> معرّف تتبع</span><span><LockKeyhole size={14}/> خصوصية البيانات</span></div></div><div className="ban-hero-art" aria-hidden="true"><ScrollText size={76}/><i/></div></header>
   <div className="ban-disclaimer" role="note"><Info size={18}/><span><strong>{AUDIT_ORIGIN}.</strong> لم تُقرأ سجلات فعلية من خادم أو قاعدة بيانات؛ كل التفاصيل أدناه اصطناعية.</span></div>
   <div className="ban-role"><span><ShieldCheck size={17}/> تتطلب تفاصيل الحدث صلاحية مراجعة سجل تدقيق المؤسسة، وتُحجب عن بقية الأدوار في المحاكاة.</span><DemoRolePicker id="audit-detail-role-picker"/></div>
   {!allowed?<section className="ban-locked" data-testid="audit-detail-forbidden"><StatePanel state="forbidden" title="لا تملك صلاحية عرض تفاصيل هذا الحدث" description="مسؤول المنصة لا يحصل تلقائيًا على أحداث مؤسسة أخرى. يجب فرض هذا المنع في Backend."/><Link href={ORGANIZATION_ROUTES.audit}>العودة إلى سجل التدقيق <ArrowLeft size={16}/></Link></section>:
    state!=='found'||!event||!summary?<section className="ban-locked" data-testid={`audit-detail-${state}`}><StatePanel state={state==='invalid'?'error':'empty'} title={state==='missing'?'لم تحدد حدثًا':state==='invalid'?'معرّف الحدث غير صالح':'الحدث غير موجود'} description="اختر حدثًا من سجل التدقيق التجريبي؛ لا يجري البحث عن أحداث خارج البيانات المسموحة."/><Link href={ORGANIZATION_ROUTES.audit}>العودة إلى جميع الأحداث <ArrowLeft size={16}/></Link></section>:<>
    <section className="bad-event-card ban-panel" aria-label="بطاقة الحدث"><div className="bad-event-mark"><ScrollText size={27}/></div><div className="bad-event-title"><span className="bad-label">الحدث التدريبي</span><h2>{event.action}</h2><p>{categoryLabels[event.category]} · {event.resource}</p><div className="bad-event-metadata"><code dir="ltr">{event.id}</code><span><CalendarClock size={15}/>{dateTime.format(new Date(event.timestamp))}</span><OutcomeChip value={event.outcome}/></div></div><div className="bad-actions"><Button variant="outline" size="sm" onClick={()=>void copyText(shareableAuditReference(event))} leadingIcon={<ClipboardCopy size={16}/>}>نسخ المرجع</Button><Link className="bad-outline-link" href={ORGANIZATION_ROUTES.audit}><ArrowLeft size={16}/> كل الأحداث</Link></div></section>
    <section className="bad-stats" aria-label="ملخص بيانات الحدث"><article><span><UserRound size={20}/></span><small>الفاعل</small><strong>{event.actor}</strong></article><article><span><NotebookText size={20}/></span><small>نوع العملية</small><strong>{categoryLabels[event.category]}</strong></article><article><span><Clock3 size={20}/></span><small>الطابع الزمني</small><strong>{event.timestamp.slice(0,10)}</strong></article><article><span><Workflow size={20}/></span><small>التتبع</small><strong dir="ltr">{event.traceId}</strong></article></section>
    <section className="ban-panel bad-main"><div className="bad-tabs" role="tablist" aria-label="أقسام تفاصيل التدقيق">{detailTabs.map(t=><button id={`bad-tab-${t.id}`} role="tab" aria-controls="bad-tab-panel" type="button" aria-selected={tab===t.id} key={t.id} onClick={()=>setTab(t.id)} className={tab===t.id?'active':''}>{t.label}</button>)}</div>
     <div id="bad-tab-panel" role="tabpanel" aria-labelledby={`bad-tab-${tab}`} className="bad-panel">
      {tab==='overview'&&<div className="bad-two-col"><div className="bad-section"><h3><Activity size={20}/> ملخص ما حدث</h3><p className="bad-description">{event.description}</p><dl className="bad-info"><InfoRow label="الإجراء" value={event.action}/><InfoRow label="المورد الوصفي" value={event.resource}/><InfoRow label="النتيجة" value={outcomeLabels[event.outcome]}/></dl></div><aside className="bad-section bad-soft"><h3><ShieldCheck size={20}/> تفسير النتيجة</h3><p>{event.outcome==='success'?'تسجل العينة نجاح إجراء توضيحي؛ لا يثبت ذلك تنفيذ عملية فعلية.':event.outcome==='denied'?'توضح العينة رفض العملية بسبب ضوابط الوصول؛ لا يكشف السجل محتوى المورد المحمي.':'توضح العينة فشل إجراء افتراضي؛ ولا تتضمن أسرارًا تقنية أو تفاصيل حساسة.'}</p><div className="bad-note"><Info size={17}/> لا يمكن تعديل أو حذف حدث التدقيق من هذه الصفحة.</div></aside></div>}
      {tab==='metadata'&&<div className="bad-section"><h3><Database size={20}/> البيانات الوصفية المسموح بعرضها</h3><dl className="bad-info bad-info--grid"><InfoRow label="معرف الحدث" value={summary.eventId} code/><InfoRow label="التاريخ والوقت" value={dateTime.format(new Date(summary.timestamp))}/><InfoRow label="الفاعل" value={summary.actor}/><InfoRow label="معرف الفاعل" value={summary.actorId} code/><InfoRow label="تصنيف العملية" value={summary.category}/><InfoRow label="المورد" value={summary.resource}/><InfoRow label="قناة الحدث" value={summary.channel}/><InfoRow label="النتيجة" value={summary.outcome}/></dl><p className="bad-note"><Info size={17}/> القيم أسماء ومعرّفات اصطناعية لأغراض التطوير، لا تمثل أفرادًا أو نشاطًا حقيقيًا.</p></div>}
      {tab==='trace'&&<div className="bad-section"><h3><Workflow size={20}/> ربط الحدث بالتتبع</h3><div className="bad-trace"><div><small>معرّف الارتباط التجريبي</small><code dir="ltr">{trace?.traceId}</code></div><Button size="sm" variant="outline" onClick={()=>void copyText(event.traceId)} leadingIcon={<ClipboardCopy size={16}/>}>نسخ معرّف التتبع</Button></div><div className="bad-timeline"><div><span><ScrollText size={17}/></span><div><strong>توفر السجل الوصفي</strong><p>يوجد حدث تجريبي يرتبط بهذا المعرّف في كتالوج التدقيق.</p></div></div><div><span><ShieldCheck size={17}/></span><div><strong>النتيجة المسجلة</strong><p>{outcomeLabels[event.outcome]} — هذه حالة المثال، وليست نتيجة تنفيذ مباشر.</p></div></div><div><span><LockKeyhole size={17}/></span><div><strong>خطوات الوكلاء التفصيلية</strong><p>{trace?.reason}</p></div></div></div>{resolveTraceId(event.traceId)&&<Link className="bad-outline-link" href={buildAgentTraceDetailUrl(event.traceId)}><Workflow size={16}/> عرض خطوات التتبع التدريبي المطابق <ArrowLeft size={15}/></Link>}<p className="bad-note"><Info size={17}/> الربط مع Agent Trace الحقيقي سيكون ممكنًا بعد توفر API مصرح به. لا يتم اختلاق خطوات للوكلاء اعتمادًا على معرّف التتبع.</p></div>}
      {tab==='privacy'&&<div className="bad-section bad-privacy"><h3><LockKeyhole size={20}/> ضوابط الخصوصية وسلامة التدقيق</h3><div className="bad-privacy-grid"><article><KeyRound size={23}/><strong>حجب الأسرار</strong><p>لا كلمات مرور أو رموز جلسات أو عناوين اتصال حساسة.</p></article><article><ShieldAlert size={23}/><strong>عزل المؤسسة</strong><p>إلزام الخادم بالتحقق من المؤسسة والمستخدم قبل إتاحة الحدث.</p></article><article><ScrollText size={23}/><strong>سلامة السجل</strong><p>يجب تطبيق تخزين وتسجيل غير قابلين للتعديل من واجهة المستخدم.</p></article><article><Database size={23}/><strong>حدود الاحتفاظ</strong><p>تحدد السياسة المؤسسية المدة والإخفاء والتصدير عند بناء الخدمات الحقيقية.</p></article></div></div>}
     </div>
    </section>
    <nav className="bad-bottom-nav" aria-label="التنقل بين الأحداث التدريبية"><span>{neighbors?.previous?<Link href={buildAuditDetailUrl(neighbors.previous)}>الحدث السابق <ChevronLeft size={15}/></Link>:<span className="bad-disabled">لا يوجد حدث سابق</span>}</span><Link href={ORGANIZATION_ROUTES.audit}>العودة إلى سجل التدقيق</Link><span>{neighbors?.next?<Link href={buildAuditDetailUrl(neighbors.next)}><ChevronLeft size={15}/> الحدث التالي</Link>:<span className="bad-disabled">لا يوجد حدث تالٍ</span>}</span></nav>
    <footer className="bad-footer"><LockKeyhole size={18}/> لا تحتوي البيانات التدريبية على SQL أو مدخلات المستخدم الخام أو أسرار المصادقة. يجب تطبيق RBAC والاحتفاظ وسلامة السجل في FastAPI قبل الإطلاق.</footer>
   </>}
   {notice&&<div className="bau-toast"><Toast {...notice} onClose={()=>setNotice(null)}/></div>}
  </div>;
}
export function AuditEventDetailsScreen({requestedId}:{requestedId:string|null}){
 return <AdminLayout variant="feature"><DemoAccessProvider initialRole="it_admin"><DetailsBody key={requestedId??'missing'} requestedId={requestedId}/></DemoAccessProvider></AdminLayout>;
}
