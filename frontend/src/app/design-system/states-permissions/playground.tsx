"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AlertTriangle, ArrowUpLeft, Ban, Check, CheckCircle2, CircleHelp, CloudOff, Code2, Eye, FileSearch2, LoaderCircle, LockKeyhole, RotateCcw, Search, ShieldCheck, UserRoundCog } from "lucide-react";
import { Button, Badge } from "@/components/ui";
import { StatePanel, LoadingSkeleton, ErrorCodeDetail, type BayanViewState } from "@/components/states";
import { DemoRolePicker, useDemoAccess } from "@/components/access";
import { capabilityLabels, capabilities, canPreviewRoute, hasPermission, roleIds, roleMeta } from "@/lib/access/policy";
import catalog from "@/lib/screen-catalog.json";

const stateOptions:{id:BayanViewState;label:string;icon:typeof CircleHelp}[]=[
  {id:"idle",label:"جاهز",icon:CircleHelp},{id:"loading",label:"انتظار",icon:LoaderCircle},{id:"streaming",label:"بث SSE",icon:LoaderCircle},
  {id:"success",label:"نجاح",icon:CheckCircle2},{id:"empty",label:"فارغ",icon:FileSearch2},{id:"invalid_input",label:"مدخلات 400",icon:AlertTriangle},{id:"unauthenticated",label:"جلسة 401",icon:LockKeyhole},{id:"error",label:"خطأ 500",icon:AlertTriangle},
  {id:"forbidden",label:"منع 403",icon:Ban},{id:"rate_limited",label:"حد المعدل 429",icon:RotateCcw},{id:"offline",label:"انقطاع",icon:CloudOff}
];
const codeByState:Partial<Record<BayanViewState,{code:string;requestId:string}>>={
  invalid_input:{code:"VALIDATION_ERROR",requestId:"demo-400-005"},unauthenticated:{code:"NOT_AUTHENTICATED",requestId:"demo-401-006"},
  error:{code:"INTERNAL_SERVER_ERROR",requestId:"demo-500-001"},forbidden:{code:"ACCESS_DENIED",requestId:"demo-403-002"},rate_limited:{code:"RATE_LIMIT_EXCEEDED",requestId:"demo-429-003"},offline:{code:"NETWORK_UNAVAILABLE",requestId:"demo-net-004"}
};

