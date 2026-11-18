"use client";

import { useState } from "react";
import { CheckCircle2, FileText, ShieldCheck, Sparkles } from "lucide-react";
import { Button, Dialog, Toast } from "@/components/ui";
import { AgentTraceViewer, ChatComposer, CitationCard, MessageBubble, ReportExporter, SmartViewManager, SQLViewer } from "@/components/bayan";
import type { AgentTraceStepData, ChatMessageData, DocumentCitation, SmartViewData } from "@/components/bayan";

const questionSuggestions=[{id:"1",label:"كم عدد الطلاب في كلية الهندسة؟"},{id:"2",label:"ما شروط الحرمان من الاختبار؟"},{id:"3",label:"أنشئ تقريرًا عن أعداد الطلاب"}];
const sql=`SELECT faculty_name, COUNT(*) AS student_count
FROM smart_view_student_enrollment
WHERE faculty_name = 'الهندسة'
GROUP BY faculty_name;`;
const citationSamples:DocumentCitation[]=[
  {id:"src-1",documentTitle:"اللائحة الأكاديمية (مثال تجريبي)",page:12,kind:"لائحة",excerpt:"هذا مقتطف تجريبي لشرح ظهور المصدر ورقم الصفحة داخل واجهة الاسترجاع."},
  {id:"src-2",documentTitle:"دليل شؤون الطلاب (مثال تجريبي)",page:8,kind:"دليل",excerpt:"الملفات وأرقام الصفحات هنا ليست استشهادات فعلية، وإنما أمثلة لتصميم المكوّن."}
];
const columns=[{key:"faculty",label:"الكلية"},{key:"students",label:"عدد الطلاب"}];
const reportRows=[{faculty:"الهندسة",students:1250},{faculty:"الحاسبات",students:980},{faculty:"الطب",students:1100}];
const initialViews:SmartViewData[]=[
  {id:"sv-01",name:"عرض الطلاب",source:"بيانات شؤون الطلاب",security:"Restricted",state:"active",updatedAt:"2026-11-06"},
  {id:"sv-02",name:"عرض التسجيل",source:"نظام التسجيل الأكاديمي",security:"Masked",state:"active",updatedAt:"2026-11-06"},
  {id:"sv-03",name:"عرض الأداء الأكاديمي",source:"مستودع البيانات الأكاديمية",security:"Public",state:"active",updatedAt:"2026-11-06"},
  {id:"sv-04",name:"عرض البيانات الحساسة",source:"سجل خاص",security:"Blacklist",state:"inactive",updatedAt:"2026-11-06"}
];
const traceSamples:AgentTraceStepData[]=[
  {id:"st-1",agent:"Supervisor",label:"تصنيف نية الاستعلام وتوجيهه",status:"success",durationMs:40,summary:"تم تحديد مسار الاستعلام عن بيانات الجامعة واختيار وكيل SQL. ملخص حدث تشغيلي تجريبي."},
  {id:"st-2",agent:"SQL",label:"التحقق من العرض الذكي وتنفيذ قراءة",status:"success",durationMs:280,summary:"تم اعتماد عرض ذكي متاح للدور واستخدام استعلام قراءة فقط. لا تُعرض بيانات اعتماد الاتصال."},
  {id:"st-3",agent:"Analyst",label:"تنظيم مؤشرات النتيجة",status:"success",durationMs:90,summary:"تم حساب ملخص إجمالي للنتائج التجريبية."},
  {id:"st-4",agent:"Reporter",label:"صياغة الإجابة القابلة للتصدير",status:"success",durationMs:120,summary:"تم تجهيز تقرير تجريبي بتنسيق عربي."}
];
const initialMessages:ChatMessageData[]=[
  {id:"m-1",role:"user",text:"كم عدد الطلاب المسجلين في كلية الهندسة؟",time:"10:24 ص"},
  {id:"m-2",role:"assistant",text:"تشير البيانات التجريبية إلى وجود 1,250 طالبًا مسجلًا في كلية الهندسة.",time:"10:25 ص",status:"complete"}
];

