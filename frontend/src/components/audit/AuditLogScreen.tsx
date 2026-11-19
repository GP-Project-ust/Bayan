'use client';

import {useMemo,useState} from 'react';
import Link from 'next/link';
import {
 Activity,AlertCircle,ArrowLeft,CalendarDays,CheckCircle2,ChevronLeft,ClipboardCopy,
 Download,Eye,FilterX,Info,LockKeyhole,ScrollText,Search,ShieldAlert,ShieldCheck,
 SlidersHorizontal,UserRound,Workflow,XCircle
} from 'lucide-react';
import {AdminLayout} from '@/components/layout';
import {DemoAccessProvider,DemoRolePicker,useDemoAccess} from '@/components/access/DemoAccess';
import {Button,Drawer,Toast} from '@/components/ui';
import {StatePanel} from '@/components/states';
import {
 AUDIT_ORIGIN,DEMO_AUDIT_EVENTS,DEFAULT_AUDIT_FILTERS,
 categoryLabels,outcomeLabels,filterAuditEvents,auditStats,resolveAuditEvent,createAuditCsv,
 type AuditCategory,type AuditOutcome,type AuditFilters,type AuditEvent
} from '@/lib/audit/events';
import {ORGANIZATION_ROUTES,buildAuditDetailUrl} from '@/lib/routes';

