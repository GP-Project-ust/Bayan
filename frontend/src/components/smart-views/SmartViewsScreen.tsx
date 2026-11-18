'use client';

import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {
 Activity,ArrowLeft,BookOpenCheck,CheckCircle2,ChevronLeft,ClipboardCheck,Code2,Database,
 Eye,FilterX,Info,Layers3,LockKeyhole,PauseCircle,PlayCircle,Plus,
 RefreshCcw,Search,ShieldAlert,ShieldCheck,SlidersHorizontal,Table2,Workflow,FileCode2
} from 'lucide-react';
import {AdminLayout} from '@/components/layout';
import {DemoAccessProvider,DemoRolePicker,useDemoAccess} from '@/components/access/DemoAccess';
import {Button,Dialog,Drawer,Toast} from '@/components/ui';
import {StatePanel} from '@/components/states';
import {SOURCE_STORAGE_KEY,restoreSourceFlags,withLocalFlags,sourceTypeLabels,type DataSource} from '@/lib/data-sources/sources';
import {CREATED_SOURCES_KEY,restoreCreatedSources} from '@/lib/data-sources/connect';
import {DRAFT_STORAGE_KEY,eligibleSources,restoreLocalDrafts,type LocalSmartView} from '@/lib/smart-view-create/wizard';
import {
 VIEW_STORAGE_KEY,DEMO_VIEWS,DEFAULT_VIEW_FILTERS,VIEW_CLASS_LABELS,VIEW_KIND_LABELS,
 VIEW_STATUS_LABELS,applyViewStates,buildViewReview,canToggleView,filterSmartViews,
 restoreViewStates,viewStats,visibleSmartViews,type SmartView,type ViewFilters
} from '@/lib/smart-views/views';

type Notice={title:string;message:string;tone:'success'|'warning'|'danger'|'info'};
const statTypes=[{key:'total',label:'إجمالي نماذج العروض',icon:Layers3,hint:'أمثلة ومقترحات غير منشورة'},
 {key:'active',label:'نشط في المعاينة',icon:CheckCircle2,hint:'مؤشر محلي لا عرض SQL حقيقي'},
 {key:'draft',label:'مسودات ومقترحات',icon:ClipboardCheck,hint:'لم تُعتمد أو تُنشر'},
 {key:'restricted',label:'مقيّدة أو مقنّعة',icon:ShieldCheck,hint:'تحتاج ضبط RBAC على الخادم'}] as const;
