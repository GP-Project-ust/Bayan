"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent, type KeyboardEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle, ArrowLeft, BookMarked, BookOpen, BookOpenCheck,
  ChevronLeft, ChevronRight, ClipboardCopy, FileSearch, FileText, FileWarning,
  Hash, Info, LibraryBig, LockKeyhole, Maximize2, Minus, Plus,
  ShieldCheck, Sparkles, ZoomIn
} from "lucide-react";
import { ChatLayout } from "@/components/layout";
import { Badge, Button, Toast } from "@/components/ui";
import { StatePanel } from "@/components/states";
import { DemoAccessProvider, DemoRolePicker, useDemoAccess } from "@/components/access/DemoAccess";
import { ORGANIZATION_ROUTES } from "@/lib/routes";
import { documentCategoryLabels, type LibraryDocument } from "@/lib/document-library/library";
import type { Snippet } from "@/lib/semantic-search/search";
import {
  getDemoDocument, getPageCitation, nextPage, pagesWithSnippets,
  parseDocumentPage, snippetsOnPage, viewerHref
} from "@/lib/document-viewer/viewer";

type Notice = { title: string; message: string; tone: "success" | "warning" | "info" | "danger" };
const formatPage = (page: number, total: number) => `الصفحة ${page} من ${total}`;

function SourceIndex({ doc, page, onChoose }: { doc: LibraryDocument; page: number; onChoose: (page: number, snippet?: Snippet) => void }) {
  const pages = pagesWithSnippets(doc);
  return <aside className="bdv-index" aria-labelledby="bdv-index-title">
    <div className="bdv-index-heading"><span className="bdv-index-icon"><BookMarked size={20} /></span><div><h2 id="bdv-index-title">فهرس المقتطفات</h2><p>المواضع التجريبية المرتبطة بالبحث</p></div><Badge tone="info">{doc.snippets.length}</Badge></div>
    {pages.length ? <div className="bdv-index-scroll"><div className="bdv-index-list">{doc.snippets.map(item => <button key={item.id} type="button" className={`bdv-index-item ${item.page === page ? "is-active" : ""}`} onClick={() => onChoose(item.page, item)} aria-current={item.page === page ? "location" : undefined}>
      <span className="bdv-index-page"><Hash size={13} />{item.page}</span><span className="bdv-index-copy"><strong>{item.section}</strong><small>{item.excerpt}</small></span><ChevronLeft size={16} />
    </button>)}</div></div> : <div className="bdv-index-empty"><FileWarning size={21} /><p>لا توجد مقتطفات مرتبطة بهذا المستند. يمكنك تصفح أرقام صفحاته الوصفية فقط.</p></div>}
    <div className="bdv-index-footer"><p><Info size={15} /> الصفحات والمقتطفات المعروضة افتراضية ولا تمثل ملفات أو لوائح رسمية.</p><div><span>صفحات بمقتطفات</span><strong>{pages.length} من {doc.totalPages}</strong></div></div>
    <Link href={ORGANIZATION_ROUTES.semanticSearch} className="bdv-index-search"><FileSearch size={17} /> الانتقال إلى البحث الدلالي <ArrowLeft size={15} /></Link>
  </aside>;
}