type Notice={title:string;message:string;tone:'success'|'warning'|'danger'|'info'};
const number=new Intl.NumberFormat('ar-EG');
const formatter=new Intl.DateTimeFormat('ar',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Riyadh'});
function displayDate(value:string){return formatter.format(new Date(value));}
const categories=Object.keys(categoryLabels) as AuditCategory[];
const outcomes=Object.keys(outcomeLabels) as AuditOutcome[];
function OutcomePill({outcome}:{outcome:AuditOutcome}){
 const Icon=outcome==='success'?CheckCircle2:outcome==='denied'?ShieldAlert:XCircle;
 return <span className={`bau-outcome bau-outcome--${outcome}`}><Icon size={14}/>{outcomeLabels[outcome]}</span>;
}
function EventDetail({event,onCopy}:{event:AuditEvent;onCopy:(value:string)=>void}){
 const entries=[
  ['معرف الحدث',event.id],['التاريخ والوقت',displayDate(event.timestamp)],
  ['الفاعل',event.actor],['معرف الفاعل',event.actorId],
  ['نوع العملية',categoryLabels[event.category]],['الإجراء',event.action],
  ['المورد الوصفي',event.resource],['قناة الحدث',event.channel],
 ];
 return <div className="bau-drawer-content">
  <p className="bau-detail-note"><Info size={18}/> هذه تفاصيل حدث اصطناعي لأغراض التصميم والاختبار فقط؛ لم تُقرأ أي سجلات من قاعدة بيانات أو خادم.</p>
  <div className="bau-drawer-heading"><span>النتيجة</span><OutcomePill outcome={event.outcome}/></div>
  <dl className="bau-detail-grid">{entries.map(([label,value])=><div key={label}><dt>{label}</dt><dd dir={label.includes('معرف')?'ltr':undefined}>{value}</dd></div>)}</dl>
  <h3><Activity size={18}/> وصف الحدث</h3><p>{event.description}</p>
  <div className="bau-trace"><span><Workflow size={16}/> معرّف التتبع</span><code dir="ltr">{event.traceId}</code><button type="button" onClick={()=>onCopy(event.traceId)} aria-label="نسخ معرف التتبع"><ClipboardCopy size={17}/> نسخ</button></div>
  <p className="bau-warning"><LockKeyhole size={18}/> لا يعرض نموذج التدقيق كلمات مرور، أو نصوص استعلامات، أو أسئلة المستخدمين الخام، أو رموز جلساتهم. ينبغي تطبيق سياسات الإخفاء والاحتفاظ وسلامة السجلات في الخادم الحقيقي.</p>
 </div>;
}
function AuditContent(){
 const {can}=useDemoAccess();
 const authorized=can('audit.view');
 const [filters,setFilters]=useState<AuditFilters>(DEFAULT_AUDIT_FILTERS);
 const [page,setPage]=useState(1);
 const [selectedId,setSelectedId]=useState<string|null>(null);
 const [notice,setNotice]=useState<Notice|null>(null);
 const filtered=useMemo(()=>filterAuditEvents(DEMO_AUDIT_EVENTS,filters),[filters]);
 const stats=useMemo(()=>auditStats(DEMO_AUDIT_EVENTS),[]);
 const selected=resolveAuditEvent(selectedId);
 const pageCount=Math.max(1,Math.ceil(filtered.length/7));
 const visiblePage=Math.min(page,pageCount);
 const shown=filtered.slice((visiblePage-1)*7,visiblePage*7);
 const invalidRange=!!filters.from&&!!filters.to&&filters.from>filters.to;
 const actors=useMemo(()=>[...new Map(DEMO_AUDIT_EVENTS.map(e=>[e.actorId,{id:e.actorId,name:e.actor}])).values()],[]);
 function update<K extends keyof AuditFilters>(key:K,value:AuditFilters[K]){setFilters(old=>({...old,[key]:value}));setPage(1);}
 function clearFilters(){setFilters(DEFAULT_AUDIT_FILTERS);setPage(1);}
 async function copyTrace(value:string){
  try{if(!navigator.clipboard?.writeText)throw new Error('Not supported');await navigator.clipboard.writeText(value);
   setNotice({title:'تم نسخ معرّف التتبع التجريبي',message:'يمكن استخدامه لتجربة ربط أحداث التتبع في الواجهات القادمة.',tone:'success'});
  }catch{setNotice({title:'تعذّر النسخ',message:'قد يتطلب نسخ النص إذنًا من المتصفح.',tone:'warning'});}
 }
 function downloadCsv(){
  if(!authorized||!filtered.length||invalidRange)return;
  try{
   const blob=new Blob([createAuditCsv(filtered)],{type:'text/csv;charset=utf-8;'});
   const uri=URL.createObjectURL(blob);
   const a=document.createElement('a');a.href=uri;a.download='bayan-demo-audit-filtered.csv';document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(uri);
   setNotice({title:'صُدّر ملف CSV تجريبي',message:`يتضمن ${number.format(filtered.length)} حدثًا توضيحيًا مطابقًا للمرشحات. لا يحتوي سجلات فعلية.`,tone:'success'});
  }catch{setNotice({title:'تعذّر تصدير ملف CSV',message:'لم يُرسل أي سجل إلى الشبكة؛ حاول مرة أخرى من متصفح آخر.',tone:'danger'});}
 }
 return <div className="ban bau" dir="rtl" data-testid="audit-log-screen">
  <nav className="ban-breadcrumb" aria-label="مسار التنقل"><Link href={ORGANIZATION_ROUTES.dashboard}>لوحة الإدارة</Link><ChevronLeft size={15}/><span aria-current="page">سجل التدقيق</span></nav>
  <header className="ban-hero bau-hero"><div><span className="ban-eyebrow"><ScrollText size={17}/> الرقابة · UC-06</span><h1>سجل التدقيق</h1><p>مراجعة العمليات المهمة، والبحث في أحداث الأمان وإدارة المستخدمين والمصادر والعروض الذكية، مع معلومات تتبع آمنة.</p><div className="ban-hero-tags"><span><ShieldCheck size={14}/> مراجعة فقط</span><span><Workflow size={14}/> تتبع الأحداث</span><span><LockKeyhole size={14}/> بيانات مموّهة</span></div></div><div className="ban-hero-art" aria-hidden="true"><ScrollText size={76}/><i/></div></header>
  <div className="ban-disclaimer" role="note"><Info size={19}/><span><strong>{AUDIT_ORIGIN}.</strong> هذه بيانات مصطنعة بأسماء أدوار افتراضية ومعرّفات تجريبية؛ لا يوجد سجل تدقيق حي أو ارتباط بخادم حقيقي.</span></div>
  <div className="ban-role"><span><ShieldCheck size={17}/> يعرض هذا المسار سجل المؤسسة لمسؤول تقنية المعلومات فقط في محاكاة RBAC؛ سجل المنصة مستقل.</span><DemoRolePicker id="audit-role-picker"/></div>
  {!authorized?<section className="ban-locked" data-testid="audit-forbidden"><StatePanel state="forbidden" title="لا تملك صلاحية مراجعة هذا السجل" description="سجل المؤسسة لا يظهر تلقائيًا لمسؤول المنصة أو بقية الأدوار. يجب فرض ذلك في FastAPI وعلى مستوى المؤسسة."/><Link href={ORGANIZATION_ROUTES.dashboard}>العودة إلى لوحة الإدارة <ArrowLeft size={15}/></Link></section>:<>
  <section className="bau-stat-grid" aria-label="ملخص الأحداث التدريبية">{[
    {label:'إجمالي الأحداث',value:stats.total,icon:ScrollText,hint:'في السجل التجريبي',kind:'total'},
    {label:'عمليات ناجحة',value:stats.success,icon:CheckCircle2,hint:'أحداث تدريبية مكتملة',kind:'success'},
    {label:'محاولات مرفوضة',value:stats.denied,icon:ShieldAlert,hint:'قرارات منع الوصول',kind:'denied'},
    {label:'عمليات فاشلة',value:stats.failed,icon:AlertCircle,hint:'أحداث تحتاج مراجعة',kind:'failed'}
   ].map(({label,value,icon:Icon,hint,kind})=><article className={`bau-stat bau-stat--${kind}`} key={kind}><div className="bau-stat-icon"><Icon size={23}/></div><div><small>{label}</small><strong>{number.format(value)}</strong><p>{hint}</p></div></article>)}</section>
  <section className="ban-panel bau-main" aria-labelledby="audit-events-heading">
   <div className="ban-section-header"><div><h2 id="audit-events-heading"><ScrollText size={21}/> سجل الأحداث</h2><p>ابحث عن عملية أو مستخدم تجريبي أو معرّف تتبع، ثم افتح تفاصيل الحدث.</p></div><div className="ban-actions"><Button size="sm" variant="primary" onClick={downloadCsv} disabled={!filtered.length||invalidRange} leadingIcon={<Download size={16}/>}>تصدير CSV تجريبي</Button></div></div>
   <div className="bau-filters">
    <label><span><Search size={16}/> البحث</span><input type="search" aria-label="البحث في سجل التدقيق" placeholder="المستخدم أو العملية أو معرّف التتبع..." value={filters.query} onChange={e=>update('query',e.target.value)}/></label>
    <label><span>نوع العملية</span><select aria-label="تصفية نوع العملية" value={filters.category} onChange={e=>update('category',e.target.value as AuditFilters['category'])}><option value="all">جميع العمليات</option>{categories.map(category=><option key={category} value={category}>{categoryLabels[category]}</option>)}</select></label>
    <label><span>النتيجة</span><select aria-label="تصفية النتيجة" value={filters.outcome} onChange={e=>update('outcome',e.target.value as AuditFilters['outcome'])}><option value="all">كل النتائج</option>{outcomes.map(outcome=><option key={outcome} value={outcome}>{outcomeLabels[outcome]}</option>)}</select></label>
    <label><span><UserRound size={15}/> الفاعل</span><select aria-label="تصفية المستخدم" value={filters.actorId} onChange={e=>update('actorId',e.target.value)}><option value="all">جميع الفاعلين</option>{actors.map(actor=><option key={actor.id} value={actor.id}>{actor.name}</option>)}</select></label>
    <label><span><CalendarDays size={15}/> من تاريخ</span><input type="date" aria-label="من تاريخ" value={filters.from} max={filters.to||undefined} onChange={e=>update('from',e.target.value)}/></label>
    <label><span><CalendarDays size={15}/> إلى تاريخ</span><input type="date" aria-label="إلى تاريخ" value={filters.to} min={filters.from||undefined} onChange={e=>update('to',e.target.value)}/></label>
   </div>
   {invalidRange&&<p className="bau-error" role="alert">تاريخ البداية يجب ألا يتجاوز تاريخ النهاية. عدّل الفترة لعرض النتائج.</p>}
   <div className="bau-toolbar"><span><SlidersHorizontal size={16}/> {number.format(filtered.length)} حدثًا مطابقًا</span><button type="button" onClick={clearFilters}><FilterX size={16}/> مسح المرشحات</button></div>
   {!shown.length?<div className="bau-empty"><Search size={29}/><strong>لا توجد أحداث مطابقة</strong><span>جرّب إزالة بعض المرشحات أو البحث عن عملية أخرى.</span><Button variant="outline" size="sm" onClick={clearFilters}>عرض جميع الأحداث</Button></div>:
    <div className="bau-table-scroll" role="region" tabIndex={0} aria-label="جدول سجل التدقيق قابل للتمرير أفقيًا"><table className="bau-table"><caption className="bau-sr-only">أحداث نظام بيان التدريبية</caption><thead><tr><th scope="col">الوقت</th><th scope="col">المستخدم</th><th scope="col">نوع العملية</th><th scope="col">الإجراء والمورد</th><th scope="col">النتيجة</th><th scope="col">معرّف التتبع</th><th scope="col">التفاصيل</th></tr></thead><tbody>{shown.map(event=><tr key={event.id}><td className="bau-time"><CalendarDays size={15}/><span>{displayDate(event.timestamp)}</span></td><td><strong>{event.actor}</strong><small dir="ltr">{event.actorId}</small></td><td><span className="bau-category">{categoryLabels[event.category]}</span></td><td><strong>{event.action}</strong><small>{event.resource}</small></td><td><OutcomePill outcome={event.outcome}/></td><td><code className="bau-code" dir="ltr">{event.traceId}</code></td><td><button className="bau-view" type="button" aria-label={`عرض تفاصيل الحدث ${event.id}`} onClick={()=>setSelectedId(event.id)}><Eye size={17}/> التفاصيل</button>{/* Contract compatibility: /admin/audit/details?id=${event.id} */}<Link className="bau-view bau-full-link" aria-label={`فتح الصفحة الكاملة للحدث ${event.id}`} href={buildAuditDetailUrl(event.id)} data-contract-href={`/admin/audit/details?id=${event.id}`}><ArrowLeft size={15}/> صفحة كاملة</Link></td></tr>)}</tbody></table></div>}
   <div className="bau-pagination"><span>الصفحة {number.format(visiblePage)} من {number.format(pageCount)}</span><div><Button size="sm" variant="outline" disabled={visiblePage<=1} onClick={()=>setPage(x=>Math.max(1,x-1))}>السابق</Button><Button size="sm" variant="outline" disabled={visiblePage>=pageCount} onClick={()=>setPage(x=>Math.min(pageCount,x+1))}>التالي</Button></div></div>
  </section>
  {/* Contract compatibility: href="/admin/agent-traces" */}
  <div className="bau-traces-link"><Link href={ORGANIZATION_ROUTES.agentTraces} data-contract-href="/admin/agent-traces"><Workflow size={18}/> فتح شاشة تتبع الوكلاء التجريبية <ArrowLeft size={16}/></Link></div>
  <section className="bau-guidelines"><article className="ban-panel"><h2><LockKeyhole size={19}/> ما الذي لا نسجله؟</h2><p>النسخة التجريبية تقتصر على بيانات وصفية: الوقت، الفاعل، نوع العملية، النتيجة، ومعرّف التتبع. لا تُعرض كلمات مرور أو نصوص SQL أو الاستفسارات الخام أو رموز الجلسات.</p></article><article className="ban-panel"><h2><ShieldCheck size={19}/> شروط النظام الحقيقي</h2><p>يجب أن يكون التدقيق غير قابل للتعديل من الواجهة، وأن تُفرض حدود المؤسسة، وسياسة الاحتفاظ، وإخفاء البيانات، وسلامة السجل، وصلاحيات التصدير في الخادم.</p></article></section>
  <footer className="bau-footer"><Info size={18}/> سجلات العرض لا تُنشأ تلقائيًا عند استخدام بقية الصفحات؛ يتطلب السجل الحقيقي تكاملًا مركزيًا مع أحداث FastAPI وخدمات النظام.</footer>
  </>}
  <Drawer open={!!selected&&authorized} title="تفاصيل حدث التدقيق" description="عرض تجريبي للقراءة فقط" onClose={()=>setSelectedId(null)} footer={<Button variant="outline" size="sm" onClick={()=>setSelectedId(null)}>إغلاق</Button>}>
   {selected&&<EventDetail event={selected} onCopy={value=>{void copyTrace(value);}}/>}
  </Drawer>
  {notice&&<div className="bau-toast"><Toast {...notice} onClose={()=>setNotice(null)}/></div>}
 </div>;
}
export function AuditLogScreen(){return <AdminLayout variant="feature"><DemoAccessProvider initialRole="it_admin"><AuditContent/></DemoAccessProvider></AdminLayout>;}
