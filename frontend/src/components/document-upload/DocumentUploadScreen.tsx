"use client";

import {useEffect,useMemo,useRef,useState,type ChangeEvent,type DragEvent} from "react";
import Link from "next/link";
import {
  AlertCircle,ArrowLeft,BookOpen,CheckCircle2,ChevronLeft,Clock3,CloudUpload,
  FileCheck2,FileText,FileWarning,FolderOpen,Info,Layers3,
  ListChecks,LockKeyhole,Paperclip,RotateCcw,ShieldCheck,Sparkles,
  Trash2,UploadCloud,X
} from "lucide-react";
import {ChatLayout} from "@/components/layout";
import {Badge,Button,Dialog,Drawer,Toast} from "@/components/ui";
import {StatePanel} from "@/components/states";
import {DemoAccessProvider,DemoRolePicker,useDemoAccess} from "@/components/access/DemoAccess";
import {
  ACCEPT_ATTRIBUTE,accessLabels,categoryLabels,exampleFiles,initialUploadMetadata,
  isSimulating,makeDemoUploadItems,MAX_BATCH_FILES,MAX_FILE_BYTES,nextSimulationStage,
  queueStats,readableSize,stageLabels,stagePercent,validateMetadata,
  type AccessLevel,type FileDescriptor,type UploadCategory,type UploadItem,
  type UploadMetadata,type UploadStage
} from "@/lib/document-upload/upload";

type Notice={title:string;message:string;tone:"success"|"warning"|"info"|"danger"};
const stageTone=(stage:UploadStage):"success"|"warning"|"danger"|"info"|"neutral"=>
  stage==="indexed"?"success":stage==="invalid"?"danger":stage==="canceled"?"warning":isSimulating(stage)?"info":"neutral";
const progressText=(item:UploadItem)=>item.stage==="indexed"?"100% — محاكاة فقط":`${item.progress}% — محاكاة فقط`;
const DEMO_NOTICE="هذه شاشة عرض تجريبية؛ لا تُرسل أي ملفات إلى الخادم، ولا يُقرأ محتواها أو يُخزّن، ولا تُنشأ مقاطع أو متجهات في Qdrant. المعالجة والمؤشرات هنا محاكاة واجهة فقط.";

