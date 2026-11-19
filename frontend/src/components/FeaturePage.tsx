"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { useOverlay } from "./ui/useOverlay";
import catalog from "@/lib/screen-catalog.json";
import {canPreviewRoute, roleMeta, roleIds, type RoleId} from "@/lib/access/policy";
import {StatePanel} from "@/components/states";
import { FeatureLayout, AuthLayout } from "./layout";
import { ORGANIZATION_ROUTES, AUXILIARY_ROUTES } from "@/lib/routes";
import { Activity, ArrowLeft, ArrowRight, Bell, BookOpen, Check, CheckCircle2, ChevronDown, ClipboardList, Clock, Code2, Database,
  Download, FilePlus, FileSearch, FileText, Filter, FolderOpen, GraduationCap, Home, Layers, ListFilter, Lock, LogIn,
  Mail, MessageCircle, MoreVertical, Pencil, Plus, RefreshCw, Save, Search, Settings, Shield, ShieldAlert, ShieldCheck,
  Sparkles, Users, UserRound, X, XCircle, Zap, ChartBar, ArrowUpRight } from "lucide-react";

type ScreenItem = (typeof catalog)[number];
const GROUP_ORDER = ["المحادثات","الوثائق","التقارير","التحليلات","الإدارة","الرقابة","المنصة","الحساب","النظام"];
const groupsIcon = (group: string) => ({"المحادثات":MessageCircle,"الوثائق":BookOpen,"التقارير":FileText,"التحليلات":ChartBar,"الإدارة":Users,"الرقابة":ShieldCheck,"المنصة":Database,"الحساب":Settings,"النظام":Layers}[group] || Home);
const demoStatistics = [
 {label:"المستخدمون",value:"125",icon:Users}, {label:"العروض الذكية",value:"12",icon:Layers},
 {label:"الأحداث المسجلة",value:"48",icon:ClipboardList},{label:"حالة الخدمات",value:"تجريبية",icon:Activity}
];
const processSteps = ["التحقق من الصلاحيات","إرسال الطلب","تشغيل المعالجة","عرض النتائج","التدقيق والتوثيق"];