export function BayanDomainPlayground(){
  const [draft,setDraft]=useState("");
  const [messages,setMessages]=useState<ChatMessageData[]>(initialMessages);
  const [pending,setPending]=useState(false);
  const [authorized,setAuthorized]=useState(true);
  const [views,setViews]=useState<SmartViewData[]>(initialViews);
  const [selectedView,setSelectedView]=useState<SmartViewData|null>(null);
  const [selectedCitation,setSelectedCitation]=useState<DocumentCitation|null>(null);
  const [creating,setCreating]=useState(false);
  const [newViewName,setNewViewName]=useState("");
  const [toast,setToast]=useState<{title:string;message:string}|null>(null);
  function send(text:string){
    setMessages(old=>[...old,{id:`m-user-${old.length}`,role:"user" as const,text,time:"الآن"},{id:`m-assistant-${old.length}`,role:"assistant" as const,text:"جارٍ معالجة الطلب التجريبي...",time:"الآن",status:"pending" as const}]);
    setDraft("");setPending(true);
  }
  function finish(){
    setMessages(old=>old.map((m,i)=>i===old.length-1&&m.status==="pending"?{...m,text:"هذه إجابة توضيحية من الواجهة التجريبية. لم يتم الاتصال ببيانات الجامعة أو بوكلاء حقيقيين.",status:"complete" as const}:m));
    setPending(false);
  }
  function addView(){const name=newViewName.trim();if(!name)return;setViews(old=>[...old,{id:`sv-${old.length+1}`,name,source:"مصدر تجريبي",security:"Restricted" as const,state:"inactive" as const}]);setCreating(false);setNewViewName("");setToast({title:"تمت الإضافة في المعاينة",message:"العرض الذكي الجديد محفوظ مؤقتًا في حالة الصفحة، وليس في قاعدة البيانات."});}
  return <><div className="bayan-story-sections">
    <section className="bayan-story-card"><header className="bayan-story-section-head"><div><span>01 + 02</span><h2>المحادثة والرسائل</h2><p>مكوّنا ChatComposer وMessageBubble؛ جرّب كتابة سؤال أو اختيار سؤال جاهز.</p></div><div className="bayan-story-controls"><Button variant="outline" size="sm" disabled={!pending} onClick={finish} leadingIcon={<CheckCircle2 size={16}/>}>إكمال المعالجة التجريبية</Button></div></header>
      <div className="bayan-story-chat-window" role="region" aria-label="تجربة شاشة المحادثة"><div className="bayan-story-chat-stream">{messages.map(m=><MessageBubble key={m.id} message={m}/>)}</div><ChatComposer value={draft} onChange={setDraft} onSend={send} suggestions={questionSuggestions} busy={pending} onAttach={()=>setToast({title:"إرفاق الملفات",message:"واجهة الإرفاق تجريبية؛ ربط التخزين ضمن مراحل Backend."})}/></div>
    </section>
    <section className="bayan-story-card"><header className="bayan-story-section-head"><div><span>03 + 04</span><h2>SQL والمصادر</h2><p>شفافية الاستعلامات للقراءة فقط، وربط إجابات RAG بالمراجع وأرقام الصفحات.</p></div><label className="bayan-story-check"><input type="checkbox" checked={authorized} onChange={e=>setAuthorized(e.target.checked)}/> عرض بصلاحية متقدمة (محاكاة)</label></header>
      <div className="bayan-story-two-cols"><SQLViewer sql={sql} canView={authorized} initiallyExpanded/><div className="bayan-story-citations"><h3><FileText size={18}/> المراجع التوضيحية</h3>{citationSamples.map(c=><CitationCard key={c.id} citation={c} canOpen={authorized} onOpen={setSelectedCitation}/>)}</div></div>
    </section>
    <section className="bayan-story-card"><header className="bayan-story-section-head"><div><span>05</span><h2>التقارير والتصدير</h2><p>تصدير CSV وملف XML متوافق مع Excel، أو الطباعة للحفظ بصيغة PDF.</p></div></header><ReportExporter title="تقرير أعداد الطلاب (بيانات تجريبية)" columns={columns} rows={reportRows}/></section>
    <section className="bayan-story-card"><header className="bayan-story-section-head"><div><span>06</span><h2>إدارة العروض الذكية</h2><p>بحث وتصنيف أمني وتفعيل وإيقاف في الواجهة فقط. خيارات الإدارة تظهر وفق حالة الصلاحية التوضيحية.</p></div><label className="bayan-story-check"><input type="checkbox" checked={authorized} onChange={e=>setAuthorized(e.target.checked)}/> صلاحية مسؤول (محاكاة)</label></header>
      <SmartViewManager views={views} canManage={authorized} onCreate={()=>setCreating(true)} onSelect={setSelectedView} onToggle={view=>{setViews(old=>old.map(v=>v.id===view.id?{...v,state:v.state==="active"?("inactive" as const):("active" as const)}:v));setToast({title:"تم تعديل الحالة محليًا",message:"التغيير خاص بالمعاينة ولم يُرسل إلى قاعدة بيانات."});}}/>
    </section>
    <section className="bayan-story-card"><header className="bayan-story-section-head"><div><span>07</span><h2>تتبّع الوكلاء</h2><p>نموذج AgentTraceViewer لاستعراض أحداث المسار التشغيلية والأزمنة وحالات التنفيذ.</p></div><span className="bayan-story-inline-note"><ShieldCheck size={18}/> دون إظهار استدلالات خاصة أو بيانات حساسة</span></header><AgentTraceViewer steps={traceSamples} requestId="demo-request-001" canView={authorized}/></section>
    </div>
    <Dialog open={!!selectedCitation} onClose={()=>setSelectedCitation(null)} title="تفاصيل المصدر" description="مرجع توضيحي، وليس وثيقة فعلية مسترجعة."><p><strong>{selectedCitation?.documentTitle}</strong></p><p>الصفحة {selectedCitation?.page}</p><p>{selectedCitation?.excerpt}</p></Dialog>
    <Dialog open={!!selectedView} onClose={()=>setSelectedView(null)} title="تفاصيل العرض الذكي" description="تُعرض البيانات لأغراض اختبار الواجهة فقط."><p><strong>{selectedView?.name}</strong></p><p>مصدر البيانات: {selectedView?.source}</p><p>التصنيف: {selectedView?.security}</p><p>الحالة: {selectedView?.state}</p></Dialog>
    <Dialog open={creating} onClose={()=>setCreating(false)} title="إضافة عرض ذكي" description="إضافة تجريبية في ذاكرة الصفحة فقط." footer={<><Button variant="outline" onClick={()=>setCreating(false)}>إلغاء</Button><Button disabled={!newViewName.trim()} onClick={addView}>إضافة</Button></>}><label className="bayan-story-field">اسم العرض الذكي<input value={newViewName} onChange={e=>setNewViewName(e.target.value)} placeholder="مثال: عرض نتائج الفصول"/></label></Dialog>
    {toast&&<div className="bayan-story-toast"><Toast title={toast.title} message={toast.message} tone="success" onClose={()=>setToast(null)}/></div>}
  </>;
}
