"use client";

import {useEffect,useRef,useState,type KeyboardEvent,type ReactNode} from "react";
import Link from "next/link";
import {
  ArrowLeft, ArrowRight, Bell, BellRing, Check, ChevronLeft,
  FileDown, FileText, Info, Keyboard, Languages, LayoutGrid, LockKeyhole,
  MessageSquareText, MonitorCog, MoonStar, RotateCcw, Save, Settings2,
  ShieldCheck, Sparkles, Database, EyeOff, Accessibility, Laptop,
} from "lucide-react";
import {ChatLayout} from "@/components/layout";
import {Badge,Button,Card,Dialog,Select,Toast} from "@/components/ui";
import {ORGANIZATION_ROUTES} from "@/lib/routes";
import {DemoAccessProvider,useDemoAccess,DemoRolePicker} from "@/components/access/DemoAccess";
import {roleMeta} from "@/lib/access/policy";
import {
  demoStorageKey,defaultPreferences,readDemoPreferences,writeDemoPreferences,
  sanitizePreferences,effectivePreferences,preferencesEqual,
  type UserPreferences,
} from "@/lib/settings/preferences";

type SectionId="appearance"|"notifications"|"chat"|"advanced";
type Notice={title:string;message:string;tone:"success"|"info"|"warning"|"danger"};
const sections = [
  {id:"appearance",title:"المظهر والعرض",description:"حجم النص وتباعد العناصر",icon:MonitorCog},
  {id:"notifications",title:"الإشعارات",description:"تنبيهات النظام والقنوات",icon:BellRing},
  {id:"chat",title:"تفضيلات المحادثة",description:"الكتابة والمصادر",icon:MessageSquareText},
  {id:"advanced",title:"الإعدادات المتقدمة",description:"SQL والتقارير والصلاحيات",icon:ShieldCheck},
] as const;

function Toggle({id,title,description,checked,onChange,disabled=false,icon}: {
  id:string;title:string;description:string;checked:boolean;onChange:(next:boolean)=>void;disabled?:boolean;icon:ReactNode;
}){
  return <div className={`bayan-settings-toggle-row ${disabled?"is-disabled":""}`}>
    <span className="bayan-settings-item-icon" aria-hidden="true">{icon}</span>
    <div className="bayan-settings-item-copy"><label htmlFor={id}>{title}</label><p>{description}</p></div>
    <input type="checkbox" role="switch" id={id} className="bayan-settings-switch" checked={checked}
      onChange={e=>onChange(e.target.checked)} disabled={disabled}/>
  </div>;
}

