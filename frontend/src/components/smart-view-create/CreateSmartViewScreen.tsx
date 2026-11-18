'use client';

import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {ArrowLeft,ArrowRight,BookOpenCheck,CheckCircle2,ChevronLeft,ClipboardCheck,Code2,Database,Eye,
 FileCode2,Info,Layers3,LockKeyhole,Plus,ShieldAlert,ShieldCheck,Table2,TriangleAlert,X} from 'lucide-react';
import {AdminLayout} from '@/components/layout';
import {Button,Dialog} from '@/components/ui';
import {DemoAccessProvider,DemoRolePicker,useDemoAccess} from '@/components/access/DemoAccess';
import {StatePanel} from '@/components/states';
import {DEMO_SOURCES,SOURCE_STORAGE_KEY,restoreSourceFlags,sourceClassLabels,sourceTypeLabels,withLocalFlags} from '@/lib/data-sources/sources';
import {DEMO_VIEWS,type SmartView} from '@/lib/smart-views/views';
import {DRAFT_STORAGE_KEY,DEFAULT_FORM,MAX_DRAFTS,WIZARD_STEPS,SCOPES,AUDIENCES,FILTER_SAMPLES,
 availableTables,addLocalDraft,buildDraftDescriptor,clampClassification,classes,eligibleSources,findContext,
 getRequiredClass,illustrativeSql,makeLocalDraft,restoreLocalDrafts,validateAll,validateWizardStep,
 type DraftClassification,type FilterOperator,type LocalSmartView,type SmartViewForm,type WizardStep} from '@/lib/smart-view-create/wizard';

