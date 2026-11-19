"use client";

import {useEffect,useMemo,useRef,useState} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {
  AlertCircle,BookOpen,BookOpenCheck,CalendarDays,CheckCircle2,ChevronLeft,
  ClipboardCopy,FileClock,FileSearch,FileText,FileWarning,FolderOpen,Grid2X2,
  Info,Layers3,LayoutList,LibraryBig,LockKeyhole,Plus,RefreshCw,Search,
  ShieldCheck,SlidersHorizontal,Sparkles,UploadCloud,X
} from "lucide-react";
import {ChatLayout} from "@/components/layout";
import {viewerHref} from "@/lib/document-viewer/viewer";
import {Badge,Button,Drawer,Toast} from "@/components/ui";
import {StatePanel} from "@/components/states";
import {DemoAccessProvider,DemoRolePicker,useDemoAccess} from "@/components/access/DemoAccess";
import {ORGANIZATION_ROUTES} from "@/lib/routes";
import {
  changeDocumentStatus,defaultLibraryFilters,documentCategoryLabels,filterLibraryDocuments,
  indexStatusLabels,initialLibraryDocuments,libraryStats,makeDemoDocumentCitation,validDocumentPage,
  type DocumentSort,type IndexStatus,type LibraryCategory,type LibraryDocument,
  type LibraryFilters,type LibraryLayout,type StatusFilter
} from "@/lib/document-library/library";

type Notice={title:string;message:string;tone:"success"|"warning"|"info"|"danger"};
const filterCategories:{value:LibraryCategory;label:string}[]=[
  {value:"all",label:"جميع التصنيفات"},{value:"regulations",label:"اللوائح"},
  {value:"guides",label:"الأدلة"},{value:"policies",label:"السياسات"},
  {value:"forms",label:"النماذج"}
];
const filterStatuses:{value:StatusFilter;label:string}[]=[
  {value:"all",label:"جميع حالات الفهرسة"},{value:"indexed",label:"مفهرس"},
  {value:"processing",label:"قيد المعالجة"},{value:"pending",label:"بانتظار الفهرسة"},
  {value:"failed",label:"تحتاج مراجعة"}
];
const statusTone:Record<IndexStatus,"success"|"warning"|"danger"|"info">={indexed:"success",processing:"info",pending:"warning",failed:"danger"};
const statusShort:Record<IndexStatus,string>={indexed:"مفهرس",processing:"قيد المعالجة",pending:"بانتظار الفهرسة",failed:"فشلت الفهرسة"};
const fmt=new Intl.DateTimeFormat("ar-EG",{day:"numeric",month:"short",year:"numeric"});
const displayDate=(date:string)=>fmt.format(new Date(`${date}T12:00:00Z`));
const mockDisclaimer="بيانات المستندات وحالات الفهرسة هنا خيالية لأغراض العرض والتصميم. لا توجد ملفات مرفوعة أو معالجة أو PDF حقيقية.";