function getRelated(p:ScreenItem) {
 return catalog.filter(x=>x.group===p.group && x.path!==p.path).slice(0,7);
}
function createCsv(rows:string[][],columns:string[]) {
 const quote=(v:string)=>'"'+String(v).replaceAll('"','""')+'"';
 const csv = '\ufeff'+[columns,...rows].map(row=>row.map(quote).join(",")).join("\r\n");
 const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));
 const a=document.createElement("a");a.href=url;a.download="bayan-demo-export.csv";a.click();URL.revokeObjectURL(url);
}
export default function FeaturePage({route}:{route:string}) {
 const router=useRouter();
 const screen = catalog.find(x=>x.path===route);
 const [search,setSearch]=useState("");
 const [modal,setModal]=useState("");
 const closeModal=useCallback(()=>setModal(""),[]);
 const dialogRef=useOverlay(Boolean(modal),closeModal);
 const [selected,setSelected]=useState<string[]>([]);
 const [toast,setToast]=useState("");
 const [step,setStep]=useState(0);
 const [role,setRole]=useState<RoleId>("it_admin");
 const [currentRows,setCurrentRows]=useState<string[][]>(screen?.rows?.map(x=>[...x]) || []);
 const [form,setForm]=useState<Record<string,string>>({});
 const [loading,setLoading]=useState(false);
 const [checked,setChecked]=useState<Record<string,boolean>>({});
 const [expanded,setExpanded]=useState(false);
 const visibleRows=useMemo(()=>currentRows.filter(x=>x.join(" ").includes(search)),[currentRows,search]);
 if(!screen)return null;
 const authPage=["/login","/forgot-password"].includes(route);
 const showToast=(message:string)=>{setToast(message);setModal("");};
 const openAction=(action:string)=>{
  if(action.includes("تصدير") && screen.columns.length){createCsv(visibleRows,screen.columns);showToast("تم تنزيل ملف CSV من البيانات التجريبية المعروضة.");return;}
  if(action.includes("فحص")||action.includes("اختبار الاتصال")){setLoading(true);setTimeout(()=>{setLoading(false);showToast("هذه محاكاة للواجهة فقط؛ لا يوجد اتصال حقيقي بالخادم.");},450);return;}
  setModal(action);
 };
 const formFields= screen.fields?.length?screen.fields:["الاسم","الوصف"];
 const submitForm=()=>{showToast("تم حفظ التغييرات في واجهة العرض التجريبية فقط؛ لم تُرسل أي بيانات للخادم.");setForm({});};
 const saveListAction=()=>{
  if((modal.includes("إضافة")||modal.includes("إنشاء")) && screen.columns.length){
   const title=form["الاسم"]||form["عنوان"]||form["الوصف"]||"عنصر تجريبي جديد";
   setCurrentRows(old=>[[title,"تجريبي","جديد"],...old]);
  }
  showToast("تمت محاكاة الإجراء محليًا، دون تعديل بيانات حقيقية.");setForm({});
 };
 const previewRolePicker=<label className="b5-role-picker" style={{maxWidth:320,marginBottom:15}}><span>اختيار الدور في المعاينة (ليس تسجيل دخول)</span><select aria-label="اختيار دور المستخدم التجريبي" value={role} onChange={e=>setRole(e.target.value as RoleId)}>{roleIds.map(r=><option value={r} key={r}>{roleMeta[r].label}</option>)}</select></label>;
 if(!authPage && !canPreviewRoute(role,route)) return <FeatureLayout group={screen.group} onNewChat={()=>router.push(ORGANIZATION_ROUTES.home)}><div className="feature-shell" style={{maxWidth:980,margin:'30px auto'}}><p style={{fontSize:13,marginBottom:15,color:'#496882'}}>معاينة صلاحيات واجهات المشروع — اختيار الدور هنا لا يغيّر صلاحيات الخادم.</p>{previewRolePicker}<StatePanel state="forbidden" description={`الدور «${roleMeta[role].label}» غير مخوّل بعرض صفحة «${screen.title}» حسب كتالوج التصميم. يمكنك تغيير الدور في هذه المعاينة فقط.`}/><div style={{marginTop:17}}><Link className="feature-btn" href={AUXILIARY_ROUTES.designSystemStatesPermissions}>فتح مصفوفة الصلاحيات</Link></div></div></FeatureLayout>;
 const dashboard=(
  <div className="feature-main-block">
    <div className="b5-feature-role-control">{previewRolePicker}<Link href={AUXILIARY_ROUTES.designSystemStatesPermissions}>مصفوفة صلاحيات التصميم</Link></div>
    <header className="feature-heading"><div><div className="feature-eyebrow"><Sparkles size={17}/> نظام بيان — التصميم التفاعلي المقترح</div><h1>{screen.title}</h1><p>{screen.description}</p></div><div className="feature-status"><CheckCircle2 size={16}/> واجهة تجريبية</div></header>
    <div className="feature-meta"><span><ShieldCheck size={16}/> {screen.roles.join("، ")}</span><span><ClipboardList size={16}/> {screen.requirements}</span><span><Zap size={16}/> {screen.priority}</span></div>
    <div className="feature-tabbar"><Link href={AUXILIARY_ROUTES.screens}><Layers size={16}/> خريطة الشاشات</Link>{getRelated(screen).filter(item=>canPreviewRoute(role,item.path)).slice(0,4).map(item=><Link key={item.path} href={item.path}>{item.title}</Link>)}</div>
    {screen.kind==="sitemap" ? <>
      <section className="feature-panel"><h2><Layers/> فهرس جميع واجهات المشروع</h2><p>يضم هذا الفهرس الشاشات التي توصي الخطة بتصميمها. كل صفحة تجريبية قابلة للتصفح ولا تعني اكتمال التنفيذ الخلفي.</p><div className="feature-toolbar"><Search size={18}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="ابحث عن شاشة أو قسم أو متطلب..." /></div></section>
      {GROUP_ORDER.map(group=> {const matches=catalog.filter(x=>x.group===group&&[x.title,x.description,x.requirements].join(' ').includes(search));const Icon=groupsIcon(group);return matches.length>0?<section className="feature-panel" key={group}><h2><Icon/> {group} <small>({matches.length})</small></h2><div className="screen-grid">{matches.map(item=><Link className="screen-tile" href={item.path} key={item.path}><div><strong>{item.title}</strong><small>{item.requirements} · {item.priority}</small></div><ArrowLeft size={19}/></Link>)}</div></section>:null})}
    </> : null}
    {screen.kind==="list" ? <section className="feature-panel"><div className="feature-section-top"><div><h2><ListFilter/> {screen.title}</h2><p>بيانات توضيحية للاختبار البصري والتفاعلي؛ الربط الحقيقي يتطلب واجهات API وصلاحيات من الخادم.</p></div><div className="feature-actions">{screen.actions.map(action=><button key={action} className={action.includes('إضافة')||action.includes('إنشاء')?"feature-btn primary":"feature-btn"} onClick={()=>openAction(action)}>{action.includes('إضافة')||action.includes('إنشاء')?<Plus size={16}/>:action.includes('تصدير')?<Download size={16}/>:<ArrowUpRight size={16}/>} {action}</button>)}</div></div>
      <div className="feature-toolbar"><Search size={19}/><input value={search} placeholder="بحث داخل القائمة..." onChange={e=>setSearch(e.target.value)}/><span>{visibleRows.length} عناصر</span><button className="feature-btn" onClick={()=>setSearch("")}><Filter size={16}/> مسح</button></div>
      <div className="feature-table-scroll"><table className="feature-table"><thead><tr>{screen.columns.map(v=><th key={v}>{v}</th>)}<th>الإجراءات</th></tr></thead><tbody>{visibleRows.map((row,i)=><tr key={i}>{row.map((c,j)=><td key={j}>{j===0?<b>{c}</b>:j===row.length-1?<span className="feature-table-badge">{c}</span>:c}</td>)}<td><button className="feature-ico-btn" title="عرض التفاصيل" onClick={()=>{setSelected(row);setExpanded(true)}}><ArrowUpRight size={18}/></button><button className="feature-ico-btn" title="خيارات" onClick={()=>{setSelected(row);setModal("خيارات العنصر")}}><MoreVertical size={18}/></button></td></tr>)}</tbody></table>{!visibleRows.length&&<div className="feature-empty">لا توجد عناصر مطابقة للبحث.</div>}</div>
      {expanded&&<aside className="feature-detail-drawer"><button className="feature-ico-btn" onClick={()=>setExpanded(false)}><X/></button><h3>تفاصيل العنصر المحدد</h3>{selected.map((v,i)=><p key={i}><b>{screen.columns[i] || 'بيانات'}:</b> {v}</p>)}<span className="feature-muted">البيانات للعرض فقط.</span></aside>}
    </section>:null}
    {screen.kind==="form" ? <section className="feature-panel"><div className="feature-section-top"><div><h2><FilePlus/> {screen.title}</h2><p>أكمل الحقول المطلوبة، ثم اختبر التدفق التجريبي دون إرسال بيانات إلى خادم حقيقي.</p></div></div><form className="feature-form" onSubmit={e=>{e.preventDefault();submitForm()}}>{formFields.map(field=><label key={field}><span>{field}</span>{field.includes("ملف")?<input type="file" accept=".pdf,.docx,.txt" onChange={e=>setForm({...form,[field]:e.target.files?.[0]?.name||""})}/>:field.includes("الدور")?<select value={form[field]||""} onChange={e=>setForm({...form,[field]:e.target.value})}><option value="">اختر الدور</option>{["موظف المؤسسة","مدير المؤسسة","مسؤول تقنية المعلومات","مسؤول المنصة"].map(v=><option key={v}>{v}</option>)}</select>:field.includes("المستوى الأمني")?<select value={form[field]||""} onChange={e=>setForm({...form,[field]:e.target.value})}><option value="">اختر التصنيف</option>{["Public","Masked","Restricted","Blacklist"].map(v=><option key={v}>{v}</option>)}</select>:<input required={field.includes("البريد")||field.includes("الاسم")||field.includes("عنوان")} type={field.includes("كلمة المرور")?"password":"text"} placeholder={`أدخل ${field}`} value={form[field]||""} onChange={e=>setForm({...form,[field]:e.target.value})}/>}</label>)}<div className="feature-form-footer"><button type="submit" className="feature-btn primary"><Save size={18}/> {screen.actions[0]||'حفظ'}</button><button type="button" className="feature-btn" onClick={()=>router.back()}>إلغاء والعودة</button></div></form></section>:null}
    {screen.kind==="wizard" ? <section className="feature-panel"><h2><Sparkles/> معالج التهيئة الذكية</h2><div className="feature-wizard-steps">{screen.fields.map((name,i)=><button className={i===step?"active":i<step?"done":""} key={name} onClick={()=>setStep(i)}><span>{i<step?<Check size={16}/>:i+1}</span>{name}</button>)}</div><div className="feature-wizard-content"><h3>الخطوة {step+1}: {screen.fields[step]}</h3><p>هذه مرحلة مقترحة لتوضيح تدفق العمل. تُفحص الصلاحيات والاتصال ونتائج المعالجة قبل الانتقال للخطوة التالية عند الربط بالخادم.</p><label>ملاحظة أو قيمة تجريبية<input value={form["wizard_"+step]||""} onChange={e=>setForm({...form,["wizard_"+step]:e.target.value})} placeholder={`بيانات مرحلة ${screen.fields[step]}`}/></label></div><div className="feature-form-footer"><button className="feature-btn" disabled={step===0} onClick={()=>setStep(s=>Math.max(0,s-1))}><ArrowRight size={16}/> السابق</button><button className="feature-btn primary" onClick={()=>step===screen.fields.length-1?showToast("اكتملت محاكاة المعالج، لم يتم ربط أي مصدر أو فهرسة فعلية."):setStep(s=>s+1)}>{step===screen.fields.length-1?"إنهاء المحاكاة":"التالي"}<ArrowLeft size={16}/></button></div></section>:null}
    {screen.kind==="overview" ? <><div className="feature-stats">{demoStatistics.map(m=>{const Icon=m.icon;return <div className="feature-metric" key={m.label}><Icon size={25}/><span>{m.label}</span><strong>{m.value}</strong></div>})}</div><section className="feature-panel"><h2><ChartBar/> نظرة عامة تجريبية</h2><p>المخططات والمؤشرات التالية للعرض فقط ولا تمثل نتائج فعلية للنظام.</p>{["الاستعلامات الناجحة","طلبات استرجاع المستندات","التقارير المنسقة","عمليات التهيئة"].map((v,i)=><div className="feature-bar-row" key={v}><span>{v}</span><div><i style={{width:`${[72,59,46,23][i]}%`}}/></div><b>{[72,59,46,23][i]}%</b></div>)}<div className="feature-actions">{screen.actions.map(a=><button className="feature-btn" onClick={()=>openAction(a)} key={a}>{a}</button>)}</div></section></>:null}
    {screen.kind==="detail" ? <section className="feature-panel"><h2><FileText/> بيانات وتفاصيل {screen.title}</h2><p>تم تصميم هذه الشاشة لتجميع المعلومات المتعلقة بالعنصر مع إجراءات قابلة للضبط حسب الدور.</p><div className="feature-detail-cols"><div><label>الاسم</label><strong>عنصر تجريبي ضمن «{screen.group}»</strong></div><div><label>الحالة</label><strong>قيد المراجعة</strong></div><div><label>نطاق الوصول</label><strong>{screen.roles.join(" / ")}</strong></div><div><label>المتطلبات</label><strong>{screen.requirements}</strong></div></div><div className="feature-actions">{screen.actions.map(a=><button className="feature-btn" onClick={()=>openAction(a)} key={a}>{a}</button>)}</div></section>:null}
    {screen.kind==="settings" ? <section className="feature-panel"><h2><Settings/> {screen.title}</h2><p>الإعدادات في هذا النموذج محلية للمعاينة؛ سيجري حفظها عبر الخادم بعد اعتماد API.</p>{formFields.map((f,i)=><div className="feature-settings-row" key={f}><span><b>{f}</b><small>إعداد قابل للضبط حسب سياسة المؤسسة</small></span><button className={`feature-switch ${checked[f]?'enabled':''}`} onClick={()=>setChecked(c=>({...c,[f]:!c[f]}))} aria-label={`تبديل ${f}`} aria-pressed={!!checked[f]}><span/></button></div>)}<button className="feature-btn primary" onClick={submitForm}><Save size={16}/> حفظ التفضيلات محليًا</button></section>:null}
    {screen.kind==="status" ? <section className="feature-panel feature-status-page"><ShieldAlert size={43}/><h2>{screen.title}</h2><p>{screen.description}</p><button className="feature-btn primary" onClick={()=>router.push(ORGANIZATION_ROUTES.home)}><Home size={17}/> العودة للرئيسية</button></section>:null}
    {screen.kind==="existing" ? <section className="feature-panel"><p>توجد لهذا القسم شاشة أصلية في المشروع.</p><Link className="feature-btn primary" href={route}><ArrowUpRight size={16}/> فتحها</Link></section>:null}
    <section className="feature-panel"><h2><BookOpen/> كيف ترتبط هذه الشاشة بباقي النظام؟</h2><div className="feature-flow-mini">{processSteps.map((s,i)=><div key={s}><span>{i+1}</span><b>{s}</b>{i<processSteps.length-1&&<ArrowLeft size={16}/>}</div>)}</div><p>قبل الربط النهائي يجب إضافة التحقق الفعلي من الهوية والصلاحيات، والتحقق من المدخلات، وتسجيل الأحداث على الخادم. لا تعتمد الواجهة وحدها للحماية.</p></section>
  </div>
 );
 const dialog=modal&&<div className="feature-overlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setModal("")}}><div ref={dialogRef} tabIndex={-1} className="feature-modal" role="dialog" aria-modal="true" aria-label={modal}><button aria-label="إغلاق" className="feature-ico-btn feature-close" onClick={()=>setModal("")}><X/></button><h2>{modal}</h2><p>هذه نافذة منبثقة ضمن تصميم الواجهات المقترح، ولا تنفذ عملية على قاعدة بيانات حقيقية.</p>{modal.includes("خيارات") ? <><h3>{selected[0]}</h3><div className="feature-actions"><button className="feature-btn" onClick={()=>showToast("تم عرض العنصر في النموذج التجريبي.")}>عرض التفاصيل</button><button className="feature-btn" onClick={()=>showToast("تم تنفيذ التعديل داخل المحاكاة فقط.")}>تعديل</button></div></>:<><label className="feature-modal-label">الاسم أو الملاحظة<input value={form["الاسم"]||""} onChange={e=>setForm({...form,الاسم:e.target.value})} placeholder="اكتب قيمة تجريبية" /></label><label className="feature-modal-label">الوصف<textarea value={form["الوصف"]||""} onChange={e=>setForm({...form,الوصف:e.target.value})} placeholder="وصف مختصر" rows={3}/></label><div className="feature-form-footer"><button className="feature-btn primary" onClick={saveListAction}><Check size={16}/> تأكيد (تجريبي)</button><button className="feature-btn" onClick={()=>setModal("")}>إلغاء</button></div></>}</div></div>;
 if(authPage)return <AuthLayout><div className="bayan-auth-card"><div className="bayan-auth-brand"><GraduationCap size={48}/><strong>بيان</strong><span>مساعد مؤسسي عربي ذكي</span></div><h1>{screen.title}</h1><p>{screen.description}</p><form onSubmit={e=>{e.preventDefault();showToast("واجهة مصادقة تجريبية؛ استخدم الرابط أدناه لمعاينة الشاشات دون تسجيل دخول حقيقي.")}}>{screen.fields.map(f=><label key={f}>{f}<input required type={f.includes("كلمة")?"password":"text"} value={form[f]||""} onChange={e=>setForm({...form,[f]:e.target.value})} placeholder={f}/></label>)}<button type="submit" className="feature-btn primary"><LogIn size={17}/>{screen.actions[0]}</button></form><div className="bayan-auth-links"><Link href={ORGANIZATION_ROUTES.home}>استعراض المحادثة التجريبية</Link><Link href={AUXILIARY_ROUTES.screens}>خريطة الواجهات</Link></div>{toast&&<div className="feature-toast" role="status">{toast}</div>}</div></AuthLayout>;
 return <FeatureLayout group={screen.group} onNewChat={()=>router.push(ORGANIZATION_ROUTES.home)}><div className="feature-shell"><nav className="feature-breadcrumb" aria-label="مسار الصفحة"><Link href={AUXILIARY_ROUTES.screens}>خريطة الواجهات</Link><ArrowLeft size={15}/><span>{screen.group}</span><ArrowLeft size={15}/><strong>{screen.title}</strong></nav><div className="feature-layout-grid"><aside className="feature-nav" aria-label="أقسام الواجهات"><h3>أقسام النظام</h3>{GROUP_ORDER.map(group=>{const Icon=groupsIcon(group);const pages=catalog.filter(x=>x.group===group&&x.kind!=="existing"&&canPreviewRoute(role,x.path));return <div key={group} className="feature-nav-group"><div className="feature-nav-head"><Icon size={17}/>{group}</div>{pages.slice(0,group==="الإدارة"?7:5).map(p=><Link key={p.path} className={p.path===route?'active':''} href={p.path}>{p.title}</Link>)}</div>})}</aside><div className="feature-content">{dashboard}</div></div></div>{dialog}{toast&&<div className="feature-toast" role="status"><CheckCircle2 size={17}/>{toast}<button onClick={()=>setToast("")} aria-label="إغلاق"><X size={16}/></button></div>}</FeatureLayout>;
}
