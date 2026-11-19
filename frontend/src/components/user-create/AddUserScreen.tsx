'use client';

import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {ArrowLeft,ArrowRight,Building2,Check,CheckCircle2,ChevronLeft,ClipboardCheck,FileCheck2,Info,LockKeyhole,Mail,ShieldCheck,UserRoundPlus,UsersRound,AlertTriangle} from 'lucide-react';
import {AdminLayout} from '@/components/layout';
import {Button,Dialog} from '@/components/ui';
import {StatePanel} from '@/components/states';
import {DemoAccessProvider,DemoRolePicker,useDemoAccess} from '@/components/access/DemoAccess';
import {userDetailsHref} from '@/lib/user-management/details';
import {appendAuditEntry, getCustomRoles, type CustomRole} from '@/lib/access/enterprise-rbac';
import {capabilityLabels} from '@/lib/access/policy';
import {DEMO_USERS,USERS_DEMO_NOTE,createUser,demoInstitution,departments,restoreUserFixtures,userRoleLabels,validateUserDraft,type TenantRole,type UserDraft,type UserRecord} from '@/lib/user-management/users';

const STORAGE_KEY='bayan.demo.users.v1';
const ROLES:TenantRole[]=['employee','manager','it_admin'];
const EMPTY_DRAFT:UserDraft={name:'',email:'',department:'شؤون الطلاب',role:'employee'};
const STEPS=[{label:'بيانات الحساب',hint:'الاسم والبريد المؤسسي'},{label:'المؤسسة والدور',hint:'القسم والصلاحيات'},{label:'المراجعة النهائية',hint:'التأكد ثم الإضافة التجريبية'}];
const ROLE_DETAILS:Record<TenantRole,{headline:string;points:string[]}>={
 employee:{headline:'للموظف حق الاستعلام عن المعلومات المصرّح بها',points:['المحادثة والبحث في المستندات','الاطلاع على المصادر المسموح بها','لا يملك إدارة المستخدمين']},
 manager:{headline:'للمدير أدوات تحليل وتقارير ضمن نطاق المؤسسة',points:['مؤشرات الأداء والتحليلات','إنشاء التقارير وتصدير المسموح منها','لا يملك إدارة حسابات المؤسسة']},
 it_admin:{headline:'مسؤول التقنية يدير حسابات المؤسسة وفق سياساتها',points:['إدارة المستخدمين والأدوار المؤسسية','مصادر البيانات والعروض الذكية','مراجعة سجلات التدقيق المصرح بها']}
};

