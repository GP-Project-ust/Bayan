"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, ArrowRight, Bell, BellRing, CheckCheck, CheckCircle2, ChevronLeft,
  ClipboardCheck, FileText, Filter, Inbox, Info, Layers3, LockKeyhole,
  MailCheck, MailOpen, RefreshCcw, Search, ShieldAlert, Sparkles, X,
} from "lucide-react";
import { ChatLayout } from "@/components/layout";
import { Badge, Button, Drawer, Toast } from "@/components/ui";
import { ORGANIZATION_ROUTES } from "@/lib/routes";
import {
  categories, demoNotifications, filterNotifications, markAllRead,
  notificationStats, priorities, setNotificationRead,
  type BayanNotification, type NotificationCategory, type ReadFilter,
} from "@/lib/notifications/notifications";

type Message = {title:string; message:string; tone:"success"|"info"|"warning"|"danger"};
const readFilters: {id:ReadFilter; title:string}[] = [
  {id:"all",title:"جميع الإشعارات"},
  {id:"unread",title:"غير المقروءة"},
  {id:"read",title:"المقروءة"},
];
const categoryFilters: {id:NotificationCategory|"all"; title:string}[] = [
  {id:"all",title:"جميع الفئات"},
  {id:"reports",title:"التقارير"},
  {id:"documents",title:"المستندات"},
  {id:"security",title:"الأمان"},
  {id:"administration",title:"الإدارة"},
  {id:"system",title:"النظام"},
];
const categoryIcons = {
  reports:FileText,
  documents:Layers3,
  security:ShieldAlert,
  administration:ClipboardCheck,
  system:Bell,
};

function NotificationItem({ item, onOpen, onReadChange }: {
  item:BayanNotification; onOpen:(id:string)=>void; onReadChange:(id:string,isRead:boolean)=>void;
}) {
  const Icon = categoryIcons[item.category];
  return <li className={`bayan-notice-item ${item.isRead ? "is-read" : "is-unread"}`}>
    <div className={`bayan-notice-category-icon notice-category-${item.category}`} aria-hidden="true"><Icon size={23}/></div>
    <div className="bayan-notice-item-body">
      <div className="bayan-notice-item-heading">
        <button className="bayan-notice-title" type="button" onClick={()=>onOpen(item.id)}
          aria-label={`عرض تفاصيل: ${item.title}`}>
          {item.title}
        </button>
        {!item.isRead && <span className="bayan-notice-dot" aria-label="غير مقروء" />}
        {item.priority !== "normal" && <Badge tone={item.priority === "urgent" ? "danger":"warning"}>{priorities[item.priority]}</Badge>}
      </div>
      <p>{item.summary}</p>
      <div className="bayan-notice-meta">
        <span>{categories[item.category]}</span><i aria-hidden="true">•</i>
        <span>{item.source}</span><i aria-hidden="true">•</i>
        <time>{item.timeLabel}</time>
      </div>
    </div>
    <div className="bayan-notice-item-actions">
      <button type="button" className="bayan-notice-read-toggle"
        onClick={()=>onReadChange(item.id,!item.isRead)}
        aria-label={item.isRead ? `تمييز ${item.title} كغير مقروء` : `تمييز ${item.title} كمقروء`}
        title={item.isRead ? "تمييز كغير مقروء":"تمييز كمقروء"}>
        {item.isRead ? <MailOpen size={18}/> : <MailCheck size={18}/>}<span>{item.isRead ? "غير مقروء" : "تحديد كمقروء"}</span>
      </button>
      <button type="button" className="bayan-notice-open" onClick={()=>onOpen(item.id)} aria-label={`فتح تفاصيل إشعار ${item.title}`}>
        <ChevronLeft size={21}/>
      </button>
    </div>
  </li>;
}

