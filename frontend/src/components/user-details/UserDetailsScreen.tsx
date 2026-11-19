'use client';

import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {
  Activity,AlertTriangle,ArrowLeft,BadgeCheck,Building2,CalendarDays,CheckCircle2,
  ChevronLeft,Clipboard,Clock3,ContactRound,FileClock,Info,KeyRound,LockKeyhole,
  Mail,Pencil,RefreshCcw,Shield,ShieldCheck,UserRound,UserRoundMinus,UserRoundPlus,
  UsersRound,BriefcaseBusiness
} from 'lucide-react';
import {AdminLayout} from '@/components/layout';
import {Badge,Button,Dialog,Toast} from '@/components/ui';
import {StatePanel} from '@/components/states';
import {DemoAccessProvider,DemoRolePicker,useDemoAccess} from '@/components/access/DemoAccess';
import {ORGANIZATION_ROUTES} from '@/lib/routes';
import {capabilityLabels,rolePermissions} from '@/lib/access/policy';
import {
  DEMO_USERS,USERS_DEMO_NOTE,demoActorId,demoInstitution,departments,
  editUser,restoreUserFixtures,setUserStatus,userRoleLabels,userStatusLabels,
  userTotals,validateUserDraft,type AccountStatus,type TenantRole,type UserDraft,type UserRecord
} from '@/lib/user-management/users';
import {
  findUserById,fixtureActivity,normalizeRequestedUserId,roleChangeAllowed,
  USER_DETAILS_STORAGE_KEY,type UserPreviewActivity
} from '@/lib/user-management/details';
import {PermissionMatrix} from '@/components/access/PermissionMatrix';

type Tab='overview'|'permissions'|'activity';
type Notice={title:string;message:string;tone:'success'|'warning'|'danger'|'info'};
const ROLES:TenantRole[]=['employee','manager','it_admin'];

