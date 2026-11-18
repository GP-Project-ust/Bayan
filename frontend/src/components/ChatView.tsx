"use client";

import { useState, useRef } from "react";
import { ChatLayout } from "./layout";
import { Sparkles, Lightbulb, UsersRound, CalendarDays, ChartNoAxesColumnIncreasing, UserRound, Bot,
  CheckCircle2, Info, Database, ChevronUp, ChevronDown, Copy, BookOpen,
  FileText, Download, Send, Paperclip, FileSpreadsheet, FileType2, FileDown, CircleCheck } from "lucide-react";

type Format = "PDF" | "Excel" | "CSV";
const PROMPTS = [
  { icon: UsersRound, text: "كم عدد الطلاب المسجلين في كلية الهندسة؟" },
  { icon: CalendarDays, text: "اعرض لائحة الغياب والحرمان" },
  { icon: ChartNoAxesColumnIncreasing, text: "أنشئ تقريرًا عن أداء الأقسام" },
];
const SQL = `SELECT college_name, COUNT(*) AS total_students\nFROM students\nWHERE college_name = 'الهندسة'\nGROUP BY college_name;`;
const studentAnswer = "تشير البيانات التجريبية إلى أن عدد الطلاب المسجلين في كلية الهندسة هو 1250 طالبًا.";