const hints=[
 'تعريف العرض واختيار مصدر توضيحي غير محظور',
 'اختيار جدول وحقول مسموح بها فقط',
 'فرض تصنيف لا يقل عن حساسية البيانات',
 'عرض تعريف وصفي وSQL توضيحي غير منفذ',
 'مراجعة المسودة وحفظها في المتصفح فقط'
];
const operatorNames:Record<FilterOperator,string>={none:'دون شرط',eq:'يساوي (رمزي)',ne:'لا يساوي (رمزي)',not_null:'قيمة موجودة'};
function FieldError({message}:{message?:string}){return message?<small className="bsv26-error" role="alert">{message}</small>:null;}
function ScreenContent(){
 const router=useRouter();
 const {can}=useDemoAccess();
 const authorized=can('smartviews.manage');
 const [form,setForm]=useState<SmartViewForm>({...DEFAULT_FORM});
 const [step,setStep]=useState<WizardStep>(1);
 const [errors,setErrors]=useState<Record<string,string>>({});
 const [flags,setFlags]=useState<Record<string,boolean>>({});
 const [drafts,setDrafts]=useState<LocalSmartView[]>([]);
 const [loaded,setLoaded]=useState(false);
 const [confirmSave,setConfirmSave]=useState(false);
 const [confirmExit,setConfirmExit]=useState(false);
 const [notice,setNotice]=useState<string|null>(null);
 const [saved,setSaved]=useState<LocalSmartView|null>(null);
 useEffect(()=>{
  try{const raw=localStorage.getItem(SOURCE_STORAGE_KEY);if(raw)setFlags(restoreSourceFlags(JSON.parse(raw)));}catch{}
  try{const raw=localStorage.getItem(DRAFT_STORAGE_KEY);if(raw)setDrafts(restoreLocalDrafts(JSON.parse(raw)));}
  catch{setNotice('تعذر قراءة مسودات المتصفح. لن يتم إنشاء أي عرض على قاعدة البيانات.');}
  setLoaded(true);
 },[]);
 const sources=useMemo(()=>withLocalFlags(flags),[flags]);
 const validSources=useMemo(()=>eligibleSources(sources),[sources]);
 const existing=useMemo<SmartView[]>(()=>[...DEMO_VIEWS,...drafts],[drafts]);
 const context=useMemo(()=>findContext(form,sources),[form,sources]);
 const tables=useMemo(()=>availableTables(context.source),[context.source]);
 const classificationMinimum=useMemo(()=>context.source?getRequiredClass(context.source,context.picked):'public' as DraftClassification,[context.source,context.picked]);
 const complete=useMemo(()=>validateAll(form,sources,existing),[form,sources,existing]);
 const atLimit=drafts.length>=MAX_DRAFTS;
 const previewReady=complete.valid;
 function patch(patch:Partial<SmartViewForm>){setForm(previous=>({...previous,...patch}));setErrors({});setNotice(null);}
 function chooseSource(id:string){
  const source=validSources.find(s=>s.id===id);
  patch({sourceId:id,tableName:'',fields:[],filterField:'',filterOperator:'none',classification:source?.classification==='blocked'?'restricted':source?.classification||'restricted'});
 }
 function chooseTable(name:string){patch({tableName:name,fields:[],filterField:'',filterOperator:'none',classification:(context.source?.classification==='blocked'||!context.source?.classification)?'restricted':context.source.classification});}
 function toggleField(name:string){
  const fields=form.fields.includes(name)?form.fields.filter(f=>f!==name):[...form.fields,name];
  const allowed=context.available.filter(f=>fields.includes(f.name));
  const min=context.source?getRequiredClass(context.source,allowed):'restricted';
  patch({fields,filterField:fields.includes(form.filterField)?form.filterField:'',filterOperator:fields.includes(form.filterField)?form.filterOperator:'none',classification:clampClassification(form.classification,min)});
 }
 function next(){
  const result=validateWizardStep(step,form,sources,existing);setErrors(result.errors);
  if(!result.valid){setNotice('تحقق من الحقول الموضحة قبل الانتقال إلى الخطوة التالية.');return;}
  setStep(previous=>Math.min(5,previous+1) as WizardStep);setNotice(null);
 }
 function previous(){setErrors({});setNotice(null);setStep(p=>Math.max(1,p-1) as WizardStep);}
 function sample(){
  const exampleSource=validSources.find(s=>s.id==='SRC-001')||validSources[0];
  if(!exampleSource)return;
  const exampleTable=availableTables(exampleSource).find(t=>t.name==='colleges')||availableTables(exampleSource)[0];
  if(!exampleTable)return;
  const fields=exampleTable.fields.filter(f=>f.classification==='public'||f.classification==='masked').map(f=>f.name).slice(0,2);
  patch({name:'ملخص الكليات التجريبي',description:'تعريف توضيحي لعرض بيانات الكليات المسموح بها دون بيانات الطلاب الفردية.',sourceId:exampleSource.id,
   tableName:exampleTable.name,fields,classification:'restricted',audience:'الإدارة المصرح لها',scope:'مؤشرات مجمعة تدريبية',filterOperator:'none',filterField:'',filterValue:'active',acknowledged:false});
 }
 function persist(){
  if(!authorized)return;
  const validation=validateAll(form,sources,existing);
  if(!validation.valid){setConfirmSave(false);setErrors(validation.errors);setStep(1);setNotice('لم يكتمل التحقق من نموذج المسودة؛ راجع الحقول.');return;}
  if(atLimit){setConfirmSave(false);setNotice('بلغت الحد الأقصى للمسودات المحلية.');return;}
  try{
   const token=Math.random().toString(36).slice(2,10).padEnd(8,'0');
   const item=makeLocalDraft(form,`SV-DRAFT-${token}`,sources,existing);
   const next=addLocalDraft(drafts,item);
   localStorage.setItem(DRAFT_STORAGE_KEY,JSON.stringify(next));
   setDrafts(next);setSaved(item);setConfirmSave(false);setNotice(null);
  }catch(error){setConfirmSave(false);setNotice(error instanceof Error?error.message:'تعذر الحفظ المحلي؛ لم يُنشر أي عرض.');}
 }
 const selectedFields=context.picked;
 const preview=previewReady?buildDraftDescriptor(form):null;
 const pseudoSql=previewReady?illustrativeSql(form):null;
 const dataWarning='المصدر والجداول والحقول بيانات تعليمية مفترضة، وليست مخطط قاعدة بيانات تم اكتشافه. لن يُنشأ SQL View أو يُنفَّذ استعلام أو تُنقل بيانات.';
 return <div className="ban bsv26" dir="rtl" data-testid="create-smart-view-screen">
  <nav className="ban-breadcrumb" aria-label="مسار التنقل"><Link href="/admin">لوحة الإدارة</Link><ChevronLeft size={15}/><Link href="/admin/smart-views">العروض الذكية</Link><ChevronLeft size={15}/><span aria-current="page">إنشاء عرض ذكي</span></nav>
  <header className="ban-hero bsv26-hero"><div><span className="ban-eyebrow"><Layers3 size={16}/> الإدارة · UC-05</span><h1>إنشاء عرض ذكي جديد</h1><p>معالج توضيحي لتحديد الحقول المصرح بها والتصنيف الأمني، مع حفظ مسودة محلية غير منشورة.</p><div className="ban-hero-tags"><span><ShieldCheck size={14}/> أقل امتياز</span><span><Eye size={14}/> قراءة فقط</span><span><LockKeyhole size={14}/> لا نشر أو تنفيذ</span></div></div><div className="ban-hero-art" aria-hidden="true"><Layers3 size={72}/><i/></div></header>
  <div className="ban-disclaimer" role="note"><Info size={18}/><span><strong>وضع تجريبي آمن:</strong> {dataWarning}</span></div>
  <div className="ban-role"><span><ShieldCheck size={17}/> إنشاء المسودات محصور بمسؤول تقنية المعلومات في محاكاة الصلاحيات.</span><DemoRolePicker id="bsv26-role"/></div>
  {!authorized?<section className="ban-locked"><StatePanel state="forbidden" title="لا تملك صلاحية إنشاء عرض ذكي" description="الأدوار الأخرى لا ترث امتيازات مسؤول تقنية المعلومات، والتحقق الحقيقي سيكون عبر FastAPI."/><Link href="/admin/smart-views">العودة إلى العروض <ArrowLeft size={15}/></Link></section>:
  !loaded?<section className="ban-panel"><p role="status">جارٍ استعادة المسودات المحلية...</p></section>:
  saved?<section className="ban-panel bsv26-success" role="status"><CheckCircle2 size={50}/><h2>تم حفظ مسودة تجريبية محليًا</h2><p>أُضيف «{saved.name}» إلى قائمة العروض في هذا المتصفح فقط. لم يحدث نشر أو تعديل لقاعدة البيانات أو استدعاء لأي وكيل.</p><code dir="ltr">{saved.id}</code><div><Link className="bsv26-primary-link" href={`/admin/smart-views/details?id=${encodeURIComponent(saved.id)}`}><FileCode2 size={16}/> عرض تفاصيل المسودة</Link><Link className="bsv26-primary-link" href="/admin/smart-views"><Layers3 size={16}/> عرض المسودات في القائمة</Link><Button variant="outline" onClick={()=>{setForm({...DEFAULT_FORM});setStep(1);setSaved(null);setErrors({});}}>إنشاء مسودة أخرى</Button></div></section>:
  <>
   <section className="bsv26-steps" aria-label="مراحل إنشاء العرض">
    {WIZARD_STEPS.map((name,index)=>{const n=index+1;return <div className={`bsv26-step ${step===n?'active':step>n?'passed':''}`} key={name} aria-current={step===n?'step':undefined}><span>{step>n?<CheckCircle2 size={18}/>:n}</span><strong>{name}</strong><small>{hints[index]}</small></div>;})}
   </section>
   <div className="bsv26-grid"><section className="ban-panel bsv26-form" aria-labelledby="bsv26-title">
    <div className="ban-section-header"><div><h2 id="bsv26-title"><ClipboardCheck size={20}/> {WIZARD_STEPS[step-1]}</h2><p>{hints[step-1]}</p></div><span className="bsv26-counter">{step} / 5</span></div>
    {notice&&<div className="bsv26-notice" role="alert"><TriangleAlert size={17}/><span>{notice}</span><button aria-label="إغلاق التنبيه" onClick={()=>setNotice(null)}><X size={15}/></button></div>}
    <div className="bsv26-body">
    {step===1&&<>
      <label className="bsv26-field"><span>اسم العرض <b>*</b></span><input value={form.name} maxLength={70} onChange={e=>patch({name:e.target.value})} aria-invalid={!!errors.name} placeholder="مثال: ملخص الكليات التجريبي"/><FieldError message={errors.name}/></label>
      <label className="bsv26-field"><span>وصف العرض <b>*</b></span><textarea value={form.description} maxLength={220} rows={3} onChange={e=>patch({description:e.target.value})} aria-invalid={!!errors.description} placeholder="اكتب غرض العرض دون معلومات حقيقية أو بيانات شخصية"/><FieldError message={errors.description}/></label>
      <label className="bsv26-field"><span>مصدر البيانات التدريبي <b>*</b></span><select value={form.sourceId} onChange={e=>chooseSource(e.target.value)}><option value="">اختر مصدرًا غير محظور</option>{validSources.map(source=><option value={source.id} key={source.id}>{source.name} — {sourceTypeLabels[source.type]}</option>)}</select><FieldError message={errors.sourceId}/></label>
      <div className="bsv26-help"><Database size={18}/> لا تظهر المصادر المحظورة أو المعطّلة، ولا المصادر المضافة محليًا دون مخطط تدريبي موثق.</div>
    </>}
    {step===2&&<>
      <label className="bsv26-field"><span>جدول / مجموعة بيانات تدريبية <b>*</b></span><select value={form.tableName} onChange={e=>chooseTable(e.target.value)}><option value="">اختر مجموعة البيانات</option>{tables.map(t=><option key={t.name} value={t.name}>{t.label} ({t.name})</option>)}</select><FieldError message={errors.tableName}/></label>
      {context.table?<fieldset className="bsv26-fieldset"><legend>الحقول المسموحة — اختر حتى 8</legend><div className="bsv26-field-list">{context.available.map(field=><label key={field.name} className={form.fields.includes(field.name)?'selected':''}><input type="checkbox" checked={form.fields.includes(field.name)} disabled={!form.fields.includes(field.name)&&form.fields.length>=8} onChange={()=>toggleField(field.name)}/><span><strong dir="ltr">{field.name}</strong><small>{field.description} · {field.kind}</small></span><em>{sourceClassLabels[field.classification]}</em></label>)}</div><FieldError message={errors.fields}/><p>لا نعرض الحقول «المقيّدة» أو «المحظورة» ضمن خيارات الإنشاء. المقتطفات هنا وصفية فقط.</p></fieldset>:<div className="bsv26-help"><Table2 size={18}/> اختر أولًا مصدرًا وجدولًا من الخطوة السابقة.</div>}
    </>}
    {step===3&&<>
      <div className="bsv26-min-class"><ShieldCheck size={19}/><span>أدنى تصنيف مسموح به تلقائيًا: <strong>{sourceClassLabels[classificationMinimum]}</strong></span></div>
      <fieldset className="bsv26-fieldset"><legend>تصنيف العرض <b>*</b></legend><div className="bsv26-classes">{classes.map(c=><label className={form.classification===c?'selected':''} key={c}><input type="radio" name="view-class" checked={form.classification===c} disabled={classes.indexOf(c)<classes.indexOf(classificationMinimum)} onChange={()=>patch({classification:c})}/><strong>{sourceClassLabels[c]}</strong></label>)}</div><FieldError message={errors.classification}/></fieldset>
      <div className="bsv26-two"><label className="bsv26-field"><span>الجمهور المقترح</span><select value={form.audience} onChange={e=>patch({audience:e.target.value as SmartViewForm['audience']})}>{AUDIENCES.map(a=><option key={a}>{a}</option>)}</select><FieldError message={errors.audience}/></label><label className="bsv26-field"><span>نطاق النتائج</span><select value={form.scope} onChange={e=>patch({scope:e.target.value})}>{SCOPES.map(s=><option key={s}>{s}</option>)}</select><FieldError message={errors.scope}/></label></div>
      <label className="bsv26-field"><span>نوع شرط التصفية الرمزي</span><select value={form.filterOperator} onChange={e=>patch({filterOperator:e.target.value as FilterOperator,filterField:e.target.value==='none'?'':form.filterField})}>{(Object.keys(operatorNames) as FilterOperator[]).map(op=><option value={op} key={op}>{operatorNames[op]}</option>)}</select></label>
      {form.filterOperator!=='none'&&<div className="bsv26-two"><label className="bsv26-field"><span>حقل التصفية</span><select value={form.filterField} onChange={e=>patch({filterField:e.target.value})}><option value="">اختر الحقل</option>{selectedFields.map(f=><option value={f.name} key={f.name}>{f.name}</option>)}</select><FieldError message={errors.filterField}/></label>{form.filterOperator!=='not_null'&&<label className="bsv26-field"><span>قيمة تدريبية رمزية</span><select value={form.filterValue} onChange={e=>patch({filterValue:e.target.value as SmartViewForm['filterValue']})}>{FILTER_SAMPLES.map(value=><option value={value} key={value}>{value}</option>)}</select></label>}</div>}
      <div className="bsv26-help"><LockKeyhole size={18}/> لن نسمح بإدخال شرط SQL حر أو قيم شخصية. لن تُحوِّل خيارات العرض إلى امتيازات حقيقية.</div>
    </>}
    {step===4&&<>
      <div className="bsv26-preview-intro"><FileCode2 size={29}/><h3>معاينة تعريف العرض</h3><p>هذه المعاينة نص توضيحي مُشتق من الحقول التدريبية، وليست SQL صالحًا للتنفيذ أو عرضًا منشورًا.</p></div>
      <div className="bsv26-definition"><div><strong><Code2 size={17}/> تمثيل وصفي للقراءة فقط</strong><span>JSON · لا بيانات أفراد</span></div><pre dir="ltr">{JSON.stringify({name:form.name,sourceId:form.sourceId,table:form.tableName,fields:form.fields,classification:form.classification,audience:form.audience,scope:form.scope,filter:form.filterOperator==='none'?null:{field:form.filterField,operator:form.filterOperator,value:'parameter-only'},illustrative:true,published:false},null,2)}</pre></div>
      <div className="bsv26-definition"><div><strong><Code2 size={17}/> {context.source?.type==='postgres'||context.source?.type==='mysql'?'SQL تصوري — غير منفذ':'معاينة وصفية للموصل'}</strong></div><pre dir="ltr">{context.source&&(context.source.type==='postgres'||context.source.type==='mysql')?`-- Non-executable example; no server request\nSELECT ${form.fields.map(x=>`"${x}"`).join(', ')}\nFROM "${form.tableName}"${form.filterOperator==='none'?'':`\nWHERE "${form.filterField}" ${form.filterOperator==='not_null'?'IS NOT NULL':form.filterOperator==='ne'?'<> :filter_value':'= :filter_value'}`};`:'هذا النوع لا يستخدم معاينة SQL، ويُعرض تعريف JSON فقط.'}</pre></div>
      <label className="bsv26-ack"><input type="checkbox" checked={form.acknowledged} onChange={e=>patch({acknowledged:e.target.checked})}/><span>أؤكد أن هذا تعريف تدريبي للقراءة فقط، ولا ينشئ SQL View ولا ينفذ استعلامًا ولا يتجاوز صلاحيات المؤسسة.</span></label><FieldError message={errors.acknowledged}/>
    </>}
    {step===5&&<>
      <div className="bsv26-review-head"><CheckCircle2 size={27}/><div><h3>مراجعة المسودة قبل الحفظ</h3><p>ستُضاف إلى قائمة العروض بوصفها مسودة محلية غير منشورة فقط.</p></div></div>
      <dl className="bsv26-summary">{[
       ['اسم العرض',form.name],['المصدر',context.source?.name||'—'],['الجدول',form.tableName],['الحقول',form.fields.join('، ')],
       ['التصنيف',sourceClassLabels[form.classification]],['الجمهور',form.audience],['النطاق',form.scope],['التصفية',operatorNames[form.filterOperator]],['حالة الحفظ','مسودة محلية — غير منشورة']
      ].map(([key,value])=><div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl>
      <div className="bsv26-warning"><ShieldAlert size={19}/> لا يمكن استخدام هذه المسودة في وكيل SQL أو RAG؛ نشر العروض الحقيقي يتطلب مراجعة أمنية وتنفيذًا من Backend.</div>
      {atLimit&&<div className="bsv26-notice" role="alert">وصلت إلى الحد الأقصى: {MAX_DRAFTS} مسودة محفوظة في هذا المتصفح.</div>}
    </>}
    </div>
    <div className="bsv26-controls"><Button variant="outline" disabled={step===1} onClick={previous} leadingIcon={<ArrowRight size={16}/>}>السابق</Button><div><Button variant="ghost" onClick={()=>setConfirmExit(true)}>إلغاء</Button>{step===1&&<Button variant="outline" onClick={sample}>تعبئة مثال تدريبي</Button>}{step<5?<Button onClick={next} trailingIcon={<ArrowLeft size={16}/>}>التالي</Button>:<Button disabled={!complete.valid||atLimit} onClick={()=>setConfirmSave(true)} leadingIcon={<CheckCircle2 size={17}/>}>حفظ مسودة محلية</Button>}</div></div>
   </section>
   <aside className="bsv26-aside"><section className="ban-panel"><h2><Layers3 size={19}/> ملخص العرض</h2><span className="bsv26-logo"><Layers3 size={29}/></span><strong>{form.name||'عرض ذكي جديد'}</strong><small>{context.source?.name||'لم تحدد المصدر بعد'}</small><dl><div><dt>الجدول</dt><dd dir="ltr">{form.tableName||'—'}</dd></div><div><dt>الحقول</dt><dd>{form.fields.length} من 8</dd></div><div><dt>التصنيف</dt><dd>{sourceClassLabels[form.classification]}</dd></div><div><dt>الحالة</dt><dd>مسودة فقط</dd></div></dl></section><section className="ban-panel"><h2><BookOpenCheck size={19}/> ضوابط العرض الآمن</h2><ol><li>التحقق من المصدر على الخادم.</li><li>تطبيق عزل المؤسسة.</li><li>حجب الحقول الحساسة.</li><li>منع SQL غير المصرح به.</li><li>اعتماد تعريف العرض وتسجيل العملية.</li></ol><small>خطوات مقترحة للمستقبل؛ لا تنفذها واجهة المعاينة.</small></section></aside></div>
   <footer className="bsv26-footer"><Info size={18}/><span>جميع المدخلات والخانات والمخططات في هذه الشاشة تدريبية. يُحفظ التعريف في localStorage فقط، دون بيانات اعتماد أو سجلات مستخدمين.</span></footer>
  </>}
  <Dialog open={confirmSave&&authorized} onClose={()=>setConfirmSave(false)} title="تأكيد حفظ المسودة" description="لن يُنشأ عرض PostgreSQL فعلي" footer={<><Button variant="outline" onClick={()=>setConfirmSave(false)}>إعادة المراجعة</Button><Button onClick={persist}>حفظ المسودة محليًا</Button></>}><p>سيتم حفظ «{form.name}» في المتصفح وإظهاره ضمن قائمة العروض الذكية كمسودة غير منشورة. لن يُنفَّذ أي استعلام.</p></Dialog>
  <Dialog open={confirmExit&&authorized} onClose={()=>setConfirmExit(false)} title="إلغاء إعداد العرض" description="ستفقد التغييرات غير المحفوظة" footer={<><Button variant="outline" onClick={()=>setConfirmExit(false)}>متابعة التعديل</Button><Button variant="danger" onClick={()=>{setConfirmExit(false);router.push('/admin/smart-views');}}>تجاهل التغييرات</Button></>}><p>هل تريد العودة إلى قائمة العروض دون حفظ المسودة الحالية؟</p></Dialog>
 </div>;
}
export function CreateSmartViewScreen(){return <DemoAccessProvider initialRole="it_admin"><AdminLayout variant="feature"><ScreenContent/></AdminLayout></DemoAccessProvider>;}
