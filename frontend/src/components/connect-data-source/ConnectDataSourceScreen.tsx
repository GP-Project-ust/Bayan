'use client';

import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {ArrowLeft,ArrowRight,CheckCircle2,ChevronLeft,ClipboardCheck,Database,FileQuestion,
 FileText,Info,KeyRound,Layers3,LockKeyhole,Network,PlugZap,Server,ShieldCheck,
 ShieldAlert,TriangleAlert,WifiOff,X,BookOpenCheck} from 'lucide-react';
import {AdminLayout} from '@/components/layout';
import {Button,Dialog} from '@/components/ui';
import {StatePanel} from '@/components/states';
import {DemoAccessProvider,DemoRolePicker,useDemoAccess} from '@/components/access/DemoAccess';
import {DEMO_SOURCES,sourceClassLabels,sourceTypeLabels,type DataSource,type SourceType} from '@/lib/data-sources/sources';
import {CREATED_SOURCES_KEY,DEFAULT_WIZARD,DEFAULT_PORT,MAX_CREATED_SOURCES,
 createDemoSource,demoClasses,demoOwners,demoPurposes,demoScopes,demoTypes,
 demonstrationProbe,restoreCreatedSources,saveCreatedSource,validateAll,validateStep,
 type ConnectionWizard,type WizardStep} from '@/lib/data-sources/connect';

