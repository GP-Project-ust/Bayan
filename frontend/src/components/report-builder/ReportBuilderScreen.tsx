"use client";
import {useMemo,useState} from "react";
import Link from "next/link";
import {ArrowLeft,ArrowRight,BookOpenCheck,CalendarDays,BarChart3,Check,CheckCheck,CheckCircle2,ChevronLeft,ClipboardList,Download,FileBarChart,FileText,Info,Layers3,LockKeyhole,RefreshCcw,ShieldCheck,Sparkles,TriangleAlert} from "lucide-react";
import {ChatLayout} from "@/components/layout";
import {Button,Dialog,Toast} from "@/components/ui";
import {StatePanel} from "@/components/states";
import {DemoAccessProvider,DemoRolePicker,useDemoAccess} from "@/components/access/DemoAccess";
import {allowedMetrics,createDemoDraftJson,emptyBuilderForm,groupLabels,metricCatalog,reportKinds,sampleTemplate,selectMetric,selectSource,sourceCatalog,steps,validateBuilder,validateStep,visibilityLabels,type BuilderForm,type MetricId,type ReportStep,type SourceId,type ValidationErrors} from "@/lib/reports/builder";
import {reportKindLabels} from "@/lib/reports/reports";

type ToastDetails={title:string;message:string;tone:"success"|"warning"|"info"|"danger"};
const numberAr=(n:number)=>new Intl.NumberFormat("ar-EG").format(n);
const min=1 as ReportStep,max=4 as ReportStep;
const isEmpty=(errors:ValidationErrors)=>Object.keys(errors).length===0;

