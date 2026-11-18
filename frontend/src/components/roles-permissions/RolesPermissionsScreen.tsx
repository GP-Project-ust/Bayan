'use client';

import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {
 ArrowLeft,ArrowRightLeft,BookOpen,Check,CheckCircle2,ChevronLeft,ClipboardCheck,
 FileQuestion,Info,KeyRound,LockKeyhole,Plus,RefreshCcw,Search,Shield,
 ShieldCheck,ShieldX,Users,UsersRound,X,Layers,FileText
} from 'lucide-react';
import {AdminLayout} from '@/components/layout';
import {Badge,Button,Dialog,Drawer,Toast} from '@/components/ui';
import {StatePanel} from '@/components/states';
import {DemoAccessProvider,DemoRolePicker,useDemoAccess} from '@/components/access/DemoAccess';
import {capabilities,capabilityLabels,roleIds,roleMeta,rolePermissions,type RoleId,type Capability} from '@/lib/access/policy';
import {DEMO_USERS,restoreUserFixtures} from '@/lib/user-management/users';
import {
 ROLE_REVIEW_STORAGE_KEY,compareRoles,createReviewRequest,grantedFor,institutionRoles,
 permissionSections,restoreReviewRequests,roleScope,validateReviewDraft,
 type ReviewAction,type ReviewDraft,type ReviewRequest
} from '@/lib/access/role-review';

