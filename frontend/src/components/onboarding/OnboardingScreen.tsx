'use client';

import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {
 ArrowLeft,ArrowRight,BookOpenCheck,Building2,Check,CheckCircle2,ChevronLeft,
 ClipboardCheck,CloudOff,Code2,Database,FileText,FolderOpen,Info,Layers3,
 ListChecks,LockKeyhole,PlayCircle,RefreshCcw,Save,ShieldCheck,Sparkles,Workflow,History
} from 'lucide-react';
import {PlatformLayout} from '@/components/layout/PlatformLayout';
import {Button,Dialog,Toast} from '@/components/ui';
import {DemoAccessProvider,DemoRolePicker,useDemoAccess} from '@/components/access/DemoAccess';
import {StatePanel} from '@/components/states';
import {DEMO_ORGANIZATIONS} from '@/lib/organizations/organizations';
import {appendCompletedHistory} from '@/lib/onboarding-history/history';
import {
 DEFAULT_ONBOARDING_FORM,DRAFT_KEY,ONBOARDING_DEMO_NOTICE,ONBOARDING_STEPS,
 SOURCE_LABELS,VIEW_CLASSIFICATION,VIEW_DESCRIPTION,VIEW_LABELS,
 allowedTemplates,canComplete,completionSummary,loadDraft,onboardingOrgLabel,readiness,
 saveDraft,schemaPreview,validateStage,
 type DataSourceKind,type OnboardingForm,type OnboardingStage,type ViewTemplate
} from '@/lib/onboarding/onboarding';

type Notice={title:string;message:string;tone:'success'|'warning'|'danger'|'info'};
const sourceKinds=Object.keys(SOURCE_LABELS) as DataSourceKind[];
const viewIcons:Record<DataSourceKind,typeof Database>={postgresql:Database,odoo:Layers3,files:FolderOpen,api:Workflow};
const documentLabels={'none':'لا توجد وثائق حاليًا','sample3':'3 ملفات تدريبية رمزية','sample12':'12 ملفًا تدريبيًا رمزيًا'} as const;
const initialForm=()=>({...DEFAULT_ONBOARDING_FORM,sources:[...DEFAULT_ONBOARDING_FORM.sources],selectedViews:[...DEFAULT_ONBOARDING_FORM.selectedViews]});

