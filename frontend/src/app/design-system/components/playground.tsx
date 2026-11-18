"use client";

import { useCallback, useState } from "react";
import { AlertTriangle, Check, ChevronLeft, Download, Edit3, FileText, LoaderCircle, Mail, Plus, Search, Shield, Trash2, UserPlus } from "lucide-react";
import { Badge, Button, Card, DataTable, Dialog, Drawer, Input, Select, Textarea, Toast, type Column } from "@/components/ui";

type User={id:number;name:string;email:string;role:string;state:"نشط"|"غير نشط"};
const initialUsers:User[]=[
  {id:1,name:"أحمد العنسي",email:"ahmed@example.org",role:"مدير المؤسسة",state:"نشط"},
  {id:2,name:"سارة القحطاني",email:"sara@example.org",role:"موظف المؤسسة",state:"نشط"},
  {id:3,name:"خالد الشهري",email:"khaled@example.org",role:"مسؤول تقنية المعلومات",state:"غير نشط"},
];
const roleOptions=[{value:"employee",label:"موظف المؤسسة"},{value:"manager",label:"مدير المؤسسة"},{value:"it",label:"مسؤول تقنية المعلومات"},{value:"platform",label:"مسؤول المنصة"}];

type ToastState={title:string;message:string;tone:"success"|"warning"|"danger"|"info"};
export function ComponentsPlayground(){
  const [busy,setBusy]=useState(false),[dialog,setDialog]=useState(false),[drawer,setDrawer]=useState(false);
  const [notification,setNotification]=useState<ToastState|null>(null);
  const [users,setUsers]=useState(initialUsers);
  const [search,setSearch]=useState("");
  const [name,setName]=useState(""),[email,setEmail]=useState(""),[role,setRole]=useState("employee");
  const [remarks,setRemarks]=useState("");
  const closeDialog=useCallback(()=>setDialog(false),[]);
  const closeDrawer=useCallback(()=>setDrawer(false),[]);
  const selectedRole=roleOptions.find(x=>x.value===role)?.label??"موظف المؤسسة";
  const createUser=()=>{
    if(!name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())){
      setNotification({title:"تحتاج البيانات إلى مراجعة",message:"أدخل اسم المستخدم وبريدًا إلكترونيًا صحيحًا.",tone:"warning"});return;
    }
    setUsers(old=>[{id:Math.max(0,...old.map(x=>x.id))+1,name:name.trim(),email:email.trim(),role:selectedRole,state:"نشط"},...old]);
    setName("");setEmail("");setRole("employee");setDrawer(false);
    setNotification({title:"أضيف المستخدم التجريبي",message:"التغيير محلي للمعاينة فقط ولا يُرسل إلى الخادم.",tone:"success"});
  };
  const columns:Column<User>[]=[
    {key:"name",title:"الاسم",render:u=><strong>{u.name}</strong>},
    {key:"email",title:"البريد الإلكتروني",render:u=><span dir="ltr" className="bui-showcase-email">{u.email}</span>},
    {key:"role",title:"الدور",render:u=><Badge tone="info">{u.role}</Badge>},
    {key:"status",title:"الحالة",render:u=><Badge tone={u.state==="نشط"?"success":"warning"}>{u.state}</Badge>},
    {key:"actions",title:"الإجراءات",render:u=><Button size="sm" variant="outline" leadingIcon={<Edit3/>} onClick={()=>setNotification({title:`تفاصيل ${u.name}`,message:"زر تجريبي للمعاينة، وليس تعديلًا في قاعدة البيانات.",tone:"info"})}>عرض</Button>},
  ];
  const filtered=users.filter(u=>[u.name,u.email,u.role].some(v=>v.toLowerCase().includes(search.trim().toLowerCase())));
  return <div className="bui-showcase-grid">
    <section className="bui-showcase-section" aria-labelledby="button-heading"><div className="bui-showcase-heading"><div><span>01</span><h2 id="button-heading">الأزرار — Button</h2></div><small>الأحجام والحالات والألوان</small></div>
      <div className="bui-showcase-flex"><Button leadingIcon={<Plus/>} onClick={()=>setDrawer(true)}>إضافة مستخدم</Button><Button variant="secondary" leadingIcon={<Shield/>}>إجراء إداري</Button><Button variant="outline" leadingIcon={<Download/>} onClick={()=>setNotification({title:"التصدير",message:"نموذج واجهة فقط، لا يوجد ملف ناتج.",tone:"info"})}>تصدير تقرير</Button><Button variant="ghost">إجراء نصي</Button><Button variant="danger" leadingIcon={<Trash2/>} onClick={()=>setDialog(true)}>حذف</Button></div>
      <div className="bui-showcase-flex"><Button size="sm">صغير</Button><Button size="md">متوسط</Button><Button size="lg">كبير</Button><Button disabled>غير متاح</Button><Button loading={busy} onClick={()=>setBusy(v=>!v)}>جارٍ المعالجة...</Button><Button variant="outline" onClick={()=>setBusy(v=>!v)}>{busy?"إنهاء الانتظار":"تجربة الانتظار"}</Button></div>
    </section>

    <section className="bui-showcase-section" aria-labelledby="field-heading"><div className="bui-showcase-heading"><div><span>02</span><h2 id="field-heading">حقول الإدخال — Forms</h2></div><small>وسوم واضحة وحالات خطأ</small></div>
      <div className="bui-showcase-fields"><Input label="اسم المستخدم" placeholder="اكتب اسم المستخدم" startIcon={<UserPlus/>} value={name} onChange={e=>setName(e.target.value)}/><Input label="البريد الإلكتروني" placeholder="name@example.org" startIcon={<Mail/>} dir="ltr" type="email" value={email} onChange={e=>setEmail(e.target.value)}/><Select label="الدور الوظيفي" value={role} onChange={e=>setRole(e.target.value)} options={roleOptions}/><Input label="مثال على حقل خاطئ" placeholder="اسم المستخدم" error="هذا الحقل مطلوب، يُرجى تعبئته"/><Textarea label="ملاحظات" rows={3} placeholder="اكتب ملاحظاتك هنا..." value={remarks} onChange={e=>setRemarks(e.target.value)}/><Input label="حقل للقراءة فقط" defaultValue="Bayan / Smart Views" readOnly description="لا يمكن تعديل القيمة في هذا الحقل."/></div>
    </section>

    <section className="bui-showcase-section" aria-labelledby="badge-heading"><div className="bui-showcase-heading"><div><span>03</span><h2 id="badge-heading">البطاقات والشارات — Cards & Badges</h2></div><small>إحصائيات وحالات واضحة</small></div>
      <div className="bui-showcase-cards"><Card title="إجمالي المستخدمين" description="نموذج بيانات تجريبية" action={<UserPlus size={23} color="var(--bayan-action-primary)"/>}><div className="bui-showcase-stat">{users.length} <span>حسابات تجريبية</span></div></Card><Card title="العروض الذكية" description="مؤشرات للعرض فقط" action={<FileText size={22} color="var(--bayan-action-primary)"/>}><div className="bui-showcase-stat">12 <span>عرضًا</span></div></Card></div>
      <div className="bui-showcase-flex bui-showcase-badges"><Badge tone="success" icon={<Check/>}>نشط</Badge><Badge tone="warning" icon={<AlertTriangle/>}>قيد الانتظار</Badge><Badge tone="danger">خطأ</Badge><Badge tone="info">معلومات</Badge><Badge>غير مصنف</Badge></div>
    </section>

    <section className="bui-showcase-section" aria-labelledby="table-heading"><div className="bui-showcase-heading"><div><span>04</span><h2 id="table-heading">جدول البيانات — DataTable</h2></div><small>تمرير أفقي · بيانات قابلة للبحث</small></div>
      <div className="bui-showcase-table-toolbar"><div className="bui-showcase-search"><Input label="بحث في المستخدمين" placeholder="الاسم أو البريد أو الدور" startIcon={<Search/>} value={search} onChange={e=>setSearch(e.target.value)}/></div><Button size="sm" onClick={()=>setDrawer(true)} leadingIcon={<Plus/>}>إضافة مستخدم</Button></div>
      <DataTable caption="مستخدمو بيان التجريبيون" rows={filtered} rowKey={u=>u.id} columns={columns} emptyMessage="لم يتم العثور على مستخدم يطابق البحث"/>
      <p className="bui-showcase-helper">جرّب البحث وفتح التفاصيل وإضافة مستخدم. لن تُحفَظ التغييرات خارج جلسة المعاينة.</p>
    </section>

    <section className="bui-showcase-section" aria-labelledby="overlay-heading"><div className="bui-showcase-heading"><div><span>05</span><h2 id="overlay-heading">النوافذ والدرج — Dialog & Drawer</h2></div><small>Escape · إغلاق · تركيز لوحة المفاتيح</small></div>
      <div className="bui-showcase-flex"><Button variant="outline" onClick={()=>setDialog(true)}>افتح نافذة التأكيد</Button><Button variant="outline" onClick={()=>setDrawer(true)} trailingIcon={<ChevronLeft/>}>افتح درج إضافة مستخدم</Button></div>
    </section>

    <section className="bui-showcase-section" aria-labelledby="toast-heading"><div className="bui-showcase-heading"><div><span>06</span><h2 id="toast-heading">التنبيهات — Toast</h2></div><small>النجاح والتحذير والخطأ والمعلومة</small></div>
      <div className="bui-showcase-flex"><Button variant="outline" size="sm" onClick={()=>setNotification({title:"تمت العملية بنجاح",message:"تم تحديث البيانات التجريبية.",tone:"success"})}>نجاح</Button><Button variant="outline" size="sm" onClick={()=>setNotification({title:"انتبه",message:"بعض البيانات تحتاج مراجعة.",tone:"warning"})}>تحذير</Button><Button variant="outline" size="sm" onClick={()=>setNotification({title:"تعذر تنفيذ الطلب",message:"لا يوجد اتصال حقيقي بخادم بيان في هذا المثال.",tone:"danger"})}>خطأ</Button><Button variant="outline" size="sm" onClick={()=>setNotification({title:"معلومة",message:"كل البيانات الموجودة للعرض والتجربة فقط.",tone:"info"})}>معلومة</Button></div>
      {notification && <div className="bui-showcase-inline-toast"><Toast {...notification} onClose={()=>setNotification(null)}/></div>}
    </section>

    <Dialog open={dialog} onClose={closeDialog} title="تأكيد الإجراء" description="مثال على نافذة تأكيد عملية حساسة" footer={<><Button variant="outline" onClick={closeDialog}>إلغاء</Button><Button variant="danger" onClick={()=>{setDialog(false);setNotification({title:"تم تأكيد الإجراء التجريبي",message:"لم يُحذف أي سجل حقيقي.",tone:"success"});}}>تأكيد</Button></>}>
      <div className="bui-showcase-dialog-note"><AlertTriangle size={22}/> هل أنت متأكد من إكمال هذا الإجراء؟ لن يتم حذف أي بيانات فعلية.</div>
    </Dialog>
    <Drawer open={drawer} onClose={closeDrawer} title="إضافة مستخدم جديد" description="نموذج تجريبي للإدارة حسب الأدوار" footer={<><Button variant="outline" onClick={closeDrawer}>إلغاء</Button><Button onClick={createUser} leadingIcon={<Plus/>}>إضافة</Button></>}>
      <div className="bui-showcase-drawer-form"><Input label="اسم المستخدم" placeholder="الاسم الكامل" required value={name} onChange={e=>setName(e.target.value)}/><Input label="البريد الإلكتروني" dir="ltr" type="email" placeholder="name@example.org" required value={email} onChange={e=>setEmail(e.target.value)}/><Select label="الدور" value={role} onChange={e=>setRole(e.target.value)} options={roleOptions}/><div className="bui-showcase-tip"><Shield size={19}/> الصلاحيات المعروضة توضيحية فقط؛ التحكم الفعلي RBAC يجب أن يتم في الخادم.</div></div>
    </Drawer>
  </div>;
}