function exportFile(format: Format, question: string, answer: string) {
  if (typeof window === "undefined") return;
  if (format === "PDF") { window.print(); return; }
  const csv = `السؤال,الإجابة\n"${question.replaceAll('"','""')}","${answer.replaceAll('"','""')}"\n`;
  const excel = `\ufeff<html dir="rtl"><meta charset="utf-8"/><table><tr><th>السؤال</th><th>الإجابة</th></tr><tr><td>${question}</td><td>${answer}</td></tr></table></html>`;
  const mime = format === "CSV" ? "text/csv;charset=utf-8;" : "application/vnd.ms-excel;charset=utf-8;";
  const blob = new Blob([format === "CSV" ? "\ufeff" + csv : excel], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href=url; anchor.download=`bayan-report.${format === "CSV" ? "csv" : "xls"}`; anchor.click();
  URL.revokeObjectURL(url);
}

export default function ChatView() {
  const [sqlExpanded,setSqlExpanded] = useState(true);
  const [question,setQuestion] = useState(PROMPTS[0].text);
  const [draft,setDraft] = useState("");
  const [answer,setAnswer] = useState(studentAnswer);
  const [waiting,setWaiting] = useState(false);
  const [activeChat,setActiveChat] = useState("عدد طلاب كلية الهندسة");
  const [format,setFormat] = useState<Format>("PDF");
  const inputRef = useRef<HTMLInputElement>(null);
  const runQuery = (value: string) => {
    const clean=value.trim(); if(!clean) return;
    setQuestion(clean); setDraft(""); setWaiting(true);
    setActiveChat(clean.includes("كلية الهندسة") ? "عدد طلاب كلية الهندسة" : clean.includes("الغياب") ? "لائحة الغياب والحرمان" : clean.includes("الأقسام") ? "تقرير أداء الأقسام" : "إحصاءات القبول");
    // Demonstration state only: no live back-end call.
    setTimeout(() => {setWaiting(false); setAnswer(clean.includes("كلية الهندسة") ? studentAnswer : clean.includes("الغياب") ? "يمكن مراجعة لائحة الغياب والحرمان من قسم المصادر والمراجع. هذا الرد تجريبي لأغراض عرض التصميم." : clean.includes("الأقسام") ? "تم إعداد نموذج تجريبي لتقرير أداء الأقسام، ويمكن تصدير بياناته من الخيارات أدناه." : "هذه إجابة توضيحية ضمن التصميم الأولي لواجهة بيان، وليست نتيجة حقيقية من قاعدة البيانات.");},700);
  };
  const reset = () => {setQuestion("");setAnswer("");setDraft("");setActiveChat(""); inputRef.current?.focus();};
  return <ChatLayout onNewChat={reset} onHistory={(title)=>runQuery(title)} activeChat={activeChat}>
      <div className="chat-body">
        <section className="welcome-card">
          <div className="welcome-heading"><Sparkles size={35}/><h1>مرحبًا بك في <em>بيان</em></h1></div>
          <p className="welcome-description">مساعد مؤسسي عربي ذكي للاستعلام عن بيانات الجامعة، وتحليلها، وإعداد التقارير،<br/> مع توثيق المصادر وشفافية الاستعلامات.</p>
          <img className="hero-campus" src="/assets/campus-chat.png" alt="رسم توضيحي لمبنى جامعي" />
          <div className="welcome-divider"/>
          <h2 className="suggest-heading"><Lightbulb size={27}/> يمكنك البدء بأحد الأسئلة التالية:</h2>
          <div className="suggestions">{PROMPTS.map(({ icon: Icon, text }) => <button key={text} className="suggestion" onClick={()=>runQuery(text)}><Icon size={27}/><span>{text}</span></button>)}</div>
        </section>
        <section className="conversation" aria-label="المحادثة" aria-busy={waiting}>
          {question && <div className="user-question"><span className="user-bubble-avatar"><UserRound size={22} fill="currentColor"/></span><div><div className="question-bubble">{question}</div><small>10:24 ص</small></div></div>}
          <div className="answer-card">
            <div className="answer-avatar"><Bot size={31}/></div>
            <div className="answer-main-row"><p aria-live="polite" aria-atomic="true">{waiting ? "جارٍ معالجة طلبك..." : answer ? answer : "مرحبًا! يمكنك البدء بطرح سؤالك أو اختيار أحد الاقتراحات أعلاه."}</p><span className="request-status" role="status" aria-live="polite"><CheckCircle2 size={21}/>{waiting ? "حالة الطلب: جارٍ المعالجة" : "حالة الطلب: مكتمل"}</span></div>
            <div className="data-notice"><Info size={20}/> بيانات تجريبية لأغراض العرض.</div>
            <section className="sql-box">
              <button className="sql-header" type="button" aria-controls="bayan-sql-result" onClick={()=>setSqlExpanded(!sqlExpanded)} aria-expanded={sqlExpanded}><div><Database size={24}/> <strong>عرض استعلام SQL</strong></div>{sqlExpanded?<ChevronUp size={23}/>:<ChevronDown size={23}/>}</button>
              {sqlExpanded && <div className="sql-content" id="bayan-sql-result"><div className="sql-caption">استعلام SQL المستخدم للحصول على النتيجة (عرض للشفافية – للقراءة فقط):</div>
                <div className="sql-code-wrap"><button className="copy-sql" title="نسخ SQL" aria-label="نسخ SQL" onClick={()=>navigator.clipboard?.writeText(SQL)}><Copy size={19}/></button><code className="sql-code" dir="ltr"><span>SELECT</span> college_name, <b>COUNT</b>(*) <span>AS</span> total_students{"\n"}<span>FROM</span> students{"\n"}<span>WHERE</span> college_name = <i>&apos;الهندسة&apos;</i>{"\n"}<span>GROUP BY</span> college_name;</code></div>
              </div>}
            </section>
            <section className="sources-box" id="sources"><h2><BookOpen size={26}/> المصادر والمراجع</h2><p>تم الرجوع إلى المراجع التالية للإجابة على الاستعلام:</p><div className="source-line"><FileText size={20}/><span>اللائحة الأكاديمية للجامعة — ص 12</span></div><div className="source-line"><FileText size={20}/><span>دليل شؤون الطلاب — ص 8</span></div></section>
            <section className="export-row" id="reports"><div className="export-explanation"><h2><Download size={25}/> تصدير التقرير</h2><p>يمكنك تصدير نتيجة الاستعلام في أحد التنسيقات التالية:</p></div><div className="export-formats"><button className={`format-button format-pdf ${format==="PDF"?"selected":""}`} onClick={()=>setFormat("PDF")}><FileType2 size={22}/>PDF</button><button className={`format-button format-excel ${format==="Excel"?"selected":""}`} onClick={()=>setFormat("Excel")}><FileSpreadsheet size={22}/>Excel</button><button className={`format-button format-csv ${format==="CSV"?"selected":""}`} onClick={()=>setFormat("CSV")}><FileDown size={22}/>CSV</button></div><button className="main-export-button" onClick={()=>exportFile(format,question,answer)}><Download size={23}/>تصدير التقرير</button></section>
            <small className="answer-time">10:25 ص</small>
          </div>
        </section>
        <form className="composer" onSubmit={(e)=>{e.preventDefault();runQuery(draft)}}><button type="button" className="attach-button" title="إرفاق ملف (تصميم أولي)"><Paperclip size={24}/></button><input ref={inputRef} dir="rtl" placeholder="اكتب سؤالك هنا..." value={draft} onChange={(e)=>setDraft(e.target.value)} aria-label="سؤالك"/><button type="submit" className="send-button" aria-label="إرسال السؤال"><Send size={25}/></button></form>
      </div>
  </ChatLayout>;
}