const stepNames=['بيانات المصدر','إعداد الاتصال','التصنيف والأمان','محاكاة التحقق','المراجعة والحفظ'];
const stepSummary=['تعريف المصدر ونوعه وغرضه','نقطة اتصال تدريبية فقط','عزل النطاق ومستوى الوصول','تحقق محلي من صحة الحقول','حفظ بيانات وصفية محلية'];
const typeHints:Record<SourceType,string>={postgres:'قاعدة بيانات PostgreSQL للقراءة فقط في التصور المستقبلي.',odoo:'موصل تعليمي لنظام Odoo Education؛ لا يوجد تكامل فعلي.',mysql:'قاعدة بيانات MySQL مؤسسية — نموذج إعداد فقط.',files:'مخزن مستندات للبحث والفهرسة الدلالية في المستقبل.',api:'واجهة REST افتراضية يمكن ربطها لاحقًا من الخادم.'};
const typeIcons:Record<SourceType,typeof Database>={postgres:Database,mysql:Database,odoo:Layers3,files:FileText,api:Network};
type Notice={type:'danger'|'warning';message:string};
function FieldError({message}:{message?:string}){return message?<small className="bdc-error" role="alert">{message}</small>:null;}
function NewSourceBody(){
 const {can}=useDemoAccess();const authorized=can('sources.manage');
 const [form,setForm]=useState<ConnectionWizard>(DEFAULT_WIZARD);
 const [step,setStep]=useState<WizardStep>(1);
 const [maxReached,setMaxReached]=useState<WizardStep>(1);
 const [errors,setErrors]=useState<Record<string,string>>({});
 const [created,setCreated]=useState<DataSource[]>([]);
 const [testPassed,setTestPassed]=useState(false);
 const [saved,setSaved]=useState<DataSource|null>(null);
 const [confirmExit,setConfirmExit]=useState(false);
 const [confirmSave,setConfirmSave]=useState(false);
 const [notice,setNotice]=useState<Notice|null>(null);
 useEffect(()=>{
  try {const raw=localStorage.getItem(CREATED_SOURCES_KEY);if(raw!==null)setCreated(restoreCreatedSources(JSON.parse(raw)));}
  catch{setNotice({type:'warning',message:'تعذّر قراءة المصادر المحفوظة محليًا. لن تُحفظ أي تغييرات دون نجاح التخزين.'});}
 },[]);
 const existing=useMemo(()=>[...DEMO_SOURCES,...created],[created]);
 const probe=useMemo(()=>demonstrationProbe(form),[form]);
 const allValid=useMemo(()=>validateAll(form,existing),[form,existing]);
 const FieldIcons=typeIcons[form.type];
 const isFull=created.length>=MAX_CREATED_SOURCES;
 const canSave=authorized&&testPassed&&allValid.valid&&!isFull;
 function update<K extends keyof ConnectionWizard>(key:K,value:ConnectionWizard[K]){
  setForm(prev=>({...prev,[key]:value}));setErrors(prev=>{const next={...prev};delete next[key];return next;});
  setTestPassed(false);setNotice(null);
 }
 function chooseType(type:SourceType){setForm(prev=>({...prev,type,host:type==='files'?'docs-training.example.invalid':type==='api'?'api-training.example.invalid':type==='odoo'?'odoo-training.example.invalid':`${type}-training.example.invalid`,port:DEFAULT_PORT[type]}));setErrors({});setTestPassed(false);}
 function nextStep(){
  if(step===5)return;
  if(step<=3){const checked=validateStep(step,form,existing);setErrors(checked.errors);if(!checked.valid)return;}
  if(step===4&&!testPassed){setNotice({type:'warning',message:'نفّذ محاكاة التحقق من الحقول قبل الانتقال إلى المراجعة.'});return;}
  const next=(step+1) as WizardStep;setStep(next);setMaxReached(prev=>Math.max(prev,next) as WizardStep);setErrors({});setNotice(null);
 }
 function goToStep(target:WizardStep){
  if(target>maxReached||saved)return;
  if(target===5&&!testPassed)return;
  setStep(target);setErrors({});setNotice(null);
 }
 function sample(){setForm({...DEFAULT_WIZARD,name:'مصدر التحليلات التجريبي',owner:demoOwners[4],scope:demoScopes[4],purpose:demoPurposes[2],host:'analytics-training.example.invalid',classification:'masked',acknowledged:true});setStep(1);setMaxReached(1);setErrors({});setTestPassed(false);setNotice(null);}
 function testConfiguration(){const checked=validateAll(form,existing);setErrors(checked.errors);setTestPassed(checked.valid);if(!checked.valid)setNotice({type:'warning',message:'توجد أخطاء في بيانات الخطوات السابقة. ارجع لتصحيحها ثم أعد المحاكاة.'});else setNotice(null);}
 function persistDemo(){setConfirmSave(false);if(!canSave){setNotice({type:'danger',message:'تعذّر الحفظ: تحقق من الإعدادات ومحاكاة التحقق والصلاحية.'});return;}
  try{const id=`SRC-DEMO-${Date.now().toString(36)}`;const item=createDemoSource(form,id);const next=saveCreatedSource(created,item);localStorage.setItem(CREATED_SOURCES_KEY,JSON.stringify(next));setCreated(next);setSaved(item);setNotice(null);}
  catch(error){setNotice({type:'danger',message:error instanceof Error?error.message:'تعذّر الحفظ المحلي؛ لم تتم إضافة المصدر.'});}
 }
 return <div className="ban bdc" dir="rtl" data-testid="connect-data-source-screen">
  <nav className="ban-breadcrumb" aria-label="مسار التنقل"><Link href="/admin">لوحة الإدارة</Link><ChevronLeft size={15}/><Link href="/admin/data-sources">مصادر البيانات</Link><ChevronLeft size={15}/><span aria-current="page">ربط مصدر جديد</span></nav>
  <header className="ban-hero bdc-hero"><div><span className="ban-eyebrow"><PlugZap size={17}/> الإدارة · UC-05</span><h1>ربط مصدر بيانات جديد</h1><p>معالج تدريبي لإعداد البيانات الوصفية والتصنيف الأمني ومراجعة المصدر قبل الربط الحقيقي عبر الخادم.</p><div className="ban-hero-tags"><span><ShieldCheck size={14}/> أقل امتياز</span><span><LockKeyhole size={14}/> دون أسرار</span><span><WifiOff size={14}/> دون اتصالات فعلية</span></div></div><div className="ban-hero-art" aria-hidden="true"><Database size={72}/><i/></div></header>
  <div className="ban-disclaimer" role="note"><Info size={18}/><span><strong>واجهة تجريبية — لا تدخل بيانات حقيقية:</strong> لا تستقبل الصفحة كلمات مرور أو رموز API ولا تنفّذ اتصالًا بالشبكة. يُسمح فقط بنطاقات <b dir="ltr">example.invalid</b>. الحفظ محلي في المتصفح لبيانات وصفية غير حساسة.</span></div>
  <div className="ban-role"><span><ShieldCheck size={17}/> يقتصر إعداد مصادر المؤسسة على مسؤول تقنية المعلومات في محاكاة الصلاحيات.</span><DemoRolePicker id="bdc-role-picker"/></div>
  {!authorized?<div className="ban-locked" data-testid="connect-source-forbidden"><StatePanel state="forbidden" title="لا تملك صلاحية ربط مصادر المؤسسة" description="لا تمنح محاكاة دور مسؤول المنصة صلاحية تلقائية على بيانات المؤسسة. فرض هذه القاعدة فعليًا مسؤولية الخادم."/><Link href="/admin/data-sources">العودة إلى مصادر البيانات <ArrowLeft size={15}/></Link></div>:
  saved?<section className="ban-panel bdc-success" role="status" data-testid="source-saved"><CheckCircle2 size={48}/><h2>تم حفظ مصدر تجريبي محليًا</h2><p>أضيف «{saved.name}» إلى قائمة المصادر المحلية بحالة «{saved.status==='pending'?'بانتظار الإعداد':'معطّل'}». لم يتم إنشاء موصل أو إرسال بيانات إلى خادم أو فحص قاعدة بيانات.</p><div><span>معرّف تجريبي</span><strong dir="ltr">{saved.id}</strong></div><div className="bdc-actions"><Link className="bdc-link-primary" href="/admin/data-sources">عرض قائمة المصادر <ArrowLeft size={16}/></Link><Button variant="outline" onClick={()=>{setSaved(null);setForm(DEFAULT_WIZARD);setStep(1);setMaxReached(1);setTestPassed(false);}}>إعداد مصدر آخر</Button></div></section>:
  <>
   <section className="bdc-steps" aria-label="مراحل ربط المصدر">{stepNames.map((title,index)=>{const no=(index+1) as WizardStep;return <button key={title} type="button" disabled={no>maxReached||(no===5&&!testPassed)} onClick={()=>goToStep(no)} aria-current={step===no?'step':undefined} className={`bdc-step ${step===no?'active':''} ${step>no?'done':''}`}><span>{step>no?<CheckCircle2 size={20}/>:String(no).padStart(2,'0')}</span><strong>{title}</strong><small>{stepSummary[index]}</small></button>;})}</section>
   <div className="bdc-grid"><section className="ban-panel bdc-form-panel" aria-labelledby="bdc-form-heading">
    <div className="ban-section-header"><div><h2 id="bdc-form-heading"><ClipboardCheck size={21}/> {stepNames[step-1]}</h2><p>الخطوة {step} من 5 · {stepSummary[step-1]}</p></div><span className="bdc-step-counter">{step}/5</span></div>
    {notice&&<div role="alert" className={`bdc-notice ${notice.type}`}><TriangleAlert size={17}/>{notice.message}<button type="button" aria-label="إغلاق التنبيه" onClick={()=>setNotice(null)}><X size={15}/></button></div>}
    {step===1&&<div className="bdc-form-body">
      <div className="bdc-field"><label htmlFor="bdc-name">اسم المصدر <b>*</b></label><input id="bdc-name" value={form.name} onChange={e=>update('name',e.target.value)} maxLength={70} aria-invalid={!!errors.name} placeholder="مثال: مصدر التحليلات التجريبي"/><FieldError message={errors.name}/><small>اسم وصفي تدريبي؛ تجنّب أسماء المؤسسات الحقيقية.</small></div>
      <fieldset className="bdc-types"><legend>نوع مصدر البيانات <b>*</b></legend><div className="bdc-type-grid">{demoTypes.map(t=>{const Icon=typeIcons[t];return <button className={form.type===t?'selected':''} aria-pressed={form.type===t} type="button" onClick={()=>chooseType(t)} key={t}><Icon size={23}/><strong>{sourceTypeLabels[t]}</strong><small>{t==='files'?'وثائق':t==='odoo'?'ERP':t==='api'?'REST':'SQL'}</small></button>})}</div><FieldError message={errors.type}/></fieldset>
      <div className="bdc-field-row"><div className="bdc-field"><label htmlFor="bdc-owner">الجهة المسؤولة <b>*</b></label><select id="bdc-owner" value={form.owner} onChange={e=>update('owner',e.target.value)}>{demoOwners.map(x=><option key={x}>{x}</option>)}</select><FieldError message={errors.owner}/></div><div className="bdc-field"><label htmlFor="bdc-purpose">غرض المصدر <b>*</b></label><select id="bdc-purpose" value={form.purpose} onChange={e=>update('purpose',e.target.value)}>{demoPurposes.map(x=><option key={x}>{x}</option>)}</select><FieldError message={errors.purpose}/></div></div>
      <div className="bdc-type-hint"><Info size={18}/>{typeHints[form.type]}</div>
    </div>}
    {step===2&&<div className="bdc-form-body">
      <div className="bdc-secret-lock"><LockKeyhole size={21}/><div><strong>لا تُدخل بيانات اعتماد</strong><p>يُسمح ببيانات وصفية تدريبية فقط. عند الربط الحقيقي تُرسل الأسرار إلى FastAPI عبر قناة آمنة، ثم تُحفظ في مخزن أسرار، وليس في المتصفح.</p></div></div>
      <div className="bdc-field"><label htmlFor="bdc-host">اسم المضيف التدريبي <b>*</b></label><input id="bdc-host" dir="ltr" value={form.host} onChange={e=>update('host',e.target.value)} spellCheck={false} autoComplete="off" aria-invalid={!!errors.host} placeholder="db-training.example.invalid"/><FieldError message={errors.host}/><small>يجب أن ينتهي بالنطاق <code>example.invalid</code>، ولا يُستخدم أي عنوان حقيقي.</small></div>
      {form.type!=='files'&&<div className="bdc-field"><label htmlFor="bdc-port">المنفذ التوضيحي <b>*</b></label><input id="bdc-port" dir="ltr" value={form.port} inputMode="numeric" onChange={e=>update('port',e.target.value)} aria-invalid={!!errors.port} maxLength={5}/><FieldError message={errors.port}/></div>}
      <div className="bdc-info-pair"><div><span>نوع الموصل</span><strong>{sourceTypeLabels[form.type]}</strong></div><div><span>نمط الوصول المستقبلي</span><strong>قراءة فقط</strong></div></div>
      <div className="bdc-disabled-fields"><label>اسم المستخدم الفعلي <input disabled value="غير متاح في النسخة التجريبية" readOnly/></label><label>كلمة المرور / مفتاح API <input disabled value="تُدار بأمان عبر الخادم لاحقًا" readOnly/></label></div>
    </div>}
    {step===3&&<div className="bdc-form-body">
      <div className="bdc-field"><label htmlFor="bdc-scope">نطاق البيانات داخل المؤسسة <b>*</b></label><select id="bdc-scope" value={form.scope} onChange={e=>update('scope',e.target.value)}>{demoScopes.map(x=><option key={x}>{x}</option>)}</select><FieldError message={errors.scope}/></div>
      <fieldset className="bdc-security"><legend>تصنيف الوصول <b>*</b></legend>{demoClasses.map(c=><label key={c} className={form.classification===c?'selected':''}><input type="radio" name="demo-classification" checked={form.classification===c} onChange={()=>update('classification',c)}/><span className={`bdc-class-dot ${c}`}/><strong>{sourceClassLabels[c]}</strong><small>{c==='public'?'محتوى مسموح نشره بعد الاعتماد':c==='masked'?'إخفاء الحقول الحساسة':c==='restricted'?'يتطلب صلاحيات دقيقة': 'يُحفظ معطّلًا ولا يتاح فحصه'}</small></label>)}</fieldset>
      <div className="bdc-secret-lock"><ShieldAlert size={21}/><div><strong>التصنيف لا يمنح صلاحية وصول تلقائيًا</strong><p>تنفذ سياسات الأعمدة والصفوف وعزل المؤسسات في Backend وقاعدة البيانات، كما تُراجع العروض الذكية قبل استخدامها.</p></div></div>
      <label className="bdc-ack"><input type="checkbox" checked={form.acknowledged} onChange={e=>update('acknowledged',e.target.checked)}/><span>أؤكد أن المدخلات تدريبية ولا تحتوي على أسرار أو عناوين فعلية، وأن هذه الخطوات لا تختبر اتصالًا حقيقيًا.</span></label><FieldError message={errors.acknowledged}/>
    </div>}
    {step===4&&<div className="bdc-form-body"><div className="bdc-probe-intro"><PlugZap size={37}/><h3>محاكاة التحقق من الإعدادات</h3><p>نراجع قواعد إدخال اسم المصدر ونوعه ونطاقه وصيغة المضيف والمنفذ فقط. لا تُرسل طلبات HTTP ولا محاولات اتصال بقواعد البيانات.</p></div><Button leadingIcon={<PlugZap size={17}/>} onClick={testConfiguration}>تشغيل محاكاة التحقق</Button>{testPassed&&<div className="bdc-test-result" role="status"><CheckCircle2 size={24}/><div><strong>{probe.title}</strong><p>{probe.detail}</p></div></div>}<div className="bdc-probe-checks">{['اسم المصدر غير مكرر في القائمة المحلية','صيغة مضيف تدريبي وغير متصل بالشبكة','وجود تصنيف ونطاق وإقرار أمني','عدم إدخال بيانات اعتماد أو رموز وصول'].map(x=><span key={x}><CheckCircle2 size={15}/>{x}</span>)}</div></div>}
    {step===5&&<div className="bdc-form-body"><div className="bdc-review-heading"><ClipboardCheck size={23}/><div><h3>مراجعة بيانات المصدر</h3><p>سيُحفظ سجل وصفي محلي فقط دون إنشاء موصل أو إرسال دعوة أو تغيير قاعدة بيانات.</p></div></div><dl className="bdc-summary">{[['اسم المصدر',form.name],['النوع',sourceTypeLabels[form.type]],['الجهة المالكة',form.owner],['الغرض',form.purpose],['النطاق',form.scope],['التصنيف',sourceClassLabels[form.classification]],['المضيف التدريبي',form.host],['المنفذ',form.type==='files'?'غير مطلوب':form.port],['الحالة بعد الحفظ',form.classification==='blocked'?'معطّل محليًا':'بانتظار إعداد حقيقي']].map(([key,value])=><div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl><div className="bdc-review-warning"><TriangleAlert size={20}/><span>الحفظ المحلي لا يعني نجاح الاتصال أو إتاحة البيانات للوكلاء. لن يُضاف المصدر إلى خادم بيان أو PostgreSQL أو Qdrant.</span></div>{isFull&&<div className="bdc-notice warning">وصلت إلى الحد الأقصى للمصادر التجريبية الإضافية ({MAX_CREATED_SOURCES}).</div>}</div>}
    <div className="bdc-navigation"><Button variant="outline" disabled={step===1} onClick={()=>goToStep((step-1) as WizardStep)} leadingIcon={<ArrowRight size={16}/>}>السابق</Button><div className="bdc-navigation-buttons"><Button variant="ghost" onClick={()=>setConfirmExit(true)}>إلغاء العملية</Button>{step===1&&<Button variant="outline" onClick={sample}>تعبئة مثال تدريبي</Button>}{step<5?<Button onClick={nextStep} trailingIcon={<ArrowLeft size={16}/>}>التالي</Button>:<Button disabled={!canSave} onClick={()=>setConfirmSave(true)} leadingIcon={<CheckCircle2 size={17}/>}>حفظ المصدر التجريبي</Button>}</div></div>
   </section>
   <aside className="bdc-aside" aria-label="ملخص ومعايير الأمان"><div className="ban-panel bdc-overview"><h2><Server size={18}/> ملخص المصدر</h2><span className="bdc-source-avatar"><FieldIcons size={29}/></span><strong>{form.name.trim()||'مصدر جديد'}</strong><small>{sourceTypeLabels[form.type]} · {form.scope}</small><div><span>التصنيف</span><b>{sourceClassLabels[form.classification]}</b></div><div><span>الاتصال</span><b>لم يُختبر فعليًا</b></div><div><span>تخزين الأسرار</span><b>غير متاح</b></div></div><div className="ban-panel bdc-guidance"><h2><BookOpenCheck size={18}/> قبل الربط الحقيقي</h2><ol><li>التحقق من دور مسؤول المؤسسة.</li><li>اعتماد سرّ الاتصال في مخزن آمن بالخادم.</li><li>إجراء اختبار خادم مع مهلة وحدود اتصال.</li><li>تطبيق تصنيفات البيانات والعروض الذكية.</li><li>تسجيل عملية الربط في سجل التدقيق.</li></ol><small>هذه إجراءات هندسية مقترحة ولم تُنفذ في النموذج الحالي.</small></div></aside></div>
   <footer className="bdc-footer"><Info size={18}/><span>المصدر المضاف يحتفظ فقط ببيانات تدريبية محددة من قوائم مسموحة. يمكن معاينته في «إدارة مصادر البيانات» بعد الحفظ. لن يبدأ SQL أو RAG بالاعتماد عليه تلقائيًا.</span></footer>
  </>}
  <Dialog open={confirmExit&&authorized} onClose={()=>setConfirmExit(false)} title="إلغاء إعداد المصدر" description="ستفقد المدخلات غير المحفوظة" footer={<><Button variant="outline" onClick={()=>setConfirmExit(false)}>متابعة التعديل</Button><Button variant="danger" onClick={()=>{setConfirmExit(false);setForm(DEFAULT_WIZARD);setStep(1);setMaxReached(1);setTestPassed(false);setErrors({});}}>تجاهل البيانات</Button></>}><p>هل تريد إلغاء إعداد المصدر التجريبي الحالي؟ لن تؤثر العملية على القائمة المحفوظة.</p></Dialog>
  <Dialog open={confirmSave&&authorized} onClose={()=>setConfirmSave(false)} title="تأكيد الحفظ المحلي" description="لا يُنفذ أي ربط حقيقي" footer={<><Button variant="outline" onClick={()=>setConfirmSave(false)}>مراجعة مجددًا</Button><Button onClick={persistDemo}>حفظ محلي فقط</Button></>}><p>سيُحفظ المصدر «{form.name}» في متصفحك بحالة «بانتظار الإعداد»، دون حفظ أي بيانات اعتماد أو الاتصال بقواعد بيانات فعلية.</p></Dialog>
 </div>;
}
export function ConnectDataSourceScreen(){return <DemoAccessProvider initialRole="it_admin"><AdminLayout variant="feature"><NewSourceBody/></AdminLayout></DemoAccessProvider>;}