function SmartViewPill({view}:{view:SmartView}){return <span className={`bsv-status bsv-status--${view.status}`}><span aria-hidden="true"/>{VIEW_STATUS_LABELS[view.status]}</span>;}
function SmartViewLevel({view}:{view:SmartView}){return <span className={`bsv-level bsv-level--${view.classification}`}>{view.classification==='public'?<CheckCircle2 size={13}/>:<LockKeyhole size={13}/>} {VIEW_CLASS_LABELS[view.classification]}</span>;}
function ViewsContent(){
 const {can}=useDemoAccess();const authorized=can('smartviews.manage');
 const [loaded,setLoaded]=useState(false);
 const [states,setStates]=useState<Record<string,'active'|'paused'>>({});
 const [localDrafts,setLocalDrafts]=useState<LocalSmartView[]>([]);
 const [flags,setFlags]=useState<Record<string,boolean>>({});
 const [createdSources,setCreatedSources]=useState<DataSource[]>([]);
 const [filters,setFilters]=useState<ViewFilters>(DEFAULT_VIEW_FILTERS);
 const [selectedId,setSelectedId]=useState<string|null>(null);
 const [confirmId,setConfirmId]=useState<string|null>(null);
 const [notice,setNotice]=useState<Notice|null>(null);
 const [page,setPage]=useState(1);
 useEffect(()=>{
  try{const raw=localStorage.getItem(VIEW_STORAGE_KEY);if(raw)setStates(restoreViewStates(JSON.parse(raw)));}
  catch{setNotice({title:'تعذّر تحميل حالات العروض',message:'ستظهر الحالات الافتراضية للمعاينة.',tone:'warning'});}
  try{const raw=localStorage.getItem(SOURCE_STORAGE_KEY);if(raw)setFlags(restoreSourceFlags(JSON.parse(raw)));}catch{}
  try{const raw=localStorage.getItem(CREATED_SOURCES_KEY);if(raw)setCreatedSources(restoreCreatedSources(JSON.parse(raw)));}catch{}
  try{const raw=localStorage.getItem(DRAFT_STORAGE_KEY);if(raw)setLocalDrafts(restoreLocalDrafts(JSON.parse(raw)));}catch{}
  setLoaded(true);
 },[]);
 const sources=useMemo(()=>[...withLocalFlags(flags),...createdSources],[flags,createdSources]);
 const sourceNames=useMemo(()=>Object.fromEntries(sources.map(source=>[source.id,source.name])),[sources]);
 const candidates=useMemo(()=>applyViewStates([...DEMO_VIEWS,...localDrafts.filter(d=>eligibleSources(sources).some(source=>source.id===d.sourceId))],states),[states,localDrafts,sources]);
 const views=useMemo(()=>visibleSmartViews(candidates,sources),[candidates,sources]);
 const filtered=useMemo(()=>filterSmartViews(views,filters,sourceNames),[views,filters,sourceNames]);
 const stats=useMemo(()=>viewStats(views),[views]);
 const lastPage=Math.max(1,Math.ceil(filtered.length/5));
 const currentPage=Math.min(page,lastPage);
 const shown=filtered.slice((currentPage-1)*5,currentPage*5);
 const selected=views.find(v=>v.id===selectedId)||null;
 const confirming=views.find(v=>v.id===confirmId)||null;
 const selectedSource=selected?sources.find(source=>source.id===selected.sourceId):undefined;
 const confirmingSource=confirming?sources.find(source=>source.id===confirming.sourceId):undefined;
 const canSwitch=!!confirming&&canToggleView(confirming,confirmingSource);
 function update<K extends keyof ViewFilters>(key:K,value:ViewFilters[K]){setFilters(previous=>({...previous,[key]:value}));setPage(1);}
 function resetFilters(){setFilters(DEFAULT_VIEW_FILTERS);setPage(1);}
 function updateStatus(){
  if(!authorized||!confirming||!canSwitch)return;
  const nextValue=confirming.status==='active'?'paused':'active';
  const next={'SV-DEMO-01':nextValue} as Record<string,'active'|'paused'>;
  try{localStorage.setItem(VIEW_STORAGE_KEY,JSON.stringify(next));setStates(next);setConfirmId(null);
   setNotice({title:'تم تحديث حالة المعاينة',message:'تغيّر العرض التوضيحي محليًا فقط؛ لم يُنفذ أي أمر SQL أو تغيير على الخادم.',tone:'success'});
  }catch{setNotice({title:'تعذّر حفظ حالة العرض',message:'تحقق من إعدادات تخزين المتصفح؛ لم يتم تغيير حالة المصدر الحقيقي.',tone:'danger'});}
 }
 function deleteLocalDraft(id:string){
  const next=localDrafts.filter(d=>d.id!==id);
  try{localStorage.setItem(DRAFT_STORAGE_KEY,JSON.stringify(next));setLocalDrafts(next);setSelectedId(null);
   setNotice({title:'حُذفت المسودة المحلية',message:'الحذف لم يؤثر على أي عرض منشور أو قاعدة بيانات.',tone:'info'});
  }catch{setNotice({title:'تعذر حذف المسودة',message:'لم يجرِ تغيير البيانات في المتصفح أو على الخادم.',tone:'danger'});}
 }
 function resetStatus(){
  try{localStorage.removeItem(VIEW_STORAGE_KEY);setStates({});setConfirmId(null);
   setNotice({title:'استُعيدت الحالات الافتراضية',message:'أُزيلت تغييرات المعاينة المحلية فقط.',tone:'info'});
  }catch{setNotice({title:'تعذّرت الاستعادة',message:'لم يتم تعديل أي بيانات خارج المتصفح.',tone:'danger'});}
 }
 async function copyViewDescriptor(view:SmartView){
  const text=JSON.stringify(buildViewReview(view),null,2);
  try{
   if(!navigator.clipboard?.writeText)throw new Error('Clipboard API unavailable');
   await navigator.clipboard.writeText(text);
   setNotice({title:'تم نسخ الوصف التجريبي',message:'نُسخ وصف محدود بلا أسرار أو بيانات مؤسسية حقيقية.',tone:'success'});
  }catch{setNotice({title:'تعذّر النسخ',message:'قد يمنع المتصفح استخدام الحافظة. لا توجد أي بيانات محذوفة أو مُرسلة.',tone:'warning'});}
 }
 return <div className="ban bsv" dir="rtl" data-testid="smart-views-screen">
  <nav className="ban-breadcrumb" aria-label="مسار التنقل"><Link href="/admin">لوحة الإدارة</Link><ChevronLeft size={15}/><Link href="/admin/data-sources">مصادر البيانات</Link><ChevronLeft size={15}/><span aria-current="page">العروض الذكية</span></nav>
  <header className="ban-hero bsv-hero"><div><span className="ban-eyebrow"><Layers3 size={17}/> الإدارة · UC-05</span><h1>إدارة العروض الذكية</h1><p>واجهة لإدارة طبقة Smart Views المصرّح بها: المصادر، والحقول المقروءة، والتصنيفات الأمنية، وحالة كل عرض.</p><div className="ban-hero-tags"><span><ShieldCheck size={14}/> مبدأ أقل امتياز</span><span><Table2 size={14}/> حقول محددة</span><span><Eye size={14}/> معاينة فقط</span></div></div><div className="ban-hero-art" aria-hidden="true"><Layers3 size={72}/><i/></div></header>
  <div className="ban-disclaimer" role="note"><Info size={18}/><span><strong>بيانات تدريبية بالكامل:</strong> العروض الذكية هنا أمثلة توضيحية ومسودات غير منشورة، ولا توجد استعلامات SQL منفذة أو مخططات مستكشفة من قاعدة بيانات. لا تعرض الصفحة أي بيانات أشخاص أو أسرار اتصال.</span></div>
  <div className="ban-role"><span><ShieldCheck size={17}/> إدارة العروض المؤسسية مخصصة لمسؤول تقنية المعلومات في محاكاة الصلاحيات.</span><DemoRolePicker id="bsv-role-picker"/></div>
  {!authorized?<section className="ban-locked" data-testid="smart-views-forbidden"><StatePanel state="forbidden" title="لا تملك صلاحية إدارة العروض الذكية" description="دور مسؤول المنصة لا يرث تلقائيًا صلاحيات مؤسسة أخرى. الصلاحيات الحقيقية تُفرض في FastAPI وقاعدة البيانات."/><Link href="/admin">العودة إلى الإدارة <ArrowLeft size={15}/></Link></section>:
  !loaded?<section className="ban-panel"><p role="status">جارٍ تحميل إعدادات العرض المحلية...</p></section>:<>
  <section className="bsv-stats" aria-label="مؤشرات العروض التجريبية">{statTypes.map(({key,label,icon:Icon,hint})=><article className="bsv-stat" key={key}><span className="bsv-stat-icon"><Icon size={23}/></span><div><small>{label}</small><strong>{stats[key].toLocaleString('ar-EG')}</strong><p>{hint}</p></div></article>)}</section>
  <section className="ban-panel bsv-main" aria-labelledby="bsv-table-title"><div className="ban-section-header"><div><h2 id="bsv-table-title"><Layers3 size={21}/> قائمة العروض الذكية</h2><p>هذه الفهرسة تمثيلية ولا تعني أن العروض منشورة على PostgreSQL أو Odoo.</p></div><div className="ban-actions"><Link href="/admin/smart-views/new" className="bsv-create"><Plus size={17}/> إنشاء عرض ذكي</Link><Button variant="outline" size="sm" onClick={resetStatus} leadingIcon={<RefreshCcw size={15}/>}>استعادة الحالة</Button></div></div>
   <div className="bsv-filters"><label className="bsv-search"><span><Search size={15}/> البحث في العروض</span><input aria-label="البحث في العروض الذكية" value={filters.query} onChange={e=>update('query',e.target.value)} placeholder="اسم العرض أو الحقل أو المصدر..."/></label>
    <label><span>مصدر البيانات</span><select aria-label="تصفية مصدر البيانات" value={filters.sourceId} onChange={e=>update('sourceId',e.target.value)}><option value="all">جميع المصادر</option>{[...new Set(views.map(v=>v.sourceId))].map(id=><option value={id} key={id}>{sourceNames[id]||id}</option>)}</select></label>
    <label><span>الحالة</span><select aria-label="تصفية حالة العرض" value={filters.status} onChange={e=>update('status',e.target.value as ViewFilters['status'])}><option value="all">جميع الحالات</option>{(['active','paused','draft'] as const).map(status=><option key={status} value={status}>{VIEW_STATUS_LABELS[status]}</option>)}</select></label>
    <label><span>التصنيف</span><select aria-label="تصفية التصنيف الأمني" value={filters.classification} onChange={e=>update('classification',e.target.value as ViewFilters['classification'])}><option value="all">جميع التصنيفات</option>{(['public','masked','restricted'] as const).map(level=><option key={level} value={level}>{VIEW_CLASS_LABELS[level]}</option>)}</select></label>
   </div>
   <div className="bsv-toolbar"><span><SlidersHorizontal size={16}/> {filtered.length.toLocaleString('ar-EG')} عروض مطابقة</span><div><label>نوع السجل <select value={filters.kind} onChange={e=>update('kind',e.target.value as ViewFilters['kind'])}><option value="all">الكل</option><option value="illustrative">أمثلة المصادر</option><option value="proposal">مقترحات غير منشورة</option></select></label><button type="button" onClick={resetFilters}><FilterX size={16}/> مسح المرشحات</button></div></div>
   {shown.length===0?<div className="bsv-empty"><Search size={27}/><strong>لا توجد عروض مطابقة</strong><span>تأكد من معايير البحث أو اختر جميع المصادر.</span><Button variant="outline" size="sm" onClick={resetFilters}>إزالة المرشحات</Button></div>:<div className="bsv-table-scroll" role="region" tabIndex={0} aria-label="جدول العروض الذكية قابل للتمرير أفقيًا"><table className="bsv-table"><thead><tr><th scope="col">العرض الذكي</th><th scope="col">مصدر البيانات</th><th scope="col">الحقول المسموحة</th><th scope="col">حالة العرض</th><th scope="col">مستوى الوصول</th><th scope="col">إجراءات</th></tr></thead><tbody>{shown.map(view=>{const source=sources.find(s=>s.id===view.sourceId);return <tr key={view.id}><td><div className="bsv-name"><span className="bsv-name-icon"><Layers3 size={20}/></span><span><strong>{view.name}</strong><small dir="ltr">{view.id}</small><small>{VIEW_KIND_LABELS[view.kind]}</small></span></div></td><td><strong className="bsv-source-name">{sourceNames[view.sourceId]||'غير متاح'}</strong><small className="bsv-source-id" dir="ltr">{view.sourceId}</small></td><td><div className="bsv-field-summary">{view.fields.slice(0,2).map(field=><code key={field} dir="ltr">{field}</code>)}{view.fields.length>2&&<small>+{view.fields.length-2}</small>}</div></td><td><SmartViewPill view={view}/></td><td><SmartViewLevel view={view}/></td><td><div className="bsv-actions"><button type="button" onClick={()=>setSelectedId(view.id)} title="ملخص العرض السريع" aria-label={`ملخص العرض ${view.name}`}><Eye size={17}/></button><Link href={`/admin/smart-views/details?id=${encodeURIComponent(view.id)}`} aria-label={`فتح التفاصيل الكاملة للعرض ${view.name}`} title="صفحة التفاصيل الكاملة"><FileCode2 size={17}/></Link><Link href={`/admin/data-sources/details?id=${encodeURIComponent(view.sourceId)}`} aria-label={`عرض مصدر ${view.name}`} title="فتح المصدر"><Database size={17}/></Link><button type="button" disabled={!canToggleView(view,source)} onClick={()=>setConfirmId(view.id)} aria-label={`تغيير الحالة التجريبية ${view.name}`} title="إيقاف أو تنشيط العرض التجريبي">{view.status==='active'?<PauseCircle size={17}/>:<PlayCircle size={17}/>}</button></div></td></tr>;})}</tbody></table></div>}
   <div className="bsv-pagination"><span>الصفحة {currentPage} من {lastPage}</span><div><Button variant="outline" size="sm" disabled={currentPage<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}>السابق</Button><Button variant="outline" size="sm" disabled={currentPage>=lastPage} onClick={()=>setPage(p=>Math.min(lastPage,p+1))}>التالي</Button></div></div>
  </section>
  <section className="bsv-guidelines"><article className="ban-panel"><h2><ShieldCheck size={19}/> ضوابط إنشاء العروض الذكية</h2><ol><li>تحديد مصدر مؤسسي صالح وغير محظور.</li><li>اختيار حقول القراءة المصرح بها فقط.</li><li>فرض تصنيف الحقول والمصادر وعزل المؤسسة.</li><li>اعتماد العرض وتسجيل الأثر قبل إتاحته للاستعلام.</li></ol><p>هذه سياسة تصميم مستقبلية؛ لا يجري أي من هذه الخطوات في الخادم حاليًا.</p></article><article className="ban-panel"><h2><Code2 size={19}/> ما معنى العرض الذكي؟</h2><p>طبقة وصفية لنتائج استعلامات مُقيّدة، تساعد وكيل SQL في استخدام البيانات المسموح بها بدل الوصول إلى الجداول الحساسة مباشرةً.</p><div className="bsv-safe"><LockKeyhole size={18}/> لا يوجد تعديل SQL من الواجهة، ولا يظهر أي حقل مصنّف «محظور».</div></article></section>
  <footer className="bsv-footer"><Info size={18}/><span>الاختبارات والتصنيفات في هذه الصفحة تدريبية. عند الربط الحقيقي يجب فرض مصادقة المستخدم، وعزل المؤسسات، وقراءة فقط، والتحقق من الاستعلام على الخادم، وتسجيل عمليات التدقيق.</span></footer>
  </>}
  <Drawer open={!!selected&&authorized} onClose={()=>setSelectedId(null)} title={selected?.name||'تفاصيل العرض'} description="بطاقة وصفية تعليمية — لا توجد بيانات مسترجعة أو SQL منفذ" footer={<><Button variant="outline" onClick={()=>setSelectedId(null)}>إغلاق</Button>{selected&&<Link href={`/admin/smart-views/details?id=${encodeURIComponent(selected.id)}`} className="bsv-drawer-link"><FileCode2 size={15}/> التفاصيل الكاملة</Link>}{selected&&<Button variant="secondary" onClick={()=>{void copyViewDescriptor(selected);}} leadingIcon={<ClipboardCheck size={15}/>}>نسخ تعريف العرض</Button>}{selected?.id.startsWith('SV-DRAFT-')&&<Button variant="danger" onClick={()=>deleteLocalDraft(selected.id)}>حذف المسودة</Button>}</>}>
   {selected&&<div className="bsv-drawer"><div className="bsv-drawer-notice"><Info size={17}/> هذا عرض توضيحي، وليس View منشورًا في قاعدة البيانات.</div><dl>{[['المعرف',selected.id],['المصدر',sourceNames[selected.sourceId]||selected.sourceId],['الجهة المالكة',selected.owner],['النطاق',selected.scope],['الجمهور المقترح',selected.audience],['آخر تحديث توضيحي',selected.lastUpdated]].map(([name,value])=><div key={name}><dt>{name}</dt><dd>{value}</dd></div>)}</dl><div className="bsv-drawer-pills"><SmartViewPill view={selected}/><SmartViewLevel view={selected}/></div><h3><BookOpenCheck size={16}/> وصف العرض</h3><p>{selected.description}</p><h3><Table2 size={16}/> الحقول المعتمدة في المثال</h3><div className="bsv-drawer-fields">{selected.fields.map(f=><code dir="ltr" key={f}>{f}</code>)}</div><div className="bsv-drawer-notice"><ShieldAlert size={17}/> لا تتضمن البطاقة حقولًا محظورة أو بيانات سجلات، والتصنيف الحقيقي يجب التحقق منه على الخادم.</div><Link href={`/admin/data-sources/details?id=${encodeURIComponent(selected.sourceId)}`} className="bsv-drawer-link"><Database size={16}/> فتح تفاصيل المصدر <ArrowLeft size={15}/></Link>{selectedSource&&<small className="bsv-drawer-source">نوع المصدر: {sourceTypeLabels[selectedSource.type]} · حالته: {selectedSource.status==='disabled'?'معطّل محليًا':'تجريبية'}</small>}</div>}
  </Drawer>
  <Dialog open={!!confirming&&authorized} onClose={()=>setConfirmId(null)} title="تغيير حالة عرض توضيحي" description="عملية محلية لا تطبق على SQL أو قاعدة البيانات" footer={<><Button variant="outline" onClick={()=>setConfirmId(null)}>إلغاء</Button><Button disabled={!canSwitch} onClick={updateStatus}>{confirming?.status==='active'?'إيقاف محلي':'تنشيط محلي'}</Button></>}>
    {confirming&&<div className="bsv-confirm"><AlertLine/><p>هل تريد {confirming.status==='active'?'إيقاف':'تنشيط'} العرض «{confirming.name}» داخل هذه المعاينة؟ لا تتأثر صلاحيات الخادم أو بيانات أي مصدر.</p></div>}
  </Dialog>
  {notice&&<div className="bsv-toast"><Toast {...notice} onClose={()=>setNotice(null)}/></div>}
 </div>;
}
function AlertLine(){return <ShieldAlert color="#b98734" size={24}/>;}
export function SmartViewsScreen(){return <DemoAccessProvider initialRole="it_admin"><AdminLayout variant="feature"><ViewsContent/></AdminLayout></DemoAccessProvider>;}