export function AccessStatesPlayground(){
  const {role,can,canVisit}=useDemoAccess();
  const [state,setState]=useState<BayanViewState>("loading");
  const [selectedPath,setSelectedPath]=useState("/admin/users");
  const [filter,setFilter]=useState("");
  const [onlyAllowed,setOnlyAllowed]=useState(false);
  const [demoAction,setDemoAction]=useState("");
  const [selectedCapability,setSelectedCapability]=useState<(typeof capabilities)[number]>("sql.inspect");
  const screens=useMemo(()=>catalog.filter(s=>(!onlyAllowed||canVisit(s.path))&&[s.title,s.group,s.path].join(" ").includes(filter)),[role,onlyAllowed,filter,canVisit]);
  const granted=capabilities.filter(p=>can(p));
  const page=catalog.find(x=>x.path===selectedPath);
  return <div className="b5-sections">
    <section className="b5-card"><header className="b5-section-heading"><div><span>01 — RBAC</span><h2>اختيار الدور وتحديد الصلاحيات</h2><p>تغيير الدور يغيّر فورًا الإجراءات والصفحات المتاحة في هذه المحاكاة.</p></div><DemoRolePicker/></header>
      <div className="b5-role-summary"><div className="b5-role-avatar"><UserRoundCog size={27}/></div><div><strong>{roleMeta[role].label}</strong><p>{roleMeta[role].description}</p></div><Badge tone="info">{granted.length} صلاحيات مقترحة</Badge></div>
      <div className="b5-capability-grid">{capabilities.map(permission=><button key={permission} type="button" aria-pressed={selectedCapability===permission} className={`b5-capability ${can(permission)?"b5-allow":"b5-deny"} ${selectedCapability===permission?"selected":""}`} onClick={()=>setSelectedCapability(permission)}><span>{can(permission)?<Check size={17}/>:<LockKeyhole size={16}/>}</span><b>{capabilityLabels[permission]}</b><small>{can(permission)?"مسموح في المعاينة":"غير مسموح"}</small></button>)}</div>
      <div className="b5-action-preview"><div><strong>تجربة صلاحية: {capabilityLabels[selectedCapability]}</strong><p>يظهر الزر بحسب صلاحية الدور، لكن التحقق الحقيقي يجب أن يتم على الخادم قبل تنفيذ الطلب.</p></div><div>{can(selectedCapability)?<Button variant="primary" size="sm" onClick={()=>setDemoAction(`تمت محاكاة «${capabilityLabels[selectedCapability]}» محليًا فقط`)} leadingIcon={<Check size={16}/>}>تجربة الإجراء</Button>:<Button variant="outline" disabled size="sm" leadingIcon={<LockKeyhole size={15}/>}>غير مصرح</Button>}</div></div>
      {demoAction&&<div role="status" className="b5-local-notice"><CheckCircle2 size={17}/>{demoAction}<button onClick={()=>setDemoAction("")}>إغلاق</button></div>}
    </section>

    <section className="b5-card"><header className="b5-section-heading"><div><span>02 — UI STATES</span><h2>تجربة حالات الطلب</h2><p>نص عربي مناسب لكل حالة، مع زر إعادة المحاولة عند الحاجة، وتفاصيل خطأ غير حساسة.</p></div><Badge tone="neutral">9 حالات</Badge></header>
      <div className="b5-state-picker" role="group" aria-label="اختر حالة الطلب">{stateOptions.map(({id,label,icon:Icon})=><button type="button" key={id} className={state===id?"selected":""} onClick={()=>setState(id)} aria-pressed={state===id}><Icon size={17}/>{label}</button>)}</div>
      <div className="b5-two-columns"><StatePanel state={state} onRetry={["error","rate_limited","offline"].includes(state)?()=>setState("loading"):undefined} detail={codeByState[state]&&<ErrorCodeDetail code={codeByState[state]!.code} requestId={codeByState[state]!.requestId}/>}/><div className="b5-skeleton-sample"><h3>مثال على مؤشر تحميل المحتوى</h3><LoadingSkeleton rows={4}/><small>يعرض بدل الصفحة إلى أن تصل البيانات؛ لا تعتمد على إخفاء البيانات الحساسة في CSS.</small></div></div>
    </section>

    <section className="b5-card"><header className="b5-section-heading"><div><span>03 — ROUTE ACCESS</span><h2>فحص الوصول إلى صفحات المشروع</h2><p>تستمد قواعد عرض المسارات من كتالوج الشاشات المعتمد. اختر أي صفحة لاختبار الوصول.</p></div><Badge tone="info">{screens.length} شاشة في القائمة</Badge></header>
      <div className="b5-route-controls"><label className="b5-search"><Search size={18}/><input value={filter} onChange={e=>setFilter(e.target.value)} placeholder="ابحث باسم الصفحة أو مسارها..." aria-label="البحث عن شاشة"/></label><label className="b5-checkbox"><input type="checkbox" checked={onlyAllowed} onChange={e=>setOnlyAllowed(e.target.checked)}/> الصفحات المسموح بها فقط</label></div>
      <div className="b5-route-grid"><div className="b5-route-list" role="list" aria-label="صفحات النظام">{screens.map(screen=><button type="button" role="listitem" key={screen.path} className={selectedPath===screen.path?"selected":""} onClick={()=>setSelectedPath(screen.path)}><div><b>{screen.title}</b><code dir="ltr">{screen.path}</code></div><span className={canVisit(screen.path)?"allow":"deny"}>{canVisit(screen.path)?<CheckCircle2 size={18}/>:<LockKeyhole size={18}/>}</span></button>)}{!screens.length&&<p className="b5-no-matches">لا توجد صفحات مطابقة.</p>}</div>
        <div className="b5-route-detail"><h3>{page?.title||"اختر صفحة"}</h3><p>{page?.description}</p><div className="b5-route-code">{selectedPath}</div>{canPreviewRoute(role,selectedPath)?<StatePanel state="success" title="الدور مخوّل لعرض الصفحة" description="هذه نتيجة تحقق واجهي تجريبي؛ يتطلب الوصول الحقيقي جلسة وتحققًا من الصلاحيات على الخادم." compact/>:<StatePanel state="forbidden" compact/>}<div className="b5-route-detail-link"><Link href={selectedPath}>فتح نموذج الصفحة <ArrowUpLeft size={16}/></Link></div></div>
      </div>
    </section>

    <section className="b5-card"><header className="b5-section-heading"><div><span>04 — ACCESS MATRIX</span><h2>مصفوفة الصلاحيات</h2><p>مقارنة سريعة بين الأدوار الأربعة لتطوير الواجهات. القيم مقترحة وليست بديلًا عن سياسة الخادم.</p></div><ShieldCheck size={24}/></header>
      <div className="b5-matrix-scroll" tabIndex={0} aria-label="جدول صلاحيات الأدوار الأربعة"><table><thead><tr><th>الوظيفة</th>{roleIds.map(r=><th key={r}>{roleMeta[r].label}</th>)}</tr></thead><tbody>{capabilities.map(permission=><tr key={permission}><th scope="row">{capabilityLabels[permission]}</th>{roleIds.map(r=><td key={r} className={hasPermission(r,permission)?"yes":"no"}>{hasPermission(r,permission)?<span><Check size={16}/> مسموح</span>:<span><LockKeyhole size={14}/> محجوب</span>}</td>)}</tr>)}</tbody></table></div>
    </section>
    <div className="b5-security-notice"><Code2 size={23}/><div><strong>تنبيه أمني مهم</strong><p>تُستخدم هذه الصفحة لتصميم تجربة المستخدم وفحص عناصر الواجهة فقط. لا توجد مصادقة حقيقية أو عزل مؤسسات (Tenant Isolation). يجب تطبيق RBAC وتقييد الاستعلامات والوصول للوثائق داخل FastAPI وقواعد البيانات، وليس عبر React وحده. كما ينبغي ألا تُرسل بيانات غير مصرح بها إلى المتصفح أصلًا.</p></div></div>
  </div>;
}
