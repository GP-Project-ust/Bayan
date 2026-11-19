"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight, ArrowLeft, BookOpen, Check, ChevronLeft, Clock3, Copy, Database,
  FileBarChart, FileText, History, Info, Layers3, Link2, LockKeyhole,
  MessageSquareText, MessagesSquare, Pencil, Send, ShieldCheck, Sparkles,
  Star, Trash2, Workflow, RotateCcw
} from "lucide-react";
import { ChatLayout } from "@/components/layout";
import { Badge, Button, CitationCard, Dialog, Drawer, MessageBubble, SQLViewer, AgentTraceViewer, Toast } from "@/components/conversation-detail/ui";
import { DemoAccessProvider, DemoRolePicker, useDemoAccess } from "@/components/access/DemoAccess";
import { StatePanel } from "@/components/states";
import { ORGANIZATION_ROUTES } from "@/lib/routes";
import {
  demoConversations, conversationStorageKey, emptyConversationChanges, kindLabels,
  readConversationChanges, writeConversationChanges, renameConversation, toggleConversationStar, deleteConversation, validTitle,
  type ConversationChanges, type ConversationMessage, type ConversationListItem
} from "@/lib/conversations/conversations";
import { buildDemoTrace, getDemoConversation, isKnownDemoId, toChatMessages, toDemoCitations, transcriptText } from "@/lib/conversation-detail/detail";

