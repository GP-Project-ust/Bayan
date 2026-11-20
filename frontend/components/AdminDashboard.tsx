"use client";

import { useCallback, useState } from "react";
import { useOverlay } from "./ui/useOverlay";
import { AdminLayout } from "./layout";
import { Sparkles, UsersRound, Layers3, ScrollText, Activity, CheckCircle2, Plus,
  UserRound, Pencil, MoreHorizontal, Crown, Laptop, ShieldCheck, LockKeyhole, Ellipsis,
  Timer, Zap, UserRoundPlus, Settings, ExternalLink, CalendarDays, RefreshCw,
  ChartNoAxesColumnIncreasing, FileText, X, Shield, Clock3 } from "lucide-react";

type Role = "مدير المؤسسة" | "موظف المؤسسة" | "مسؤول تقنية المعلومات" | "مسؤول المنصة";
type UserRow = {name:string;email:string;role:Role;active:boolean};
type SmartView = {name:string;source:string;security:string;active:boolean};
const initialUsers:UserRow[]=[
  {name:"أ. د. ناصر العتيبي",email:"n.alotaibi@univ.edu.sa",role:"مدير المؤسسة",active:true},
  {name:"أ. سارة القحطاني",email:"s.qahtani@univ.edu.sa",role:"موظف المؤسسة",active:true},
  {name:"م. خالد الشهري",email:"k.alshahri@univ.edu.sa",role:"مسؤول تقنية المعلومات",active:true},
  {name:"أ. ليان الحربي",email:"l.alharbi@univ.edu.sa",role:"مسؤول المنصة",active:false},
];
const initialSmartViews:SmartView[]=[
  {name:"عرض الطلاب",source:"نظام شؤون الطلاب",security:"محدود",active:true},
  {name:"عرض التسجيل",source:"نظام التسجيل الأكاديمي",security:"محدد",active:true},
  {name:"عرض الأداء الأكاديمي",source:"مستودع البيانات الأكاديمية",security:"داخلي",active:true},
];
const initialLogs=[
  {time:"اليوم، 10:18 ص",user:"أ. سارة القحطاني",action:"تسجيل دخول إلى النظام",status:"نجاح"},
  {time:"اليوم، 09:56 ص",user:"أ. د. ناصر العتيبي",action:"تحديث دور مستخدم (من موظف المؤسسة إلى مسؤول المنصة)",status:"نجاح"},
  {time:"اليوم، 09:37 ص",user:"م. خالد الشهري",action:"إنشاء عرض ذكي (عرض الأداء الأكاديمي)",status:"نجاح"},
  {time:"أمس، 04:21 م",user:"أ. ليان الحربي",action:"تصدير نتائج استعلام (CSV)",status:"نجاح"},
  {time:"أمس، 02:47 م",user:"أ. سارة القحطاني",action:"مراجعة استعلام (عرض بيانات التسجيل للفصل الحالي)",status:"نجاح"},
];
const roles: Role[]=["مدير المؤسسة","موظف المؤسسة","مسؤول تقنية المعلومات","مسؤول المنصة"];