function SettingsBody(){
  const {role,can}=useDemoAccess();
  const canSql=can("sql.inspect"),canExport=can("reports.export"),canSources=can("citations.view"),canChat=can("chat.ask");
  const [section,setSection]=useState<SectionId>("appearance");
  const [saved,setSaved]=useState<UserPreferences>(()=>({...defaultPreferences}));
  const [draft,setDraft]=useState<UserPreferences>(()=>({...defaultPreferences}));
  const [storageReady,setStorageReady]=useState(false);
  const [notice,setNotice]=useState<Notice|null>(null);
  const [confirmReset,setConfirmReset]=useState(false);
  const tabRefs=useRef<Array<HTMLButtonElement|null>>([]);
  const preview=effectivePreferences(draft,{sql:canSql,reports:canExport,citations:canSources});
  const dirty=!preferencesEqual(saved,draft);

  useEffect(()=>{
    // Client-only preview persistence. No network call or account synchronization.
    try{
      const next=readDemoPreferences(window.localStorage.getItem(demoStorageKey));
      setSaved(next);setDraft(next);
    }catch{
      setNotice({title:"تعذر قراءة التخزين المحلي",message:"ستعمل المعاينة مؤقتًا دون تخزين التفضيلات في هذا المتصفح.",tone:"warning"});
    }
    setStorageReady(true);
  },[]);

  function update<K extends keyof UserPreferences>(key:K,value:UserPreferences[K]){
    setDraft(current=>({...current,[key]:value}));
    setNotice(null);
  }
  function save(){
    if(!storageReady)return;
    const clean=sanitizePreferences(draft);
    try{
      window.localStorage.setItem(demoStorageKey,writeDemoPreferences(clean));
      setSaved(clean);setDraft(clean);
      setNotice({title:"حُفظت تفضيلات المعاينة",message:"الحفظ في هذا المتصفح فقط؛ لم تُرسل التغييرات إلى خادم بيان أو حساب مستخدم.",tone:"success"});
    }catch{
      setNotice({title:"تعذر حفظ التفضيلات",message:"قد يكون التخزين المحلي معطّلًا أو ممتلئًا. يمكنك الاستمرار في التجربة دون حفظ.",tone:"danger"});
    }
  }
  function reset(){
    try{window.localStorage.removeItem(demoStorageKey);}catch{/* Private-mode storage may be blocked. */}
    const fallback={...defaultPreferences};
    setSaved(fallback);setDraft(fallback);setConfirmReset(false);
    setNotice({title:"استُعيدت التفضيلات الافتراضية",message:"تم مسح إعدادات المعاينة من المتصفح إن كان التخزين متاحًا.",tone:"info"});
  }
  function discard(){setDraft({...saved});setNotice({title:"أُلغيت التغييرات غير المحفوظة",message:"عادت الحقول إلى آخر تفضيلات حفظتها في هذا المتصفح.",tone:"info"});}
  function chooseTab(next:SectionId){setSection(next);setNotice(null);}
  function handleTabKey(event:KeyboardEvent<HTMLButtonElement>,index:number){
    let next:number|null=null;
    if(event.key==="ArrowLeft")next=(index+1)%sections.length;
    if(event.key==="ArrowRight")next=(index+sections.length-1)%sections.length;
    if(event.key==="Home")next=0;
    if(event.key==="End")next=sections.length-1;
    if(next!==null){event.preventDefault();tabRefs.current[next]?.focus();chooseTab(sections[next].id);}
  }
  const effectiveSql=preview.showSql;

  return <div className="bayan-settings" data-testid="settings-screen">
    <nav className="bayan-settings-breadcrumb" aria-label="مسار التنقل">
      <Link href={ORGANIZATION_ROUTES.home}>الرئيسية</Link><ChevronLeft size={15}/><span aria-current="page">الإعدادات</span>
    </nav>
    <header className="bayan-settings-heading">
      <div><span className="bayan-settings-kicker"><Sparkles size={16}/> تفضيلات حسابك</span>
        <h1>الإعدادات والتفضيلات</h1><p>خصص طريقة استخدام «بيان» بما يناسب احتياجاتك وبيئة عملك.</p></div>
      <Link className="bayan-settings-back" href={ORGANIZATION_ROUTES.profile}><ArrowRight size={17}/> الملف الشخصي</Link>
    </header>
    <section className="bayan-settings-hero" aria-label="ملخص إعدادات بيان">
      <div className="bayan-settings-hero-copy"><span><Settings2 size={17}/> مركز إعدادات المستخدم</span><h2>تجربة بيان بالطريقة التي تفضلها</h2><p>المظهر، الإشعارات، طريقة عرض المراجع، والتفاصيل التقنية وفق الدور المصرّح له.</p>
        <div className="bayan-settings-hero-chips"><span><Languages size={16}/> العربية · RTL</span><span><ShieldCheck size={16}/> حسب صلاحيات الدور</span><span><Laptop size={16}/> واجهة متجاوبة</span></div>
      </div><div className="bayan-settings-hero-icon" aria-hidden="true"><Settings2 size={108}/></div>
    </section>
    <div className="bayan-settings-notice" role="note"><Info size={19}/><p><strong>هذه إعدادات تجريبية:</strong> الحفظ في التخزين المحلي لهذا المتصفح فقط. لا توجد جلسة دخول حقيقية أو مزامنة مع FastAPI. إعدادات الواجهة لا تمنح صلاحيات SQL أو كشف معلومات محظورة.</p></div>

    <div className="bayan-settings-workspace">
      <aside className="bayan-settings-navigation" aria-label="أقسام الإعدادات">
        <div className="bayan-settings-nav-head"><Settings2 size={18}/><strong>الأقسام</strong></div>
        <div role="tablist" aria-label="أقسام تفضيلات بيان" aria-orientation="vertical">
          {sections.map((item,index)=>{const Icon=item.icon;return <button key={item.id} type="button" id={`bayan-settings-tab-${item.id}`} ref={el=>{tabRefs.current[index]=el;}}
            role="tab" aria-selected={section===item.id} aria-controls={`bayan-settings-panel-${item.id}`}
            tabIndex={section===item.id?0:-1} className={`bayan-settings-nav-item ${section===item.id?"active":""}`}
            onClick={()=>chooseTab(item.id)} onKeyDown={event=>handleTabKey(event,index)}>
              <span className="bayan-settings-nav-icon"><Icon size={20}/></span><span><strong>{item.title}</strong><small>{item.description}</small></span><ChevronLeft size={16}/>
            </button>;})}
        </div>
        <div className="bayan-settings-nav-foot"><LockKeyhole size={18}/><p>تُطبّق الصلاحيات الفعلية على الخادم؛ هذه القائمة للعرض فقط.</p></div>
      </aside>

      <div className="bayan-settings-main">
        <section id={`bayan-settings-panel-${section}`} role="tabpanel" tabIndex={0}
          aria-labelledby={`bayan-settings-tab-${section}`} className="bayan-settings-panel">
          {section==="appearance"&&<div className="bayan-settings-panel-stack">
            <Card title="المظهر وإمكانية الوصول" description="خيارات للقراءة المريحة دون تغيير التصميم الرسمي المعتمد لبيان.">
              <div className="bayan-settings-two-col">
                <Select label="كثافة الواجهة" id="bayan-density" value={draft.density} onChange={e=>update("density",e.target.value as UserPreferences["density"])}
                  options={[{value:"comfortable",label:"مريحة — مسافات واسعة"},{value:"compact",label:"مدمجة — معلومات أكثر"}]}/>
                <Select label="حجم النص في المعاينة" id="bayan-font-size" value={draft.fontScale} onChange={e=>update("fontScale",e.target.value as UserPreferences["fontScale"])}
                  options={[{value:"100",label:"عادي (100%)"},{value:"110",label:"كبير (110%)"},{value:"120",label:"كبير جدًا (120%)"}]}/>
              </div>
              <Toggle id="bayan-reduced-motion" title="تقليل الحركة" description="تقليل الحركة الانتقالية داخل منطقة معاينة الإعدادات." checked={draft.reduceMotion} onChange={v=>update("reduceMotion",v)} icon={<Accessibility size={21}/>}/>
              <div className="bayan-settings-locked"><Languages size={20}/><div><strong>اللغة واتجاه العرض</strong><p>العربية (RTL) — معتمدة في هذا الإصدار، ولا يتوفر تبديل لغة فعال بعد.</p></div><Badge tone="neutral">ثابت</Badge></div>
              <div className="bayan-settings-locked"><MoonStar size={20}/><div><strong>وضع الألوان</strong><p>النسق الفاتح المعتمد. الوضع الداكن غير منفذ في شاشات النظام حاليًا.</p></div><Badge tone="neutral">قيد التخطيط</Badge></div>
            </Card>
            <Card title="معاينة فورية" description="تتغير هذه العينة فقط؛ لا يتغير تصميم الشاشات الأخرى قبل دمج التفضيلات معها.">
              <div className={`bayan-settings-live-preview ${preview.density==="compact"?"compact":""} ${preview.reduceMotion?"quiet":""}`}
                style={{fontSize:`${preview.fontScale}%`}}>
                <span className="bayan-settings-preview-label"><LayoutGrid size={16}/> مثال على عرض بطاقة البيانات</span>
                <div className="bayan-settings-preview-top"><strong>ملخص الاستعلام</strong><Badge tone="success">تم بنجاح</Badge></div>
                <p>تشير البيانات التجريبية إلى وجود <strong>1250 طالبًا</strong> في كلية الهندسة.</p>
                <div className="bayan-settings-preview-stats"><span>المؤسسة التجريبية</span><span>المصادر المتاحة: 2</span></div>
              </div>
            </Card>
          </div>}

          {section==="notifications"&&<div className="bayan-settings-panel-stack">
            <Card title="تفضيلات الإشعارات" description="حدد أنواع التنبيهات التجريبية التي تفضل رؤيتها.">
              <Toggle id="bayan-notify-app" title="الإشعارات داخل التطبيق" description="تنبيهات التحديثات والأنشطة المرتبطة بمساحة العمل." checked={draft.inAppNotifications} onChange={v=>update("inAppNotifications",v)} icon={<Bell size={21}/>}/>
              <Toggle id="bayan-notify-reports" title="تحديثات التقارير" description="إشعارات اكتمال معالجة التقرير أو جاهزية النتائج." checked={draft.reportNotifications} onChange={v=>update("reportNotifications",v)} icon={<FileText size={21}/>}/>
              <Toggle id="bayan-notify-email" title="إشعارات البريد الإلكتروني" description="تفضيل تجريبي لا يرسل رسائل فعلية إلى البريد." checked={draft.emailNotifications} onChange={v=>update("emailNotifications",v)} icon={<BellRing size={21}/>}/>
              <div className="bayan-settings-locked"><ShieldCheck size={20}/><div><strong>التنبيهات الأمنية الإلزامية</strong><p>تديرها سياسة المؤسسة ولا يمكن تعطيلها من هذه الواجهة.</p></div><Badge tone="warning">تُدار مركزيًا</Badge></div>
            </Card>
            <div className="bayan-settings-inline-link"><BellRing size={19}/><p>هذه تفضيلات للمعاينة، ولا تعمل على تصفية إشعارات شاشة المركز الآن.</p><Link href={ORGANIZATION_ROUTES.notifications}>فتح مركز الإشعارات <ArrowLeft size={16}/></Link></div>
          </div>}

          {section==="chat"&&<div className="bayan-settings-panel-stack">
            <Card title="طريقة استخدام المحادثة" description="ضبط تفضيلات الكتابة وإظهار الاستشهادات في الإجابات المستقبلية.">
              <Toggle id="bayan-send-enter" title="الإرسال بزر Enter" description="استخدم Enter لإرسال السؤال وShift + Enter لسطر جديد (تفضيل مستقبلي)." checked={canChat&&draft.sendOnEnter} onChange={v=>update("sendOnEnter",v)} disabled={!canChat} icon={<Keyboard size={21}/>}/>
              <Toggle id="bayan-show-sources" title="عرض المصادر وأرقام الصفحات" description="إظهار مستندات الاستشهاد عند توفر نتائج بحث دلالي مصرح بها." checked={preview.showSources} onChange={v=>update("showSources",v)} disabled={!canSources} icon={<FileText size={21}/>}/>
              <div className="bayan-settings-locked"><MessageSquareText size={20}/><div><strong>سجل المحادثات</strong><p>سيُربط تفضيل الاحتفاظ بالمحادثات بسياسة المؤسسة عند توفر الخدمة.</p></div><Badge tone="neutral">بانتظار API</Badge></div>
            </Card>
            <Card title="معاينة نمط الإجابة" description="نصوص نموذجية لا تأتي من خدمة الذكاء الاصطناعي.">
              <div className="bayan-settings-chat-demo"><span className="bayan-settings-chat-question">كم عدد طلاب كلية الهندسة؟</span>
                <div className="bayan-settings-chat-reply"><strong>بيان</strong><p>وفق البيانات التجريبية: 1250 طالبًا مسجلًا.</p>
                  {preview.showSources?<div className="bayan-settings-chat-citation"><FileText size={15}/> دليل شؤون الطلاب — ص 8 (مصدر تجريبي)</div>:<small>المصادر مخفية في هذه المعاينة</small>}</div>
              </div>
            </Card>
          </div>}

          {section==="advanced"&&<div className="bayan-settings-panel-stack">
            <Card title="الصلاحيات والتفاصيل التقنية" description="إظهار الخيارات بناءً على مصفوفة RBAC التجريبية فقط.">
              <div className="bayan-settings-role-control"><div><strong>الدور المستخدم في المعاينة</strong><p>غيّر الدور لاختبار ظهور الخيارات وفق الأذونات.</p></div><DemoRolePicker id="bayan-settings-role"/></div>
              <div className="bayan-settings-role-note"><ShieldCheck size={18}/><span>الدور الحالي: <strong>{roleMeta[role].label}</strong> — لا يمنح هذا الاختيار وصولًا فعليًا إلى بيانات المؤسسة.</span></div>
              <Toggle id="bayan-sql-toggle" title="عرض استعلامات SQL" description={canSql?"تفضيل عرض للمستخدم المصرح له؛ تنفيذ SQL يبقى في الخادم.":"غير متاح لهذا الدور في مصفوفة المعاينة."}
                checked={effectiveSql} onChange={v=>update("showSql",v)} disabled={!canSql} icon={<Database size={21}/>}/>
              {!canSql&&<div className="bayan-settings-permission-message"><LockKeyhole size={17}/> يظل SQL مخفيًا مهما كانت الإعدادات المخزنة، إلى أن يحصل المستخدم على تصريح حقيقي من الخادم.</div>}
              <div className="bayan-settings-formats">
                <Select label="صيغة التصدير المفضلة" id="bayan-format" value={canExport?draft.defaultReportFormat:"pdf"} disabled={!canExport}
                  onChange={e=>update("defaultReportFormat",e.target.value as UserPreferences["defaultReportFormat"])}
                  description={canExport?"هذا تفضيل للمعاينة وليس إعدادًا لتصدير تلقائي.":"يتطلب إذن تصدير التقارير؛ الخيار معطل للدور الحالي."}
                  options={[{value:"pdf",label:"PDF"},{value:"excel",label:"Excel"},{value:"csv",label:"CSV"}]}/>
                <div className="bayan-settings-format-icon"><FileDown size={27}/><span>{canExport?"تنسيق الإخراج التجريبي":"لا يوجد إذن تصدير"}</span></div>
              </div>
            </Card>
            <Card title="مثال على التفاصيل المتقدمة" description="عرض قراءة فقط، ولا ينفذ أي استعلام.">
              {effectiveSql?<pre className="bayan-settings-sql-preview" dir="ltr"><code>SELECT COUNT(*) FROM students WHERE college = 'engineering';</code></pre>
                :<div className="bayan-settings-sql-hidden"><EyeOff size={21}/><span>عرض SQL غير مفعّل أو غير متاح لهذا الدور.</span></div>}
              <div className="bayan-settings-security-tip"><Info size={17}/><p>إخفاء SQL من الواجهة لا يمنع استخراج البيانات. يجب فرض الأذونات وتصنيف البيانات على Backend وقاعدة البيانات.</p></div>
            </Card>
          </div>}
        </section>
        <div className="bayan-settings-actions"><div className="bayan-settings-save-state" aria-live="polite">{dirty?<><span className="bayan-settings-pending-dot"/> تغييرات غير محفوظة</>:<><Check size={17}/> جميع التفضيلات محفوظة في المعاينة</>}</div>
          <div className="bayan-settings-buttons"><Button size="md" variant="outline" disabled={!dirty} onClick={discard}>إلغاء التغييرات</Button>
            <Button size="md" variant="primary" leadingIcon={<Save size={17}/>} onClick={save} disabled={!dirty||!storageReady}>حفظ التفضيلات</Button>
          </div>
        </div>
      </div>
    </div>

    <footer className="bayan-settings-bottom">
      <div><ShieldCheck size={18}/><span>هذه الإعدادات خاصة بالمعاينة داخل المتصفح؛ لا تمثل سياسة المؤسسة الفعلية.</span></div>
      <button type="button" onClick={()=>setConfirmReset(true)}><RotateCcw size={16}/> استعادة الإعدادات الافتراضية</button>
    </footer>
    <Dialog open={confirmReset} onClose={()=>setConfirmReset(false)} title="استعادة الإعدادات الافتراضية؟"
      description="سيؤدي ذلك إلى مسح تفضيلات المعاينة المحفوظة في هذا المتصفح فقط."
      footer={<><Button variant="danger" leadingIcon={<RotateCcw size={16}/>} onClick={reset}>استعادة الافتراضيات</Button>
        <Button variant="outline" onClick={()=>setConfirmReset(false)}>إلغاء</Button></>}>
      <p>لن تتغير أي بيانات حساب حقيقية، ولن يتم إرسال طلب إلى الخادم.</p>
    </Dialog>
    {notice&&<div className="bayan-settings-toast"><Toast {...notice} onClose={()=>setNotice(null)}/></div>}
  </div>;
}

export function SettingsScreen(){return <DemoAccessProvider initialRole="employee"><ChatLayout variant="feature"><SettingsBody/></ChatLayout></DemoAccessProvider>;}
