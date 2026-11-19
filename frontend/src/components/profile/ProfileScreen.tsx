"use client";

import { useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowLeft, ArrowRight, Bell, BookOpenCheck, Building2, Check, CheckCircle2,
  ChevronLeft, CircleHelp, ClipboardCheck, ContactRound, Eye, FileText, Fingerprint,
  GraduationCap, Info, KeyRound, LockKeyhole, Mail, Pencil, Phone, Save, Settings2,
  ShieldCheck, ShieldQuestion, SlidersHorizontal, Sparkles, UserRound, UserRoundCog, X,
} from "lucide-react";
import { ChatLayout } from "@/components/layout";
import { Badge, Button, Card, Dialog, Input, Toast } from "@/components/ui";
import { DemoAccessProvider, useDemoAccess } from "@/components/access/DemoAccess";
import { ORGANIZATION_ROUTES, AUXILIARY_ROUTES } from "@/lib/routes";
import { capabilityLabels, roleMeta, rolePermissions } from "@/lib/access/policy";
import {
  cleanProfile, demoIdentity, initialProfile, validateProfile,
  type ProfileDraft, type ProfileErrors,
} from "@/lib/profile/profile";

type TabId = "overview" | "edit" | "permissions" | "preferences" | "security";
type Notice = { title: string; message: string; tone: "success" | "info" | "warning" | "danger" };
const tabs: Array<{id:TabId; label:string; icon:typeof UserRound}> = [
  { id:"overview", label:"نظرة عامة", icon:UserRound },
  { id:"edit", label:"البيانات الشخصية", icon:Pencil },
  { id:"permissions", label:"الدور والصلاحيات", icon:ShieldCheck },
  { id:"preferences", label:"تفضيلات العرض", icon:SlidersHorizontal },
  { id:"security", label:"أمان الحساب", icon:LockKeyhole },
];

function Detail({ icon, label, value, hint }: { icon: ReactNode; label:string; value:string; hint?:string }) {
  return <div className="bayan-profile-detail">
    <div className="bayan-profile-detail-icon" aria-hidden="true">{icon}</div>
    <div><span className="bayan-profile-detail-label">{label}</span><strong>{value}</strong>{hint && <small>{hint}</small>}</div>
  </div>;
}