function Wizard(){
 const {can}=useDemoAccess();const allowed=can('onboarding.run');
 const [step,setStep]=useState<OnboardingStage>(0);
 const [form,setForm]=useState<OnboardingForm>(initialForm);
 const [notice,setNotice]=useState<Notice|null>(null);
 const [error,setError]=useState<string|null>(null);
 const [resetOpen,setResetOpen]=useState(false);
 const [finishOpen,setFinishOpen]=useState(false);
 const [completed,setCompleted]=useState(false);
 const [draftLoaded,setDraftLoaded]=useState(false);
 useEffect(()=>{try{const saved=loadDraft(window.localStorage);if(saved){setForm(saved);setDraftLoaded(true);}}catch{/* isolated demo has no persistence requirement */}},[]);
 const views=useMemo(()=>allowedTemplates(form),[form]);
 const readinessList=useMemo(()=>readiness(form),[form]);
 const passed=readinessList.filter(x=>x.passed).length;
 const progress=Math.round(100*passed/5);
 function patch(change:Partial<OnboardingForm>){setForm(p=>({...p,...change}));setError(null);setCompleted(false);}
 function updateOrganization(id:string){patch({organizationId:id,organizationName:'',organizationCode:''});}
 function updateSources(kind:DataSourceKind){
  const sources=form.sources.includes(kind)?form.sources.filter(v=>v!==kind):[...form.sources,kind];
  patch({sources,analysisDone:false,indexingDone:false,selectedViews:[]});
 }
 function updateSecurity(classification:OnboardingForm['classification']){
  patch({classification,selectedViews:form.selectedViews.filter(x=>VIEW_CLASSIFICATION[x]==='internal'||classification==='restricted')});
 }
 function toggleView(id:ViewTemplate){if(!views.includes(id))return;patch({selectedViews:form.selectedViews.includes(id)?form.selectedViews.filter(x=>x!==id):[...form.selectedViews,id]});}
 function nextStep(){if(!allowed)return;if(completed)return;const validation=validateStage(step,form);if(validation){setError(validation);return;}if(step===5){if(canComplete(form))setFinishOpen(true);else setError('أكمل جميع الخطوات المطلوبة قبل تأكيد المحاكاة.');return;}setStep((step+1) as OnboardingStage);setError(null);}
 function previousStep(){if(step>0){setStep((step-1) as OnboardingStage);setError(null);}}
 function save(){try{saveDraft(window.localStorage,form);setDraftLoaded(true);setNotice({title:'حُفظت المسودة التجريبية',message:'حُفظت بيانات وصفية غير حساسة في هذا المتصفح فقط.',tone:'success'});}catch{setNotice({title:'تعذّر حفظ المسودة',message:'مساحة تخزين المتصفح غير متاحة. لا تُرسل أي بيانات إلى خادم.',tone:'danger'});}}
 function reset(){try{window.localStorage.removeItem(DRAFT_KEY);}catch{}setForm(initialForm());setStep(0);setError(null);setCompleted(false);setDraftLoaded(false);setResetOpen(false);setNotice({title:'أُعيد ضبط النموذج',message:'لم تتغير بيانات المؤسسات أو الخدمات.',tone:'info'});}
 function complete(){if(!allowed||!canComplete(form)){setFinishOpen(false);setError('معايير الجاهزية غير مكتملة.');return;}
  setCompleted(true);setFinishOpen(false);
  let logged=false;
  try {
   const stamp=Date.now();const suffix=Math.random().toString(36).slice(2,6).padEnd(4,'0');
   appendCompletedHistory(window.localStorage,form,`ONB-LOCAL-${stamp}-${suffix}`,new Date(stamp).toISOString());
   logged=true;
   window.localStorage.removeItem(DRAFT_KEY);
  } catch {/* local storage can be disabled: do not claim that history was saved */}
  setDraftLoaded(false);
  setNotice(logged?{title:'اكتملت المحاكاة وحُفظ سجل محلي',message:'سجل العملية موجود في صفحة سجل التهيئة؛ لم تُنشأ أي موارد خارج المتصفح.',tone:'success'}:{title:'اكتملت المحاكاة دون حفظ سجل',message:'تعذّر التخزين المحلي، ولم تُنشأ أي موارد حقيقية.',tone:'warning'});
 }
 function downloadSummary(){if(!allowed||!completed)return;const summary=completionSummary(form);const content=JSON.stringify(summary,null,2);const blob=new Blob([content],{type:'application/json;charset=utf-8'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download='bayan-onboarding-demo-summary.json';document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(url);}
 return <main className="ban bon" data-testid="onboarding-screen" dir="rtl">
  <nav className="ban-breadcrumb" aria-label="مسار التنقل"><Link href="/platform/organizations">إدارة المؤسسات</Link><ChevronLeft size={15}/><span>إدارة المنصة</span><ChevronLeft size={15}/><span aria-current="page">معالج التهيئة الذكية</span></nav>
  <header className="ban-hero bon-hero"><div><span className="ban-eyebrow"><Sparkles size={18}/> إدارة المنصة · UC-07 / FR-28</span><h1>معالج التهيئة الذكية للمؤسسات</h1><p>ست خطوات منظمة لإعداد مؤسسة على مستوى التصميم: تعريف الجهة، اختيار المصادر، فحص المخطط، العروض الذكية، المستندات، ومراجعة الجاهزية.</p><div className="ban-hero-tags"><span><ShieldCheck size={14}/> عزل المؤسسات</span><span><LockKeyhole size={14}/> دون بيانات اعتماد</span><span><CloudOff size={14}/> محاكاة محلية بالكامل</span></div></div><div className="ban-hero-art" aria-hidden="true"><Workflow size={76}/><i/></div></header>
  <div className="ban-disclaimer" role="note"><Info size={18}/><span><strong>{ONBOARDING_DEMO_NOTICE}</strong> جميع أسماء البنى والعروض المعروضة توضيحية وليست بيانات حقيقية.</span></div>
  <div className="ban-role"><span><ShieldCheck size={17}/> صلاحية المعاينة: <b dir="ltr">onboarding.run</b> — لا تمنح الوصول إلى بيانات المؤسسة الداخلية.</span><DemoRolePicker id="onboarding-role-picker"/></div>
  {!allowed?<section className="ban-locked" data-testid="onboarding-forbidden"><StatePanel state="forbidden" title="غير مصرح لك بمعاينة التهيئة الذكية" description="هذه الشاشة مخصصة لمسؤول المنصة في نموذج الصلاحيات. تحقُّق الصلاحيات الفعلي يجب أن يجري داخل Backend."/><Link href="/platform/organizations">العودة لإدارة المؤسسات <ArrowLeft size={16}/></Link></section>:completed?
   <section className="ban-panel bon-finished" data-testid="onboarding-completed"><div className="bon-finished-icon"><CheckCircle2 size={55}/></div><span className="bon-demo-chip">نتيجة محاكاة فقط</span><h2>اكتملت مراجعة جاهزية التهيئة التجريبية</h2><p>تمت محاكاة خطوات إعداد «{onboardingOrgLabel(form)}» محليًا. لم يتم إنشاء مؤسسة أو ربط قاعدة بيانات أو فهرسة مستندات أو إرسال طلب إلى الخادم.</p><div className="bon-complete-grid"><span>مصادر مختارة <strong>{form.sources.length}</strong></span><span>قوالب عروض <strong>{form.selectedViews.length}</strong></span><span>طلبات شبكة <strong>0</strong></span><span>موارد منشأة <strong>0</strong></span></div><div className="bon-footer"><Button onClick={downloadSummary} leadingIcon={<FileText size={16}/>}>تنزيل ملخص JSON تجريبي</Button><Button variant="outline" onClick={()=>setResetOpen(true)} leadingIcon={<RefreshCcw size={15}/>}>بدء نموذج جديد</Button><Link href="/platform/onboarding/history" className="bon-link">سجل عمليات التهيئة <History size={15}/></Link><Link href="/platform/organizations" className="bon-link">العودة إلى المؤسسات <ArrowLeft size={15}/></Link></div></section>:
  <div className="bon-main-grid">
    <aside className="bon-rail" aria-label="مراحل التهيئة"><div className="bon-rail-header"><span className="bon-rail-icon"><Workflow size={25}/></span><div><strong>تقدم إعداد المؤسسة</strong><small>مراحل تدريبية — دون تنفيذ</small></div></div><div className="bon-progress"><div className="bon-progress-top"><span>معايير الجاهزية</span><strong>{progress}%</strong></div><div className="bon-progress-track"><span style={{width:`${progress}%`}}/></div><small>{passed} من 5 فحوص تحضيرية</small></div>
    <ol className="bon-step-list">{ONBOARDING_STEPS.map((s,i)=>{const visited=i<=step;const done=i<5&&readinessList[i]?.passed;return <li key={s.label}><button type="button" disabled={!visited} className={`bon-step ${step===i?'current':''} ${done?'passed':''}`} onClick={()=>{setStep(i as OnboardingStage);setError(null);}} aria-current={step===i?'step':undefined}><span className="bon-step-number">{done?<Check size={16}/>:String(i+1).padStart(2,'0')}</span><span><b>{s.label}</b><small>{s.caption}</small></span></button></li>;})}</ol>
    <div className="bon-rail-note"><LockKeyhole size={18}/><p>المنصة لا تقرأ كلمات المرور أو البيانات الأكاديمية في هذه المحاكاة.</p></div></aside>
    <div className="bon-content">
      <section className="ban-panel bon-panel" aria-live="polite"><div className="bon-heading"><div><span>الخطوة {step+1} من 6</span><h2>{ONBOARDING_STEPS[step].label}</h2><p>{ONBOARDING_STEPS[step].caption}</p></div><span className="bon-heading-icon"><ClipboardCheck size={27}/></span></div>
      {step===0&&<div className="bon-fields"><div className="bon-info"><Building2 size={18}/> اختر مؤسسة قيد التهيئة من الأمثلة أو صِف مؤسسة جديدة افتراضية.</div><label className="bon-field bon-wide"><span>طريقة التهيئة <b>*</b></span><select value={form.organizationId} onChange={e=>updateOrganization(e.target.value)}><option value="new">مؤسسة جديدة تجريبية</option>{DEMO_ORGANIZATIONS.filter(o=>o.status==='onboarding').map(o=><option key={o.id} value={o.id}>{o.name} — {o.code}</option>)}</select></label>
       {form.organizationId==='new'?<><label className="bon-field"><span>اسم المؤسسة <b>*</b></span><input value={form.organizationName} maxLength={80} onChange={e=>patch({organizationName:e.target.value})} placeholder="جامعة افتراضية جديدة"/></label><label className="bon-field"><span>الرمز اللاتيني <b>*</b></span><input dir="ltr" value={form.organizationCode} maxLength={18} onChange={e=>patch({organizationCode:e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g,'')})} placeholder="DEMO-UNIVERSITY"/><small>3–18 رمزًا لاتينيًا كبيرًا أو رقمًا أو شرطة.</small></label><label className="bon-field"><span>نوع المؤسسة</span><select value={form.sector} onChange={e=>patch({sector:e.target.value})}>{['جامعة','معهد','كلية','مركز','أكاديمية'].map(v=><option key={v}>{v}</option>)}</select></label><label className="bon-field"><span>المنطقة الوصفية</span><input value={form.region} maxLength={40} onChange={e=>patch({region:e.target.value})} placeholder="صنعاء"/></label></>:
       <div className="bon-selected-org bon-wide"><Building2 size={26}/><div><strong>{onboardingOrgLabel(form)}</strong><small>اسم اصطناعي من قائمة المؤسسات التدريبية؛ لا تتغير حالتها الفعلية أو المحلية هنا.</small></div></div>}
       <div className="bon-security bon-wide"><ShieldCheck size={18}/> لا تجمع هذه الخطوة أسماء موظفين أو أرقام هواتف أو بيانات داخلية.</div></div>}
      {step===1&&<div className="bon-fields"><div className="bon-info bon-wide"><Database size={18}/> اختر نوعًا أو أكثر. لن نطلب عناوين خوادم أو بيانات دخول.</div><div className="bon-source-grid bon-wide">{sourceKinds.map(kind=>{const Icon=viewIcons[kind];const selected=form.sources.includes(kind);return <button type="button" key={kind} onClick={()=>updateSources(kind)} className={`bon-option ${selected?'chosen':''}`} aria-pressed={selected}><span className="bon-option-icon"><Icon size={24}/></span><span className="bon-option-copy"><b>{SOURCE_LABELS[kind]}</b><small>{kind==='files'?'اختيار مصدر وثائق وصفية':kind==='api'?'واجهة خدمات تدريبية':'بيانات مخطط نموذجية دون اتصال'}</small></span><span className="bon-option-check">{selected?<CheckCircle2 size={20}/>:<span/>}</span></button>;})}</div><div className="bon-security bon-wide"><LockKeyhole size={18}/> أي بيانات اعتماد مستقبلية يجب أن تُرسل عبر قناة مشفرة إلى Backend وتُحفظ في مخزن أسرار، لا في localStorage.</div></div>}
      {step===2&&<div className="bon-stack"><div className="bon-info"><Code2 size={18}/> سنعرض أسماء جداول وحقول افتراضية فقط، دون استعلام أو اكتشاف بنية حقيقية.</div><div className="bon-stage-summary"><strong>المصادر المختارة</strong><div>{form.sources.map(k=><span key={k}>{SOURCE_LABELS[k]}</span>)}</div></div><Button onClick={()=>patch({analysisDone:true,selectedViews:[]})} leadingIcon={<PlayCircle size={16}/>}>{form.analysisDone?'إعادة محاكاة التحليل':'تشغيل محاكاة تحليل المخطط'}</Button>{form.analysisDone&&<div className="bon-table-wrap"><table><thead><tr><th>كيان افتراضي</th><th>حقول نموذجية</th><th>توضيح</th></tr></thead><tbody>{schemaPreview(form).map(x=><tr key={x.entity}><td dir="ltr">{x.entity}</td><td dir="ltr">{x.columns}</td><td>{x.note}</td></tr>)}</tbody></table></div>}{form.analysisDone&&<div className="bon-success"><CheckCircle2 size={18}/> اكتملت محاكاة فحص البنية فقط — بلا اتصال بالخادم.</div>}</div>}
      {step===3&&<div className="bon-stack"><div className="bon-info"><Layers3 size={18}/> القوالب المسموحة مبنية على المصدر المختار وتصنيفه، ولا تشمل بيانات شخصية أو حقولًا محظورة.</div><label className="bon-field"><span>مستوى الوصول الأدنى للعروض</span><select value={form.classification} onChange={e=>updateSecurity(e.target.value as OnboardingForm['classification'])}><option value="internal">داخلي — حقول مجمّعة فقط</option><option value="restricted">مقيّد — يحتاج اعتمادًا أمنيا لاحقًا</option></select></label><div className="bon-views">{views.map(v=><label key={v} className={`bon-view ${form.selectedViews.includes(v)?'selected':''}`}><input type="checkbox" checked={form.selectedViews.includes(v)} onChange={()=>toggleView(v)}/><div><strong>{VIEW_LABELS[v]}</strong><small>{VIEW_DESCRIPTION[v]}</small></div><span>{VIEW_CLASSIFICATION[v]==='restricted'?'مقيّد':'داخلي'}</span></label>)}</div>{views.length===0&&<p className="bon-warning">لا توجد قوالب مسموحة للمصادر المحددة.</p>}<div className="bon-security"><LockKeyhole size={18}/> لا يتم تنفيذ CREATE VIEW أو SQL في هذه الخطوة. الاختيارات مجرد مقترحات.</div></div>}
      {step===4&&<div className="bon-stack"><div className="bon-info"><BookOpenCheck size={18}/> اختر حجم بيانات رمزية لفحص مراحل فهرسة المستندات دون قراءة أو رفع ملفات.</div><div className="bon-doc-choices">{(Object.keys(documentLabels) as OnboardingForm['documentPlan'][]).map(id=><label key={id} className={form.documentPlan===id?'selected':''}><input type="radio" name="bon-document-plan" value={id} checked={form.documentPlan===id} onChange={()=>patch({documentPlan:id,indexingDone:false})}/><span>{documentLabels[id]}</span></label>)}</div><div className="bon-mini-pipeline"><div><FileText size={19}/><span>اكتشاف الملفات</span></div><ChevronLeft size={16}/><div><Code2 size={19}/><span>تقسيم النص</span></div><ChevronLeft size={16}/><div><Layers3 size={19}/><span>فهرسة المتجهات</span></div></div><Button onClick={()=>patch({indexingDone:true})} leadingIcon={<PlayCircle size={17}/>}>{form.documentPlan==='none'?'محاكاة تجاوز الفهرسة دون مستندات':'بدء محاكاة الفهرسة'}</Button>{form.indexingDone&&<div className="bon-success"><CheckCircle2 size={18}/>{form.documentPlan==='none'?'تم تجاوز الفهرسة افتراضيًا بلا ملفات.':'اكتملت مراحل الفهرسة الوصفية — لا توجد متجهات محفوظة في Qdrant.'}</div>}</div>}
      {step===5&&<div className="bon-stack"><div className="bon-review-top"><ClipboardCheck size={28}/><div><h3>مراجعة الجاهزية قبل إنهاء المحاكاة</h3><p>لا يُعدّ أي بند أدناه اعتمادًا للبيانات أو نظامًا مُهيّأ فعليًا.</p></div></div><div className="bon-review-grid"><div><span>المؤسسة التجريبية</span><strong>{onboardingOrgLabel(form)}</strong></div><div><span>مصادر البيانات</span><strong>{form.sources.map(s=>SOURCE_LABELS[s]).join('، ')}</strong></div><div><span>قوالب العروض</span><strong>{form.selectedViews.map(x=>VIEW_LABELS[x]).join('، ')||'لم تُحدد'}</strong></div><div><span>مستندات تدريبية</span><strong>{documentLabels[form.documentPlan]}</strong></div><div><span>التصنيف</span><strong>{form.classification==='internal'?'داخلي':'مقيّد'}</strong></div><div><span>حالة العمليات الحقيقية</span><strong>لم تُنفّذ</strong></div></div><h3 className="bon-check-title"><ListChecks size={19}/> قائمة الجاهزية التدريبية</h3><div className="bon-review-checks">{readinessList.map((item,i)=><button key={item.label} type="button" onClick={()=>setStep(i as OnboardingStage)} className={item.passed?'valid':'invalid'}><span>{item.passed?<CheckCircle2 size={18}/>:<Info size={18}/>}</span>{item.label}<small>{item.passed?'مكتملة تجريبيًا':'تحتاج مراجعة'}</small></button>)}</div><label className="bon-acknowledge"><input type="checkbox" checked={form.acknowledged} onChange={e=>patch({acknowledged:e.target.checked})}/><span>أقرّ بأن جميع النتائج افتراضية، ولا يوجد اتصال بقواعد البيانات أو إنشاء عروض أو فهرسة أو تفعيل مؤسسات حقيقية.</span></label></div>}
      {error&&<div className="bon-error" role="alert"><Info size={17}/>{error}</div>}
      <footer className="bon-controls"><div><Button variant="outline" disabled={step===0} onClick={previousStep} leadingIcon={<ArrowRight size={15}/>}>السابق</Button><Button onClick={nextStep} trailingIcon={<ArrowLeft size={15}/>}>{step===5?'تأكيد إكمال المحاكاة':'التالي'}</Button></div><div><Button variant="outline" onClick={save} leadingIcon={<Save size={15}/>}>حفظ مسودة</Button><Button variant="ghost" onClick={()=>setResetOpen(true)} leadingIcon={<RefreshCcw size={15}/>}>إعادة البدء</Button></div></footer>
      </section>
      <div className="bon-footnotes"><span><Info size={16}/> {draftLoaded?'استُعيدت مسودة تدريبية محفوظة في هذا المتصفح.':'يمكن حفظ مسودة وصفية في هذا المتصفح للعودة إليها.'}</span><Link href="/platform/onboarding/history">سجل عمليات التهيئة <History size={15}/></Link><Link href="/platform/organizations">عرض المؤسسات <ArrowLeft size={15}/></Link></div>
    </div>
  </div>}
  <Dialog open={resetOpen} onClose={()=>setResetOpen(false)} title="بدء محاكاة جديدة" description="لن تُحذف أي بيانات مؤسسة حقيقية" footer={<><Button variant="outline" onClick={()=>setResetOpen(false)}>إلغاء</Button><Button variant="danger" onClick={reset}>مسح المسودة التجريبية</Button></>}><p>سيُعاد تعيين إدخالات المعالج المحلي ومسودته المحفوظة في هذا المتصفح فقط.</p></Dialog>
  <Dialog open={finishOpen} onClose={()=>setFinishOpen(false)} title="تأكيد اكتمال المحاكاة" description="لا يتم إطلاق خدمات أو تخزين أي بيانات خارج المتصفح" footer={<><Button variant="outline" onClick={()=>setFinishOpen(false)}>العودة للمراجعة</Button><Button onClick={complete}>تأكيد المحاكاة فقط</Button></>}><p>ستُعرض نتيجة جاهزية تدريبية للمؤسسة «{onboardingOrgLabel(form)}». لا تُنشأ موارد أو مؤسسات في المنصة.</p></Dialog>
  {notice&&<div className="bon-toast"><Toast title={notice.title} message={notice.message} tone={notice.tone} onClose={()=>setNotice(null)}/></div>}
 </main>;
}
export function OnboardingScreen(){return <DemoAccessProvider initialRole="platform_admin"><PlatformLayout><Wizard/></PlatformLayout></DemoAccessProvider>;}
