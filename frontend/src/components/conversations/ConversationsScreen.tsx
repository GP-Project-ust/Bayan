"use client";

import {useEffect,useMemo,useState, type FormEvent} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {
  ArchiveRestore, ArrowLeft, BookOpen, CalendarDays, CheckCircle2, ChevronLeft,
  Clock3, Database, FileBarChart, FileText, Filter, Info, Layers3,
  LockKeyhole, MessageSquareText, MoreHorizontal, Pin, PinOff, Plus,
  RotateCcw, Search, Send, ShieldCheck, Sparkles, Trash2, X,
  Pencil, Inbox, MessagesSquare, Star, ListFilter, Copy,
} from "lucide-react";
import {ChatLayout} from "@/components/layout";
import {Badge,Button,Dialog,Drawer,Toast} from "@/components/ui";
import {DemoAccessProvider,DemoRolePicker,useDemoAccess} from "@/components/access/DemoAccess";
import {ORGANIZATION_ROUTES, buildConversationUrl} from "@/lib/routes";
import {
  demoConversations,conversationStorageKey,kindLabels,emptyConversationChanges,
  readConversationChanges,writeConversationChanges,applyConversationChanges,
  filterConversations,conversationStats,validTitle,renameConversation,
  toggleConversationStar,deleteConversation,
  type ConversationChanges,type ConversationListItem,type ConversationFilter,
  type ConversationSort,type ConversationMessage,
} from "@/lib/conversations/conversations";

const filters:{value:ConversationFilter;label:string}[]=[
  {value:"all",label:"جميع المحادثات"},{value:"starred",label:"المفضلة"},
  {value:"data",label:"استعلامات البيانات"},{value:"documents",label:"اللوائح والمستندات"},
  {value:"reports",label:"التقارير"},
];
const iconByKind={data:Database,documents:BookOpen,reports:FileBarChart};
type Notice={title:string;message:string;tone:"success"|"warning"|"info"|"danger"};

function formatDemoDate(iso:string):string {
  return new Intl.DateTimeFormat("ar-YE",{day:"numeric",month:"long",year:"numeric",hour:"2-digit",minute:"2-digit",timeZone:"Asia/Aden"}).format(new Date(iso));
}
function ConversationCard({item,onSelect,onStar,onRename,onDelete}:{
  item:ConversationListItem;onSelect:(id:string)=>void;onStar:(id:string)=>void;
  onRename:(id:string)=>void;onDelete:(id:string)=>void;
}) {
  const Icon=iconByKind[item.kind];
  return <li className="bayan-conv-item" data-testid="conversation-row">
    <span className={`bayan-conv-item-icon kind-${item.kind}`} aria-hidden="true"><Icon size={25}/></span>
    <div className="bayan-conv-item-content">
      <div className="bayan-conv-title-row"><button className="bayan-conv-title" type="button" onClick={()=>onSelect(item.id)}>{item.title}</button>
        {item.starred&&<span className="bayan-conv-star-label" aria-label="مفضلة"><Star size={14} fill="currentColor"/></span>}
        <span className={`bayan-conv-type type-${item.kind}`}>{kindLabels[item.kind]}</span>
      </div>
      <p>{item.summary}</p>
      <div className="bayan-conv-meta"><span><CalendarDays size={14}/><time dateTime={item.updatedAt}>{formatDemoDate(item.updatedAt)}</time></span>
        <span><MessagesSquare size={14}/>{item.messages.length} رسائل</span>
        {item.sources&&<span><BookOpen size={14}/>{item.sources.length} مصادر توضيحية</span>}
      </div>
    </div>
    <div className="bayan-conv-item-actions">
      <button className="bayan-conv-icon-button" type="button" title={item.starred?"إزالة من المفضلة":"إضافة إلى المفضلة"}
        aria-label={`${item.starred?"إزالة من المفضلة":"إضافة إلى المفضلة"}: ${item.title}`} aria-pressed={item.starred} onClick={()=>onStar(item.id)}>
        {item.starred?<Star size={20} fill="currentColor"/>:<Star size={20}/>}
      </button>
      <button className="bayan-conv-icon-button" type="button" onClick={()=>onRename(item.id)} aria-label={`إعادة تسمية ${item.title}`} title="إعادة التسمية"><Pencil size={19}/></button>
      <button className="bayan-conv-icon-button danger" type="button" onClick={()=>onDelete(item.id)} aria-label={`حذف ${item.title}`} title="حذف المحادثة"><Trash2 size={19}/></button>
      <button className="bayan-conv-open" type="button" onClick={()=>onSelect(item.id)} aria-label={`عرض المحادثة ${item.title}`}>عرض التفاصيل <ChevronLeft size={17}/></button>
      <Link className="bayan-conv-page-link" href={buildConversationUrl(item.id)} aria-label={`فتح الصفحة الكاملة للمحادثة ${item.title}`}>فتح الصفحة</Link>
    </div>
  </li>;
}

