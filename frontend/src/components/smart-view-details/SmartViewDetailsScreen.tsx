'use client';

import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {
 ArrowLeft,BookOpen,CheckCircle2,ChevronLeft,ClipboardCopy,Code2,Database,FileCode2,
 Info,Layers3,LockKeyhole,Play,RefreshCcw,SearchCheck,ShieldAlert,ShieldCheck,
 Table2,TriangleAlert,Workflow
} from 'lucide-react';
import {AdminLayout} from '@/components/layout';
import {DemoAccessProvider,DemoRolePicker,useDemoAccess} from '@/components/access/DemoAccess';
import {Button,Toast} from '@/components/ui';
import {StatePanel} from '@/components/states';
import {SOURCE_STORAGE_KEY,restoreSourceFlags,withLocalFlags,sourceClassLabels,sourceTypeLabels,type DataSource} from '@/lib/data-sources/sources';
import {CREATED_SOURCES_KEY,restoreCreatedSources} from '@/lib/data-sources/connect';
import {getSourceSchema} from '@/lib/data-sources/details';
import {DRAFT_STORAGE_KEY,restoreLocalDrafts} from '@/lib/smart-view-create/wizard';
import {DEMO_VIEWS,VIEW_STORAGE_KEY,VIEW_CLASS_LABELS,VIEW_STATUS_LABELS,applyViewStates,restoreViewStates,type SmartView} from '@/lib/smart-views/views';
import {buildDetailPreview,findDetailView,illustrativeDraftQuery,isSavedDraft,normalizeViewId,runLocalInspection,safeDetailDescriptor,schemaForDraft,type DetailSimulation,type DetailView} from '@/lib/smart-view-details/details';