function DemoPaper({ doc, page, activeSnippet, zoom, highlight, onNext, onPrevious }: {
  doc: LibraryDocument; page: number; activeSnippet: Snippet | null; zoom: number; highlight: boolean;
  onNext: () => void; onPrevious: () => void;
}) {
  const matches = snippetsOnPage(doc, page);
  const paperStyle = { "--bdv-paper-width": `${Math.round(635 * zoom / 100)}px`, fontSize: `${Math.round(16 * zoom / 100)}px` } as CSSProperties;
  function keyboardNav(event: KeyboardEvent<HTMLDivElement>) {
    // Keyboard navigation only while the preview surface is focused, not inputs or links.
    if (event.target !== event.currentTarget) return;
    if (event.key === "ArrowLeft" && page < doc.totalPages) { event.preventDefault(); onNext(); }
    if (event.key === "ArrowRight" && page > 1) { event.preventDefault(); onPrevious(); }
  }
  return <section className="bdv-stage" aria-label="معاينة صفحة المستند التجريبية">
    <div className="bdv-stage-header"><span><Maximize2 size={16} /> معاينة تخطيط الصفحة — ليست نسخة PDF</span><span>العرض {zoom}%</span></div>
    <div className="bdv-page-frame">
      <div className="bdv-paper" data-testid="viewer-paper" style={paperStyle} tabIndex={0} onKeyDown={keyboardNav} aria-label={`معاينة تجريبية: ${formatPage(page, doc.totalPages)}؛ استخدم أسهم لوحة المفاتيح للتنقل`}>
        <header className="bdv-paper-head"><div className="bdv-paper-brand"><span><BookOpenCheck size={24} /></span><div><strong>بيان</strong><small>مساعد مؤسسي عربي ذكي</small></div></div><span className="bdv-watermark"><FileText size={14} /> نموذج عرض توضيحي</span></header>
        <div className="bdv-paper-rule" />
        <div className="bdv-paper-topline"><span>{doc.title}</span><strong>{formatPage(page, doc.totalPages)}</strong></div>
        <div className="bdv-paper-document-title"><div className="bdv-paper-symbol"><BookOpen size={30} /></div><h3>{doc.title}</h3><p>{documentCategoryLabels[doc.category]} · {doc.owner}</p></div>
        {matches.length > 0 ? <div className="bdv-paper-snippet-group"><div className="bdv-paper-section-title"><BookMarked size={17} /> مقتطفات تدريبية مرتبطة بهذه الصفحة</div>
          {matches.map(match => <blockquote key={match.id} className={`bdv-paper-snippet ${highlight && activeSnippet?.id === match.id ? "bdv-paper-snippet--highlighted" : ""}`} data-testid="viewer-highlighted-snippet"><div><strong>{match.section}</strong><Badge tone="info">ص {match.page}</Badge></div><p>{match.excerpt}</p><small><Info size={14} /> نص افتراضي للتصميم؛ ليس اقتباسًا من مستند موجود.</small></blockquote>)}
        </div> : <div className="bdv-paper-no-content" data-testid="viewer-page-placeholder"><FileSearch size={33} /><h4>لا تتوفر بيانات نصية لهذه الصفحة</h4><p>رقم الصفحة مأخوذ من وصف مستند تجريبي. لا يوجد ملف PDF أصلي ولا محتوى موثّق يمكن عرضه هنا.</p><span>انتقل إلى إحدى الصفحات ذات المقتطفات من الفهرس الجانبي.</span></div>}
        <div className="bdv-paper-blank" aria-hidden="true" />
        <footer className="bdv-paper-footer"><span>بيان · تصميم أولي غير رسمي</span><span>{page} / {doc.totalPages}</span></footer>
      </div>
    </div>
  </section>;
}