export default function AdminDashboard(){
  const [users,setUsers]=useState<UserRow[]>(initialUsers);
  const [views,setViews]=useState<SmartView[]>(initialSmartViews);
  const [logs,setLogs]=useState(initialLogs);
  const [modal,setModal]=useState<"user"|"view"|""|"log">("");
  const closeModal=useCallback(()=>setModal(""),[]);
  const dialogRef=useOverlay(Boolean(modal),closeModal);
  const [newName,setNewName]=useState("");const [newEmail,setNewEmail]=useState(""); const [newRole,setNewRole]=useState<Role>("موظف المؤسسة");
  const [newView,setNewView]=useState("");
  const changeRole=(index:number)=>{setUsers(old=>old.map((row,i)=>i===index?{...row,role:roles[(roles.indexOf(row.role)+1)%roles.length]}:row));};
  const toggleUser=(index:number)=>{setUsers(old=>old.map((row,i)=>i===index?{...row,active:!row.active}:row));};
  const addUser=()=>{if(!newName.trim()||!newEmail.trim())return; setUsers(old=>[...old,{name:newName,email:newEmail,role:newRole,active:true}]);setNewName("");setNewEmail("");setModal("");};
  const addView=()=>{if(!newView.trim())return;setViews(old=>[...old,{name:newView,source:"المستودع الأكاديمي",security:"محدود",active:true}]);setNewView("");setModal("");};
  const updateView=(index:number)=>{setViews(old=>old.map((view,i)=>i===index?{...view,active:!view.active}:view));};
  return <AdminLayout>
    <div className="admin-main">
      <header className="admin-hero"><img className="admin-campus-top" src="/assets/campus-admin-top.png" alt="مبنى الجامعة"/><div className="admin-heading"><h1><Sparkles size={32}/> لوحة <em>الإدارة</em></h1><p>إدارة المستخدمين والأدوار، والعروض الذكية، ومتابعة سجل التدقيق، ومراقبة حالة النظام.</p></div></header>
      <div className="stats-grid">
        <div className="stat-card"><UsersRound size={32}/><div>إجمالي المستخدمين<strong>{125+users.length-initialUsers.length}</strong></div></div>
        <div className="stat-card"><Layers3 size={32}/><div>العروض الذكية النشطة<strong>{12+views.length-initialSmartViews.length}</strong></div></div>
        <div className="stat-card"><ScrollText size={32}/><div>أحداث التدقيق الأخيرة<strong>48<small> خلال آخر 24 ساعة</small></strong></div></div>
        <div className="stat-card system-status-stat"><Activity size={35}/><div>حالة النظام<strong><CheckCircle2 size={20}/> يعمل بشكل طبيعي</strong></div></div>
      </div>
      <div className="admin-columns">
        <div className="admin-primary">
          <section id="users" className="admin-panel users-panel"><div className="panel-heading"><div><h2><UsersRound size={28}/> إدارة المستخدمين والأدوار</h2><p>إدارة حسابات المستخدمين وتحديد الأدوار وصلاحيات الوصول (RBAC).</p></div><button className="action-primary" onClick={()=>setModal("user")}><Plus size={22}/> إضافة مستخدم</button></div>
            <div className="table-scroller" role="region" aria-label="جدول المستخدمين والأدوار — مرّر أفقيًا لعرض جميع الأعمدة" tabIndex={0}><table className="data-table users-table"><caption className="bayan-sr-only">جدول المستخدمين والأدوار</caption><thead><tr><th>الاسم</th><th>البريد الإلكتروني</th><th>الدور</th><th>الحالة</th><th>الإجراءات</th></tr></thead><tbody>{users.map((u,i)=><tr key={u.email}><td><span className="person-name"><span className="tiny-person"><UserRound size={17} fill="currentColor"/></span><b>{u.name}</b></span></td><td dir="ltr" className="email-td">{u.email}</td><td><span className={`role-pill role-${roles.indexOf(u.role)}`}>{u.role==="مدير المؤسسة"?<Crown size={17}/>:u.role==="موظف المؤسسة"?<UsersRound size={17}/>:u.role==="مسؤول تقنية المعلومات"?<Laptop size={17}/>:<Layers3 size={17}/>} {u.role}</span></td><td><span className={`state-pill ${u.active?"success":"warning"}`}>{u.active?<CheckCircle2 size={17}/>:<Clock3 size={17}/>} {u.active?"نشط":"غير نشط"}</span></td><td><div className="table-actions"><button title="تعديل الدور" onClick={()=>changeRole(i)}><Pencil size={16}/>تعديل الدور</button><button className="icon-action" title="تبديل الحالة" onClick={()=>toggleUser(i)}><MoreHorizontal size={18}/></button></div></td></tr>)}</tbody></table></div>
          </section>
          <section id="audit" className="admin-panel audit-panel"><div className="panel-heading"><div><h2><ScrollText size={27}/> سجل التدقيق</h2><p>سجل بالأنشطة المهمة على النظام مثل تسجيل الدخول، وتعديل الأدوار، وإدارة العروض الذكية.</p></div><button className="outline-button" onClick={()=>setModal("log")}><ExternalLink size={18}/> عرض السجل الكامل</button></div>
            <div className="table-scroller" role="region" aria-label="جدول سجل التدقيق — مرّر أفقيًا لعرض جميع الأعمدة" tabIndex={0}><table className="data-table audit-table"><caption className="bayan-sr-only">جدول سجل التدقيق</caption><thead><tr><th>الوقت</th><th>المستخدم</th><th>الإجراء</th><th>النتيجة</th></tr></thead><tbody>{logs.slice(0,5).map((log,i)=><tr key={i}><td><span className="time-cell"><CalendarDays size={17}/>{log.time}</span></td><td><b>{log.user}</b></td><td>{log.action}</td><td><span className="state-pill success"><CheckCircle2 size={17}/>{log.status}</span></td></tr>)}</tbody></table></div>
          </section>
          <section id="smart-views" className="admin-panel smart-panel"><div className="panel-heading"><div><h2><Layers3 size={29}/> إدارة العروض الذكية</h2><p>إنشاء وإدارة العروض الذكية التي توفر وصولًا منظمًا وآمنًا إلى بيانات الجامعة.</p></div><button className="action-primary" onClick={()=>setModal("view")}><Plus size={22}/> إنشاء عرض ذكي</button></div>
            <div className="table-scroller" role="region" aria-label="جدول العروض الذكية — مرّر أفقيًا لعرض جميع الأعمدة" tabIndex={0}><table className="data-table smart-table"><caption className="bayan-sr-only">جدول العروض الذكية</caption><thead><tr><th>اسم العرض</th><th>المصدر</th><th>المستوى الأمني</th><th>الحالة</th><th>الإجراءات</th></tr></thead><tbody>{views.map((view,i)=><tr key={view.name}><td><b className="smart-name">{i===0?<UsersRound size={20}/>:i===1?<CalendarDays size={20}/>:<ChartNoAxesColumnIncreasing size={20}/>} {view.name}</b></td><td>{view.source}</td><td><span className={`security-pill security-${i%3}`}><ShieldCheck size={17}/>{view.security}</span></td><td><span className={`state-pill ${view.active?"success":"warning"}`}><CheckCircle2 size={16}/>{view.active?"نشط":"متوقف"}</span></td><td><div className="table-actions"><button onClick={()=>updateView(i)}><RefreshCw size={16}/>تحديث</button><button className="icon-action" onClick={()=>updateView(i)}><MoreHorizontal size={18}/></button></div></td></tr>)}</tbody></table></div>
          </section>
        </div>
        <aside className="admin-widgets" id="settings"><div className="status-widget"><h2><Activity size={26}/> حالة النظام</h2><div className="health-list">{["الخدمات الأساسية","قاعدة البيانات","خدمة معالجة الاستعلامات","خدمة العروض الذكية"].map(label=><div key={label}><span>{label}</span><CheckCircle2 size={20}/></div>)}</div><div className="response-time"><Timer size={26}/><span>زمن الاستجابة المتوسط<strong>320 مللي ثانية</strong></span></div></div>
          <div className="quick-widget"><h2><Zap size={28}/> إجراءات سريعة</h2><button onClick={()=>setModal("user")}><UserRoundPlus size={23}/> إضافة مستخدم جديد</button><button onClick={()=>setModal("view")}><Layers3 size={23}/> إنشاء عرض ذكي</button><button onClick={()=>setModal("log")}><ScrollText size={23}/> عرض سجل التدقيق</button><button onClick={()=>document.querySelector("#settings")?.scrollIntoView({behavior:"smooth"})}><Settings size={23}/> إعدادات النظام</button><img className="admin-campus-bottom" src="/assets/campus-admin-bottom.png" alt="زخرفة مبنى الجامعة"/></div>
        </aside>
      </div>
    </div>
  {!!modal&&<div className="dialog-overlay" onMouseDown={(e)=>{if(e.currentTarget===e.target)setModal("")}}><div ref={dialogRef} tabIndex={-1} className="dialog-card" role="dialog" aria-modal="true" aria-labelledby="bayan-admin-dialog-title"><button className="close-dialog" aria-label="إغلاق" onClick={()=>setModal("")}><X/></button>
    {modal==="user"?<><h2 id="bayan-admin-dialog-title">إضافة مستخدم جديد</h2><p>بيانات تجريبية في الواجهة الأولية.</p><label>اسم المستخدم<input placeholder="الاسم الكامل" value={newName} onChange={e=>setNewName(e.target.value)}/></label><label>البريد الإلكتروني<input type="email" placeholder="name@example.com" value={newEmail} onChange={e=>setNewEmail(e.target.value)}/></label><label>الدور<select value={newRole} onChange={e=>setNewRole(e.target.value as Role)}>{roles.map(role=><option key={role}>{role}</option>)}</select></label><button className="action-primary dialog-submit" onClick={addUser}>إضافة مستخدم</button></>:modal==="view"?<><h2 id="bayan-admin-dialog-title">إنشاء عرض ذكي</h2><p>نموذج توضيحي لا يتصل بقاعدة بيانات حقيقية.</p><label>اسم العرض<input placeholder="اسم العرض الذكي" value={newView} onChange={e=>setNewView(e.target.value)}/></label><button className="action-primary dialog-submit" onClick={addView}>حفظ العرض</button></>:<><h2 id="bayan-admin-dialog-title">سجل التدقيق الكامل</h2><p>سجلات افتراضية لأغراض التصميم والعرض.</p>{logs.map((log,i)=><div className="dialog-log" key={i}>{log.time} — {log.user}: {log.action}</div>)}</>}
  </div></div>}
  </AdminLayout>;
}