type Tab='overview'|'fields'|'security'|'inspection';
type Notice={title:string;message:string;tone:'success'|'warning'|'danger'|'info'};
const tabs:{id:Tab;label:string;icon:typeof Layers3}[]=[
 {id:'overview',label:'نظرة عامة',icon:Layers3},{id:'fields',label:'الحقول والتعريف',icon:Table2},
 {id:'security',label:'التصنيف والوصول',icon:ShieldCheck},{id:'inspection',label:'فحص محلي',icon:SearchCheck}
];
function DetailContent({requestedId}:{requestedId:string|null}){
 const {can}=useDemoAccess();
 const authorized=can('smartviews.manage');
 const [loaded,setLoaded]=useState(false);
 const [flags,setFlags]=useState<Record<string,boolean>>({});
 const [created,setCreated]=useState<DataSource[]>([]);
 const [drafts,setDrafts]=useState<DetailView[]>([]);
 const [states,setStates]=useState<Record<string,'active'|'paused'>>({});
 const [tab,setTab]=useState<Tab>('overview');
 const [inspection,setInspection]=useState<DetailSimulation|null>(null);
 const [notice,setNotice]=useState<Notice|null>(null);
 useEffect(()=>{
  try{const raw=localStorage.getItem(SOURCE_STORAGE_KEY);if(raw)setFlags(restoreSourceFlags(JSON.parse(raw)));}catch{}
  try{const raw=localStorage.getItem(CREATED_SOURCES_KEY);if(raw)setCreated(restoreCreatedSources(JSON.parse(raw)));}catch{}
  try{const raw=localStorage.getItem(DRAFT_STORAGE_KEY);if(raw)setDrafts(restoreLocalDrafts(JSON.parse(raw)));}
  catch{setNotice({title:'تعذّر تحميل المسودات',message:'لن تُعرض أي مسودة لم يجتز سجلها التحقق المحلي.',tone:'warning'});}
  try{const raw=localStorage.getItem(VIEW_STORAGE_KEY);if(raw)setStates(restoreViewStates(JSON.parse(raw)));}catch{}
  setLoaded(true);
 },[]);
 const sources=useMemo(()=>[...withLocalFlags(flags),...created],[flags,created]);
 const candidates=useMemo<DetailView[]>(()=>[...applyViewStates(DEMO_VIEWS,states),...drafts],[states,drafts]);
 const view=useMemo(()=>findDetailView(requestedId,candidates),[requestedId,candidates]);
 const source=useMemo(()=>view?sources.find(s=>s.id===view.sourceId):undefined,[view,sources]);
 const descriptor=useMemo(()=>view?buildDetailPreview(view,source):null,[view,source]);
 const matchingTable=useMemo(()=>view?schemaForDraft(view,source):null,[view,source]);
 const pseudoSql=useMemo(()=>view?illustrativeDraftQuery(view,source):null,[view,source]);
 const schema=useMemo(()=>source?getSourceSchema(source):null,[source]);
 const columns=useMemo(()=>view?view.fields.map(field=>{
  const meta=schema?.tables.flatMap(t=>t.fields).find(f=>f.name===field);
  return {field,kind:meta?.kind||'حقل مجمّع افتراضي',classification:meta?.classification||'illustrative',description:meta?.description||'عنصر تخطيطي للتوضيح فقط'};
 }):[],[schema,view]);
 useEffect(()=>{setInspection(null);setTab('overview');},[requestedId]);
 function inspect(){
  if(!authorized||!view)return;
  setInspection(runLocalInspection(view,source));setTab('inspection');
 }
 async function copyDescriptor(){
  if(!authorized||!view)return;
  const value=safeDetailDescriptor(view,source);
  if(!value){setNotice({title:'المعاينة غير متاحة',message:'المصدر غير مؤهل أو التعريف لا يجتاز ضوابط الأمان المحلية.',tone:'warning'});return;}
  try{
   if(!navigator.clipboard?.writeText)throw new Error('clipboard unavailable');
   await navigator.clipboard.writeText(JSON.stringify(value,null,2));
   setNotice({title:'نُسخ الوصف التجريبي',message:'تم نسخ تعريف JSON فقط؛ دون بيانات شخصية أو كلمات مرور أو نتائج SQL.',tone:'success'});
  }catch{setNotice({title:'تعذّر النسخ',message:'يمكنك قراءة التعريف في تبويب الحقول والتعريف.',tone:'warning'});}
 }
 const fieldsSafe=!!descriptor;
 return <div className="ban bsv27" dir="rtl" data-testid="smart-view-details-screen">
  <nav className="ban-breadcrumb" aria-label="مسار التنقل"><Link href="/admin">لوحة الإدارة</Link><ChevronLeft size={15}/><Link href="/admin/smart-views">العروض الذكية</Link><ChevronLeft size={15}/><span aria-current="page">تفاصيل العرض</span></nav>
  <header className="ban-hero bsv27-hero"><div><span className="ban-eyebrow"><FileCode2 size={17}/> الإدارة · UC-05</span><h1>تفاصيل العرض الذكي واختباره</h1><p>استعراض التعريف الوصفي والحقول والتصنيف الأمني، وفحص افتراضي لا يقرأ البيانات ولا ينفّذ SQL.</p><div className="ban-hero-tags"><span><ShieldCheck size={14}/> صلاحيات المؤسسة</span><span><Code2 size={14}/> تعريف للقراءة فقط</span><span><LockKeyhole size={14}/> بلا نشر</span></div></div><div className="ban-hero-art" aria-hidden="true"><FileCode2 size={73}/><i/></div></header>
  <div className="ban-disclaimer" role="note"><Info size={18}/><span><strong>معاينة تعليمية بالكامل:</strong> أسماء المصادر والجداول والحقول أمثلة تدريبية وليست بنية قاعدة بيانات مكتشفة. نتيجة الفحص والصفوف المحتملة اصطناعية، ولا توجد طلبات شبكة أو استعلامات SQL منفّذة.</span></div>
  <div className="ban-role"><span><ShieldCheck size={17}/> تفاصيل العروض المؤسسية متاحة لمسؤول تقنية المعلومات في محاكاة الأدوار.</span><DemoRolePicker id="bsv27-role-picker"/></div>
  {!authorized?<section className="ban-locked" data-testid="smart-view-details-forbidden"><StatePanel state="forbidden" title="لا تملك صلاحية عرض التفاصيل التقنية" description="مسؤول المنصة والأدوار الأخرى لا يرثون صلاحيات عرض بيانات المؤسسة. الحماية النهائية تُنفَّذ في Backend."/><Link href="/admin/smart-views">العودة إلى قائمة العروض <ArrowLeft size={16}/></Link></section>:
  !loaded?<section className="ban-panel"><p role="status">جارٍ التحقق من البيانات المحلية...</p></section>:
  !view?<section className="ban-panel bsv27-missing" data-testid="smart-view-details-missing"><TriangleAlert size={34}/><h2>{normalizeViewId(requestedId)?'العرض غير موجود أو حُذفت مسودته':'رابط العرض غير صالح'}</h2><p>لم يُعثر على تعريف مطابق في الأمثلة أو المسودات الآمنة المحفوظة. لن تُعرض تفاصيل مفترضة لمعرّف غير معروف.</p><Link href="/admin/smart-views" className="bsv27-primary-link">العودة إلى العروض <ArrowLeft size={16}/></Link></section>:
  <>
   <section className="ban-panel bsv27-identity" aria-label="هوية العرض المختار">
    <div className="bsv27-title"><span className="bsv27-view-icon"><Layers3 size={31}/></span><div><small>تعريف عرض ذكي تدريبي</small><h2>{view.name}</h2><code dir="ltr">{view.id}</code><p>{view.description}</p></div></div>
    <div className="bsv27-pills"><span className={`bsv27-status bsv27-status--${view.status}`}>{VIEW_STATUS_LABELS[view.status]}</span><span className="bsv27-class"><ShieldCheck size={14}/>{VIEW_CLASS_LABELS[view.classification]}</span><span className="bsv27-draft">{isSavedDraft(view)?'مسودة محلية':'مثال وصفي فقط'}</span></div>
    <div className="bsv27-actions"><Link href="/admin/smart-views" className="bsv27-subtle-link"><ArrowLeft size={17}/> قائمة العروض</Link><Button variant="outline" size="sm" onClick={()=>void copyDescriptor()} leadingIcon={<ClipboardCopy size={16}/>}>نسخ التعريف</Button><Button size="sm" onClick={inspect} leadingIcon={<Play size={17}/>}>تشغيل فحص تجريبي</Button></div>
   </section>
   <section className="bsv27-stats" aria-label="ملخص العرض">
    <article><Database size={23}/><span>مصدر البيانات</span><strong>{source?.name||'غير متاح'}</strong><small>{source?sourceTypeLabels[source.type]:'مصدر غير معروف'}</small></article>
    <article><Table2 size={23}/><span>الحقول التوضيحية</span><strong>{view.fields.length.toLocaleString('ar-EG')}</strong><small>لا توجد سجلات حقيقية</small></article>
    <article><ShieldCheck size={23}/><span>تصنيف العرض</span><strong>{VIEW_CLASS_LABELS[view.classification]}</strong><small>يستلزم مراجعة خادم لاحقة</small></article>
    <article><Workflow size={23}/><span>حالة النشر الفعلية</span><strong>غير منشور</strong><small>لا يوجد اتصال بقاعدة البيانات</small></article>
   </section>
   <section className="ban-panel bsv27-content" aria-label="التفاصيل التقنية">
    <div className="bsv27-tabs" role="tablist" aria-label="تبويبات تفاصيل العرض">{tabs.map(({id,label,icon:Icon})=><button type="button" role="tab" key={id} id={`bsv27-tab-${id}`} aria-selected={tab===id} aria-controls="bsv27-panel" className={tab===id?'active':''} onClick={()=>setTab(id)}><Icon size={17}/>{label}</button>)}</div>
    <div role="tabpanel" id="bsv27-panel" aria-labelledby={`bsv27-tab-${tab}`} className="bsv27-pane">
     {tab==='overview'&&<div className="bsv27-two-col"><section><h3><BookOpen size={20}/> ملخص التعريف</h3><dl className="bsv27-facts">{[
      ['الاسم',view.name],['المعرّف',view.id],['المصدر',source?.name||'غير متاح'],['المالك المسجل في المثال',view.owner],['النطاق',view.scope],['الجمهور المقترح',view.audience],['آخر تحديث تمثيلي',view.lastUpdated],['حالة العرض',VIEW_STATUS_LABELS[view.status]]
     ].map(([key,value])=><div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl></section><aside className="bsv27-side-note"><LockKeyhole size={27}/><h3>فصل العرض عن البيانات الحقيقية</h3><p>تُستخدم Smart Views لتحديد البيانات المسموح بعرضها للوكلاء بعد مراجعة المصدر والحقول والصلاحيات. لا يمكن اعتبار أي تعريف في هذه الصفحة عرضًا منشورًا.</p><Link href={`/admin/data-sources/details?id=${encodeURIComponent(view.sourceId)}`}><Database size={16}/> فتح تفاصيل مصدر البيانات <ArrowLeft size={15}/></Link></aside></div>}
     {tab==='fields'&&<><div className="bsv27-pane-heading"><div><h3><Table2 size={20}/> حقول العرض</h3><p>أسماء وصفية مصدرها عينات التدريب فقط؛ التصنيف الفعلي يتطلب مراجعة المخطط على الخادم.</p></div><span>{columns.length} حقول</span></div>
      <div className="bsv27-table-scroll" role="region" tabIndex={0} aria-label="جدول حقول العرض قابل للتمرير"><table><thead><tr><th>الحقل</th><th>النوع التوضيحي</th><th>التصنيف الوصفي</th><th>التفسير</th></tr></thead><tbody>{columns.map(col=><tr key={col.field}><td><code dir="ltr">{col.field}</code></td><td>{col.kind}</td><td>{col.classification==='illustrative'?'غير مثبت':((sourceClassLabels as Record<string, string>)[col.classification] || col.classification)}</td><td>{col.description}</td></tr>)}</tbody></table></div>
      <div className="bsv27-pane-heading bsv27-code-heading"><div><h3><Code2 size={20}/> تعريف العرض للقراءة فقط</h3><p>JSON وصفي آمن، ولا يمثّل تعريف SQL منشورًا أو أمرًا قابلًا للتنفيذ.</p></div><Button variant="outline" size="sm" onClick={()=>void copyDescriptor()} leadingIcon={<ClipboardCopy size={15}/>}>نسخ JSON</Button></div>
      {descriptor?<pre className="bsv27-json" dir="ltr">{JSON.stringify(safeDetailDescriptor(view,source),null,2)}</pre>:<div className="bsv27-blocked"><ShieldAlert size={20}/> المعاينة ممنوعة لأن المصدر أو بنية التعريف غير مؤهلين.</div>}
      {pseudoSql&&<><div className="bsv27-pane-heading bsv27-code-heading"><div><h3><Code2 size={20}/> SQL تصوري للقراءة فقط</h3><p>مثال توثيقي بمُعرّفات مُتحقق منها ومعاملات رمزية؛ لا يتم تشغيله أو إرساله إلى خادم.</p></div></div><pre className="bsv27-json" dir="ltr">{pseudoSql}</pre></>}
      <div className="bsv27-info"><Info size={17}/>{matchingTable?`جدول ${matchingTable.name} معرّف ضمن مخطط تدريبي — ليس جدولًا تم اكتشافه فعليًا.`:'لا يوجد جدول SQL موثوق مرتبط بهذا المثال؛ لذلك لا نعرض استعلامًا مفترضًا.'}</div>
     </>}
     {tab==='security'&&<div className="bsv27-security"><section><h3><ShieldCheck size={21}/> ضوابط الوصول</h3><ul><li>الصلاحية المعروضة: إدارة العروض الذكية للمؤسسة فقط.</li><li>لا يُسمح بالمصادر المصنفة «محظورة».</li><li>المسودات الجديدة لا تتضمن حقولًا مقيّدة أو محظورة في خياراتها.</li><li>لا يُسمح بتخفيض تصنيف المسودة عن تصنيف المصدر.</li><li>العزل بين المؤسسات والتحقق من RBAC والتدقيق تُنفَّذ في FastAPI وقاعدة البيانات لاحقًا.</li></ul></section><aside className="bsv27-security-status"><h3>مقارنة التصنيف</h3><dl><div><dt>تصنيف المصدر</dt><dd>{source?sourceClassLabels[source.classification]:'غير معروف'}</dd></div><div><dt>تصنيف العرض</dt><dd>{VIEW_CLASS_LABELS[view.classification]}</dd></div></dl>{!descriptor?<p className="warn">تعريف غير مؤهل للمعاينة</p>:source?.classification==='restricted'&&view.classification!=='restricted'?<p className="warn">يلزم تدقيق التصنيف قبل استخدام هذا المثال.</p>:<p>المطابقة هنا مبدئية ومحلية ولا تمنح صلاحية حقيقية.</p>}</aside></div>}
     {tab==='inspection'&&<section className="bsv27-inspect"><div className="bsv27-pane-heading"><div><h3><SearchCheck size={20}/> فحص التعريف محليًا</h3><p>محاكاة محدودة للضوابط وبنية البيانات؛ لا اتصال بالخادم، ولا SQL منفّذ.</p></div><Button onClick={inspect} leadingIcon={<RefreshCcw size={16}/>}>{inspection?'إعادة الفحص':'بدء الفحص التجريبي'}</Button></div>
      {!inspection?<div className="bsv27-inspect-empty"><Play size={35}/><h4>لم يبدأ الفحص بعد</h4><p>اضغط «بدء الفحص التجريبي» لمراجعة صلاحية المصدر وبنية التعريف والتصنيف دون تنفيذ أي استعلام.</p></div>:<><div className={`bsv27-verdict bsv27-verdict--${inspection.verdict}`} role="status"><Info size={20}/>{inspection.message}</div><div className="bsv27-checks">{inspection.checks.map(check=><article key={check.id} className={`bsv27-check bsv27-check--${check.result}`}>{check.result==='pass'?<CheckCircle2 size={20}/>:<TriangleAlert size={20}/>}<div><strong>{check.label}</strong><p>{check.detail}</p></div><span>{check.result==='pass'?'اجتاز':'يتطلب مراجعة'}</span></article>)}</div>
       <div className="bsv27-pane-heading"><div><h3><Table2 size={20}/> صفوف اختبار مصطنعة</h3><p>الأمثلة أدناه مولَّدة من قيم ثابتة فقط، ولا تمثل بيانات من PostgreSQL أو Odoo.</p></div></div>
       {inspection.rows.length?<div className="bsv27-table-scroll" role="region" tabIndex={0} aria-label="جدول بيانات اصطناعية"><table><thead><tr>{view.fields.map(field=><th key={field} dir="ltr">{field}</th>)}</tr></thead><tbody>{inspection.rows.map((row,i)=><tr key={i}>{view.fields.map(field=><td key={field}>{row[field]}</td>)}</tr>)}</tbody></table></div>:<div className="bsv27-info"><ShieldAlert size={17}/> لا تتوفر صفوف اصطناعية آمنة لهذا التعريف؛ لم يتم الوصول إلى أي مصدر بيانات.</div>}
       </>}
     </section>}
    </div>
   </section>
   <footer className="bsv27-footer"><Info size={18}/><p>هذه الشاشة نموذج تفاعلي توثيقي. قبل نشر أي Smart View حقيقي يجب اعتماد مخطط البيانات، ومراجعة تصنيف الحقول، وفرض عزل المؤسسة والصلاحيات، وتسجيل عمليات التدقيق في الخادم.</p></footer>
  </>}
  {notice&&<div className="bsv27-toast"><Toast {...notice} onClose={()=>setNotice(null)}/></div>}
 </div>;
}
export function SmartViewDetailsScreen({requestedId}:{requestedId:string|null}){
 return <DemoAccessProvider initialRole="it_admin"><AdminLayout variant="feature"><DetailContent requestedId={requestedId}/></AdminLayout></DemoAccessProvider>;
}