function Body({requestedId}:{requestedId:string|null}){
  const router=useRouter();
  const {can}=useDemoAccess();
  const canManage=can('users.manage');
  const validId=normalizeRequestedUserId(requestedId);
  const [loaded,setLoaded]=useState(false);
  const [users,setUsers]=useState<UserRecord[]>(()=>DEMO_USERS.map(u=>({...u})));
  const [tab,setTab]=useState<Tab>('overview');
  const [editing,setEditing]=useState(false);
  const [draft,setDraft]=useState<UserDraft|null>(null);
  const [errors,setErrors]=useState<Record<string,string>>({});
  const [pendingStatus,setPendingStatus]=useState(false);
  const [localEvents,setLocalEvents]=useState<UserPreviewActivity[]>([]);
  const [notice,setNotice]=useState<Notice|null>(null);

  useEffect(()=>{
    try{
      const saved=localStorage.getItem(USER_DETAILS_STORAGE_KEY);
      setUsers(saved===null?DEMO_USERS.map(u=>({...u})):restoreUserFixtures(JSON.parse(saved)));
    }catch{
      setUsers(DEMO_USERS.map(u=>({...u})));
      setNotice({title:'تعذّر قراءة بيانات المتصفح',message:'عُرضت سجلات المثال الافتراضية بدلًا منها.',tone:'warning'});
    }
    setLoaded(true);
  },[]);
  const user=useMemo(()=>findUserById(users,validId),[users,validId]);
  const permissions=user?rolePermissions[user.role]:[];
  const activity=user?[...localEvents,...fixtureActivity(user)]:[];
  const protectedActor=!!user&&user.id===demoActorId;
  const isLastAdmin=!!user&&user.role==='it_admin'&&user.status==='active'&&userTotals(users).admins<=1;
  const statusNext:AccountStatus=user?.status==='active'?'disabled':'active';
  const disableBlocked=protectedActor||isLastAdmin;

  function persist(next:UserRecord[]):boolean{
    try{
      localStorage.setItem(USER_DETAILS_STORAGE_KEY,JSON.stringify(next));
      setUsers(next);
      return true;
    }catch{
      setNotice({title:'لم تُحفظ التعديلات',message:'تعذّر استخدام التخزين المحلي. لم يتم عرض نجاح العملية.',tone:'danger'});
      return false;
    }
  }
  function recordLocalEvent(title:string,detail:string){
    setLocalEvents(prev=>[{
      id:`action-${Date.now()}-${prev.length}`,title,detail,
      date:new Intl.DateTimeFormat('ar',{hour:'2-digit',minute:'2-digit'}).format(new Date()),kind:'local' as const
    },...prev].slice(0,8));
  }
  function openEdit(){
    if(!canManage||!user)return;
    setDraft({name:user.name,email:user.email,role:user.role,department:user.department});
    setErrors({});setEditing(true);
  }
  function submitEdit(){
    if(!canManage||!user||!draft)return;
    const violations=validateUserDraft(draft,users,user.id);
    setErrors(violations);
    if(Object.keys(violations).length)return;
    const result=editUser(users,user.id,draft);
    if(!result.ok){setNotice({title:'التعديل غير مسموح',message:result.error,tone:'warning'});return;}
    if(!persist(result.users))return;
    setEditing(false);
    recordLocalEvent('تعديل بيانات الحساب في المعاينة','حُفظت بيانات العرض فقط في هذا المتصفح، دون تحديث الخادم.');
    setNotice({title:'تم حفظ بيانات المعاينة',message:'التغيير محلي فقط ولا يؤثر على حساب حقيقي أو صلاحيات فعلية.',tone:'success'});
  }
  function applyStatus(){
    if(!canManage||!user)return;
    const result=setUserStatus(users,user.id,statusNext);
    setPendingStatus(false);
    if(!result.ok){setNotice({title:'الإجراء مرفوض',message:result.error,tone:'warning'});return;}
    if(!persist(result.users))return;
    recordLocalEvent(statusNext==='disabled'?'تعطيل الحالة التجريبية':'تنشيط الحالة التجريبية','تغيّرت قيمة الحالة في متصفح العرض فقط، دون إنهاء أي جلسة حقيقية.');
    setNotice({title:statusNext==='disabled'?'تم التعطيل محليًا':'تم التنشيط محليًا',message:'لا يتغير الوصول الفعلي إلى النظام.',tone:'success'});
  }
  async function copyId(){
    if(!user)return;
    try{await navigator.clipboard.writeText(user.id);setNotice({title:'نُسخ المعرّف',message:'نسخ المعرّف التجريبي فقط.',tone:'success'});}
    catch{setNotice({title:'تعذّر النسخ',message:'يمكنك تحديد المعرّف من بطاقة الحساب ونسخه يدويًا.',tone:'warning'});}
  }
  const identity=<nav className="ban-breadcrumb" aria-label="مسار التنقل"><Link href={ORGANIZATION_ROUTES.dashboard}>لوحة الإدارة</Link><ChevronLeft size={15}/><Link href={ORGANIZATION_ROUTES.users}>إدارة المستخدمين</Link><ChevronLeft size={15}/><span aria-current="page">تفاصيل المستخدم</span></nav>;

  return <div className="ban bud" dir="rtl" data-testid="user-details-screen">
    {identity}
    <header className="ban-hero bud-hero">
      <div><span className="ban-eyebrow"><ContactRound size={17}/> إدارة المستخدمين · تفاصيل الحساب</span><h1>تفاصيل المستخدم</h1><p>معلومات الحساب ودوره وصلاحياته وحالة الوصول، مع إجراءات إدارة تجريبية.</p>
      <div className="ban-hero-tags"><span><Building2 size={15}/> نطاق المؤسسة</span><span><ShieldCheck size={15}/> مراجعة الصلاحيات</span><span><FileClock size={15}/> نشاط توضيحي</span></div></div>
      <div className="ban-hero-art" aria-hidden="true"><ContactRound size={74}/></div>
    </header>
    <div className="ban-disclaimer" role="note"><Info size={19}/><p><strong>بيانات العرض:</strong> {USERS_DEMO_NOTE} معلومات النشاط أدناه توضيحية وليست سجل تدقيق. يُرجى عدم إدخال بيانات حقيقية.</p></div>
    <section className="ban-role"><span><LockKeyhole size={17}/> تفاصيل المستخدمين وإجراءاتهم تظهر لمسؤول تقنية المعلومات فقط في هذه المحاكاة.</span><DemoRolePicker id="bud-demo-role"/></section>
    {!canManage?<div className="ban-locked" data-testid="user-details-forbidden"><StatePanel state="forbidden" title="ليس لديك صلاحية عرض تفاصيل المستخدم" description="اختر مسؤول تقنية المعلومات من الدور التجريبي. يجب التحقق من الوصول الحقيقي على خادم FastAPI وبحسب المؤسسة."/><Link href={ORGANIZATION_ROUTES.users}>العودة إلى المستخدمين <ArrowLeft size={17}/></Link></div>:
    !loaded?<section className="ban-panel bud-state" role="status">جارٍ تحميل سجل العرض التجريبي…</section>:
    !user?<section className="ban-panel bud-state" data-testid="user-details-not-found"><AlertTriangle size={36}/><h2>{validId?'المستخدم غير موجود في قائمة العرض':'معرّف المستخدم غير صالح أو مفقود'}</h2><p>ربما تغيّر السجل أو حُذف محليًا. افتح حسابًا من صفحة إدارة المستخدمين.</p><Link href={ORGANIZATION_ROUTES.users} className="bud-back"><UsersRound size={17}/> عرض المستخدمين</Link></section>:
    <>
      <section className="ban-panel bud-identity" data-testid="user-identity">
        <div className="bud-profile"><span className="bud-avatar"><UserRound size={34}/></span><div><div className="bud-profile-heading"><h2>{user.name}</h2><Badge tone={user.status==='active'?'success':'warning'}>{userStatusLabels[user.status]}</Badge></div><p dir="ltr" className="bud-email">{user.email}</p><div className="bud-mini-meta"><span><Shield size={15}/>{userRoleLabels[user.role]}</span><span><Building2 size={15}/>{user.department}</span><span><Clipboard size={14}/><b dir="ltr">{user.id}</b></span></div></div></div>
        <div className="bud-profile-actions"><Button variant="outline" size="sm" leadingIcon={<Clipboard size={15}/>} onClick={copyId}>نسخ المعرّف</Button><Button size="sm" leadingIcon={<Pencil size={16}/>} onClick={openEdit}>تعديل المستخدم</Button><Button size="sm" variant={user.status==='active'?'danger':'outline'} disabled={user.status==='active'&&disableBlocked} leadingIcon={user.status==='active'?<UserRoundMinus size={15}/>:<UserRoundPlus size={15}/>} onClick={()=>setPendingStatus(true)}>{user.status==='active'?'تعطيل الحساب':'تنشيط الحساب'}</Button></div>
      </section>
      <div className="bud-metrics" aria-label="ملخص الحساب">
        <article className="bud-metric"><span><BadgeCheck size={21}/></span><div><small>حالة الحساب</small><strong>{userStatusLabels[user.status]}</strong><p>نموذج محلي فقط</p></div></article>
        <article className="bud-metric"><span><KeyRound size={21}/></span><div><small>الدور المؤسسي</small><strong>{userRoleLabels[user.role]}</strong><p>حسب نموذج الصلاحيات</p></div></article>
        <article className="bud-metric"><span><CalendarDays size={21}/></span><div><small>تاريخ الإضافة</small><strong dir="ltr">{user.joined}</strong><p>تاريخ سجّل تدريبي</p></div></article>
        <article className="bud-metric"><span><Clock3 size={21}/></span><div><small>آخر نشاط</small><strong>{user.lastSeen}</strong><p>قيمة افتراضية</p></div></article>
      </div>
      <div className="bud-grid">
        <div className="bud-main">
          <section className="ban-panel bud-card" aria-label="معلومات المستخدم">
            <div className="bud-tabs" role="tablist" aria-label="أقسام تفاصيل المستخدم">
              {([{id:'overview',label:'البيانات الأساسية',icon:<UserRound size={17}/>},{id:'permissions',label:'الدور والصلاحيات',icon:<ShieldCheck size={17}/>},{id:'activity',label:'النشاط التجريبي',icon:<Activity size={17}/>} ] as const).map(t=><button key={t.id} type="button" role="tab" aria-selected={tab===t.id} className={tab===t.id?'active':''} onClick={()=>setTab(t.id)}>{t.icon}{t.label}</button>)}
            </div>
            <div className="bud-tab-content" role="tabpanel">
              {tab==='overview'&&<div data-testid="user-overview"><div className="bud-heading"><BriefcaseBusiness size={20}/><div><h3>بيانات الحساب والمؤسسة</h3><p>حقول تعريفية من سجلات العرض المشتركة مع إدارة المستخدمين.</p></div></div>
                <dl className="bud-fields"><div><dt>الاسم الكامل</dt><dd>{user.name}</dd></div><div><dt>البريد الإلكتروني</dt><dd dir="ltr">{user.email}</dd></div><div><dt>معرّف المستخدم</dt><dd dir="ltr">{user.id}</dd></div><div><dt>القسم</dt><dd>{user.department}</dd></div><div className="bud-field-wide"><dt>المؤسسة</dt><dd>{user.institution}</dd></div><div><dt>الدور</dt><dd>{userRoleLabels[user.role]}</dd></div><div><dt>حالة الحساب</dt><dd>{userStatusLabels[user.status]}</dd></div></dl>
                <p className="bud-info"><Info size={17}/> لا تعرض الصفحة كلمة مرور أو رمز وصول أو جلسات فعلية؛ هذه بيانات تعريفية وهمية فقط.</p></div>}
              {tab==='permissions'&&<div data-testid="user-permissions"><div className="bud-heading"><ShieldCheck size={20}/><div><h3>صلاحيات الدور: {userRoleLabels[user.role]}</h3><p>صلاحيات عرض مقترحة لهذا الدور في نموذج بيان؛ تُفرض الصلاحيات الحقيقية بالخادم.</p></div></div>
                <div className="bud-permissions">{permissions.map(cap=><div className="bud-permission" key={cap}><CheckCircle2 size={19}/><span>{capabilityLabels[cap]}</span><small dir="ltr">{cap}</small></div>)}</div>
                <div style={{marginTop:'1.5rem',borderTop:'1px solid var(--bayan-border)',paddingTop:'1.25rem'}}>
                  <h4 style={{margin:'0 0 0.5rem',fontSize:'1rem',color:'var(--bayan-gold)'}}>مصفوفة الصلاحيات والاستثناءات الفردية للمستخدم</h4>
                  <p style={{fontSize:'0.85rem',color:'var(--bayan-text-muted)',margin:'0 0 1rem'}}>يمكن لمسؤول تقنية المعلومات منح استثناء صريح (ALLOW) أو حجب صريح (DENY) أو استعادة التوريث لحظياً.</p>
                  <PermissionMatrix userId={user.id} scope="organization" interactive={true}/>
                </div>
                <p className="bud-info"><LockKeyhole size={17}/> دور مسؤول المنصة مستقل، ولا يحصل تلقائيًا على صلاحية إدارة مستخدمي المؤسسة. لا يجوز الاعتماد على هذه القائمة لاتخاذ قرار وصول حقيقي.</p></div>}
              {tab==='activity'&&<div data-testid="user-activity"><div className="bud-heading"><Activity size={20}/><div><h3>النشاط والإجراءات التوضيحية</h3><p>أحداث نموذجية من السجلات الوهمية، مع إجراءات أجريتها في هذه الصفحة فقط.</p></div></div>
                <ol className="bud-timeline">{activity.map(event=><li key={event.id}><span className={event.kind==='local'?'bud-dot local':'bud-dot'}/><div><div className="bud-event-header"><strong>{event.title}</strong><time>{event.date}</time></div><p>{event.detail}</p><span className="bud-event-kind">{event.kind==='fixture'?'بيانات افتراضية':'إجراء محلي في الجلسة'}</span></div></li>)}</ol>
                <p className="bud-info"><FileClock size={17}/> هذه ليست سجلات Audit Log الفعلية؛ ستظهر فقط بعد ربط خدمة التدقيق المصرّح بها.</p></div>}
            </div>
          </section>
        </div>
        <aside className="bud-aside" aria-label="معلومات وإجراءات مرتبطة">
          <section className="ban-panel bud-side-card"><h3><ShieldCheck size={19}/> معلومات إدارة الدور</h3><p>{userRoleLabels[user.role]} هو الدور المحفوظ في نموذج هذه المؤسسة.</p><p>تغيير الدور يتم من نافذة «تعديل المستخدم» بعد التحقق من قواعد حماية الحساب الإداري وآخر مسؤول نشط.</p><Button variant="outline" size="sm" fullWidth onClick={()=>{setTab('permissions');}} leadingIcon={<Shield size={16}/>}>عرض صلاحيات الدور</Button></section>
          <section className="ban-panel bud-side-card"><h3><AlertTriangle size={19}/> قواعد الحماية</h3><ul><li>يُمنع تعطيل حساب الإدارة الحالي.</li><li>يُمنع تعطيل آخر مسؤول تقنية معلومات نشط.</li><li>يُمنع تخفيض دور الحساب الإداري الحالي.</li><li>لا تتصل هذه الشاشة بنظام المصادقة الحقيقي.</li></ul>{protectedActor&&<p className="bud-protected">هذا هو حساب الإدارة الحالي في بيانات المثال.</p>}{isLastAdmin&&<p className="bud-protected">هذا آخر مسؤول تقنية معلومات نشط.</p>}</section>
          <Link href={ORGANIZATION_ROUTES.users} className="bud-back"><UsersRound size={18}/> العودة إلى إدارة المستخدمين <ArrowLeft size={16}/></Link>
        </aside>
      </div>
    </>}
    <Dialog open={editing&&canManage&&Boolean(user)} onClose={()=>setEditing(false)} title="تعديل بيانات مستخدم تجريبي" description="لا يتم إرسال أي تعديل إلى قاعدة البيانات أو المصادقة" footer={<><Button variant="outline" onClick={()=>setEditing(false)}>إلغاء</Button><Button onClick={submitEdit} leadingIcon={<CheckCircle2 size={16}/>}>حفظ التعديل محليًا</Button></>}>
      {draft&&<div className="bud-edit-grid">
        <label><span>الاسم الكامل</span><input value={draft.name} onChange={e=>{setDraft({...draft,name:e.target.value});setErrors({});}} aria-invalid={!!errors.name} maxLength={90}/>{errors.name&&<small role="alert">{errors.name}</small>}</label>
        <label><span>البريد الإلكتروني</span><input dir="ltr" type="email" value={draft.email} onChange={e=>{setDraft({...draft,email:e.target.value});setErrors({});}} aria-invalid={!!errors.email} maxLength={254}/>{errors.email&&<small role="alert">{errors.email}</small>}</label>
        <label><span>القسم</span><select value={draft.department} onChange={e=>{setDraft({...draft,department:e.target.value});setErrors({});}}>{departments.map(d=><option key={d} value={d}>{d}</option>)}</select>{errors.department&&<small role="alert">{errors.department}</small>}</label>
        <label><span>الدور المؤسسي</span><select value={draft.role} disabled={Boolean(user)&&!roleChangeAllowed(user!,demoActorId)} onChange={e=>{setDraft({...draft,role:e.target.value as TenantRole});setErrors({});}}>{ROLES.map(r=><option key={r} value={r}>{userRoleLabels[r]}</option>)}</select>{errors.role&&<small role="alert">{errors.role}</small>}</label>
        <div className="bud-edit-hint"><Info size={16}/> يُمنع تغيير دور حساب الإدارة الحالي وإزالة دور آخر مسؤول تقنية معلومات نشط. هذا تعديل محلي تجريبي فقط.</div>
      </div>}
    </Dialog>
    <Dialog open={pendingStatus&&canManage&&Boolean(user)} onClose={()=>setPendingStatus(false)} title={statusNext==='disabled'?'تأكيد تعطيل حساب تجريبي':'تأكيد تنشيط حساب تجريبي'} description="تغيير حالة محلية فقط دون تأثير على جلسات حقيقية" footer={<><Button variant="outline" onClick={()=>setPendingStatus(false)}>إلغاء</Button><Button variant={statusNext==='disabled'?'danger':'primary'} onClick={applyStatus}>تأكيد {statusNext==='disabled'?'التعطيل':'التنشيط'} المحلي</Button></>}>
      <p className="bud-confirm">هل تريد {statusNext==='disabled'?'تعطيل':'تنشيط'} <strong>{user?.name}</strong> في البيانات التجريبية؟ لا تتغير حالة أي حساب حقيقي.</p>
    </Dialog>
    {notice&&<div className="bud-toast"><Toast {...notice} onClose={()=>setNotice(null)}/></div>}
  </div>;
}
export function UserDetailsScreen({requestedId}:{requestedId:string|null}){
  return <DemoAccessProvider initialRole="it_admin"><AdminLayout variant="feature"><Body requestedId={requestedId}/></AdminLayout></DemoAccessProvider>;
}