function ConversationBody(){
  const router=useRouter();
  const {can}=useDemoAccess();
  const canChat=can("chat.ask"),canSources=can("citations.view"),canSql=can("sql.inspect");
  const [changes,setChanges]=useState<ConversationChanges>(emptyConversationChanges);
  const [ready,setReady]=useState(false);
  const [notice,setNotice]=useState<Notice|null>(null);
  const [query,setQuery]=useState("");
  const [filter,setFilter]=useState<ConversationFilter>("all");
  const [sort,setSort]=useState<ConversationSort>("newest");
  const [selectedId,setSelectedId]=useState<string|null>(null);
  const [renameId,setRenameId]=useState<string|null>(null);
  const [renameDraft,setRenameDraft]=useState("");
  const [deleteId,setDeleteId]=useState<string|null>(null);
  const [confirmRestore,setConfirmRestore]=useState(false);
  const [extraMessages,setExtraMessages]=useState<Record<string,ConversationMessage[]>>({});
  const [followup,setFollowup]=useState("");

  useEffect(()=>{if(!canChat)setSelectedId(null);},[canChat]);
  useEffect(()=>{
    const onSidebarHistory=(event:Event)=>{
      const id=(event as CustomEvent<string>).detail;
      if(canChat && demoConversations.some(row=>row.id===id)){
        setSelectedId(id);setFollowup("");
      }
    };
    window.addEventListener("bayan:open-demo-conversation",onSidebarHistory);
    return ()=>window.removeEventListener("bayan:open-demo-conversation",onSidebarHistory);
  },[canChat]);

  useEffect(()=>{
    try{setChanges(readConversationChanges(window.localStorage.getItem(conversationStorageKey)));}
    catch{setNotice({title:"التخزين المحلي غير متاح",message:"يمكنك التجربة مؤقتًا، لكن تغييرات السجل لن تُحفظ بعد تحديث الصفحة.",tone:"warning"});}
    setReady(true);
  },[]);

  const items=useMemo(()=>applyConversationChanges(demoConversations,changes),[changes]);
  const visible=useMemo(()=>filterConversations(items,{query,filter,sort}),[items,query,filter,sort]);
  const stats=useMemo(()=>conversationStats(items),[items]);
  const selected=items.find(item=>item.id===selectedId)??null;
  const renaming=items.find(item=>item.id===renameId)??null;
  const deleting=items.find(item=>item.id===deleteId)??null;
  const messages=selected?[...selected.messages,...(extraMessages[selected.id]??[])]:[];

  function commit(next:ConversationChanges){
    setChanges(next);
    try{window.localStorage.setItem(conversationStorageKey,writeConversationChanges(next));}
    catch{setNotice({title:"تعذر حفظ التغيير",message:"التغيير ظاهر مؤقتًا فقط، وقد يختفي بعد تحديث الصفحة.",tone:"warning"});}
  }
  function star(id:string){commit(toggleConversationStar(changes,id));}
  function startRename(id:string){const item=items.find(row=>row.id===id);if(!item)return;setRenameDraft(item.title);setRenameId(id);}
  function saveRename(event:FormEvent<HTMLFormElement>){
    event.preventDefault();if(!renameId)return;
    const title=validTitle(renameDraft);
    if(!title){setNotice({title:"عنوان غير صالح",message:"أدخل عنوانًا من 3 إلى 80 حرفًا.",tone:"warning"});return;}
    commit(renameConversation(changes,renameId,title));setRenameId(null);
    setNotice({title:"تم تغيير الاسم التجريبي",message:"حُفظ عنوان المحادثة داخل المتصفح فقط.",tone:"success"});
  }
  function confirmDelete(){
    if(!deleteId)return;
    commit(deleteConversation(changes,deleteId));
    if(selectedId===deleteId)setSelectedId(null);
    setDeleteId(null);
    setNotice({title:"حُذفت المحادثة من المعاينة",message:"لم تُحذف أي سجلات فعلية من الخادم. يمكنك استعادة البيانات التجريبية.",tone:"success"});
  }
  function restore(){
    const defaults={renamed:{},starredIds:[],deletedIds:[]};
    commit(defaults);setQuery("");setFilter("all");setSort("newest");setSelectedId(null);setExtraMessages({});
    setConfirmRestore(false);setNotice({title:"تمت استعادة قائمة المحادثات",message:"عادت الأمثلة الاثنا عشر إلى حالتها الأولى.",tone:"info"});
  }
  function selectConversation(id:string){
    if(!canChat){setNotice({title:"العرض غير متاح لهذا الدور",message:"هذه محاكاة لصلاحيات الواجهة فقط؛ التحقق الفعلي مسؤولية الخادم.",tone:"warning"});return;}
    setFollowup("");setSelectedId(id);
  }
  function sendFollowup(event:FormEvent<HTMLFormElement>){
    event.preventDefault();const text=followup.trim();
    if(!selected||!canChat||!text)return;
    const id=selected.id;
    const now=new Date().toLocaleTimeString("ar-YE",{hour:"2-digit",minute:"2-digit"});
    setExtraMessages(prev=>({...prev,[id]:[...(prev[id]??[]),
      {sender:"user",body:text,time:now},
      {sender:"assistant",body:"هذا رد توضيحي داخل واجهة العرض فقط. عند ربط بيان بالخادم ستُرسل الأسئلة الجديدة إلى نظام الوكلاء وفق الصلاحيات.",time:now}]}));
    setFollowup("");
    setNotice({title:"أُضيفت رسالة تجريبية",message:"لم يُرسل السؤال إلى خادم بيان ولم يتم تشغيل أي وكيل أو استعلام حقيقي.",tone:"info"});
  }
  const hasFilters=filter!=="all"||query.trim()!==""||sort!=="newest";

  return <div className="bayan-conv" data-testid="conversations-screen" aria-busy={!ready}>
    <nav className="bayan-conv-crumb" aria-label="مسار التنقل"><Link href={ORGANIZATION_ROUTES.home}>الرئيسية</Link><ChevronLeft size={15}/><span aria-current="page">المحادثات السابقة</span></nav>
    <header className="bayan-conv-hero">
      <div className="bayan-conv-hero-copy"><span className="bayan-conv-kicker"><Sparkles size={17}/> مساحة عملك الذكية</span>
        <h1>سجل المحادثات السابقة</h1>
        <p>ارجع إلى استعلاماتك السابقة، وتصفح الملخصات والمراجع، ونظّم محادثاتك بسهولة.</p>
        <div className="bayan-conv-hero-tags"><span><ShieldCheck size={16}/> عرض بحسب الصلاحية</span><span><Search size={16}/> بحث متقدم</span><span><MessageSquareText size={16}/> محادثات مرتبة</span></div>
      </div>
      <div className="bayan-conv-hero-image" aria-hidden="true"><img src="/assets/campus-chat.png" alt="" /></div>
    </header>
    <div className="bayan-conv-demo" role="note"><Info size={20}/><p><strong>بيانات تجريبية بالكامل:</strong> المحادثات والمواعيد والاستشهادات ونتائج SQL أمثلة مصطنعة. لا توجد مزامنة مع Backend؛ تحفظ تعديلات العناوين والمفضلة والحذف داخل هذا المتصفح فقط.</p></div>

    <div className="bayan-conv-overview">
      <div className="bayan-conv-stat"><span className="bayan-conv-stat-icon"><MessagesSquare size={23}/></span><div><small>إجمالي المحادثات</small><strong>{stats.total}</strong></div></div>
      <div className="bayan-conv-stat"><span className="bayan-conv-stat-icon"><Star size={23}/></span><div><small>المحادثات المفضلة</small><strong>{stats.starred}</strong></div></div>
      <div className="bayan-conv-stat"><span className="bayan-conv-stat-icon"><Database size={23}/></span><div><small>استعلامات البيانات</small><strong>{stats.data}</strong></div></div>
      <div className="bayan-conv-stat"><span className="bayan-conv-stat-icon"><FileBarChart size={23}/></span><div><small>التقارير والتحليلات</small><strong>{stats.reports}</strong></div></div>
    </div>

    <section className="bayan-conv-panel" aria-label="محادثاتي">
      <div className="bayan-conv-panel-head"><div><h2>محادثاتي</h2><p>ابحث في محادثاتك، وأضف المهم إلى المفضلة، أو اعرض التفاصيل.</p></div>
        <div className="bayan-conv-panel-actions"><Button variant="outline" size="sm" leadingIcon={<RotateCcw size={17}/>} onClick={()=>setConfirmRestore(true)}>استعادة التجربة</Button>
          <Button variant="primary" size="sm" leadingIcon={<Plus size={17}/>} onClick={()=>router.push(ORGANIZATION_ROUTES.home)}>محادثة جديدة</Button></div>
      </div>
      <div className="bayan-conv-toolbar">
        <div className="bayan-conv-search"><Search size={20} aria-hidden="true"/><input type="search" aria-label="البحث في المحادثات" placeholder="ابحث بعنوان المحادثة أو محتواها..." value={query} onChange={e=>setQuery(e.target.value)}/>
          {query&&<button type="button" onClick={()=>setQuery("")} aria-label="مسح البحث"><X size={17}/></button>}
        </div>
        <label className="bayan-conv-sort"><ListFilter size={17}/><span>ترتيب</span><select value={sort} aria-label="ترتيب المحادثات" onChange={e=>setSort(e.target.value as ConversationSort)}>
          <option value="newest">الأحدث أولاً</option><option value="oldest">الأقدم أولاً</option><option value="title">حسب العنوان</option>
        </select></label>
      </div>
      <div className="bayan-conv-filterbar" aria-label="تصفية المحادثات"><div className="bayan-conv-filters"><Filter size={17}/>
        {filters.map(f=><button key={f.value} type="button" className={filter===f.value?"active":""} aria-pressed={filter===f.value} onClick={()=>setFilter(f.value)}>{f.label}{f.value==="starred"&&stats.starred>0&&<span className="bayan-conv-filter-count">{stats.starred}</span>}</button>)}
      </div><span className="bayan-conv-results" aria-live="polite" role="status">{visible.length} من {stats.total} محادثة</span></div>
      {!canChat ? <div className="bayan-conv-empty"><LockKeyhole size={38}/><h3>عرض المحادثات غير متاح لهذا الدور التجريبي</h3><p>اختر دورًا يملك صلاحية المحادثة من أسفل الصفحة.</p></div> : visible.length>0 ?
        <ul className="bayan-conv-list">{visible.map(item=><ConversationCard key={item.id} item={item} onSelect={selectConversation} onStar={star} onRename={startRename} onDelete={setDeleteId}/>)}</ul>
        : <div className="bayan-conv-empty" role="status"><Inbox size={43}/><h3>لا توجد محادثات مطابقة</h3><p>{items.length===0?"أُزيلت جميع محادثات المعاينة. يمكنك استعادتها.":"جرّب استخدام كلمات بحث أخرى أو تغيير عوامل التصفية."}</p>
          <Button variant="outline" onClick={()=>{setQuery("");setFilter("all");setSort("newest");if(items.length===0)setConfirmRestore(true);}}> {items.length===0?"استعادة القائمة":"إزالة التصفية"}</Button></div>}
      <div className="bayan-conv-footer"><span><LockKeyhole size={16}/> لا تمثل صلاحيات المعاينة حماية حقيقية.</span>{hasFilters&&<button type="button" onClick={()=>{setQuery("");setFilter("all");setSort("newest");}}>مسح كل المرشحات</button>}</div>
    </section>
    <div className="bayan-conv-bottom"><span><Info size={15}/> البيانات المعروضة لأغراض واجهة المستخدم فقط</span><DemoRolePicker id="bayan-conv-role"/></div>

    <Drawer open={Boolean(selected)} onClose={()=>{setSelectedId(null);setFollowup("");}} title={selected?.title??"تفاصيل المحادثة"}
      description="سجل تجريبي للمحادثة مع توضيح المصادر والمراحل" className="bayan-conv-drawer">
      {selected&&<div className="bayan-conv-detail" dir="rtl">
        <div className="bayan-conv-detail-tags"><Badge tone="info">{kindLabels[selected.kind]}</Badge><Badge tone="neutral">{formatDemoDate(selected.updatedAt)}</Badge><Badge tone="warning">بيانات تجريبية</Badge></div>
        <Link className="bayan-conv-detail-full" href={buildConversationUrl(selected.id)}>فتح صفحة المحادثة الكاملة <ChevronLeft size={16}/></Link>
        <div className="bayan-conv-detail-intro"><h3>ملخص المحادثة</h3><p>{selected.summary}</p></div>
        <div className="bayan-conv-thread"><h3><MessagesSquare size={17}/> سجل الرسائل</h3><div className="bayan-conv-message-list">{messages.map((message,i)=><div key={`${selected.id}-${i}`} className={`bayan-conv-message ${message.sender}`}>
          <div className="bayan-conv-message-top"><strong>{message.sender==="user"?"أنت":"مساعد بيان"}</strong><span>{message.time}</span></div><p>{message.body}</p></div>)}</div></div>
        {selected.sources&&canSources&&<div className="bayan-conv-detail-sources"><h3><BookOpen size={17}/> المصادر المشار إليها</h3>
          {selected.sources.map(source=><div key={`${source.document}-${source.page}`}><FileText size={18}/><span>{source.document}</span><b>ص {source.page}</b></div>)}
          <small>المصادر وعناوينها وأرقام صفحاتها مصطنعة للاختبار فقط.</small></div>}
        {selected.sql&&canSql&&<div className="bayan-conv-detail-sql"><h3><Database size={17}/> عرض SQL للقراءة فقط</h3><pre dir="ltr"><code>{selected.sql}</code></pre>
          <small>هذا استعلام توضيحي ولم يُنفَّذ في قاعدة بيانات.</small></div>}
        {selected.sql&&!canSql&&<p className="bayan-conv-detail-locked"><LockKeyhole size={17}/> عرض SQL مخفي عن هذا الدور في المعاينة.</p>}
        <form onSubmit={sendFollowup} className="bayan-conv-followup"><label htmlFor="bayan-conv-followup">إضافة سؤال متابعة تجريبي</label>
          <textarea id="bayan-conv-followup" rows={2} maxLength={500} placeholder="اكتب سؤالك للمتابعة..." value={followup} onChange={e=>setFollowup(e.target.value)} />
          <div><small>المتابعة محلية داخل هذه الشاشة ولا ترسل طلب API.</small><Button size="sm" type="submit" disabled={!canChat||!followup.trim()} leadingIcon={<Send size={16}/>}>إضافة سؤال</Button></div></form>
      </div>}
    </Drawer>

    <Dialog open={Boolean(renaming)} onClose={()=>setRenameId(null)} title="إعادة تسمية المحادثة" description="سيظهر العنوان الجديد في قائمة المحادثات التجريبية."
      footer={<><Button variant="outline" onClick={()=>setRenameId(null)}>إلغاء</Button><Button type="submit" form="bayan-conv-rename-form" disabled={!validTitle(renameDraft)}>حفظ العنوان</Button></>}>
      <form id="bayan-conv-rename-form" onSubmit={saveRename} dir="rtl" className="bayan-conv-dialog-form">
        <label htmlFor="bayan-conv-rename-input">عنوان المحادثة</label><input id="bayan-conv-rename-input" maxLength={80} autoFocus value={renameDraft} onChange={e=>setRenameDraft(e.target.value)} required />
        <small>من 3 إلى 80 حرفًا، دون تغيير المحتوى الأصلي.</small>
      </form>
    </Dialog>
    <Dialog open={Boolean(deleting)} onClose={()=>setDeleteId(null)} title="تأكيد حذف المحادثة" description="هذا إجراء تجريبي يمكن التراجع عنه باستعادة بيانات المعاينة."
      footer={<><Button variant="outline" onClick={()=>setDeleteId(null)}>إلغاء</Button><Button variant="danger" leadingIcon={<Trash2 size={17}/>} onClick={confirmDelete}>حذف من المعاينة</Button></>}>
      <div className="bayan-conv-warning" dir="rtl"><Trash2 size={21}/><p>هل تريد حذف «{deleting?.title}» من قائمة المحادثات المحلية؟ لن يُحذف أي محتوى من خادم بيان.</p></div>
    </Dialog>
    <Dialog open={confirmRestore} onClose={()=>setConfirmRestore(false)} title="استعادة المحادثات التجريبية" description="إعادة القائمة إلى حالتها الأولى."
      footer={<><Button variant="outline" onClick={()=>setConfirmRestore(false)}>إلغاء</Button><Button leadingIcon={<ArchiveRestore size={17}/>} onClick={restore}>استعادة البيانات</Button></>}>
      <p className="bayan-conv-restore-copy" dir="rtl">ستُلغى التغييرات المحلية على العناوين والمفضلة والحذف، وستُعاد جميع المحادثات الاثنتا عشرة. لا يتأثر أي حساب حقيقي.</p>
    </Dialog>
    {notice&&<div className="bayan-conv-toast"><Toast {...notice} onClose={()=>setNotice(null)}/></div>}
  </div>;
}

export function ConversationsScreen(){
  const router=useRouter();
  // The shared shell is the same visual framework as the approved chat screen.
  return <DemoAccessProvider initialRole="employee"><ConversationShell onNewChat={()=>router.push("/")}/></DemoAccessProvider>;
}
function ConversationShell({onNewChat}:{onNewChat:()=>void}){
  const [historyTarget,setHistoryTarget]=useState<string|null>(null);
  return <ChatLayout variant="feature" onNewChat={onNewChat} onHistory={(title)=>setHistoryTarget(title)}>
    <ConversationHistoryBridge title={historyTarget} clear={()=>setHistoryTarget(null)}/>
    <ConversationBody />
  </ChatLayout>;
}
/**
 * A sidebar click opens the same saved example through a URL fragment that the
 * list consumes; no modification to the approved Sidebar or ChatView is needed.
 */
function ConversationHistoryBridge({title,clear}:{title:string|null;clear:()=>void}){
  useEffect(()=>{
    if(!title)return;
    const item=demoConversations.find(row=>row.title===title||row.title.includes(title)||title.includes(row.title));
    if(item)window.dispatchEvent(new CustomEvent("bayan:open-demo-conversation",{detail:item.id}));
    clear();
  },[title,clear]);
  return null;
}