function UploadBody(){
  const {can}=useDemoAccess();
  const canManage=can("sources.manage");
  const [items,setItems]=useState<UploadItem[]>([]);
  const [meta,setMeta]=useState<UploadMetadata>({...initialUploadMetadata});
  const [dragging,setDragging]=useState(false);
  const [selectedId,setSelectedId]=useState<string|null>(null);
  const [clearConfirm,setClearConfirm]=useState(false);
  const [notice,setNotice]=useState<Notice|null>(null);
  const [metadataError,setMetadataError]=useState("");
  const inputRef=useRef<HTMLInputElement|null>(null);
  const timers=useRef<Map<string,ReturnType<typeof setInterval>>>(new Map());
  const serial=useRef(1);
  const stats=useMemo(()=>queueStats(items),[items]);
  const selected=items.find(item=>item.id===selectedId)??null;
  const anyRunning=stats.running>0;

  // Timers belong to this page; never let a simulated operation outlive the page.
  useEffect(()=>{const current=timers.current;return()=>{for(const interval of current.values())clearInterval(interval);current.clear();};},[]);
  useEffect(()=>{
    if(canManage)return;
    for(const interval of timers.current.values())clearInterval(interval);
    timers.current.clear();
    setSelectedId(null);
    setItems(previous=>previous.map(item=>isSimulating(item.stage)?{...item,stage:"canceled",error:"أُوقفت المحاكاة بعد تغيير الدور."}:item));
  },[canManage]);

  function addFiles(input:readonly FileDescriptor[]){
    if(!canManage)return;
    const added=makeDemoUploadItems(input,items,meta,serial.current++);
    if(added.accepted.length)setItems(previous=>[...previous,...added.accepted]);
    if(added.skipped)setNotice({title:"بعض الملفات لم تُضف",message:`تم تجاهل ${added.skipped} ملفًا بسبب التكرار أو الحد الأقصى (${MAX_BATCH_FILES} ملفات).`,tone:"warning"});
    else if(added.accepted.length)setNotice({title:"أُضيفت الملفات إلى قائمة المعاينة",message:"الملفات لم تُرفع. فحص النوع والحجم تم من بيانات الملفات التي قدمها المتصفح فقط.",tone:"info"});
  }
  function onFileChange(event:ChangeEvent<HTMLInputElement>){
    const chosen=[...(event.currentTarget.files??[])];
    if(chosen.length)addFiles(chosen.map(file=>({name:file.name,size:file.size,type:file.type,lastModified:file.lastModified})));
    event.currentTarget.value="";
  }
  function onDrop(event:DragEvent<HTMLDivElement>){
    event.preventDefault();setDragging(false);
    if(!canManage)return;
    addFiles([...event.dataTransfer.files].map(file=>({name:file.name,size:file.size,type:file.type,lastModified:file.lastModified})));
  }
  function cancelOne(id:string){
    const timer=timers.current.get(id);
    if(timer){clearInterval(timer);timers.current.delete(id);}
    setItems(previous=>previous.map(item=>item.id===id?{...item,stage:"canceled",error:"أُلغيت المحاكاة من الواجهة."}:item));
  }
  function removeOne(id:string){
    if(!canManage)return;
    const timer=timers.current.get(id);
    if(timer){clearInterval(timer);timers.current.delete(id);}
    setItems(previous=>previous.filter(item=>item.id!==id));
    if(selectedId===id)setSelectedId(null);
  }
  function clearQueue(){
    for(const timer of timers.current.values())clearInterval(timer);
    timers.current.clear();setItems([]);setSelectedId(null);setClearConfirm(false);setMetadataError("");
    setNotice({title:"أُفرغت القائمة",message:"أُزيلت بيانات العرض المؤقتة من الصفحة؛ لم تُحذف أي ملفات فعلية.",tone:"info"});
  }
  function simulateOne(item:UploadItem){
    if(timers.current.has(item.id))return;
    let stage:UploadStage="validating";
    setItems(previous=>previous.map(row=>row.id===item.id?{...row,stage,progress:stagePercent.validating,error:null,meta:{...meta}}:row));
    const timer=setInterval(()=>{
      stage=nextSimulationStage(stage);
      const pct=stagePercent[stage as keyof typeof stagePercent]??100;
      setItems(previous=>previous.map(row=>row.id===item.id&&isSimulating(row.stage)?{...row,stage,progress:pct}:row));
      if(stage==="indexed"){
        clearInterval(timer);timers.current.delete(item.id);
      }
    },720);
    timers.current.set(item.id,timer);
  }
  function startBatch(){
    if(!canManage)return;
    const error=validateMetadata(meta);
    if(error){setMetadataError(error);setNotice({title:"تحقق من بيانات المستند",message:error,tone:"warning"});return;}
    const queued=items.filter(item=>item.stage==="queued");
    if(!queued.length){setNotice({title:"لا توجد ملفات جاهزة",message:"أضف ملفًا صالحًا أو أعد محاولة ملف ملغى قبل بدء المحاكاة.",tone:"warning"});return;}
    setMetadataError("");
    for(const item of queued)simulateOne(item);
    setNotice({title:"بدأت محاكاة المعالجة",message:"لن تنتقل أي بيانات إلى Backend أو Qdrant. مؤشرات التقدم توضيحية بالكامل.",tone:"info"});
  }
  function retry(id:string){
    if(!canManage)return;
    setItems(previous=>previous.map(item=>item.id===id&&item.stage==="canceled"?{...item,stage:"queued",progress:0,error:null}:item));
  }
  function changeMeta<K extends keyof UploadMetadata>(key:K,value:UploadMetadata[K]){
    setMeta(previous=>({...previous,[key]:value}));
    setItems(previous=>previous.map(item=>item.stage==="queued"?{...item,meta:{...item.meta,[key]:value}}:item));
    setMetadataError("");
  }
  const formDisabled=!canManage||anyRunning;
  return <div className="bdu" data-testid="document-upload-screen">
    <nav className="bdu-breadcrumb" aria-label="مسار التنقل"><Link href="/">الرئيسية</Link><ChevronLeft size={15}/><Link href="/sources">مكتبة المستندات</Link><ChevronLeft size={15}/><span aria-current="page">رفع وفهرسة مستند</span></nav>
    <header className="bdu-hero"><div><div className="bdu-eyebrow"><Sparkles size={15}/> إدارة مصادر المعرفة</div><h1>رفع المستندات وفهرستها</h1><p>جهّز ملفات المؤسسة، وصنّفها وحدّد صلاحياتها، ثم عاين مراحل المعالجة قبل ربط خدمات الرفع والفهرسة الفعلية.</p><div className="bdu-hero-tags"><span><ShieldCheck size={16}/> تحكم بالوصول</span><span><Layers3 size={16}/> فهرسة دلالية</span><span><FileCheck2 size={16}/> فحص قبل الإرسال</span></div></div><span className="bdu-hero-art" aria-hidden="true"><UploadCloud size={75}/></span></header>
    <div className="bdu-demo-banner" role="note"><Info size={20}/><div><strong>واجهة تفاعلية تجريبية — دون رفع فعلي</strong><p>{DEMO_NOTICE}</p></div></div>
    <section className="bdu-role" aria-label="اختيار الصلاحيات التجريبية"><div><LockKeyhole size={19}/><span>رفع المستندات مخصص لمسؤول تقنية المعلومات في المؤسسة؛ تغيير الدور هنا لا يمثّل تسجيل دخول حقيقيًا.</span></div><DemoRolePicker id="bdu-role-picker"/></section>
    {!canManage?<div className="bdu-denied" data-testid="upload-access-denied"><StatePanel state="forbidden" title="رفع المستندات غير متاح لهذا الدور" description="جرّب اختيار «مسؤول تقنية المعلومات» من القائمة أعلاه. هذا منع تجريبي داخل الواجهة؛ الحماية الفعلية تُنفذ في FastAPI."/></div>:<>
      <section className="bdu-steps" aria-label="مراحل إعداد المستند">
        {[{n:"01",label:"اختيار الملفات",icon:Paperclip},{n:"02",label:"التصنيف والصلاحيات",icon:ShieldCheck},{n:"03",label:"محاكاة الفهرسة",icon:ListChecks}].map((s,i)=><div key={s.n} className="bdu-step"><span className="bdu-step-icon"><s.icon size={19}/></span><div><small>الخطوة {s.n}</small><strong>{s.label}</strong></div>{i<2&&<ChevronLeft size={18} className="bdu-step-chevron"/>}</div>)}
      </section>
      <div className="bdu-stats" aria-label="ملخص قائمة الرفع">{[
        {label:"ملفات في القائمة",value:stats.total,icon:FolderOpen,tone:"blue"},
        {label:"جاهزة للمعاينة",value:stats.ready,icon:FileCheck2,tone:"teal"},
        {label:"قيد المحاكاة",value:stats.running,icon:Clock3,tone:"blue"},
        {label:"انتهت المحاكاة",value:stats.complete,icon:CheckCircle2,tone:"green"}
      ].map(s=><div className="bdu-stat" key={s.label}><span className={`bdu-stat-icon bdu-stat-icon--${s.tone}`}><s.icon size={23}/></span><div><small>{s.label}</small><strong>{s.value}</strong></div></div>)}</div>
      <div className="bdu-main-grid">
        <div className="bdu-col">
          <section className="bdu-panel" aria-labelledby="bdu-choose-title"><div className="bdu-panel-head"><div><h2 id="bdu-choose-title"><CloudUpload size={21}/> اختيار الملفات</h2><p>يدعم نموذج العرض PDF وDOCX وTXT، بحد 20 ميجابايت لكل ملف و6 ملفات في الدفعة.</p></div><Badge tone="info">الخطوة 1</Badge></div>
            <div className={`bdu-dropzone ${dragging?"bdu-dropzone--active":""}`} data-testid="upload-dropzone"
              onDragEnter={event=>{event.preventDefault();setDragging(true);}} onDragOver={event=>{event.preventDefault();setDragging(true);}}
              onDragLeave={event=>{event.preventDefault();if(!event.currentTarget.contains(event.relatedTarget as Node))setDragging(false);}} onDrop={onDrop}>
              <span className="bdu-drop-icon"><CloudUpload size={35}/></span><strong>اسحب المستندات إلى هنا</strong><p>أو اختر الملفات من جهازك — لا يتم إرسال محتواها إلى أي خدمة</p>
              <input ref={inputRef} id="bdu-file-input" data-testid="upload-file-input" type="file" multiple accept={ACCEPT_ATTRIBUTE} className="bdu-visually-hidden" onChange={onFileChange} aria-label="اختيار ملفات المستندات"/>
              <Button variant="primary" leadingIcon={<Paperclip size={17}/>} onClick={()=>inputRef.current?.click()}>اختيار الملفات</Button>
              <div className="bdu-formats"><span>PDF</span><span>DOCX</span><span>TXT</span><span>حتى {Math.round(MAX_FILE_BYTES/1024/1024)} MB</span></div>
            </div>
            <div className="bdu-demo-add"><div><Sparkles size={17}/><span>ليس لديك ملفات للتجربة؟</span></div><button type="button" onClick={()=>addFiles(exampleFiles)}>إضافة ملفين تجريبيين</button></div>
          </section>
          <section className="bdu-panel" aria-labelledby="bdu-list-title"><div className="bdu-panel-head bdu-head-wrap"><div><h2 id="bdu-list-title"><ListChecks size={20}/> قائمة الملفات <span className="bdu-count">{stats.total}</span></h2><p>حالة كل ملف مستقلة ويمكن إلغاء المحاكاة أو إزالته.</p></div>{items.length>0&&<button type="button" className="bdu-clear" onClick={()=>setClearConfirm(true)}><Trash2 size={16}/> إفراغ القائمة</button>}</div>
            {items.length===0?<div className="bdu-empty" data-testid="upload-empty"><FolderOpen size={37}/><strong>لم تُضف أي ملفات بعد</strong><p>اختر ملفًا من الجهاز أو استخدم بيانات المثال لمعاينة جميع الحالات.</p></div>:<div className="bdu-file-list">{items.map(item=><article className="bdu-file" key={item.id} data-testid="upload-file-row"><span className={`bdu-file-icon ${item.stage==="invalid"?"bad":""}`}><FileText size={24}/></span><div className="bdu-file-main"><div className="bdu-file-title"><strong dir="auto" title={item.name}>{item.name}</strong><Badge tone={stageTone(item.stage)}>{stageLabels[item.stage]}</Badge></div><div className="bdu-file-meta"><span>{readableSize(item.size)}</span><span>·</span><span>{categoryLabels[item.meta.category]}</span><span>·</span><span>{accessLabels[item.meta.access].split(" — ")[0]}</span></div>{item.error&&<p className="bdu-file-error"><AlertCircle size={13}/>{item.error}</p>}{(item.stage==="indexed"||isSimulating(item.stage))&&<div className="bdu-progress-wrap"><div className="bdu-progress"><span style={{width:`${item.progress}%`}}/></div><small>{progressText(item)}</small></div>}</div><div className="bdu-file-actions"><button type="button" onClick={()=>setSelectedId(item.id)} title="تفاصيل الملف" aria-label={`تفاصيل ${item.name}`}><Info size={17}/></button>{isSimulating(item.stage)?<button type="button" onClick={()=>cancelOne(item.id)} title="إلغاء المحاكاة" aria-label={`إلغاء محاكاة ${item.name}`}><X size={17}/></button>:item.stage==="canceled"?<button type="button" onClick={()=>retry(item.id)} title="إعادة المحاولة" aria-label={`إعادة محاولة ${item.name}`}><RotateCcw size={17}/></button>:null}<button type="button" onClick={()=>removeOne(item.id)} title="إزالة من القائمة" aria-label={`إزالة ${item.name}`}><Trash2 size={17}/></button></div></article>)}</div>}
          </section>
        </div>
        <div className="bdu-col">
          <section className="bdu-panel" aria-labelledby="bdu-meta-title"><div className="bdu-panel-head"><div><h2 id="bdu-meta-title"><ShieldCheck size={21}/> بيانات المستندات وصلاحياتها</h2><p>تُطبق هذه القيم على الملفات التي تبدأ محاكاتها من الدفعة الحالية.</p></div><Badge tone="info">الخطوة 2</Badge></div>
            <div className="bdu-field"><label htmlFor="bdu-category">تصنيف المستند <span>*</span></label><select id="bdu-category" value={meta.category} disabled={formDisabled} onChange={event=>changeMeta("category",event.target.value as UploadCategory)}>{Object.entries(categoryLabels).map(([v,label])=><option key={v} value={v}>{label}</option>)}</select></div>
            <div className="bdu-field"><label htmlFor="bdu-access">مستوى الوصول <span>*</span></label><select id="bdu-access" value={meta.access} disabled={formDisabled} onChange={event=>changeMeta("access",event.target.value as AccessLevel)}>{Object.entries(accessLabels).map(([v,label])=><option key={v} value={v}>{label}</option>)}</select><small>هذا اختيار وصفي في النموذج؛ يحتاج الخادم إلى التحقق من صلاحيات المستند وسياق المؤسسة.</small></div>
            <div className="bdu-field"><label htmlFor="bdu-owner">الجهة المالكة <span>*</span></label><input id="bdu-owner" value={meta.owner} disabled={formDisabled} maxLength={90} onChange={event=>changeMeta("owner",event.target.value)} placeholder="مثال: عمادة شؤون الطلاب"/></div>
            <div className="bdu-field"><label htmlFor="bdu-description">وصف اختياري</label><textarea id="bdu-description" value={meta.description} disabled={formDisabled} maxLength={350} rows={3} onChange={event=>changeMeta("description",event.target.value)} placeholder="وصف مختصر يساعد في تنظيم المستندات..."/><small>{meta.description.length} / 350</small></div>
            {metadataError&&<div className="bdu-form-error" role="alert"><AlertCircle size={16}/>{metadataError}</div>}
            <div className="bdu-form-privacy"><ShieldCheck size={18}/><p>المحتوى وقرارات الوصول لا تُخزّن هنا. تحقق Backend مطلوب قبل قبول الملفات أو تصنيفها أو فهرستها.</p></div>
          </section>
          <section className="bdu-panel" aria-labelledby="bdu-index-title"><div className="bdu-panel-head"><div><h2 id="bdu-index-title"><Layers3 size={21}/> مراحل الفهرسة</h2><p>تسلسل توضيحي فقط، لا ينفذ استخراج نصوص أو فهرسة حقيقية.</p></div><Badge tone="info">الخطوة 3</Badge></div>
            <ol className="bdu-pipeline">{[
              {title:"فحص النوع والحجم",text:"فحص تمهيدي من بيانات المتصفح",icon:FileCheck2},
              {title:"استقبال المستند",text:"محاكاة رفع الملف إلى الخادم",icon:CloudUpload},
              {title:"استخراج النص",text:"مرحلة افتراضية لا تقرأ محتوى الملف",icon:FileText},
              {title:"تقسيم المقاطع",text:"إعداد المقاطع للفهرسة الدلالية",icon:ListChecks},
              {title:"إنشاء المتجهات",text:"محاكاة مرحلة الـ Embeddings وQdrant",icon:Layers3},
              {title:"تأكيد اكتمال المحاكاة",text:"لا ينتج مستند مفهرس أو ملف مخزن",icon:CheckCircle2}
            ].map((step,index)=><li key={step.title}><span className="bdu-pipeline-dot"><step.icon size={18}/></span><div><strong>{step.title}</strong><p>{step.text}</p></div><small>{String(index+1).padStart(2,"0")}</small></li>)}</ol>
            <Button variant="primary" fullWidth leadingIcon={<UploadCloud size={18}/>} onClick={startBatch} disabled={stats.ready===0||anyRunning}>بدء محاكاة الرفع والفهرسة</Button>
            <div className="bdu-run-note"><Info size={15}/> التنفيذ تجريبي ولا يرسل طلبات API.</div>
            {stats.complete>0&&<div className="bdu-complete-note" role="status"><CheckCircle2 size={19}/><span>اكتملت محاكاة {stats.complete} من الملفات. <strong>لم تُضف إلى المكتبة أو Qdrant.</strong></span></div>}
          </section>
          <Link href="/sources" className="bdu-back"><BookOpen size={17}/> العودة إلى مكتبة المستندات <ArrowLeft size={17}/></Link>
        </div>
      </div>
      <div className="bdu-footer-note"><FileWarning size={18}/><span>أنواع الملفات وامتداداتها يمكن تزويرها. يتعين على الخادم فحص المحتوى والأذونات والفيروسات والحجم وحدود المعدّل قبل التخزين والفهرسة.</span></div>
    </>}
    <Drawer open={Boolean(selected)&&canManage} onClose={()=>setSelectedId(null)} title="تفاصيل الملف في قائمة المعاينة" description="بيانات وصفية محلية — لا يوجد ملف مرفوع أو مفهرس">
      {selected&&<div className="bdu-drawer"><div className="bdu-drawer-file"><FileText size={29}/><strong dir="auto">{selected.name}</strong><Badge tone={stageTone(selected.stage)}>{stageLabels[selected.stage]}</Badge></div><dl><div><dt>الحجم</dt><dd>{readableSize(selected.size)}</dd></div><div><dt>التصنيف</dt><dd>{categoryLabels[selected.meta.category]}</dd></div><div><dt>مستوى الوصول</dt><dd>{accessLabels[selected.meta.access]}</dd></div><div><dt>الجهة المالكة</dt><dd>{selected.meta.owner}</dd></div><div><dt>حالة العرض</dt><dd>{stageLabels[selected.stage]}</dd></div></dl>{selected.error&&<p className="bdu-file-error">{selected.error}</p>}<div className="bdu-drawer-note"><Info size={18}/><p>بيانات اسم الملف وحجمه مستمدة من واجهة اختيار الملفات أو الأمثلة التدريبية. لم تُقرأ بايتات الملف أو ترسل للشبكة.</p></div></div>}
    </Drawer>
    <Dialog open={clearConfirm} onClose={()=>setClearConfirm(false)} title="إفراغ قائمة الملفات" description="هل تريد إزالة جميع الملفات من واجهة المعاينة؟" footer={<div className="bdu-dialog-actions"><Button variant="outline" onClick={()=>setClearConfirm(false)}>إلغاء</Button><Button variant="danger" onClick={clearQueue}>إفراغ القائمة</Button></div>}><p className="bdu-dialog-text">ستُلغى جميع المحاكاة الجارية وتختفي بيانات الملفات المؤقتة من الصفحة. لا يؤثر هذا الإجراء على أي مستندات فعلية.</p></Dialog>
    {notice&&<div className="bdu-toast"><Toast {...notice} onClose={()=>setNotice(null)}/></div>}
  </div>;
}
export function DocumentUploadScreen(){return <DemoAccessProvider initialRole="it_admin"><ChatLayout variant="feature"><UploadBody/></ChatLayout></DemoAccessProvider>;}