function readExisting():UserRecord[]{
 try{const saved=localStorage.getItem(STORAGE_KEY);return saved===null?DEMO_USERS.map(x=>({...x})):restoreUserFixtures(JSON.parse(saved));}
 catch{return DEMO_USERS.map(x=>({...x}));}
}
function Body(){
 const router=useRouter();
 const {can}=useDemoAccess();
 const canManage=can('users.manage');
 const [step,setStep]=useState(0);
 const [draft,setDraft]=useState<UserDraft>({...EMPTY_DRAFT});
 const [errors,setErrors]=useState<Record<string,string>>({});
 const [askConfirm,setAskConfirm]=useState(false);
 const [askLeave,setAskLeave]=useState(false);
 const [created,setCreated]=useState<UserRecord|null>(null);
 const [generalError,setGeneralError]=useState('');
 const [isSaving,setIsSaving]=useState(false);
 const [loaded,setLoaded]=useState(false);
 const [existing,setExisting]=useState<UserRecord[]>(DEMO_USERS);
 const customRoles = useMemo(() => getCustomRoles().filter(r => r.scope === 'organization'), []);
 useEffect(()=>{setExisting(readExisting());setLoaded(true);},[]);
 const dirty=useMemo(()=>Boolean(draft.name.trim()||draft.email.trim()||draft.department!==EMPTY_DRAFT.department||draft.role!==EMPTY_DRAFT.role),[draft]);
 const normalizedName=draft.name.trim().replace(/\s+/g,' ');
 const normalizedEmail=draft.email.trim().toLowerCase();
 function change(patch:Partial<UserDraft>){setDraft(d=>({...d,...patch}));setErrors({});setGeneralError('');}
 function advance(){
  if(!canManage)return;
  if(step===0){const e=validateUserDraft({...draft,department:EMPTY_DRAFT.department,role:EMPTY_DRAFT.role},existing);const selection:Record<string,string>={};if(e.name)selection.name=e.name;if(e.email)selection.email=e.email;
   if(Object.keys(selection).length){setErrors(selection);return;}}
  if(step===1){const e=validateUserDraft(draft,existing);if(Object.keys(e).length){setErrors(e);return;}}
  setErrors({});setStep(n=>Math.min(2,n+1));
 }
 function prepare(){
  if(!canManage||isSaving)return;
  const current=readExisting();setExisting(current);
  const e=validateUserDraft(draft,current);if(Object.keys(e).length){setErrors(e);setStep(e.name||e.email?0:1);setGeneralError('تحقق من الحقول المميزة ثم أعد المحاولة.');return;}
  setAskConfirm(true);
 }
 function commit(){
  if(!canManage||isSaving)return;setIsSaving(true);setGeneralError('');
  try{
   // Recheck immediately before writing to avoid duplicates from a second tab.
   const current=readExisting();const result=createUser(current,draft);
   if(!result.ok){setGeneralError(result.error);setAskConfirm(false);setStep(0);return;}
   // Persist before showing success. Failure must NOT claim a saved user.
   localStorage.setItem(STORAGE_KEY,JSON.stringify(result.users));
   setExisting(result.users);setCreated(result.users[result.users.length-1]);setAskConfirm(false);
   appendAuditEntry({actorId:'USR-003',actorName:'مسؤول التقنية',actorRole:'مسؤول تقنية المعلومات',scope:'organization',tenantId:demoInstitution,operation:'USER_CREATED',targetId:result.users[result.users.length-1]?.id||'USR-NEW',targetName:draft.name,details:`إضافة مستخدم جديد: ${draft.name} (${draft.email}) بدور ${draft.customRoleId ? (customRoles.find(r => r.id === draft.customRoleId)?.nameAr || userRoleLabels[draft.role]) : userRoleLabels[draft.role]}`,reason:'إضافة مستخدم'});
  }catch{setGeneralError('تعذّر حفظ السجل في التخزين المحلي للمتصفح. لم تُضَف بيانات جديدة.');setAskConfirm(false);}
  finally{setIsSaving(false);}
 }
 function navigateBack(){if(dirty&&!created){setAskLeave(true);}else router.push('/admin/users');}
 function resetForm(){setDraft({...EMPTY_DRAFT});setErrors({});setStep(0);setGeneralError('');setCreated(null);setAskConfirm(false);}
 const activeCustomRole = draft.customRoleId ? customRoles.find(r => r.id === draft.customRoleId) : null;
 const info = activeCustomRole ? {
   headline: `دور مؤسسي مخصص: ${activeCustomRole.nameAr}`,
   points: activeCustomRole.capabilities.map(c => capabilityLabels[c] || c)
 } : ROLE_DETAILS[draft.role];
 return <div className="ban banu" dir="rtl" data-testid="add-user-screen">
  <nav className="ban-breadcrumb" aria-label="مسار التنقل"><Link href="/admin">لوحة الإدارة</Link><ChevronLeft size={15}/><Link href="/admin/users">إدارة المستخدمين</Link><ChevronLeft size={15}/><span aria-current="page">إضافة مستخدم</span></nav>
  <header className="ban-hero banu-hero"><div><span className="ban-eyebrow"><UserRoundPlus size={17}/> إدارة حسابات المؤسسة · نموذج تفصيلي</span><h1>إضافة مستخدم جديد</h1><p>إدخال بيانات الحساب، وتحديد الدور والصلاحيات، ومراجعتها قبل الإضافة إلى قائمة العرض التجريبي.</p><div className="ban-hero-tags"><span><Building2 size={15}/> مؤسسة واحدة</span><span><ShieldCheck size={15}/> صلاحيات مؤسسية</span><span><ClipboardCheck size={15}/> مراجعة قبل الحفظ</span></div></div><div className="ban-hero-art" aria-hidden="true"><UserRoundPlus size={74}/></div></header>
  <div className="ban-disclaimer" role="note"><Info size={19}/><p><strong>نموذج توضيحي فقط:</strong> {USERS_DEMO_NOTE} يُرجى عدم إدخال بيانات أشخاص حقيقيين. هذه الصفحة لا ترسل دعوات بالبريد.</p></div>
  <section className="ban-role"><span><LockKeyhole size={17}/> عرض إجراءات الإضافة محصور بدور مسؤول تقنية المعلومات في هذه المحاكاة؛ الأمان الحقيقي يُفرض في Backend.</span><DemoRolePicker id="banu-role-demo"/></section>
  {!canManage?<div className="ban-locked" data-testid="add-user-forbidden"><StatePanel state="forbidden" title="لا تملك صلاحية إضافة مستخدم" description="اختر مسؤول تقنية المعلومات من محدد الدور التجريبي لمعاينة نموذج الإضافة. لا يمنح النموذج أي صلاحيات على الخادم."/><Link href="/admin/users">العودة إلى المستخدمين <ArrowLeft size={16}/></Link></div>:
  created?<section className="ban-panel banu-success" aria-live="polite" data-testid="add-user-success"><div className="banu-success-icon"><CheckCircle2 size={39}/></div><h2>تمت إضافة المستخدم إلى النموذج التجريبي</h2><p>حُفظ سجل العرض داخل هذا المتصفح فقط. لم يُنشأ حساب فعلي، ولم تُرسل دعوة، ولم تتغير صلاحيات المؤسسة الحقيقية.</p><dl><div><dt>المعرّف التجريبي</dt><dd>{created.id}</dd></div><div><dt>اسم المستخدم</dt><dd>{created.name}</dd></div><div><dt>البريد الإلكتروني</dt><dd dir="ltr">{created.email}</dd></div><div><dt>الدور</dt><dd>{created.customRoleId ? (customRoles.find(r => r.id === created.customRoleId)?.nameAr ? `${customRoles.find(r => r.id === created.customRoleId)?.nameAr} (دور مخصص)` : userRoleLabels[created.role]) : userRoleLabels[created.role]}</dd></div></dl><div className="banu-success-actions"><Button leadingIcon={<UsersRound size={17}/>} onClick={()=>router.push('/admin/users')}>عرض قائمة المستخدمين</Button><Button variant="outline" leadingIcon={<UserRoundPlus size={16}/>} onClick={resetForm}>إضافة مستخدم تجريبي آخر</Button><Button variant="outline" onClick={()=>router.push(userDetailsHref(created.id))}>فتح تفاصيل الحساب</Button></div></section>:
  <div className="banu-grid">
   <div className="banu-main">
    <section className="ban-panel banu-wizard" aria-label="خطوات إضافة المستخدم">
     <ol className="banu-steps" aria-label="مراحل إضافة المستخدم">{STEPS.map((item,i)=><li key={item.label} className={i===step?'current':i<step?'complete':''} aria-current={i===step?'step':undefined}><span className="banu-step-n">{i<step?<Check size={17}/>:i+1}</span><span><strong>{item.label}</strong><small>{item.hint}</small></span></li>)}</ol>
     {generalError&&<div className="banu-error" role="alert"><AlertTriangle size={17}/>{generalError}</div>}
     {step===0&&<div className="banu-form-section" data-testid="add-user-account-step"><div className="banu-section-title"><Mail size={22}/><div><h2>بيانات الحساب</h2><p>أدخل الاسم والبريد الإلكتروني المستخدمين في نموذج العرض.</p></div></div><div className="banu-form-grid">
      <label className="banu-field"><span>الاسم الكامل <b>*</b></span><input value={draft.name} autoComplete="off" maxLength={90} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name?'banu-name-error':undefined} placeholder="مثال: أ. أحمد محمد" onChange={e=>change({name:e.target.value})}/>{errors.name&&<small id="banu-name-error" role="alert">{errors.name}</small>}</label>
      <label className="banu-field"><span>البريد الإلكتروني <b>*</b></span><input value={draft.email} type="email" dir="ltr" autoComplete="off" maxLength={254} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email?'banu-email-error':undefined} placeholder="employee@example.test" onChange={e=>change({email:e.target.value})}/>{errors.email&&<small id="banu-email-error" role="alert">{errors.email}</small>}</label>
     </div><div className="banu-help"><Info size={17}/> استخدم مثالًا بعنوان <code dir="ltr">example.test</code> فقط. سيُفحص تكرار البريد في قائمة المستخدمين المحلية.</div></div>}
     {step===1&&<div className="banu-form-section" data-testid="add-user-role-step"><div className="banu-section-title"><ShieldCheck size={22}/><div><h2>المؤسسة والدور</h2><p>حدّد نطاق المستخدم وصلاحياته في بيئة المعاينة.</p></div></div><div className="banu-form-grid">
      <label className="banu-field"><span>المؤسسة <b>*</b></span><input readOnly value={demoInstitution} title="المؤسسة مثبتة في هذا النموذج"/><small className="banu-muted">لا يمكن تغيير المؤسسة من شاشة الإدارة التابعة لها.</small></label>
      <label className="banu-field"><span>القسم <b>*</b></span><select value={draft.department} aria-invalid={Boolean(errors.department)} onChange={e=>change({department:e.target.value})}>{departments.map(d=><option key={d} value={d}>{d}</option>)}</select>{errors.department&&<small role="alert">{errors.department}</small>}</label>
      <fieldset className="banu-role-options"><legend>الدور المؤسسي <b>*</b></legend>
        <div className="banu-role-cards">{ROLES.map(r=><label key={r} className={draft.role===r && !draft.customRoleId?'banu-role-card selected':'banu-role-card'}><input type="radio" name="user-role" value={r} checked={draft.role===r && !draft.customRoleId} onChange={()=>change({role:r, customRoleId: undefined})}/><span><strong>{userRoleLabels[r]}</strong><small>{ROLE_DETAILS[r].headline}</small></span><ShieldCheck size={19}/></label>)}</div>
        {customRoles.length>0&&(
          <div style={{marginTop:'1.25rem',borderTop:'1px dashed rgba(255,255,255,0.1)',paddingTop:'1rem'}}>
            <span style={{fontSize:'0.875rem',fontWeight:700,color:'var(--bayan-gold)',display:'block',marginBottom:'0.6rem'}}>الأدوار المؤسسية المخصصة</span>
            <div className="banu-role-cards">
              {customRoles.map(cr=><label key={cr.id} className={draft.customRoleId===cr.id?'banu-role-card selected':'banu-role-card'}><input type="radio" name="user-role" value={cr.id} checked={draft.customRoleId===cr.id} onChange={()=>change({role:cr.baseRole as TenantRole, customRoleId:cr.id})}/><span><strong>{cr.nameAr} (مخصص)</strong><small>{cr.descriptionAr||`مبني على دور: ${userRoleLabels[cr.baseRole as TenantRole]}`}</small></span><ShieldCheck size={19}/></label>)}
            </div>
          </div>
        )}
      </fieldset>
     </div><div className="banu-help"><LockKeyhole size={17}/> لا يمكن تعيين دور «مسؤول المنصة» من إدارة مستخدمي المؤسسة؛ ويجب اعتماد الدور النهائي في الخادم.</div></div>}
     {step===2&&<div className="banu-form-section" data-testid="add-user-review-step"><div className="banu-section-title"><FileCheck2 size={22}/><div><h2>مراجعة بيانات المستخدم</h2><p>راجع القيم أدناه قبل تأكيد إضافتها إلى قائمة العرض.</p></div></div><dl className="banu-review"><div><dt>الاسم الكامل</dt><dd>{normalizedName}</dd></div><div><dt>البريد الإلكتروني</dt><dd dir="ltr">{normalizedEmail}</dd></div><div><dt>المؤسسة</dt><dd>{demoInstitution}</dd></div><div><dt>القسم</dt><dd>{draft.department}</dd></div><div><dt>الدور</dt><dd>{draft.customRoleId ? (customRoles.find(r => r.id === draft.customRoleId)?.nameAr ? `${customRoles.find(r => r.id === draft.customRoleId)?.nameAr} (دور مخصص)` : userRoleLabels[draft.role]) : userRoleLabels[draft.role]}</dd></div><div><dt>حالة الحساب في المعاينة</dt><dd>نشط — سجل وهمي</dd></div></dl><div className="banu-help"><Info size={17}/> لا يُولّد النموذج كلمة مرور ولا يُرسل دعوة. عندما تتوفر واجهة API ستُنشأ الحسابات من جهة الخادم بعد التحقق من الصلاحيات.</div></div>}
     <footer className="banu-wizard-actions"><Button variant="outline" leadingIcon={<ArrowRight size={17}/>} onClick={()=>step>0?setStep(s=>s-1):navigateBack()}>{step===0?'العودة للمستخدمين':'الخطوة السابقة'}</Button>{step<2?<Button onClick={advance} trailingIcon={<ArrowLeft size={17}/>} disabled={!loaded}>التالي</Button>:<Button disabled={!loaded} leadingIcon={<ClipboardCheck size={17}/>} onClick={prepare}>مراجعة وتأكيد الإضافة</Button>}</footer>
    </section>
   </div>
   <aside className="banu-side" aria-label="ملخص إعداد الحساب"><section className="ban-panel banu-side-card"><h2><UserRoundPlus size={19}/> ملخص الحساب</h2><p>تتحدث هذه البطاقة أثناء إدخال بيانات المستخدم.</p><dl><div><dt>الاسم</dt><dd>{normalizedName||'لم يُدخل بعد'}</dd></div><div><dt>البريد</dt><dd dir="ltr">{normalizedEmail||'—'}</dd></div><div><dt>القسم</dt><dd>{draft.department}</dd></div><div><dt>الدور</dt><dd>{draft.customRoleId ? (customRoles.find(r => r.id === draft.customRoleId)?.nameAr ? `${customRoles.find(r => r.id === draft.customRoleId)?.nameAr} (دور مخصص)` : userRoleLabels[draft.role]) : userRoleLabels[draft.role]}</dd></div><div><dt>المؤسسة</dt><dd>{demoInstitution}</dd></div></dl></section><section className="ban-panel banu-side-card"><h2><ShieldCheck size={19}/> صلاحيات الدور المختار</h2><p>{info.headline}</p><ul>{info.points.map(p=><li key={p}><Check size={16}/>{p}</li>)}</ul><small>هذا وصف توضيحي للصلاحيات، وليس ضمان وصول فعلي.</small></section></aside>
  </div>}
  <Dialog open={askConfirm&&canManage} onClose={()=>setAskConfirm(false)} title="تأكيد إضافة المستخدم التجريبي" description="مراجعة الإضافة المحلية دون إرسال دعوة أو إنشاء حساب مؤسسي حقيقي" footer={<><Button variant="outline" onClick={()=>setAskConfirm(false)}>إلغاء</Button><Button onClick={commit} loading={isSaving} leadingIcon={<UserRoundPlus size={16}/>}>تأكيد الإضافة محليًا</Button></>}><p className="banu-confirm-copy">هل تريد إضافة <strong>{normalizedName}</strong> بدور <strong>{draft.customRoleId ? (customRoles.find(r => r.id === draft.customRoleId)?.nameAr || userRoleLabels[draft.role]) : userRoleLabels[draft.role]}</strong> في قائمة مستخدمي العرض فقط؟ لن تُرسل أي رسالة بريد إلكتروني.</p></Dialog>
  <Dialog open={askLeave} onClose={()=>setAskLeave(false)} title="تجاهل البيانات غير المحفوظة؟" description="التغييرات الحالية غير محفوظة في قائمة المستخدمين" footer={<><Button variant="outline" onClick={()=>setAskLeave(false)}>متابعة التحرير</Button><Button variant="danger" onClick={()=>router.push('/admin/users')}>تجاهل والعودة</Button></>}><p className="banu-confirm-copy">سيتم تجاهل البيانات التي أدخلتها في هذا النموذج فقط.</p></Dialog>
 </div>;
}
export function AddUserScreen(){return <DemoAccessProvider initialRole="it_admin"><AdminLayout variant="feature"><Body/></AdminLayout></DemoAccessProvider>;}