function StatusChip({status}:{status:IndexStatus}){
  const Icon=status==="indexed"?CheckCircle2:status==="failed"?FileWarning:FileClock;
  return <Badge tone={statusTone[status]}><Icon size={13}/>{statusShort[status]}</Badge>;
}
function DocumentActions({doc,onPreview,onSimulate,canManage}:{doc:LibraryDocument;onPreview:(id:string)=>void;onSimulate:(id:string)=>void;canManage:boolean}){
  return <div className="bdl-actions">
    <Button variant="outline" size="sm" leadingIcon={<BookOpen size={15}/>} onClick={()=>onPreview(doc.id)}>عرض التفاصيل</Button>
    <Link className="bdl-viewer-link" href={viewerHref(doc.id,doc.snippets[0]?.page)}><FileText size={14}/> فتح العارض</Link>
    {canManage&&doc.status!=="processing"&&<button className="bdl-icon-action" type="button" onClick={()=>onSimulate(doc.id)} title={`محاكاة إعادة فهرسة ${doc.title}`} aria-label={`محاكاة إعادة فهرسة ${doc.title}`}><RefreshCw size={16}/></button>}
  </div>;
}
function DocumentTile({doc,onPreview,onSimulate,canManage}:{doc:LibraryDocument;onPreview:(id:string)=>void;onSimulate:(id:string)=>void;canManage:boolean}){
 return <article className="bdl-document-card" data-testid="library-document">
   <div className="bdl-card-head"><span className="bdl-file-mark"><FileText size={27}/><small>{doc.fileType}</small></span><StatusChip status={doc.status}/></div>
   <div className="bdl-document-copy"><span className="bdl-category-label">{documentCategoryLabels[doc.category]} · مثال تدريبي</span><h3>{doc.title}</h3><p>{doc.description}</p></div>
   <div className="bdl-document-meta"><span><BookOpen size={15}/>{doc.totalPages} صفحة</span><span><CalendarDays size={15}/>{displayDate(doc.updatedAt)}</span></div>
   <div className="bdl-card-footer"><span>{doc.owner}</span><DocumentActions doc={doc} onPreview={onPreview} onSimulate={onSimulate} canManage={canManage}/></div>
 </article>;
}
function LibraryBody(){
  const router=useRouter();
  const {can}=useDemoAccess();
  const canRead=can("documents.search"),canManage=can("sources.manage"),canCite=can("citations.view");
  const [docs,setDocs]=useState<LibraryDocument[]>(()=>initialLibraryDocuments.map(doc=>({...doc})));
  const [filters,setFilters]=useState<LibraryFilters>(defaultLibraryFilters);
  const [layout,setLayout]=useState<LibraryLayout>("cards");
  const [selectedId,setSelectedId]=useState<string|null>(null);
  const [notice,setNotice]=useState<Notice|null>(null);
  const [previewPage,setPreviewPage]=useState<number|null>(null);
  const indexTimers=useRef<Map<string,ReturnType<typeof setTimeout>>>(new Map());
  useEffect(()=>{const timers=indexTimers.current;return ()=>{for(const timer of timers.values())clearTimeout(timer);timers.clear();};},[]);
  useEffect(()=>{if(!canRead){setSelectedId(null);setNotice(null);}},[canRead]);
  const visible=useMemo(()=>filterLibraryDocuments(docs,filters),[docs,filters]);
  const stats=useMemo(()=>libraryStats(docs),[docs]);
  const selected=docs.find(doc=>doc.id===selectedId)??null;
  const shownPage=selected?(previewPage??selected.snippets[0]?.page??1):1;
  const selectedSnippet=selected?.snippets.find(s=>s.page===shownPage);
  const hasFilters=filters.query.trim()!==""||filters.category!=="all"||filters.status!=="all"||filters.sort!=="newest";
  const setFilter=<K extends keyof LibraryFilters>(key:K,value:LibraryFilters[K])=>setFilters(previous=>({...previous,[key]:value}));
  function preview(id:string){if(!canRead)return;setSelectedId(id);setPreviewPage(null);}
  function simulateIndex(id:string){
    if(!canManage)return;
    const doc=docs.find(item=>item.id===id);if(!doc||indexTimers.current.has(id))return;
    setDocs(previous=>changeDocumentStatus(previous,id,"processing"));
    setNotice({title:"بدأت محاكاة الفهرسة",message:"تغيير حالة العرض محلي فقط؛ لم يُرفع أو يُفهرس أي مستند.",tone:"info"});
    const timer=setTimeout(()=>{
      setDocs(previous=>changeDocumentStatus(previous,id,"indexed"));indexTimers.current.delete(id);
      setNotice({title:"اكتملت المحاكاة",message:"الحالة المعروضة افتراضية؛ لا توجد متجهات أو مقاطع جديدة في Qdrant.",tone:"success"});
    },750);
    indexTimers.current.set(id,timer);
  }
  async function copyCitation(){
    if(!selected||!canCite||!validDocumentPage(selected,shownPage))return;
    try{await navigator.clipboard.writeText(makeDemoDocumentCitation(selected,shownPage));setNotice({title:"تم نسخ الاستشهاد التدريبي",message:"لا تستخدمه كمرجع رسمي؛ المقتطفات والصفحات أمثلة خيالية.",tone:"success"});}
    catch{setNotice({title:"تعذر النسخ",message:"تحقق من أذونات الحافظة في المتصفح.",tone:"warning"});}
  }
  return <div className="bdl" data-testid="document-library-screen">
    <nav className="bdl-breadcrumb" aria-label="مسار التنقل"><Link href={ORGANIZATION_ROUTES.home}>الرئيسية</Link><ChevronLeft size={15}/><span aria-current="page">مكتبة المستندات</span></nav>
    <header className="bdl-hero"><div><span className="bdl-overline"><Sparkles size={15}/> قاعدة المعرفة المؤسسية</span><h1>مكتبة المستندات واللوائح</h1><p>استعرض المستندات المصنّفة وحالة فهرستها ومعلومات مصادرها، ثم انتقل إلى البحث الدلالي.</p><div className="bdl-hero-badges"><span><ShieldCheck size={15}/> نطاق عرض وفق الدور</span><span><Layers3 size={15}/> تصنيف وفهرسة المستندات</span></div></div><div className="bdl-hero-icon" aria-hidden="true"><LibraryBig size={72}/></div></header>
    <div className="bdl-demo-note" role="note"><Info size={20}/><p><strong>تصميم أولي ببيانات تجريبية:</strong> {mockDisclaimer} ترتبط أسماء بعض العينات بواجهة البحث الدلالي السابقة، ولا تمثل مستندات فعلية في الجامعة.</p></div>
    <section className="bdl-role-panel" aria-label="خيارات الصلاحيات التجريبية"><div><LockKeyhole size={19}/><span>الصلاحيات المعروضة محاكاة للواجهة فقط؛ التحقق الحقيقي من وصول المستندات يقع على الخادم.</span></div><DemoRolePicker id="bdl-demo-role"/></section>
    {canRead?<>
      <div className="bdl-stats" aria-label="ملخص المستندات">
        {[
          {label:"إجمالي المستندات",value:stats.total,icon:LibraryBig,color:"blue"},
          {label:"مفهرسة تجريبيًا",value:stats.indexed,icon:BookOpenCheck,color:"teal"},
          {label:"قيد المعالجة",value:stats.processing,icon:FileClock,color:"blue"},
          {label:"بحاجة إلى متابعة",value:stats.attention,icon:AlertCircle,color:"amber"},
        ].map(stat=><div className="bdl-stat" key={stat.label}><span className={`bdl-stat-icon bdl-stat-icon--${stat.color}`}><stat.icon size={22}/></span><div><small>{stat.label}</small><strong>{stat.value}</strong></div></div>)}
      </div>
      <section className="bdl-filter-card" aria-label="البحث وتصفية المستندات">
        <div className="bdl-filter-top"><div><h2><SlidersHorizontal size={20}/> تصفح المكتبة</h2><p>يمكن البحث باسم المستند أو الوصف أو الجهة المالكة.</p></div><div className="bdl-filter-top-actions"><Link href={ORGANIZATION_ROUTES.semanticSearch} className="bdl-semantic-link"><FileSearch size={18}/> البحث الدلالي</Link>{canManage&&<Link href={ORGANIZATION_ROUTES.sourceUpload} data-contract-href="/sources/upload" className="bdl-upload-link"><Plus size={18}/> رفع مستند</Link>}</div></div>
        <div className="bdl-filters"><label className="bdl-search" htmlFor="bdl-query"><Search size={19}/><input id="bdl-query" type="search" value={filters.query} onChange={event=>setFilter("query",event.target.value)} placeholder="ابحث في اسم المستند أو الجهة..."/><span className="bdl-sr-only">بحث في المكتبة</span></label>
          <label className="bdl-select"><span>التصنيف</span><select aria-label="تصنيف المستند" value={filters.category} onChange={event=>setFilter("category",event.target.value as LibraryCategory)}>{filterCategories.map(choice=><option key={choice.value} value={choice.value}>{choice.label}</option>)}</select></label>
          <label className="bdl-select"><span>حالة الفهرسة</span><select aria-label="حالة الفهرسة" value={filters.status} onChange={event=>setFilter("status",event.target.value as StatusFilter)}>{filterStatuses.map(choice=><option key={choice.value} value={choice.value}>{choice.label}</option>)}</select></label>
          <label className="bdl-select bdl-sort"><span>الترتيب</span><select aria-label="ترتيب المستندات" value={filters.sort} onChange={event=>setFilter("sort",event.target.value as DocumentSort)}><option value="newest">الأحدث تعديلًا</option><option value="title">الاسم أبجديًا</option><option value="pages">عدد الصفحات</option></select></label>
        </div>
      </section>
      <section className="bdl-results" aria-label="قائمة مستندات المكتبة">
        <header className="bdl-results-heading"><div><h2><FolderOpen size={21}/> المستندات المتاحة <span>{visible.length}</span></h2><p>النتائج المعروضة عينات تصميمية غير متصلة بمخزن ملفات.</p></div><div className="bdl-results-tools">{hasFilters&&<button type="button" className="bdl-clear" onClick={()=>setFilters(defaultLibraryFilters)}><X size={15}/> إعادة التصفية</button>}<div className="bdl-view-switch" aria-label="طريقة العرض"><button type="button" aria-label="عرض البطاقات" aria-pressed={layout==="cards"} className={layout==="cards"?"active":""} onClick={()=>setLayout("cards")}><Grid2X2 size={18}/></button><button type="button" aria-label="العرض الجدولي" aria-pressed={layout==="table"} className={layout==="table"?"active":""} onClick={()=>setLayout("table")}><LayoutList size={19}/></button></div></div></header>
        {visible.length===0?<div className="bdl-empty"><StatePanel state="empty" title="لا توجد مستندات مطابقة" description="جرّب تغيير البحث أو التصنيف أو حالة الفهرسة، أو استعد إعدادات العرض الافتراضية." onRetry={()=>setFilters(defaultLibraryFilters)} retryLabel="إظهار جميع المستندات"/></div>:layout==="cards"?
          <div className="bdl-grid" data-testid="library-results">{visible.map(doc=><DocumentTile key={doc.id} doc={doc} onPreview={preview} onSimulate={simulateIndex} canManage={canManage}/>)}</div>:
          <div className="bdl-table-wrapper" data-testid="library-results"><table className="bdl-table"><thead><tr><th scope="col">المستند</th><th scope="col">التصنيف</th><th scope="col">الصفحات</th><th scope="col">آخر تحديث</th><th scope="col">حالة الفهرسة</th><th scope="col">الإجراءات</th></tr></thead><tbody>{visible.map(doc=><tr key={doc.id} data-testid="library-document"><td><span className="bdl-table-doc"><FileText size={20}/><span><strong>{doc.title}</strong><small>{doc.owner}</small></span></span></td><td>{documentCategoryLabels[doc.category]}</td><td>{doc.totalPages}</td><td>{displayDate(doc.updatedAt)}</td><td><StatusChip status={doc.status}/></td><td><DocumentActions doc={doc} onPreview={preview} onSimulate={simulateIndex} canManage={canManage}/></td></tr>)}</tbody></table></div>}
        <div className="bdl-result-footer"><span>الملفات والمقاطع والصفحات المعروضة افتراضية.</span><span>عرض {visible.length} من أصل {docs.length} مستندات تجريبية.</span></div>
      </section>
    </>:<section className="bdl-denied"><StatePanel state="forbidden" title="مكتبة المؤسسة غير متاحة لهذا الدور" description="لا يحصل مسؤول المنصة تلقائيًا على صلاحية الاطلاع على وثائق المؤسسات. اختر دورًا مخولًا لتجربة تصميم المكتبة."/></section>}
    <Drawer open={Boolean(selected&&canRead)} onClose={()=>setSelectedId(null)} title="معلومات المستند ومعاينة المصدر" description="مستند تدريبي بلا ملف PDF أصلي" position="end">
      {selected&&<div className="bdl-preview" data-testid="library-document-preview">
        <div className="bdl-preview-heading"><span className="bdl-preview-icon"><FileText size={30}/></span><div><h3>{selected.title}</h3><small>{documentCategoryLabels[selected.category]} · {selected.fileType}</small></div></div>
        <StatusChip status={selected.status}/>
        <div className="bdl-preview-meta"><div><small>الجهة</small><strong>{selected.owner}</strong></div><div><small>الصفحات</small><strong>{selected.totalPages}</strong></div><div><small>الحجم الافتراضي</small><strong>{selected.fileSizeKB} KB</strong></div><div><small>آخر تحديث تجريبي</small><strong>{displayDate(selected.updatedAt)}</strong></div></div>
        <p className="bdl-preview-description">{selected.description}</p>
        <h4>مقتطفات تدريبية متاحة</h4>
        {selected.snippets.length>0?<><label className="bdl-page-picker" htmlFor="bdl-page-number"><span>رقم الصفحة في المثال</span><select id="bdl-page-number" value={shownPage} onChange={event=>setPreviewPage(Number(event.target.value))}>{selected.snippets.map(item=><option key={item.id} value={item.page}>الصفحة {item.page} — {item.section}</option>)}</select></label>
          {selectedSnippet&&<blockquote><strong>{selectedSnippet.section}</strong><p>{selectedSnippet.excerpt}</p></blockquote>}
          <div className="bdl-preview-actions"><Link className="bdl-viewer-link" href={viewerHref(selected.id,shownPage,selectedSnippet?.id)} onClick={()=>setSelectedId(null)}><FileText size={16}/> فتح صفحة المستند</Link><Button size="sm" variant="outline" disabled={!canCite} leadingIcon={<ClipboardCopy size={15}/>} onClick={copyCitation}>نسخ استشهاد تجريبي</Button><Button size="sm" onClick={()=>{setSelectedId(null);router.push(ORGANIZATION_ROUTES.semanticSearch);}} leadingIcon={<FileSearch size={16}/>}>فتح البحث الدلالي</Button></div></>:
          <div className="bdl-no-preview"><FileWarning size={21}/><p>لم تتوفر مقاطع تدريبية لهذا المستند. حالة الفهرسة هنا وصف تجريبي فقط، ولا يوجد ملف أصلي للمعاينة.</p><Link className="bdl-viewer-link" href={viewerHref(selected.id,1)} onClick={()=>setSelectedId(null)}>فتح العارض</Link></div>}
        <div className="bdl-preview-warning"><Info size={19}/> جميع المقاطع وأرقام الصفحات والمعلومات هنا افتراضية وغير صالحة للاقتباس من وثائق حقيقية.</div>
      </div>}
    </Drawer>
    {notice&&<div className="bdl-toast"><Toast {...notice} onClose={()=>setNotice(null)}/></div>}
  </div>;
}
export function DocumentLibraryScreen(){
  const router=useRouter();
  return <DemoAccessProvider initialRole="employee"><ChatLayout variant="feature" onNewChat={()=>router.push("/")} onHistory={()=>router.push("/conversations")}><LibraryBody/></ChatLayout></DemoAccessProvider>;
}