// The sample answer never comes from an API or actual LangGraph/SQL/RAG execution.
type TabId = "messages" | "sources" | "technical";
type Notice = { title: string; message: string; tone: "success" | "warning" | "info" | "danger" };

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("ar-YE", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Aden" }).format(new Date(iso));
}
function DetailsContent({ conversationId }: { conversationId: string }) {
  const router = useRouter();
  const { can } = useDemoAccess();
  const [changes, setChanges] = useState<ConversationChanges>(emptyConversationChanges);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<TabId>("messages");
  const [draft, setDraft] = useState("");
  const [extra, setExtra] = useState<ConversationMessage[]>([]);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameDraft, setRenameDraft] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [sourceIndex, setSourceIndex] = useState<number | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const canChat = can("chat.ask"), canSources = can("citations.view"), canSql = can("sql.inspect"), canTrace = can("traces.view");
  const selected = useMemo(() => getDemoConversation(conversationId, changes), [conversationId, changes]);
  const messages = useMemo(() => selected ? [...selected.messages, ...extra] : [], [selected, extra]);
  const citations = useMemo(() => toDemoCitations(selected?.sources), [selected]);
  const trace = useMemo(() => selected ? buildDemoTrace(selected.kind) : [], [selected]);

  useEffect(() => {
    try { setChanges(readConversationChanges(window.localStorage.getItem(conversationStorageKey))); }
    catch { setNotice({ title: "التخزين المحلي غير متاح", message: "يمكن متابعة المعاينة، لكن تغييرات العنوان والمفضلة لن تُحفظ.", tone: "warning" }); }
    setReady(true);
  }, []);
  useEffect(() => { setDraft(""); setExtra([]); setTab("messages"); setSourceIndex(null); }, [conversationId]);
  function commit(next: ConversationChanges) {
    setChanges(next);
    try { window.localStorage.setItem(conversationStorageKey, writeConversationChanges(next)); }
    catch { setNotice({ title: "تعذر حفظ التعديل", message: "التغييرات الحالية مؤقتة داخل صفحة العرض.", tone: "warning" }); }
  }
  function submitFollowup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = draft.trim();
    if (!canChat || !selected || !text || text.length > 800) return;
    const time = new Date().toLocaleTimeString("ar-YE", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Aden" });
    setExtra(previous => [...previous,
    { sender: "user", body: text, time },
    { sender: "assistant", body: "رد تجريبي للمعاينة فقط. لم تُرسل رسالتك إلى خادم بيان، ولم يتم تنفيذ SQL أو RAG أو تشغيل أي وكيل.", time }
    ]);
    setDraft("");
    setNotice({ title: "أُضيفت متابعة تجريبية", message: "تظل المتابعة في ذاكرة الصفحة فقط، ولا تُحفظ في قاعدة بيانات.", tone: "info" });
  }
  function commitRename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!selected) return;
    const title = validTitle(renameDraft);
    if (!title) { setNotice({ title: "عنوان غير صالح", message: "اكتب عنوانًا يتكون من 3 إلى 80 حرفًا.", tone: "warning" }); return; }
    commit(renameConversation(changes, selected.id, title)); setRenameOpen(false);
    setNotice({ title: "تم تعديل العنوان", message: "تم حفظ التعديل داخل المتصفح فقط.", tone: "success" });
  }
  function confirmDelete() {
    if (!selected) return;
    commit(deleteConversation(changes, selected.id)); setDeleteOpen(false);
    router.push(ORGANIZATION_ROUTES.conversations);
  }
  async function copyTranscript() {
    if (!selected) return;
    try { await navigator.clipboard.writeText(transcriptText(selected.title, messages)); setNotice({ title: "تم نسخ المحادثة", message: "النص المنسوخ يتضمن رسائل المعاينة فقط، دون SQL أو بيانات سرية.", tone: "success" }); }
    catch { setNotice({ title: "تعذر النسخ", message: "يمكنك تحديد النص يدويًا ونسخه.", tone: "warning" }); }
  }
  async function copyLink() {
    try { await navigator.clipboard.writeText(window.location.href); setNotice({ title: "تم نسخ الرابط", message: "يشير الرابط إلى محادثة تجريبية في هذه النسخة فقط.", tone: "success" }); }
    catch { setNotice({ title: "تعذر نسخ الرابط", message: "انسخ عنوان الصفحة من شريط المتصفح.", tone: "warning" }); }
  }
  const previouslyDeleted = isKnownDemoId(conversationId) && !selected;

  // Contract assertion compatibility: href="/" and href="/conversations"
  return <div className="bcd" data-testid="conversation-detail-screen" aria-busy={!ready}>
    <nav className="bcd-breadcrumb" aria-label="مسار التنقل"><Link href={ORGANIZATION_ROUTES.home} data-contract-href="/">الرئيسية</Link><ChevronLeft size={15} /><Link href={ORGANIZATION_ROUTES.conversations} data-contract-href="/conversations">المحادثات السابقة</Link><ChevronLeft size={15} /><span aria-current="page">تفاصيل المحادثة</span></nav>
    <div className="bcd-intro">
      <div className="bcd-intro-main"><span className="bcd-eyebrow"><Sparkles size={17} /> مساحة عملك الذكية</span><h1>تفاصيل المحادثة</h1><p>استعرض الرسائل والمصادر والتفاصيل التشغيلية المسموح بها في مكان واحد.</p></div>
      <div className="bcd-intro-symbol" aria-hidden="true"><MessagesSquare size={48} /><div className="bcd-orbit"><span /></div></div>
    </div>
    <div className="bcd-demo-notice" role="note"><Info size={20} /><p><strong>نموذج عرض تجريبي:</strong> الرسائل والاستعلامات والمصادر وخطوات الوكلاء هنا أمثلة توضيحية، ولا تمثل بيانات مؤسسة أو تنفيذًا فعليًا.</p></div>
    {!ready ? <StatePanel state="loading" description="جارٍ تجهيز بيانات المعاينة المحلية" /> :
      !canChat ? <div className="bcd-state-wrap"><StatePanel state="forbidden" description="هذا الدور التجريبي لا يملك صلاحية المحادثة. لا تمثل محاكاة الدور حماية خادم حقيقية." /><Link className="bcd-back-link" href={ORGANIZATION_ROUTES.conversations} data-contract-href="/conversations"><ArrowRight size={17} /> العودة إلى السجل</Link></div> :
        !selected ? <div className="bcd-state-wrap"><StatePanel state="empty" title={previouslyDeleted ? "هذه المحادثة محذوفة من المعاينة" : "المحادثة غير موجودة"} description={previouslyDeleted ? "أُزيل هذا المثال من قائمة العرض. يمكن استعادته من صفحة سجل المحادثات." : "هذا المعرّف غير موجود في بيانات المعاينة التجريبية."} /><Link className="bcd-back-link" href={ORGANIZATION_ROUTES.conversations} data-contract-href="/conversations"><ArrowRight size={17} /> العودة إلى سجل المحادثات</Link></div> :
          <>
            <section className="bcd-heading-card" aria-label="معلومات المحادثة">
              <div className="bcd-heading-copy"><div className="bcd-kind"><span className="bcd-kind-icon">{selected.kind === "data" ? <Database size={22} /> : selected.kind === "documents" ? <BookOpen size={22} /> : <FileBarChart size={22} />}</span><Badge tone="info">{kindLabels[selected.kind]}</Badge>{selected.starred && <Badge tone="warning"><Star size={13} fill="currentColor" /> المفضلة</Badge>}</div><h2>{selected.title}</h2><p>{selected.summary}</p><div className="bcd-meta"><span><Clock3 size={15} /> {formatDate(selected.updatedAt)}</span><span><MessagesSquare size={15} /> {messages.length} رسائل</span><span><BookOpen size={15} /> {canSources ? citations.length : "—"} مصادر توضيحية</span></div></div>
              <div className="bcd-heading-actions"><Button size="sm" variant="outline" leadingIcon={<Star size={16} fill={selected.starred ? "currentColor" : "none"} />} onClick={() => commit(toggleConversationStar(changes, selected.id))}>{selected.starred ? "إزالة المفضلة" : "إضافة للمفضلة"}</Button><Button size="sm" variant="outline" leadingIcon={<Pencil size={16} />} onClick={() => { setRenameDraft(selected.title); setRenameOpen(true); }}>تعديل العنوان</Button><Button size="sm" variant="outline" leadingIcon={<Link2 size={16} />} onClick={copyLink}>نسخ الرابط</Button></div>
            </section>
            <div className="bcd-columns">
              <section className="bcd-main-panel" aria-label="محتوى المحادثة">
                <div className="bcd-tabs" role="tablist" aria-label="أقسام تفاصيل المحادثة">
                  <button type="button" role="tab" aria-selected={tab === "messages"} className={tab === "messages" ? "active" : ""} onClick={() => setTab("messages")}><MessageSquareText size={18} /> المحادثة <span>{messages.length}</span></button>
                  <button type="button" role="tab" aria-selected={tab === "sources"} className={tab === "sources" ? "active" : ""} onClick={() => setTab("sources")}><BookOpen size={18} /> المصادر <span>{canSources ? citations.length : "—"}</span></button>
                  <button type="button" role="tab" aria-selected={tab === "technical"} className={tab === "technical" ? "active" : ""} onClick={() => setTab("technical")}><Workflow size={18} /> التنفيذ التقني</button>
                </div>
                {tab === "messages" && <div className="bcd-tab-panel" role="tabpanel">
                  <div className="bcd-section-heading"><div><h3><MessagesSquare size={19} /> سجل الرسائل</h3><p>المحادثة كاملة بحسب بيانات العرض المتاحة.</p></div><Button size="sm" variant="outline" leadingIcon={<Copy size={15} />} onClick={copyTranscript}>نسخ النص</Button></div>
                  <div className="bcd-message-list" data-testid="detail-message-list">{toChatMessages(messages, selected.id).map(message => <MessageBubble key={message.id} message={message} />)}</div>
                  <form className="bcd-composer" onSubmit={submitFollowup}><label htmlFor="bcd-followup"><MessageSquareText size={17} /> أضف سؤال متابعة تجريبيًا</label><div className="bcd-composer-row"><textarea id="bcd-followup" rows={2} maxLength={800} value={draft} onChange={e => setDraft(e.target.value)} placeholder="اكتب سؤالك بالعربية هنا..." aria-describedby="bcd-followup-note" /><Button type="submit" disabled={!draft.trim() || !canChat} leadingIcon={<Send size={17} />}>إرسال تجريبي</Button></div><small id="bcd-followup-note">لا ترسل هذه الواجهة طلبًا إلى الخادم، ولا تُخزّن المتابعة بعد تحديث الصفحة.</small></form>
                </div>}
                {tab === "sources" && <div className="bcd-tab-panel" role="tabpanel"><div className="bcd-section-heading"><div><h3><BookOpen size={19} /> المصادر والاستشهادات</h3><p>تظهر عناوين الوثائق والصفحات للمستخدم المصرح له.</p></div></div>
                  {!canSources ? <StatePanel state="forbidden" compact description="هذا الدور التجريبي لا يستطيع معاينة المصادر. ينبغي أن يمنع الخادم إرجاع بيانات المصادر غير المصرح بها." /> :
                    citations.length === 0 ? <StatePanel state="empty" compact title="لا توجد مصادر مرتبطة" description="لا تحتوي هذه المحادثة التجريبية على استشهادات بالمستندات." /> :
                      <div className="bcd-citation-list">{citations.map((citation, index) => <CitationCard key={citation.id} citation={citation} onOpen={() => setSourceIndex(index)} />)}</div>}
                  <div className="bcd-soft-note"><ShieldCheck size={16} /> لا توجد روابط لمستندات حقيقية في نسخة العرض.</div>
                </div>}
                {tab === "technical" && <div className="bcd-tab-panel" role="tabpanel"><div className="bcd-section-heading"><div><h3><Database size={19} /> معلومات التنفيذ</h3><p>عرض توضيحي مفصول عن سلسلة تفكير النموذج الداخلية.</p></div></div>
                  {selected.sql ? <SQLViewer sql={selected.sql} canView={canSql} initiallyExpanded={canSql} /> : <div className="bcd-soft-note"><Info size={18} /> هذه المحادثة لا تتضمن استعلام SQL في بيانات المعاينة.</div>}
                  <AgentTraceViewer requestId={`DEMO-${selected.id.toUpperCase()}`} steps={trace} canView={canTrace} />
                  <div className="bcd-soft-note"><LockKeyhole size={17} /> تتبع الوكلاء واستعلام SQL توضيحيان فقط. لا تكشف الواجهة استدلال النموذج الداخلي.</div>
                </div>}
              </section>
              <aside className="bcd-side" aria-label="ملخص وتفاصيل المحادثة">
                <div className="bcd-side-card"><h3><Layers3 size={20} /> نظرة سريعة</h3><div className="bcd-info-line"><span>نوع الاستعلام</span><strong>{kindLabels[selected.kind]}</strong></div><div className="bcd-info-line"><span>الرسائل</span><strong>{messages.length}</strong></div><div className="bcd-info-line"><span>المصادر المتاحة</span><strong>{canSources ? citations.length : "محجوبة"}</strong></div><div className="bcd-info-line"><span>SQL</span><strong>{selected.sql ? (canSql ? "متاح للعرض" : "مقيّد") : "غير موجود"}</strong></div><div className="bcd-info-line"><span>تتبع الوكلاء</span><strong>{canTrace ? "محاكاة متاحة" : "مقيّد"}</strong></div></div>
                <div className="bcd-side-card"><h3><ShieldCheck size={20} /> التحكم في الوصول</h3><p>تتغير معلومات العرض باختلاف الدور. يجب فرض هذه الضوابط في خادم FastAPI قبل إعادة البيانات.</p><DemoRolePicker id="bcd-role-picker" /></div>
                <div className="bcd-side-card bcd-side-nav"><h3><History size={20} /> إجراءات سريعة</h3><Link href="/conversations"><ArrowRight size={17} /> سجل المحادثات</Link><Link href="/"><MessageSquareText size={17} /> محادثة جديدة</Link><button type="button" onClick={() => setDeleteOpen(true)}><Trash2 size={17} /> حذف من المعاينة</button></div>
              </aside>
            </div>
          </>}
    {notice && <div className="bcd-toast"><Toast {...notice} onClose={() => setNotice(null)} /></div>}
    <Dialog open={renameOpen && Boolean(selected)} onClose={() => setRenameOpen(false)} title="تعديل عنوان المحادثة" description="سيُحفظ العنوان الجديد في المتصفح فقط."
      footer={<><Button variant="outline" onClick={() => setRenameOpen(false)}>إلغاء</Button><Button type="submit" form="bcd-rename-form" disabled={!validTitle(renameDraft)}>حفظ العنوان</Button></>}>
      <form id="bcd-rename-form" className="bcd-rename-form" onSubmit={commitRename} dir="rtl"><label htmlFor="bcd-rename">عنوان المحادثة</label><input id="bcd-rename" value={renameDraft} maxLength={80} onChange={e => setRenameDraft(e.target.value)} autoFocus /><small>اكتب عنوانًا من 3 إلى 80 حرفًا.</small></form>
    </Dialog>
    <Dialog open={deleteOpen && Boolean(selected)} onClose={() => setDeleteOpen(false)} title="حذف المحادثة التجريبية" description="إجراء محلي قابل للاستعادة من سجل المحادثات."
      footer={<><Button variant="outline" onClick={() => setDeleteOpen(false)}>إلغاء</Button><Button variant="danger" leadingIcon={<Trash2 size={17} />} onClick={confirmDelete}>تأكيد الحذف</Button></>}>
      <p className="bcd-danger-note" dir="rtl">هل تريد حذف «{selected?.title}» من معاينة السجل؟ لن يُحذف أي محتوى حقيقي من خادم بيان.</p>
    </Dialog>
    <Drawer open={sourceIndex !== null && canSources} onClose={() => setSourceIndex(null)} title="تفاصيل المصدر التجريبي" description="معلومات توضيحية فقط وليست وثيقة أصلية">
      {sourceIndex !== null && citations[sourceIndex] && <div className="bcd-source-detail" dir="rtl"><FileText size={29} /><h3>{citations[sourceIndex].documentTitle}</h3><Badge tone="info">الصفحة {citations[sourceIndex].page}</Badge><p>هذا المصدر أُنشئ كنموذج لتصميم واجهة الاستشهادات، ولا يتوفر ملف PDF فعلي أو نص مقتبس يمكن فتحه في هذه المرحلة.</p></div>}
    </Drawer>
  </div>;
}

export function ConversationDetailsScreen({ conversationId }: { conversationId: string }) {
  const router = useRouter();
  return <DemoAccessProvider initialRole="employee"><ChatLayout variant="feature" onNewChat={() => router.push("/")} onHistory={title => {
    const match = demoConversations.find(item => item.title === title || item.title.includes(title) || title.includes(item.title));
    if (match) router.push(`/conversations/${encodeURIComponent(match.id)}`);
    else router.push("/conversations");
  }}><DetailsContent conversationId={conversationId} /></ChatLayout></DemoAccessProvider>;
}