const USER_STORAGE_KEY='bayan.demo.users.v1';
type Notice={title:string;message:string;tone:'success'|'warning'|'danger'|'info'};
function RolesBody(){
 const {can,role:actor}=useDemoAccess();
 const authorized=can('roles.manage');
 const [selected,setSelected]=useState<RoleId>('it_admin');
 const [compare,setCompare]=useState<RoleId>('manager');
 const [query,setQuery]=useState('');
 const [scope,setScope]=useState('all');
 const [details,setDetails]=useState<RoleId|null>(null);
 const [requestOpen,setRequestOpen]=useState(false);
 const [request,setRequest]=useState<ReviewDraft>({role:'employee',capability:'reports.export',action:'grant',reason:''});
 const [issue,setIssue]=useState<string|null>(null);
 const [requests,setRequests]=useState<ReviewRequest[]>([]);
 const [confirmReset,setConfirmReset]=useState(false);
 const [notice,setNotice]=useState<Notice|null>(null);
 const [users,setUsers]=useState(DEMO_USERS);
 useEffect(()=>{
   try{const stored=localStorage.getItem(ROLE_REVIEW_STORAGE_KEY);if(stored!==null)setRequests(restoreReviewRequests(JSON.parse(stored)));}catch{setNotice({title:'تعذّر تحميل مسودات المراجعة',message:'ستظهر قائمة خالية حتى تتوفر بيانات صالحة.',tone:'warning'});}
   try{const stored=localStorage.getItem(USER_STORAGE_KEY);if(stored!==null)setUsers(restoreUserFixtures(JSON.parse(stored)));}catch{/* show fixtures */}
 },[]);
 const totals=useMemo(()=>roleIds.map(role=>({role,count:role==='platform_admin'?0:users.filter(x=>x.role===role&&x.status==='active').length})),[users]);
 const comparison=useMemo(()=>compareRoles(compare,selected),[compare,selected]);
 const filtered=useMemo(()=>permissionSections.filter(group=>scope==='all'||group.id===scope).map(group=>({...group,capabilities:group.capabilities.filter(cap=>{
  const normalized=(text:string)=>text.normalize('NFKC').toLowerCase().replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').replace(/[\u064b-\u065f]/g,'').trim();
  return !query.trim()||normalized(`${capabilityLabels[cap]} ${cap}`).includes(normalized(query));
 })})).filter(group=>group.capabilities.length>0),[scope,query]);
 const isEditable=institutionRoles.includes(selected as typeof institutionRoles[number]);
 function persist(next:ReviewRequest[]):boolean{
  try{localStorage.setItem(ROLE_REVIEW_STORAGE_KEY,JSON.stringify(next));setRequests(next);return true;}
  catch{setNotice({title:'تعذّر الحفظ المحلي',message:'لم تُسجل مسودة المراجعة. تحقّق من إعدادات تخزين المتصفح.',tone:'danger'});return false;}
 }
 function submitReview(){
  if(!authorized)return;
  const error=validateReviewDraft(request);setIssue(error);if(error)return;
  const result=createReviewRequest(requests,request);
  if(!result.ok){setIssue(result.error);return;}
  if(!persist(result.items))return;
  setRequestOpen(false);setIssue(null);
  setNotice({title:'حُفظ طلب مراجعة تجريبي',message:'المسودة محلية ولم تُرسل إلى إدارة المنصة أو تغيّر أي صلاحية.',tone:'success'});
 }
 function openNewReview(){
  if(!authorized||!isEditable)return;
  const first=capabilities.find(x=>!grantedFor(selected,x)&&x!=='onboarding.run'&&x!=='platform.manage')??'chat.ask';
  setRequest({role:selected,capability:first,action:'grant',reason:''});setIssue(null);setRequestOpen(true);
 }
 function removeRequest(id:string){
  const next=requests.filter(x=>x.id!==id);
  if(persist(next))setNotice({title:'حُذفت المسودة',message:'هذا حذف لطلب محلي فقط.',tone:'info'});
 }
 function reset(){if(persist([])){setConfirmReset(false);setNotice({title:'تم مسح طلبات المراجعة',message:'لم تتغير أدوار النظام أو الصلاحيات.',tone:'success'});}}
 return <div className="ban brp" dir="rtl" data-testid="roles-permissions-screen">
  <nav className="ban-breadcrumb" aria-label="مسار التنقل"><Link href="/admin">لوحة الإدارة</Link><ChevronLeft size={15}/><Link href="/admin/users">إدارة المستخدمين</Link><ChevronLeft size={15}/><span aria-current="page">الأدوار والصلاحيات</span></nav>
  <header className="ban-hero brp-hero"><div><span className="ban-eyebrow"><ShieldCheck size={17}/> الإدارة · UC-04</span><h1>إدارة الأدوار والصلاحيات</h1><p>مراجعة الأدوار الأربعة ومصفوفة الوصول ومقارنة الامتيازات. يمكن اقتراح تغيير في مسودة محلية دون تطبيقه.</p><div className="ban-hero-tags"><span><LockKeyhole size={14}/> مبدأ أقل امتياز</span><span><Shield size={14}/> فصل المنصة عن المؤسسة</span><span><ClipboardCheck size={14}/> مراجعة الصلاحيات</span></div></div><div className="ban-hero-art" aria-hidden="true"><ShieldCheck size={66}/><i/></div></header>
  <div className="ban-disclaimer" role="note"><Info size={18}/><span><strong>معاينة تجريبية فقط:</strong> الأدوار والحقوق مأخوذة من مصفوفة العرض الموجودة في المشروع. لا يمكن لهذه الشاشة منح وصول فعلي أو تعديل سياسات FastAPI أو الوصول إلى قواعد البيانات. اقتراحات المراجعة محفوظة محليًا فقط.</span></div>
  <div className="ban-role"><span><Users size={17}/> اختيار دور العرض لا يغيّر المستخدم المسجل أو صلاحياته الحقيقية.</span><DemoRolePicker id="brp-demo-role-picker"/></div>
  {!authorized?<div className="ban-locked" data-testid="roles-forbidden"><StatePanel state="forbidden" title="لا تملك صلاحية إدارة الأدوار المؤسسية" description={`الدور الحالي: ${roleMeta[actor].label}. هذه الصفحة مخصصة لمسؤول تقنية المعلومات في المعاينة؛ مسؤول المنصة لا يرث صلاحية إدارة بيانات المؤسسة.`}/><Link href="/admin/users">العودة إلى إدارة المستخدمين <ArrowLeft size={15}/></Link></div>:<>
   <section className="brp-stats" aria-label="ملخص إدارة الصلاحيات">
    {[{icon:<UsersRound/>,label:'الأدوار المعتمدة',value:roleIds.length,tip:'3 مؤسسية + دور المنصة'},{icon:<KeyRound/>,label:'الصلاحيات المعرفة',value:capabilities.length,tip:'مرجع سياسة العرض'},{icon:<ShieldCheck/>,label:'صلاحيات الدور المحدد',value:rolePermissions[selected].length,tip:roleMeta[selected].label},{icon:<FileQuestion/>,label:'طلبات المراجعة المحلية',value:requests.length,tip:'مسودات وليست صلاحيات فعالة'}].map(x=><article key={x.label} className="brp-stat"><span className="brp-stat-icon">{x.icon}</span><div><small>{x.label}</small><strong>{x.value.toLocaleString('ar-EG')}</strong><p>{x.tip}</p></div></article>)}
   </section>
   <section className="ban-panel brp-section" aria-labelledby="brp-role-heading"><div className="ban-section-header"><div><h2 id="brp-role-heading"><UsersRound size={20}/> الأدوار ونطاق الوصول</h2><p>اضغط على أي دور لعرض صلاحياته، أو افتح تفاصيله في الدرج الجانبي.</p></div><Link href="/admin/users" className="brp-inline-link"><UsersRound size={16}/> قائمة المستخدمين <ArrowLeft size={15}/></Link></div>
     <div className="brp-role-grid">{roleIds.map(role=>{const selectedRole=role===selected;const count=totals.find(x=>x.role===role)?.count??0;return <article className={`brp-role-card ${selectedRole?'is-selected':''}`} key={role}>
       <button type="button" className="brp-role-choice" onClick={()=>setSelected(role)} aria-pressed={selectedRole} aria-label={`اختيار دور ${roleMeta[role].label}`}><span className="brp-role-emblem">{role==='platform_admin'?<Layers/>:<ShieldCheck/>}</span><span className="brp-role-info"><strong>{roleMeta[role].label}</strong><small>{roleScope[role]}</small></span>{selectedRole&&<CheckCircle2 className="brp-selected-icon" size={19}/>}</button>
       <div className="brp-role-foot"><span><KeyRound size={13}/> {rolePermissions[role].length} صلاحيات</span><span><Users size={13}/> {role==='platform_admin'?'غير ممثل في سجلات المؤسسة':`${count} حسابات نشطة تجريبية`}</span></div><button type="button" className="brp-details-action" onClick={()=>setDetails(role)}>تفاصيل الدور <ArrowLeft size={14}/></button>
     </article>})}</div>
   </section>
   <section className="ban-panel brp-section" aria-labelledby="brp-matrix-heading"><div className="ban-section-header"><div><h2 id="brp-matrix-heading"><Shield size={20}/> مصفوفة الصلاحيات</h2><p>كل علامة تشير إلى سياسة العرض الثابتة للدور؛ لا تُمكّن الخانات من تعديل صلاحيات النظام.</p></div><div className="ban-actions"><Button size="sm" variant="outline" onClick={()=>{setQuery('');setScope('all');}} leadingIcon={<RefreshCcw size={15}/>}>إزالة المرشحات</Button></div></div>
     <div className="brp-filters"><label><span><Search size={16}/> البحث في الصلاحيات</span><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="البحث باسم الصلاحية أو رمزها..." aria-label="البحث في الصلاحيات"/></label><label><span>المجموعة</span><select value={scope} onChange={event=>setScope(event.target.value)} aria-label="مجموعة الصلاحيات"><option value="all">جميع المجموعات</option>{permissionSections.map(x=><option key={x.id} value={x.id}>{x.title}</option>)}</select></label></div>
     {filtered.length===0?<div className="brp-empty"><Search size={30}/><p>لا توجد صلاحيات تطابق البحث.</p></div>:<div className="brp-table-scroll" role="region" tabIndex={0} aria-label="مصفوفة الصلاحيات قابلة للتمرير أفقيًا"><table className="brp-matrix"><caption className="brp-sr-only">عرض صلاحيات الأدوار الأربعة في نموذج بيان، دون تعديل مباشر</caption><thead><tr><th scope="col">العملية</th>{roleIds.map(r=><th scope="col" key={r} className={selected===r?'brp-current-col':''}>{roleMeta[r].label}</th>)}</tr></thead><tbody>{filtered.flatMap(group=>[<tr key={`${group.id}-label`} className="brp-group-row"><th colSpan={5} scope="rowgroup">{group.title}</th></tr>,...group.capabilities.map(cap=><tr key={cap}><th scope="row"><span>{capabilityLabels[cap]}</span><small dir="ltr">{cap}</small></th>{roleIds.map(r=><td key={r} className={selected===r?'brp-current-col':''}><span className={`brp-matrix-mark ${grantedFor(r,cap)?'allowed':'denied'}`} title={grantedFor(r,cap)?'مسموح في سياسة العرض':'غير مسموح في سياسة العرض'}>{grantedFor(r,cap)?<Check size={17}/>:<X size={17}/>}<span className="brp-sr-only">{grantedFor(r,cap)?'مسموح':'غير مسموح'}</span></span></td>)}</tr>)] )}</tbody></table></div>}
   </section>
   <div className="brp-two-cols"><section className="ban-panel brp-section" aria-labelledby="brp-compare-heading"><div className="ban-section-header"><div><h2 id="brp-compare-heading"><ArrowRightLeft size={20}/> مقارنة الأدوار</h2><p>الفروق تعكس سياسة العرض الموجودة في الكود.</p></div></div><div className="brp-compare-controls"><label>الدور الأول <select value={compare} onChange={event=>setCompare(event.target.value as RoleId)}>{roleIds.map(r=><option key={r} value={r}>{roleMeta[r].label}</option>)}</select></label><ArrowLeft size={18} aria-hidden="true"/><label>الدور الثاني <select value={selected} onChange={event=>setSelected(event.target.value as RoleId)}>{roleIds.map(r=><option key={r} value={r}>{roleMeta[r].label}</option>)}</select></label></div>
     <div className="brp-compare-result"><p><Badge tone="success">{comparison.added.length} إضافية</Badge> موجودة في الدور الثاني دون الأول</p><div>{comparison.added.length?comparison.added.map(c=><span key={c} className="brp-chip positive">{capabilityLabels[c]}</span>):<small>لا توجد صلاحيات إضافية.</small>}</div><p><Badge tone="warning">{comparison.removed.length} أقل</Badge> موجودة في الدور الأول دون الثاني</p><div>{comparison.removed.length?comparison.removed.map(c=><span key={c} className="brp-chip negative">{capabilityLabels[c]}</span>):<small>لا توجد صلاحيات مفقودة.</small>}</div><p className="brp-common-count">{comparison.shared.length} صلاحيات مشتركة بين الدورين.</p></div>
   </section><section className="ban-panel brp-section" aria-labelledby="brp-review-heading"><div className="ban-section-header"><div><h2 id="brp-review-heading"><ClipboardCheck size={20}/> مقترحات مراجعة الصلاحيات</h2><p>مسودات محلية لا تغيّر مصفوفة الوصول ولا تنشئ طلب موافقة فعليًا.</p></div><Button size="sm" leadingIcon={<Plus size={16}/>} onClick={openNewReview} disabled={!isEditable}>اقتراح مراجعة</Button></div>
     {selected==='platform_admin'&&<div className="brp-platform-warning"><LockKeyhole size={18}/> تغييرات صلاحيات مسؤول المنصة خارج نطاق إدارة المؤسسة.</div>}
     {requests.length===0?<div className="brp-empty"><FileQuestion size={30}/><p>لم تُسجل مقترحات مراجعة محلية بعد.</p></div>:<div className="brp-request-list">{requests.slice(0,6).map(item=><article key={item.id} className="brp-request"><div><strong>{item.action==='grant'?'اقتراح منح':'اقتراح سحب'}: {capabilityLabels[item.capability]}</strong><p>{roleMeta[item.role].label} · {item.reason}</p><small>مسودة غير مطبقة</small></div><button type="button" aria-label={`حذف مقترح ${capabilityLabels[item.capability]}`} onClick={()=>removeRequest(item.id)}><X size={17}/></button></article>)}</div>}
     {requests.length>0&&<div className="brp-review-footer"><span>المقترحات: {requests.length} (محلية فقط)</span><Button variant="outline" size="sm" leadingIcon={<RefreshCcw size={15}/>} onClick={()=>setConfirmReset(true)}>مسح الطلبات</Button></div>}
   </section></div>
   <div className="brp-footer"><Info size={18}/><div><strong>قاعدة الأمان:</strong> إدارة الأدوار في الواجهة ليست وسيلة منح أو سحب صلاحيات. يجب تطبيق RBAC وعزل المؤسسات والتحقق من تصنيف البيانات في FastAPI والاستعلامات، وتدقيق أي تغيير فعلي على الخادم.</div><Link href="/admin/users">إدارة المستخدمين <ArrowLeft size={15}/></Link></div>
  </>}
  <Drawer open={Boolean(details)&&authorized} onClose={()=>setDetails(null)} title={details?`تفاصيل دور: ${roleMeta[details].label}`:'تفاصيل الدور'} description="نطاق الوصول وصلاحيات العرض المقترحة">
   {details&&<div className="brp-drawer"><p className="brp-drawer-scope"><ShieldCheck size={19}/>{roleScope[details]}</p><p>{roleMeta[details].description}</p><h3>الصلاحيات المسموحة في نموذج العرض ({rolePermissions[details].length})</h3><ul>{rolePermissions[details].map(cap=><li key={cap}><CheckCircle2 size={17}/><div><strong>{capabilityLabels[cap]}</strong><small dir="ltr">{cap}</small></div></li>)}</ul>{details==='platform_admin'&&<div className="brp-platform-warning"><LockKeyhole size={18}/> مسؤول المنصة لا يحصل تلقائيًا على حق قراءة بيانات المؤسسة أو إدارة مستخدميها.</div>}<Button variant="outline" fullWidth onClick={()=>{setSelected(details);setDetails(null);}}>اختيار الدور في المصفوفة</Button></div>}
  </Drawer>
  <Dialog open={requestOpen&&authorized} onClose={()=>setRequestOpen(false)} title="اقتراح مراجعة صلاحية" description="طلب توضيحي محفوظ محليًا ولا يُطبق على أي حساب أو دور" footer={<><Button variant="outline" onClick={()=>setRequestOpen(false)}>إلغاء</Button><Button onClick={submitReview} leadingIcon={<ClipboardCheck size={16}/>}>حفظ مسودة المراجعة</Button></>}>
   <div className="brp-review-form"><label>الدور المؤسسي<select value={request.role} onChange={e=>{setRequest({...request,role:e.target.value as RoleId});setIssue(null);}}>{institutionRoles.map(r=><option key={r} value={r}>{roleMeta[r].label}</option>)}</select></label><label>العملية<select value={request.capability} onChange={e=>{setRequest({...request,capability:e.target.value as Capability});setIssue(null);}}>{capabilities.filter(c=>c!=='onboarding.run'&&c!=='platform.manage').map(cap=><option key={cap} value={cap}>{capabilityLabels[cap]}</option>)}</select></label><label>الإجراء المقترح<select value={request.action} onChange={e=>{setRequest({...request,action:e.target.value as ReviewAction});setIssue(null);}}><option value="grant">اقتراح منح</option><option value="revoke">اقتراح سحب</option></select></label><label>سبب المراجعة<textarea value={request.reason} maxLength={500} rows={4} onChange={e=>{setRequest({...request,reason:e.target.value});setIssue(null);}} placeholder="اشرح سبب طلب مراجعة هذه الصلاحية (12 حرفًا على الأقل)"/></label>{issue&&<p role="alert" className="brp-validation">{issue}</p>}<p className="brp-form-note"><Info size={16}/> لا تعدل هذه المسودة مصفوفة الصلاحيات أو بيانات المستخدمين، ولا تُرسل إلى الخادم.</p></div>
  </Dialog>
  <Dialog open={confirmReset&&authorized} onClose={()=>setConfirmReset(false)} title="مسح مقترحات المراجعة" description="إزالة جميع المسودات التجريبية من هذا المتصفح" footer={<><Button variant="outline" onClick={()=>setConfirmReset(false)}>إلغاء</Button><Button variant="danger" onClick={reset}>مسح المسودات</Button></>}><p className="brp-confirm">هل تريد مسح {requests.length} مقترح مراجعة؟ لن يؤثر ذلك على صلاحيات حقيقية.</p></Dialog>
  {notice&&<div className="brp-toast"><Toast {...notice} onClose={()=>setNotice(null)}/></div>}
 </div>;
}
export function RolesPermissionsScreen(){return <DemoAccessProvider initialRole="it_admin"><AdminLayout variant="feature"><RolesBody/></AdminLayout></DemoAccessProvider>;}