function ReportBuilderBody(){
 const {can}=useDemoAccess();const canCreate=can("reports.create");
 const [step,setStep]=useState<ReportStep>(1);
 const [form,setForm]=useState<BuilderForm>({...emptyBuilderForm});
 const [errors,setErrors]=useState<ValidationErrors>({});
 const [confirm,setConfirm]=useState(false);
 const [resetConfirm,setResetConfirm]=useState(false);
 const [completed,setCompleted]=useState(false);
 const [toast,setToast]=useState<ToastDetails|null>(null);
 const availableMetrics=useMemo(()=>allowedMetrics(form.sourceIds),[form.sourceIds]);
 const selectedSources=sourceCatalog.filter(s=>form.sourceIds.includes(s.id));
 const selectedMetrics=metricCatalog.filter(m=>form.metricIds.includes(m.id));
 function patch<K extends keyof BuilderForm>(key:K,value:BuilderForm[K]){
  setForm(f=>({...f,[key]:value}));setErrors(e=>({...e,[key]:undefined}));
 }
 function next(){const errs=validateStep(form,step);setErrors(errs);if(!isEmpty(errs))return;if(step<max){setStep((step+1) as ReportStep);setErrors({});}}
 function back(){setErrors({});if(step>min)setStep((step-1) as ReportStep);}
 function jump(target:ReportStep){if(target<step){setStep(target);setErrors({});}}
 function startSample(){setForm({...sampleTemplate,sourceIds:[...sampleTemplate.sourceIds],metricIds:[...sampleTemplate.metricIds]});setStep(1);setErrors({});setCompleted(false);setToast({title:"تم تحميل مثال تدريبي",message:"يمكنك الآن مراجعة خطوات إنشاء التقرير وتعديل خياراته.",tone:"info"});}
 function newReport(){setCompleted(false);setForm({...emptyBuilderForm});setErrors({});setStep(1);}
 function removeSource(id:SourceId){setForm(f=>selectSource(f,id));setErrors({});}
 function toggleMetric(id:MetricId){setForm(f=>selectMetric(f,id));setErrors({});}
 function downloadDraft(){
  const all=validateBuilder(form);if(!isEmpty(all)){setErrors(all);setToast({title:"تحقق من بيانات المسودة",message:"يجب استكمال المعلومات والمصادر والفترة قبل تصدير إعداداتها.",tone:"warning"});return;}
  const blob=new Blob([createDemoDraftJson(form)],{type:"application/json;charset=utf-8"});const url=URL.createObjectURL(blob);
  const a=document.createElement("a");a.href=url;a.download="bayan-demo-report-configuration.json";document.body.appendChild(a);a.click();a.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1000);
  setToast({title:"تم تنزيل ملف الإعدادات",message:"يحتوي JSON على اختيارات النموذج فقط؛ لا يحتوي على بيانات تقرير حقيقية.",tone:"success"});
 }
 function askConfirm(){
  const all=validateBuilder(form);if(!isEmpty(all)){
   const target=([1,2,3] as const).find(s=>!isEmpty(validateStep(form,s)))??1;
   setStep(target);setErrors(validateStep(form,target));return;
  }
  setConfirm(true);
 }
 function confirmDemo(){setConfirm(false);setCompleted(true);setToast({title:"اكتملت محاكاة الإعداد",message:"لم يُرسل طلب إلى الخادم ولم يُنشأ تقرير داخل مركز التقارير.",tone:"success"});}
 return <div className="brb" data-testid="report-builder-screen">
  <nav className="brb-breadcrumb" aria-label="مسار التنقل"><Link href="/">الرئيسية</Link><ChevronLeft size={15}/><Link href="/reports">مركز التقارير</Link><ChevronLeft size={15}/><span aria-current="page">إنشاء تقرير جديد</span></nav>
  <header className="brb-hero"><div className="brb-hero-inner"><span className="brb-kicker"><Sparkles size={15}/> مساعد إعداد التقارير</span><h1>إنشاء تقرير ذكي</h1><p>صمّم تقريرًا مؤسسيًا من أربع خطوات واضحة: العنوان والهدف، المصادر والمؤشرات، الفترة، ثم المراجعة النهائية.</p><div className="brb-chips"><span><Layers3 size={15}/> 4 خطوات منظمة</span><span><ShieldCheck size={15}/> وفق الصلاحيات</span><span><FileBarChart size={15}/> قوالب أكاديمية</span></div></div><div className="brb-hero-image" aria-hidden="true"><FileBarChart size={65}/><BarChart3 size={31}/></div></header>
  <div className="brb-note" role="note"><Info size={20}/><p><strong>نموذج تجريبي:</strong> المصادر والمؤشرات أمثلة تعليمية فقط. لن يجري إنشاء تقرير حقيقي أو تشغيل وكيل أو SQL أو إرسال بيانات إلى FastAPI. يمكنك تنزيل <strong>ملف إعدادات JSON محلي</strong>، أما التقرير الناتج والمعاينة الرسمية فسيُطوّران عند ربط Backend.</p></div>
  <div className="brb-role"><div><LockKeyhole size={18}/> الصلاحيات هنا لتجربة الواجهة؛ يجب التحقق منها داخل الخادم.</div><DemoRolePicker id="brb-role"/></div>
  {!canCreate?<div className="brb-forbidden" data-testid="builder-forbidden"><StatePanel state="forbidden" title="لا تملك صلاحية إنشاء تقرير" description="إنشاء التقارير متاح لمدير المؤسسة في نموذج الصلاحيات. غيّر الدور التجريبي لمعاينة الشاشة؛ لا يُعد ذلك تفويضًا أمنيًا."/><Link href="/reports" className="brb-back-link">العودة إلى مركز التقارير <ArrowLeft size={16}/></Link></div>:completed?<section className="brb-completed" data-testid="report-builder-complete"><div className="brb-completed-symbol"><CheckCheck size={53}/></div><span className="brb-completed-label">عرض تجريبي مكتمل</span><h2>اكتملت محاكاة إعداد التقرير</h2><p>راجعنا خيارات <strong>{form.title}</strong> داخل المتصفح فقط. لم يُنشأ ملف تقرير أو مهمة معالجة أو سجل جديد في مركز التقارير.</p><div className="brb-completed-info"><span>نوع التقرير: <strong>{reportKindLabels[form.kind]}</strong></span><span>المصادر: <strong>{numberAr(form.sourceIds.length)}</strong></span><span>المؤشرات: <strong>{numberAr(form.metricIds.length)}</strong></span></div><div className="brb-completed-actions"><Button onClick={downloadDraft} leadingIcon={<Download size={17}/>}>تنزيل إعدادات JSON</Button><Button onClick={newReport} variant="outline" leadingIcon={<RefreshCcw size={16}/>}>تقرير آخر</Button><Link href="/reports" className="brb-outline-link">مركز التقارير <ArrowLeft size={16}/></Link><Link href="/reports/detail?report=rep-101" className="brb-outline-link">معاينة مثال مستقل (ليس التقرير الذي أعددته) <ArrowLeft size={16}/></Link></div></section>:<>
   <section className="brb-steps" aria-label="خطوات إعداد التقرير" data-testid="builder-steps">{steps.map(item=><button type="button" key={item.number} className={`brb-step ${item.number===step?"active":""} ${item.number<step?"passed":""}`} onClick={()=>jump(item.number)} aria-current={item.number===step?"step":undefined} disabled={item.number>step}>
    <span className="brb-step-number">{item.number<step?<Check size={17}/>:numberAr(item.number)}</span><span className="brb-step-text"><strong>{item.title}</strong><small>{item.subtitle}</small></span></button>)}</section>
   <div className="brb-columns"><main className="brb-content" aria-label="إعدادات التقرير">
    <div className="brb-content-head"><div><span>الخطوة {numberAr(step)} من ٤</span><h2>{steps[step-1].title}</h2><p>{step===1?"عرّف التقرير والغاية منه لكي يكون واضحًا لمستخدمي المؤسسة.":step===2?"اختر المصادر التجريبية والمؤشرات المتوافقة معها.":step===3?"حدد النطاق الزمني وشكل التجميع وأقسام التقرير.":"راجع جميع الخيارات قبل محاكاة الإنشاء."}</p></div><span className="brb-progress-label">{numberAr(step*25)}٪</span></div>
    <div className="brb-progress-track" role="progressbar" aria-label="تقدم إعداد التقرير" aria-valuenow={step*25} aria-valuemin={0} aria-valuemax={100}><span style={{width:`${step*25}%`}}/></div>
    {Object.keys(errors).length>0&&<div className="brb-errors" role="alert"><TriangleAlert size={18}/><span>يرجى استكمال الحقول المحددة قبل المتابعة.</span></div>}
    {step===1&&<div className="brb-form-grid" data-testid="builder-step-1">
      <label className="brb-field brb-full" htmlFor="brb-title"><span>عنوان التقرير <em>*</em></span><input id="brb-title" value={form.title} maxLength={100} onChange={e=>patch("title",e.target.value)} placeholder="مثال: توزيع الطلاب حسب الكليات خلال الفصل الأول" aria-invalid={Boolean(errors.title)} aria-describedby={errors.title?"brb-title-error":undefined}/><small>عنوان واضح بين 8 و100 حرف <b>{form.title.length}/100</b></small>{errors.title&&<strong className="brb-error-text" id="brb-title-error">{errors.title}</strong>}</label>
      <label className="brb-field brb-full" htmlFor="brb-objective"><span>هدف التقرير ووصفه <em>*</em></span><textarea id="brb-objective" rows={4} maxLength={500} value={form.objective} onChange={e=>patch("objective",e.target.value)} placeholder="اشرح القرار أو السؤال الذي تريد أن يساعد التقرير في الإجابة عنه..." aria-invalid={Boolean(errors.objective)} aria-describedby={errors.objective?"brb-objective-error":undefined}/><small>من 20 إلى 500 حرف <b>{form.objective.length}/500</b></small>{errors.objective&&<strong className="brb-error-text" id="brb-objective-error">{errors.objective}</strong>}</label>
      <fieldset className="brb-full brb-choice-fieldset"><legend>نوع التقرير</legend><div className="brb-type-grid">{reportKinds.map(k=><label key={k.id} className={`brb-type-card ${form.kind===k.id?"selected":""}`}><input type="radio" name="brb-kind" value={k.id} checked={form.kind===k.id} onChange={()=>patch("kind",k.id)}/><span className="brb-type-icon"><ClipboardList size={20}/></span><strong>{k.label}</strong><small>{k.hint}</small></label>)}</div></fieldset>
      <label className="brb-field brb-full" htmlFor="brb-visibility"><span>نطاق إتاحة التقرير (تصميم أولي)</span><select id="brb-visibility" value={form.visibility} onChange={e=>patch("visibility",e.target.value as BuilderForm["visibility"])}><option value="personal">{visibilityLabels.personal}</option><option value="department">{visibilityLabels.department}</option></select><small>لا يمنح هذا الاختيار أي صلاحيات حقيقية؛ يحدد التفضيل المقترح فقط.</small></label>
    </div>}
    {step===2&&<div data-testid="builder-step-2"><div className="brb-section-lead"><h3><Layers3 size={19}/> مصادر البيانات <em>*</em></h3><p>مصادر افتراضية تمثل العروض الذكية المصرح بها. اختر مصدرًا واحدًا على الأقل.</p></div><div className="brb-source-grid">{sourceCatalog.map(s=><label key={s.id} className={`brb-source-card ${form.sourceIds.includes(s.id)?"selected":""}`}><input type="checkbox" checked={form.sourceIds.includes(s.id)} onChange={()=>removeSource(s.id)} aria-label={`مصدر: ${s.name}`}/><span className="brb-select-circle">{form.sourceIds.includes(s.id)&&<Check size={15}/>}</span><strong>{s.name}</strong><small>{s.description}</small><span className="brb-source-meta"><span>{s.classification}</span><span>{s.scope}</span></span></label>)}</div>{errors.sourceIds&&<p className="brb-error-text">{errors.sourceIds}</p>}
      <div className="brb-section-lead brb-metrics-head"><h3><BarChart3 size={19}/> المؤشرات المطلوبة <em>*</em></h3><p>تتغير الخيارات بحسب المصادر المحددة؛ لا يمكن إضافة مؤشر خارج مصدره.</p></div>
      {availableMetrics.length?<div className="brb-metric-list">{availableMetrics.map(m=><label className={`brb-metric ${form.metricIds.includes(m.id)?"selected":""}`} key={m.id}><input type="checkbox" checked={form.metricIds.includes(m.id)} onChange={()=>toggleMetric(m.id)} aria-label={`مؤشر: ${m.label}`}/><span className="brb-metric-check">{form.metricIds.includes(m.id)&&<Check size={15}/>}</span><span><strong>{m.label}</strong><small>{m.description}</small></span><em>{m.unit}</em></label>)}</div>:<div className="brb-source-empty"><Info size={19}/> اختر مصدر بيانات لإظهار المؤشرات المتاحة.</div>}{errors.metricIds&&<p className="brb-error-text">{errors.metricIds}</p>}
      <p className="brb-selection-count">تم تحديد {numberAr(form.sourceIds.length)} مصادر و{numberAr(form.metricIds.length)} مؤشرات (الحد الأقصى 6).</p>
    </div>}
    {step===3&&<div className="brb-form-grid" data-testid="builder-step-3"><div className="brb-section-lead brb-full"><h3><CalendarDays size={19}/> النطاق الزمني</h3><p>اختر فترة واضحة لبناء سياق التقرير. التواريخ لا تؤدي إلى استعلامات حقيقية.</p></div>
     <label className="brb-field" htmlFor="brb-from"><span>تاريخ البداية <em>*</em></span><input type="date" id="brb-from" value={form.startDate} onChange={e=>patch("startDate",e.target.value)} aria-invalid={Boolean(errors.startDate)}/>{errors.startDate&&<strong className="brb-error-text">{errors.startDate}</strong>}</label>
     <label className="brb-field" htmlFor="brb-to"><span>تاريخ النهاية <em>*</em></span><input type="date" id="brb-to" value={form.endDate} onChange={e=>patch("endDate",e.target.value)} aria-invalid={Boolean(errors.endDate)}/>{errors.endDate&&<strong className="brb-error-text">{errors.endDate}</strong>}</label>
     <label className="brb-field brb-full" htmlFor="brb-group"><span>طريقة التجميع</span><select id="brb-group" value={form.groupBy} onChange={e=>patch("groupBy",e.target.value as BuilderForm["groupBy"])}>{Object.entries(groupLabels).map(([id,label])=><option value={id} key={id}>{label}</option>)}</select></label>
     <fieldset className="brb-option-fieldset brb-full"><legend>محتوى التقرير المقترح</legend><label><input type="checkbox" checked={form.includeSources} onChange={e=>patch("includeSources",e.target.checked)}/><span><strong>إظهار قائمة المصادر</strong><small>إضافة أسماء المراجع المستخدمة عند توفرها</small></span></label><label><input type="checkbox" checked={form.includeHighlights} onChange={e=>patch("includeHighlights",e.target.checked)}/><span><strong>ملخص النقاط الرئيسية</strong><small>تضمين قسم للنتائج المختصرة عند إنشاء التقرير الفعلي</small></span></label></fieldset>
    </div>}
    {step===4&&<div className="brb-review" data-testid="builder-step-4"><div className="brb-review-top"><CheckCircle2 size={24}/><div><h3>مراجعة إعدادات التقرير</h3><p>هذه معاينة للإعدادات فقط؛ لا تُعرض نتائج أو أرقام مستخرجة.</p></div></div>
      <section><h4><FileText size={17}/> التعريف</h4><dl><div><dt>العنوان</dt><dd>{form.title}</dd></div><div><dt>الهدف</dt><dd>{form.objective}</dd></div><div><dt>النوع</dt><dd>{reportKindLabels[form.kind]}</dd></div><div><dt>الظهور المقترح</dt><dd>{visibilityLabels[form.visibility]}</dd></div></dl></section>
      <section><h4><Layers3 size={17}/> المصادر والمؤشرات</h4><dl><div><dt>المصادر</dt><dd>{selectedSources.map(s=>s.name).join("، ")}</dd></div><div><dt>المؤشرات</dt><dd>{selectedMetrics.map(m=>m.label).join("، ")}</dd></div></dl></section>
      <section><h4><CalendarDays size={17}/> الفترة والمخرجات</h4><dl><div><dt>المدة</dt><dd><span dir="ltr">{form.startDate} – {form.endDate}</span></dd></div><div><dt>التجميع</dt><dd>{groupLabels[form.groupBy]}</dd></div><div><dt>قائمة المصادر</dt><dd>{form.includeSources?"نعم":"لا"}</dd></div><div><dt>ملخص النتائج</dt><dd>{form.includeHighlights?"نعم":"لا"}</dd></div></dl></section>
      <div className="brb-review-disclaimer"><Info size={18}/> تأكيد الإعداد لا ينشئ تقريرًا ولا يُرسل أي بيانات للخادم. يمكنك تنزيل الإعدادات بصيغة JSON التجريبية.</div>
      <Button variant="outline" leadingIcon={<Download size={16}/>} onClick={downloadDraft}>تنزيل ملف إعدادات JSON</Button>
    </div>}
    <footer className="brb-controls"><div className="brb-control-previous"><Button variant="outline" leadingIcon={<ArrowRight size={17}/>} onClick={back} disabled={step===1}>السابق</Button>{step===1&&<button className="brb-template-button" onClick={startSample} type="button"><Sparkles size={16}/> تعبئة مثال تجريبي</button>}</div>{step<4?<Button trailingIcon={<ArrowLeft size={17}/>} onClick={next}>التالي</Button>:<Button leadingIcon={<CheckCircle2 size={17}/>} onClick={askConfirm}>تأكيد الإنشاء التجريبي</Button>}</footer>
   </main>
   <aside className="brb-aside" aria-label="ملخص التقرير المباشر"><div className="brb-summary-head"><span><FileBarChart size={21}/></span><div><h2>ملخص التقرير</h2><p>تحديث فوري لخياراتك</p></div></div><div className="brb-preview-page"><div className="brb-preview-brand"><span>بيان</span><small>معاينة إعدادات التقرير</small></div><div className="brb-preview-title">{form.title.trim()||"عنوان التقرير"}</div><div className="brb-preview-subtitle">{reportKindLabels[form.kind]} · نموذج تدريبي</div><div className="brb-preview-line"/><div className="brb-preview-pill-row"><span>{numberAr(form.metricIds.length)} مؤشرات</span><span>{numberAr(form.sourceIds.length)} مصادر</span></div><div className="brb-preview-bars" aria-hidden="true"><i/><i/><i/><i/><i/></div><p>تظهر البيانات والمخططات بعد إنشاء التقرير الفعلي وربطه بالخادم.</p></div>
    <dl className="brb-summary-list"><div><dt>نوع التقرير</dt><dd>{reportKindLabels[form.kind]}</dd></div><div><dt>المصادر المختارة</dt><dd>{numberAr(selectedSources.length)}</dd></div><div><dt>المؤشرات</dt><dd>{numberAr(selectedMetrics.length)}</dd></div><div><dt>التجميع</dt><dd>{groupLabels[form.groupBy]}</dd></div><div><dt>النطاق</dt><dd dir="ltr">{form.startDate} — {form.endDate}</dd></div></dl><div className="brb-aside-info"><BookOpenCheck size={17}/> المصادر التجريبية لا تسمح بالوصول إلى بيانات مؤسسة فعلية.</div>
    <button type="button" className="brb-reset" onClick={()=>setResetConfirm(true)}><RefreshCcw size={16}/> مسح الإعدادات والبدء من جديد</button>
   </aside></div>
  </>}
  <Dialog open={confirm} onClose={()=>setConfirm(false)} title="تأكيد الإنشاء التجريبي" description="محاكاة عملية الإنشاء دون خدمات فعلية" footer={<><Button variant="outline" onClick={()=>setConfirm(false)}>مراجعة الإعدادات</Button><Button onClick={confirmDemo}>تأكيد المحاكاة</Button></>}><div className="brb-dialog-text"><TriangleAlert size={20}/> لن يتم إنشاء مهمة في FastAPI أو تقرير في مركز التقارير. سيظهر إشعار بإتمام محاكاة إعداد التقرير فقط.</div></Dialog>
  <Dialog open={resetConfirm} onClose={()=>setResetConfirm(false)} title="مسح خيارات التقرير؟" description="سيتم حذف التغييرات غير المحفوظة من هذه الواجهة" footer={<><Button variant="outline" onClick={()=>setResetConfirm(false)}>إلغاء</Button><Button variant="danger" onClick={()=>{newReport();setResetConfirm(false);}}>مسح الإعدادات</Button></>}><p className="brb-dialog-text">هذه العملية تؤثر فقط على القيم الموجودة داخل الصفحة. لن تُحذف أي تقارير من النظام.</p></Dialog>
  {toast&&<div className="brb-toast"><Toast {...toast} onClose={()=>setToast(null)}/></div>}
 </div>;
}
export function ReportBuilderScreen(){return <DemoAccessProvider initialRole="manager"><ChatLayout variant="feature"><ReportBuilderBody/></ChatLayout></DemoAccessProvider>;}