function ProfileBody() {
  const { role } = useDemoAccess();
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [saved, setSaved] = useState<ProfileDraft>(initialProfile);
  const [draft, setDraft] = useState<ProfileDraft>(initialProfile);
  const [errors, setErrors] = useState<ProfileErrors>({});
  const [notice, setNotice] = useState<Notice | null>(null);
  const [showDiscard, setShowDiscard] = useState(false);
  const [pendingTab, setPendingTab] = useState<TabId | null>(null);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [compactDensity, setCompactDensity] = useState(false);
  const [showPermissionsDetails, setShowPermissionsDetails] = useState(true);
  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const isDirty = JSON.stringify(cleanProfile(draft)) !== JSON.stringify(saved);
  const displayName = saved.displayName || demoIdentity.officialName;
  const initials = displayName.trim().split(/\s+/).slice(0,2).map(w => w[0]).join("");

  function switchTab(id:TabId) {
    if (id === activeTab) return;
    if (activeTab === "edit" && isDirty) { setPendingTab(id); setShowDiscard(true); return; }
    setErrors({});setActiveTab(id);setNotice(null);
  }
  function handleTabKey(event:KeyboardEvent<HTMLButtonElement>, index:number) {
    const last = tabs.length - 1;
    let next:number | null = null;
    if(event.key === "ArrowLeft") next = (index + 1) % tabs.length; // RTL
    if(event.key === "ArrowRight") next = (index + last) % tabs.length;
    if(event.key === "Home") next = 0;
    if(event.key === "End") next = last;
    if(next !== null) {
      event.preventDefault();
      tabRefs.current[next]?.focus();
      switchTab(tabs[next].id);
    }
  }
  function discardChanges() {
    setDraft(saved);setErrors({});setShowDiscard(false);
    if(pendingTab) setActiveTab(pendingTab);
    setPendingTab(null);
  }
  function saveChanges(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateProfile(draft);
    setErrors(nextErrors);
    if(Object.keys(nextErrors).length) {
      if(nextErrors.displayName) nameRef.current?.focus();
      else if(nextErrors.jobTitle) titleRef.current?.focus();
      else phoneRef.current?.focus();
      return;
    }
    const next = cleanProfile(draft);
    setSaved(next);setDraft(next);
    setNotice({ title:"تم حفظ التعديلات في المعاينة",message:"التغيير ظاهر داخل هذه الصفحة فقط؛ لم يُرسل إلى الخادم ولن يبقى بعد إعادة تحميلها.",tone:"success" });
  }
  function update(field:keyof ProfileDraft, value:string) {
    setDraft(old=>({...old,[field]:value}));
    setErrors(old=>({...old,[field]:undefined}));
    setNotice(null);
  }
  function toggleSetting(key:"emails"|"density") {
    if(key === "emails")setEmailNotifications(v=>!v);
    else setCompactDensity(v=>!v);
    setNotice({ title:"تم تغيير التفضيل للعرض",message:"هذه إعدادات محلية مؤقتة ولا تحفظ في حسابك الفعلي.",tone:"info" });
  }

  return <div className={`bayan-profile ${compactDensity?"bayan-profile--compact":""}`}>
    <nav className="bayan-profile-breadcrumb" aria-label="مسار التنقل">
      <Link href={ORGANIZATION_ROUTES.home}>الرئيسية</Link><ChevronLeft size={15} aria-hidden="true"/><span aria-current="page">الملف الشخصي</span>
    </nav>
    <header className="bayan-profile-titlebar">
      <div><span className="bayan-profile-eyebrow"><Sparkles size={17}/> حساب المستخدم</span>
        <h1>الملف الشخصي</h1><p>بيانات الحساب والمؤسسة والأذونات وإعدادات العرض.</p></div>
      <Link className="bayan-profile-back" href={ORGANIZATION_ROUTES.home}><ArrowRight size={18}/> العودة للمحادثة</Link>
    </header>
    <div className="bayan-profile-demo-banner" role="note"><Info size={19} aria-hidden="true"/><span><strong>وضع المعاينة التجريبية:</strong> جميع المعلومات المعروضة أمثلة توضيحية، ولا توجد جلسة مستخدم حقيقية أو حفظ في قاعدة البيانات.</span></div>
    <section className="bayan-profile-hero" aria-label="ملخص الحساب التجريبي">
      <span className="bayan-profile-hero-decor" aria-hidden="true"><GraduationCap size={150}/></span>
      <div className="bayan-profile-hero-main">
        <span className="bayan-profile-avatar" aria-label={`الأحرف الأولى: ${initials}`}>{initials}</span>
        <div className="bayan-profile-hero-info"><span className="bayan-profile-mini-label">معلومات المستخدم</span>
          <h2>{displayName}</h2><p>{saved.jobTitle || "مستخدم مؤسسة"}</p>
          <div className="bayan-profile-hero-pills"><span><Building2 size={15}/>{demoIdentity.organization}</span><span><ShieldCheck size={15}/>{roleMeta[role].label}</span></div>
        </div>
      </div>
      <div className="bayan-profile-hero-side"><Badge tone="info" icon={<CircleHelp size={14}/>}>حساب للعرض فقط</Badge><span>مساعد مؤسسي عربي ذكي</span></div>
    </section>

    <div className="bayan-profile-tabs" role="tablist" aria-label="أقسام الملف الشخصي">
      {tabs.map((tab,index)=>{const Icon=tab.icon;return <button key={tab.id} ref={el=>{tabRefs.current[index]=el;}} type="button"
        id={`bayan-profile-tab-${tab.id}`} role="tab" aria-controls={`bayan-profile-panel-${tab.id}`}
        aria-selected={activeTab===tab.id} tabIndex={activeTab===tab.id?0:-1}
        className={`bayan-profile-tab ${activeTab===tab.id?"active":""}`} onClick={()=>switchTab(tab.id)} onKeyDown={event=>handleTabKey(event,index)}>
        <Icon size={18} aria-hidden="true"/>{tab.label}</button>})}
    </div>

    <section id={`bayan-profile-panel-${activeTab}`} role="tabpanel" tabIndex={0} aria-labelledby={`bayan-profile-tab-${activeTab}`} className="bayan-profile-content">
      {activeTab === "overview" && <div className="bayan-profile-grid">
        <Card className="bayan-profile-card bayan-profile-card--main" title="البيانات الأساسية" description="معلومات تعريفية من السجل التجريبي">
          <div className="bayan-profile-details-grid">
            <Detail icon={<ContactRound size={22}/>} label="الاسم الرسمي" value={demoIdentity.officialName} hint="للعرض فقط — يُدار من المؤسسة" />
            <Detail icon={<Mail size={22}/>} label="البريد الإلكتروني المؤسسي" value={demoIdentity.email} hint="غير قابل للتعديل من هذه الصفحة" />
            <Detail icon={<Building2 size={22}/>} label="المؤسسة" value={demoIdentity.organization} />
            <Detail icon={<BookOpenCheck size={22}/>} label="القسم" value={demoIdentity.department} />
            <Detail icon={<Phone size={22}/>} label="رقم الهاتف" value={saved.phone || "لم يُضَف رقم"} />
            <Detail icon={<UserRoundCog size={22}/>} label="الدور" value={roleMeta[role].label} hint="يعتمد الدور الفعلي على خادم المؤسسة" />
          </div>
          <div className="bayan-profile-card-actions"><Button variant="primary" size="md" leadingIcon={<Pencil size={17}/>} onClick={()=>switchTab("edit")}>تعديل البيانات</Button><Button variant="outline" size="md" leadingIcon={<ShieldCheck size={17}/>} onClick={()=>switchTab("permissions")}>عرض الصلاحيات</Button></div>
        </Card>
        <aside className="bayan-profile-side-stack">
          <div className="bayan-profile-side-card"><span className="bayan-profile-side-icon"><ShieldCheck size={27}/></span><h3>دورك في النظام</h3><strong>{roleMeta[role].label}</strong><p>{roleMeta[role].description}</p><button type="button" onClick={()=>switchTab("permissions")}>استعراض الصلاحيات <ArrowLeft size={15}/></button></div>
          <div className="bayan-profile-side-note"><Info size={20}/><div><strong>خصوصية البيانات</strong><p>تعديل الاسم الرسمي أو البريد المؤسسي أو الدور يتطلب إجراءً معتمدًا من مسؤول الجهة، وليس من هذه الصفحة.</p></div></div>
        </aside>
      </div>}

      {activeTab === "edit" && <div className="bayan-profile-grid">
        <Card className="bayan-profile-card bayan-profile-card--main" title="تعديل البيانات الشخصية" description="يمكنك تعديل المعلومات غير الإدارية فقط داخل المعاينة.">
          <form className="bayan-profile-form" onSubmit={saveChanges} noValidate>
            <div className="bayan-profile-form-grid">
              <Input id="bayan-profile-display-name" ref={nameRef} label="الاسم المعروض" required maxLength={70} autoComplete="nickname" value={draft.displayName} onChange={e=>update("displayName",e.target.value)} error={errors.displayName} description="يظهر داخل الملف الشخصي فقط." />
              <Input id="bayan-profile-job-title" ref={titleRef} label="المسمى الوظيفي" maxLength={80} value={draft.jobTitle} onChange={e=>update("jobTitle",e.target.value)} error={errors.jobTitle} placeholder="مثال: موظف شؤون الطلاب" />
              <Input id="bayan-profile-phone" ref={phoneRef} label="رقم الهاتف (اختياري)" inputMode="tel" dir="ltr" autoComplete="tel" value={draft.phone} onChange={e=>update("phone",e.target.value)} error={errors.phone} placeholder="+967XXXXXXXXX" />
              <div className="bayan-profile-locked-field"><span>البريد الإلكتروني المؤسسي</span><div><LockKeyhole size={16}/><b dir="ltr">{demoIdentity.email}</b></div><small>يُدار من جهة العمل ولا يُعدّل هنا.</small></div>
            </div>
            <div className="bayan-profile-form-note"><ShieldCheck size={18}/><span>لا تُرسَل هذه المدخلات إلى أي خدمة، ولا تُخزَّن خارج ذاكرة الصفحة.</span></div>
            <div className="bayan-profile-form-actions"><Button type="submit" variant="primary" leadingIcon={<Save size={18}/>} disabled={!isDirty}>حفظ في المعاينة</Button><Button variant="outline" onClick={()=>{if(isDirty){setPendingTab(null);setShowDiscard(true);}else setActiveTab("overview");}}>إلغاء</Button></div>
          </form>
        </Card>
        <aside className="bayan-profile-side-stack"><div className="bayan-profile-side-card bayan-profile-edit-guidance"><span className="bayan-profile-side-icon"><Pencil size={27}/></span><h3>ما الذي يمكن تعديله؟</h3><p>الاسم المعروض، المسمى الوظيفي ورقم الهاتف فقط ضمن النموذج التجريبي.</p><div className="bayan-profile-guidance-line"><CheckCircle2 size={17}/> التحقق من البيانات قبل الحفظ</div><div className="bayan-profile-guidance-line"><CheckCircle2 size={17}/> إلغاء التعديلات غير المحفوظة</div><div className="bayan-profile-guidance-line"><CheckCircle2 size={17}/> عدم تعديل الدور أو المؤسسة</div></div></aside>
      </div>}

      {activeTab === "permissions" && <div className="bayan-profile-grid">
        <Card className="bayan-profile-card bayan-profile-card--main" title="صلاحيات الوصول" description="مصفوفة عرض توضيحية لسياسة RBAC المقترحة في بيان.">
          <div className="bayan-profile-permission-lead"><div><span className="bayan-profile-permission-icon"><ShieldCheck size={26}/></span><span><strong>{roleMeta[role].label}</strong><small>{roleMeta[role].description}</small></span></div><Badge tone="info">محاكاة UI فقط</Badge></div>
          <label className="bayan-profile-simulation" htmlFor="bayan-profile-role"><strong>استعراض دور تجريبي</strong><span>يمكنك تبديل الدور لفهم اختلاف عناصر الواجهة. لا يغيّر ذلك صلاحية حساب حقيقي.</span></label>
          <RoleSelector/>
          <div className="bayan-profile-permission-head"><h3>الإجراءات المعروضة لهذا الدور ({rolePermissions[role].length})</h3><button type="button" onClick={()=>setShowPermissionsDetails(v=>!v)} aria-expanded={showPermissionsDetails}>{showPermissionsDetails?"إخفاء التفاصيل":"إظهار التفاصيل"} <Eye size={15}/></button></div>
          {showPermissionsDetails && <ul className="bayan-profile-permission-list">{rolePermissions[role].map(capability=><li key={capability}><CheckCircle2 size={19}/><span>{capabilityLabels[capability]}</span><code dir="ltr">{capability}</code></li>)}</ul>}
          <div className="bayan-profile-warning"><ShieldQuestion size={19}/><p>الصلاحيات المعروضة لا تسمح بالوصول إلى أي بيانات. يجب التحقق من هوية المستخدم والمؤسسة وأذوناته على خادم FastAPI لكل طلب.</p></div>
        </Card>
        <aside className="bayan-profile-side-stack"><div className="bayan-profile-side-card"><span className="bayan-profile-side-icon"><Fingerprint size={28}/></span><h3>من يمنح الصلاحيات؟</h3><p>لا يغير المستخدم دوره ذاتيًا. يحدد المسؤول المخوّل الدور بحسب سياسة المؤسسة، ويطبق الخادم قيود الوصول.</p><Link href={AUXILIARY_ROUTES.screens}>خريطة شاشات النظام <ArrowLeft size={15}/></Link></div></aside>
      </div>}

      {activeTab === "preferences" && <div className="bayan-profile-grid">
        <Card className="bayan-profile-card bayan-profile-card--main" title="تفضيلات العرض" description="خيارات تجريبية لا تمثل إعدادات محفوظة في الحساب.">
          <div className="bayan-profile-settings-list">
            <div className="bayan-profile-setting"><span className="bayan-profile-setting-icon"><BookOpenCheck size={22}/></span><div><strong>لغة الواجهة</strong><p>العربية — اتجاه العرض من اليمين إلى اليسار</p></div><Badge tone="info">معتمدة</Badge></div>
            <div className="bayan-profile-setting"><span className="bayan-profile-setting-icon"><Bell size={22}/></span><div><strong>تنبيهات البريد (معاينة)</strong><p>تحاكي اختيار تلقي تنبيهات الحساب؛ لا تُرسل رسائل.</p></div><button type="button" role="switch" className="bayan-profile-switch" aria-checked={emailNotifications} aria-label="تنبيهات البريد التجريبية" onClick={()=>toggleSetting("emails")}><i/></button></div>
            <div className="bayan-profile-setting"><span className="bayan-profile-setting-icon"><Settings2 size={22}/></span><div><strong>كثافة عرض المحتوى</strong><p>تقليل المسافات داخل بطاقات الملف الشخصي.</p></div><button type="button" role="switch" className="bayan-profile-switch" aria-checked={compactDensity} aria-label="عرض مضغوط" onClick={()=>toggleSetting("density")}><i/></button></div>
          </div>
        </Card>
        <aside className="bayan-profile-side-stack"><div className="bayan-profile-side-note"><Info size={20}/><div><strong>إعدادات مؤقتة</strong><p>ستعود تفضيلات المعاينة إلى القيم الافتراضية بعد إعادة تحميل الصفحة.</p></div></div></aside>
      </div>}

      {activeTab === "security" && <div className="bayan-profile-grid">
        <Card className="bayan-profile-card bayan-profile-card--main" title="أمان الحساب" description="خيارات التعريف والحماية المتاحة في نموذج الواجهة.">
          <div className="bayan-profile-security-list">
            <div><span className="bayan-profile-security-icon"><KeyRound size={23}/></span><section><h3>كلمة المرور</h3><p>يمكنك تجربة تدفق استعادة الحساب، لكن لا يُنفذ تغيير حقيقي دون Backend.</p></section><Link href={ORGANIZATION_ROUTES.forgotPassword} className="bayan-profile-secondary-action">طلب استعادة <ArrowLeft size={17}/></Link></div>
            <div><span className="bayan-profile-security-icon"><Fingerprint size={23}/></span><section><h3>التحقق بخطوتين</h3><p>يتطلب تفعيلًا آمنًا على الخادم؛ غير متاح في هذا النموذج.</p></section><Badge tone="warning">غير متصل</Badge></div>
            <div><span className="bayan-profile-security-icon"><ClipboardCheck size={23}/></span><section><h3>الأجهزة والجلسات النشطة</h3><p>لا توجد جلسات حقيقية متصلة يمكن عرضها أو إلغاؤها في المعاينة.</p></section><Badge tone="neutral">بانتظار الربط</Badge></div>
          </div>
          <div className="bayan-profile-warning"><Info size={19}/><p>لا تختبر كلمات مرورك الحقيقية على الشاشات التجريبية. لا يجري هذا النموذج طلبات دخول أو تغيير حسابات.</p></div>
        </Card>
        <aside className="bayan-profile-side-stack"><div className="bayan-profile-side-card"><span className="bayan-profile-side-icon"><LockKeyhole size={26}/></span><h3>سياسة الأمان</h3><p>ستُضاف إدارة الجلسات وتغيير كلمة المرور والتحقق بخطوتين بعد تحديد عقود API وآلية المصادقة مع فريق Backend.</p><Link href={ORGANIZATION_ROUTES.login}>صفحة تسجيل الدخول <ArrowLeft size={15}/></Link></div></aside>
      </div>}
    </section>

    <footer className="bayan-profile-footer"><span><ShieldCheck size={15}/> واجهة تجريبية — لا تحفظ بيانات المستخدم في الخادم</span><span>بيان · تصميم عربي RTL</span></footer>
    <Dialog open={showDiscard} onClose={()=>{setShowDiscard(false);setPendingTab(null);}} title="تجاهل التعديلات؟" description="هناك حقول عدلتها ولم تحفظها في المعاينة." footer={<><Button variant="danger" leadingIcon={<X size={16}/>} onClick={discardChanges}>تجاهل التعديلات</Button><Button variant="outline" onClick={()=>{setShowDiscard(false);setPendingTab(null);}}>متابعة التحرير</Button></>}><p>سيُعاد النموذج إلى آخر قيم محفوظة داخل هذه الصفحة.</p></Dialog>
    {notice && <div className="bayan-profile-toast-wrap"><Toast {...notice} onClose={()=>setNotice(null)}/></div>}
  </div>;
}

function RoleSelector(){
  const { role, setRole } = useDemoAccess();
  return <select id="bayan-profile-role" className="bayan-profile-role-select" value={role} onChange={event=>setRole(event.target.value as typeof role)}>
    {Object.entries(roleMeta).map(([id, data])=><option value={id} key={id}>{data.label}</option>)}
  </select>;
}

export function ProfileScreen() {
  return <DemoAccessProvider initialRole="employee"><ChatLayout variant="feature"><ProfileBody/></ChatLayout></DemoAccessProvider>;
}