function NotificationsBody() {
  const [items,setItems] = useState<BayanNotification[]>(()=>demoNotifications.map(item=>({...item})));
  const [readFilter,setReadFilter] = useState<ReadFilter>("all");
  const [category,setCategory] = useState<NotificationCategory|"all">("all");
  const [query,setQuery] = useState("");
  const [selectedId,setSelectedId] = useState<string|null>(null);
  const [notice,setNotice] = useState<Message|null>(null);

  const stats = useMemo(()=>notificationStats(items),[items]);
  const visible = useMemo(()=>filterNotifications(items,{readFilter,category,query}),[items,readFilter,category,query]);
  const selected = items.find(item=>item.id===selectedId)??null;
  const closeDrawer = useCallback(()=>setSelectedId(null),[]);
  const activeFilters = query.trim()!=="" || category!=="all" || readFilter!=="all";

  function setRead(id:string,isRead:boolean){
    setItems(current=>setNotificationRead(current,id,isRead));
    setNotice({title:isRead?"تم تمييز الإشعار كمقروء":"تم تمييز الإشعار كغير مقروء",message:"التغيير مؤقت داخل المعاينة فقط.",tone:"success"});
  }
  function openItem(id:string){
    setSelectedId(id);
    setItems(current=>setNotificationRead(current,id,true));
  }
  function allRead(){
    if(!stats.unread)return;
    setItems(current=>markAllRead(current));
    setNotice({title:"تم تمييز جميع الإشعارات كمقروءة",message:"لم يُرسل التغيير إلى أي خدمة أو قاعدة بيانات.",tone:"success"});
  }
  function reset(){
    setItems(demoNotifications.map(item=>({...item})));
    setReadFilter("all");setCategory("all");setQuery("");setSelectedId(null);
    setNotice({title:"تمت استعادة بيانات المعاينة",message:"عادت الإشعارات إلى حالاتها التجريبية الأولى.",tone:"info"});
  }

  return <div className="bayan-notices">
    <nav className="bayan-notices-crumb" aria-label="مسار التنقل">
      <Link href={ORGANIZATION_ROUTES.home}>الرئيسية</Link><ChevronLeft size={15} aria-hidden="true"/><span aria-current="page">مركز الإشعارات</span>
    </nav>

    <header className="bayan-notices-hero">
      <div className="bayan-notices-hero-content">
        <span className="bayan-notices-kicker"><Sparkles size={17}/> مركز التواصل والتنبيهات</span>
        <h1>مركز الإشعارات</h1>
        <p>تابع تحديثات التقارير والمستندات والصلاحيات وحالة النظام في مكان واحد.</p>
        <div className="bayan-notices-hero-tags"><span><BellRing size={16}/> تنبيهات منظمة</span><span><CheckCircle2 size={16}/> متابعة حالة القراءة</span><span>RTL · واجهة عربية</span></div>
      </div>
      <div className="bayan-notices-hero-decor" aria-hidden="true"><BellRing size={90}/></div>
    </header>

    <div className="bayan-notices-demo" role="note"><Info size={20} aria-hidden="true"/>
      <p><strong>معاينة تجريبية:</strong> الإشعارات والأرقام والتواريخ أمثلة افتراضية. لا تصل إشعارات من الخادم، ولا تُحفَظ حالات القراءة بعد تحديث الصفحة.</p>
    </div>

    <section className="bayan-notices-stats" aria-label="ملخص الإشعارات">
      <div className="bayan-notices-stat"><span className="bayan-notices-stat-icon"><Bell size={23}/></span><div><p>إجمالي الإشعارات</p><strong>{stats.total}</strong></div></div>
      <div className="bayan-notices-stat"><span className="bayan-notices-stat-icon"><MailOpen size={23}/></span><div><p>غير المقروءة</p><strong>{stats.unread}</strong></div></div>
      <div className="bayan-notices-stat"><span className="bayan-notices-stat-icon"><ShieldAlert size={23}/></span><div><p>تنبيهات مهمة غير مقروءة</p><strong>{stats.important}</strong></div></div>
      <div className="bayan-notices-stat"><span className="bayan-notices-stat-icon"><FileText size={23}/></span><div><p>إشعارات التقارير</p><strong>{stats.reports}</strong></div></div>
    </section>

    <section className="bayan-notices-panel" aria-label="قائمة الإشعارات">
      <div className="bayan-notices-panel-head">
        <div><h2>الإشعارات الواردة</h2><p>ابحث، صنّف، واستعرض التفاصيل أو غيّر حالة القراءة.</p></div>
        <div className="bayan-notices-panel-actions">
          <Button variant="outline" size="sm" leadingIcon={<RefreshCcw size={17}/>} onClick={reset}>استعادة التجربة</Button>
          <Button variant="primary" size="sm" leadingIcon={<CheckCheck size={17}/>} onClick={allRead} disabled={stats.unread===0}>تمييز الكل كمقروء</Button>
        </div>
      </div>

      <div className="bayan-notices-toolbar">
        <div className="bayan-notices-search-wrap">
          <Search size={20} aria-hidden="true"/>
          <input type="search" value={query} onChange={e=>setQuery(e.target.value)} aria-label="البحث في الإشعارات"
            placeholder="ابحث في العناوين، المصادر، التفاصيل..."/>
          {query && <button type="button" onClick={()=>setQuery("")} aria-label="مسح البحث"><X size={18}/></button>}
        </div>
        <label className="bayan-notices-category"><Filter size={17} aria-hidden="true"/><span>الفئة</span>
          <select value={category} onChange={e=>setCategory(e.target.value as NotificationCategory|"all")} aria-label="تصفية حسب الفئة">
            {categoryFilters.map(filter=><option value={filter.id} key={filter.id}>{filter.title}</option>)}
          </select>
        </label>
      </div>

      <div className="bayan-notices-filterbar" aria-label="تصفية حالة القراءة">
        <div className="bayan-notices-filter-buttons">
          {readFilters.map(filter=><button type="button" key={filter.id} aria-pressed={readFilter===filter.id}
            className={readFilter===filter.id?"active":""} onClick={()=>setReadFilter(filter.id)}>
            {filter.title}{filter.id==="unread"&&<span className="bayan-notices-tab-count">{stats.unread}</span>}
          </button>)}
        </div>
        <span className="bayan-notices-result-count" role="status" aria-live="polite">{visible.length} من {items.length} إشعار</span>
      </div>

      {visible.length>0 ? <ul className="bayan-notices-list">
        {visible.map(item=><NotificationItem key={item.id} item={item} onOpen={openItem} onReadChange={setRead}/>)}
      </ul> : <div className="bayan-notices-empty" role="status">
        <span><Inbox size={43}/></span><h3>لا توجد إشعارات مطابقة</h3>
        <p>{activeFilters?"جرّب تغيير الفئة أو حالة القراءة أو كلمات البحث.":"ليس لديك إشعارات في هذا العرض التجريبي."}</p>
        {activeFilters&&<Button variant="outline" onClick={()=>{setReadFilter("all");setCategory("all");setQuery("");}}>مسح عوامل التصفية</Button>}
      </div>}
      <footer className="bayan-notices-panel-foot"><LockKeyhole size={16}/><span>حالة القراءة محلية ولا تمثل صلاحية أو مراجعة أمنية حقيقية.</span></footer>
    </section>

    <footer className="bayan-notices-bottom"><span><Info size={15}/> بيانات لأغراض تصميم واجهة المستخدم فقط</span><span>بيان · Design System</span></footer>

    <Drawer open={Boolean(selected)} onClose={closeDrawer} title={selected?.title??"تفاصيل الإشعار"}
      description="تفاصيل تنبيه تجريبي — لا توجد بيانات حية" position="end"
      footer={selected?<div className="bayan-notices-drawer-actions">
        {selected.destination&&<Link className="bayan-notices-drawer-link" href={selected.destination} onClick={closeDrawer}>{selected.actionLabel??"الانتقال للصفحة"}<ArrowLeft size={17}/></Link>}
        <Button variant="outline" size="md" onClick={closeDrawer}>إغلاق</Button>
      </div>:undefined}>
      {selected&&<div className="bayan-notices-drawer-body">
        <div className="bayan-notices-drawer-badges"><Badge tone="info">{categories[selected.category]}</Badge><Badge tone={selected.priority==="urgent"?"danger":selected.priority==="important"?"warning":"neutral"}>{priorities[selected.priority]}</Badge><Badge tone={selected.isRead?"success":"warning"}>{selected.isRead?"مقروء":"غير مقروء"}</Badge></div>
        <div className="bayan-notices-drawer-description"><h3>تفاصيل التنبيه</h3><p>{selected.details}</p></div>
        <dl className="bayan-notices-drawer-meta"><div><dt>مصدر الإشعار</dt><dd>{selected.source}</dd></div><div><dt>التاريخ والوقت</dt><dd>{selected.timeLabel}</dd></div><div><dt>النوع</dt><dd>{categories[selected.category]}</dd></div></dl>
        <div className="bayan-notices-drawer-hint"><Info size={19}/><p>قراءة الإشعار لا تنفّذ الإجراء المرتبط به، ولا تؤكد وجود بيانات حقيقية.</p></div>
        <Button variant="outline" size="sm" leadingIcon={<MailOpen size={17}/>} onClick={()=>setRead(selected.id,false)}>إعادة تمييز كغير مقروء</Button>
      </div>}
    </Drawer>
    {notice&&<div className="bayan-notices-toast"><Toast {...notice} onClose={()=>setNotice(null)}/></div>}
  </div>;
}

export function NotificationsScreen(){
  return <ChatLayout variant="feature"><NotificationsBody/></ChatLayout>;
}