function ViewerBody({ documentId, initialPage, initialSnippetId }: { documentId: string | null; initialPage: number; initialSnippetId: string | null }) {
  const router = useRouter();
  const { can } = useDemoAccess();
  const permitted = can("documents.search"), canCite = can("citations.view");
  const doc = useMemo(() => getDemoDocument(documentId), [documentId]);
  const [page, setPage] = useState(initialPage);
  const [activeSnippetId, setActiveSnippetId] = useState<string | null>(initialSnippetId);
  const [pageInput, setPageInput] = useState(String(initialPage));
  const [error, setError] = useState("");
  const [zoom, setZoom] = useState(100);
  const [highlight, setHighlight] = useState(true);
  const [notice, setNotice] = useState<Notice | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => { setPage(initialPage); setActiveSnippetId(initialSnippetId); setPageInput(String(initialPage)); setError(""); }, [documentId, initialPage, initialSnippetId]);
  const shownSnippets = doc ? snippetsOnPage(doc, page) : [];
  const activeSnippet = shownSnippets.find(s => s.id === activeSnippetId) ?? shownSnippets[0] ?? null;
  const totalPages = doc?.totalPages ?? 1;
  const currentCitation = doc ? getPageCitation(doc, page) : null;
  function selectPage(next: number, snippet?: Snippet) {
    if (!doc || !Number.isInteger(next) || next < 1 || next > doc.totalPages) return;
    const selected = snippet && snippet.page === next ? snippet : snippetsOnPage(doc, next)[0] ?? null;
    setPage(next); setActiveSnippetId(selected?.id ?? null); setPageInput(String(next)); setError("");
    // Shareable deep links without a fake route request or storing document data.
    window.history.replaceState(window.history.state, "", viewerHref(doc.id, next, selected?.id));
  }
  function submitPage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!doc) return;
    const parsed = parseDocumentPage(pageInput, doc.totalPages);
    if (parsed === null) { setError(`أدخل رقم صفحة صحيحًا بين 1 و${doc.totalPages}.`); inputRef.current?.focus(); return; }
    selectPage(parsed);
  }
  async function copyText(text: string, successTitle: string) {
    try { await navigator.clipboard.writeText(text); setNotice({ title: successTitle, message: "محتوى تجريبي؛ تحقق من المرجع قبل استخدام أي استشهاد رسمي.", tone: "success" }); }
    catch { setNotice({ title: "تعذر النسخ", message: "قد يتطلب النسخ إذنًا من المتصفح أو اتصال HTTPS.", tone: "warning" }); }
  }
  return <div className="bdv" data-testid="document-viewer-screen">
    <nav className="bdv-breadcrumb" aria-label="مسار التنقل"><Link href={ORGANIZATION_ROUTES.home}>الرئيسية</Link><ChevronLeft size={15} /><Link href={ORGANIZATION_ROUTES.sources}>مكتبة المستندات</Link><ChevronLeft size={15} /><span aria-current="page">عارض المستند</span></nav>
    <header className="bdv-hero"><div><span className="bdv-eyebrow"><Sparkles size={15} /> قاعدة المعرفة المؤسسية</span><h1>عارض المستندات والمصادر</h1><p>تنقل بين الصفحات التجريبية، وراجع مواضع المقاطع المستخدمة في البحث، وانسخ الاستشهادات التوضيحية.</p></div><div className="bdv-hero-visual" aria-hidden="true"><BookOpenCheck size={64} /></div></header>
    <div className="bdv-demo-note" role="note"><Info size={20} /><p><strong>معاينة تصميمية فقط:</strong> لا توجد ملفات PDF أصلية أو صفحات مستندات حقيقية في هذه النسخة. العناوين والمقاطع وأرقام الصفحات أمثلة تدريبية من الشاشتين 09 و10، وليست مصادر جامعية موثقة.</p></div>
    <section className="bdv-access-line" aria-label="تجربة أدوار الوصول"><div><LockKeyhole size={18} /><span>صلاحيات المستندات محاكاة للواجهة؛ يجب فرض الوصول في FastAPI قبل جلب أي صفحة أو ملف.</span></div><DemoRolePicker id="bdv-role-picker" /></section>
    {!permitted ? <div className="bdv-notice-state"><StatePanel state="forbidden" title="ليس لديك إذن لاستعراض مستندات المؤسسة" description="في هذه المحاكاة لا يحصل مسؤول المنصة على وصول تلقائي إلى محتوى مستندات المؤسسة." /></div> : !doc ? <div className="bdv-notice-state"><StatePanel state="empty" title="المستند غير موجود في بيانات العرض" description="الرابط لا يشير إلى مستند تجريبي معروف؛ عد إلى المكتبة واختر مستندًا من القائمة." /><Link href={ORGANIZATION_ROUTES.sources} className="bdv-return-link"><LibraryBig size={17} /> العودة إلى المكتبة</Link></div> : <>
      <section className="bdv-summary" aria-label="معلومات المستند">
        <div className="bdv-summary-primary"><span className="bdv-summary-mark"><FileText size={28} /></span><div><span className="bdv-summary-label">{documentCategoryLabels[doc.category]} · {doc.fileType} تجريبي</span><h2>{doc.title}</h2><p>{doc.owner} · {doc.totalPages} صفحة وصفية</p></div></div>
        <div className="bdv-summary-actions"><Badge tone={doc.status === "indexed" ? "success" : doc.status === "failed" ? "danger" : "warning"}>{doc.status === "indexed" ? "مفهرس تجريبيًا" : doc.status === "failed" ? "فشل الفهرسة تجريبيًا" : "لا توجد فهرسة مكتملة"}</Badge><Link href={ORGANIZATION_ROUTES.sources} className="bdv-outline-action"><LibraryBig size={17} /> العودة للمكتبة</Link></div>
      </section>
      <section className="bdv-toolbar" aria-label="أدوات عارض المستند">
        <div className="bdv-toolbar-pages"><span className="bdv-toolbar-title"><BookOpen size={18} /> التنقل بين الصفحات</span><Button variant="outline" size="sm" disabled={page <= 1} onClick={() => selectPage(nextPage(page, -1, doc.totalPages))} leadingIcon={<ChevronRight size={17} />}>السابقة</Button>
          <form className="bdv-page-form" onSubmit={submitPage} noValidate><label htmlFor="bdv-page-input">الصفحة</label><input ref={inputRef} id="bdv-page-input" aria-invalid={Boolean(error)} aria-describedby={error ? "bdv-page-error" : undefined} inputMode="numeric" value={pageInput} onChange={event => { setPageInput(event.target.value); if (error) setError(""); }} /><span>من {doc.totalPages}</span><button type="submit">انتقال</button></form>
          <Button variant="outline" size="sm" disabled={page >= doc.totalPages} onClick={() => selectPage(nextPage(page, 1, doc.totalPages))} trailingIcon={<ChevronLeft size={17} />}>التالية</Button>
        </div>
        <div className="bdv-toolbar-actions"><div className="bdv-zoom" role="group" aria-label="تكبير المعاينة"><button type="button" onClick={() => setZoom(prev => Math.max(75, prev - 25))} disabled={zoom <= 75} aria-label="تصغير"><Minus size={16} /></button><span>{zoom}%</span><button type="button" onClick={() => setZoom(prev => Math.min(150, prev + 25))} disabled={zoom >= 150} aria-label="تكبير"><Plus size={16} /></button><button type="button" onClick={() => setZoom(100)} aria-label="إعادة حجم المعاينة"><ZoomIn size={16} /></button></div>
          <label className="bdv-highlight-toggle"><input type="checkbox" checked={highlight} onChange={event => setHighlight(event.target.checked)} /><span>تمييز المقتطف</span></label>
        </div>
        {error && <p className="bdv-input-error" id="bdv-page-error" role="alert"><AlertCircle size={15} />{error}</p>}
      </section>
      <div className="bdv-layout">
        <SourceIndex doc={doc} page={page} onChoose={selectPage} />
        <div className="bdv-content">
          <DemoPaper doc={doc} page={page} activeSnippet={activeSnippet} zoom={zoom} highlight={highlight} onNext={() => selectPage(nextPage(page, 1, doc.totalPages))} onPrevious={() => selectPage(nextPage(page, -1, doc.totalPages))} />
          <section className="bdv-source-details" aria-labelledby="bdv-citation-heading">
            <div className="bdv-source-heading"><div><h2 id="bdv-citation-heading"><ShieldCheck size={19} /> تفاصيل المصدر والاستشهاد</h2><p>{formatPage(page, doc.totalPages)} · {shownSnippets.length ? `${shownSnippets.length} مقتطف تدريبي` : "لا توجد مقتطفات مسجلة"}</p></div><Badge tone="neutral">مثال توضيحي</Badge></div>
            {activeSnippet ? <div className="bdv-active-source"><span><BookMarked size={17} />{activeSnippet.section}</span><blockquote>{activeSnippet.excerpt}</blockquote><p><Hash size={15} /> رقم الصفحة {activeSnippet.page} مرتبط بعينة البحث، وليس بمستند PDF أصلي.</p></div> : <p className="bdv-unavailable-citation"><FileWarning size={17} /> لا يوجد مقتطف يمكن الاستشهاد به من هذه الصفحة في بيانات العرض.</p>}
            <div className="bdv-source-actions"><Button variant="outline" size="sm" disabled={!canCite || !currentCitation} leadingIcon={<ClipboardCopy size={16} />} onClick={() => currentCitation && copyText(currentCitation, "تم نسخ الاستشهاد التدريبي")}>نسخ الاستشهاد</Button><Button variant="outline" size="sm" leadingIcon={<ClipboardCopy size={16} />} onClick={() => copyText(window.location.href, "تم نسخ رابط الصفحة")}>نسخ رابط الصفحة</Button><button type="button" className="bdv-disabled-pdf" disabled aria-label="ملف PDF غير متاح في النموذج التجريبي"><FileText size={16} /> عرض PDF الأصلي غير متاح</button></div>
          </section>
        </div>
      </div>
      <footer className="bdv-footer"><Info size={16} /> عند ربط النظام الفعلي يجب تقديم ملف PDF مصرح به أو صورة صفحة من الخادم، وتطابق الصفحة والمقتطف والاستشهاد مع الوثيقة الأصلية.</footer>
    </>}
    {notice && <div className="bdv-toast"><Toast {...notice} onClose={() => setNotice(null)} /></div>}
  </div>;
}

export function DocumentViewerScreen({ documentId, initialPage, initialSnippetId }: { documentId: string | null; initialPage: number; initialSnippetId: string | null }) {
  const router = useRouter();
  return <DemoAccessProvider initialRole="employee"><ChatLayout variant="feature" onNewChat={() => router.push("/")} onHistory={() => router.push("/conversations")}><ViewerBody documentId={documentId} initialPage={initialPage} initialSnippetId={initialSnippetId} /></ChatLayout></DemoAccessProvider>;
}
