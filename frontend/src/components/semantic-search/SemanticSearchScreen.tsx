"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, ArrowUpRight, BookMarked, BookOpen, BookOpenCheck, Check,
  ChevronLeft, ClipboardCopy, Database, FileCheck2, FileSearch,
  FileText, Filter, Hash, Info, Layers3, LibraryBig, LockKeyhole,
  RotateCcw, Search, ShieldCheck, SlidersHorizontal, Sparkles,
  Tags, X
} from "lucide-react";
import { ChatLayout } from "@/components/layout";
import { viewerHref } from "@/lib/document-viewer/viewer";
import { Badge, Button, Drawer, Toast } from "@/components/ui";
import { StatePanel } from "@/components/states";
import { DemoAccessProvider, DemoRolePicker, useDemoAccess } from "@/components/access/DemoAccess";
import { ORGANIZATION_ROUTES } from "@/lib/routes";
import {
  categoryLabels, defaultOptions, demoSnippets, documentOptions, makeCitation, maxQueryLength,
  searchDemoSnippets, searchSuggestions, tokenize, validateSearchQuery,
  type SearchCategory, type SearchOptions, type SearchMatch, type Snippet,
  type RelevanceBand, type SortMode,
} from "@/lib/semantic-search/search";

type Notice = { title: string; message: string; tone: "success" | "warning" | "info" | "danger" };
const categoryChoices: { id: SearchCategory; label: string }[] = [
  { id: "all", label: "كل التصنيفات" },
  { id: "regulations", label: "اللوائح" },
  { id: "guides", label: "الأدلة" },
  { id: "policies", label: "السياسات" },
  { id: "forms", label: "النماذج" }
];

function Excerpt({ text, terms }: { text: string; terms: string[] }) {
  // Render as React text nodes: no HTML injection, and highlighting is visual only.
  const words = terms.filter(term => term.length > 2).slice(0, 7);
  if (!words.length) return <>{text}</>;
  const escaped = words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const rx = new RegExp(`(${escaped.join("|")})`, "gi");
  return <>{text.split(rx).map((part, i) => words.some(w => w.toLowerCase() === part.toLowerCase()) ? <mark key={i}>{part}</mark> : <span key={i}>{part}</span>)}</>;
}

function ResultCard({ match, index, query, onPreview, onCopy }: {
  match: SearchMatch; index: number; query: string;
  onPreview: (doc: Snippet) => void; onCopy: (doc: Snippet) => void;
}) {
  const { record, score } = match;
  const isHigh = score >= 90;
  return <article className="bss-result" data-testid="semantic-result">
    <div className="bss-result-top">
      <div className="bss-doc-icon"><FileText size={25} aria-hidden="true" /></div>
      <div className="bss-result-title"><div className="bss-result-kind"><span>نتيجة {index + 1}</span><Badge tone="info">{categoryLabels[record.category]}</Badge></div>
        <h3>{record.documentTitle}</h3><p>{record.section}</p></div>
      <span className={`bss-score ${isHigh ? "bss-score--high" : ""}`} aria-label={`درجة صلة توضيحية ${score} بالمئة`}><strong>{score}%</strong><small>صلة توضيحية</small></span>
    </div>
    <div className="bss-excerpt"><span className="bss-quote-mark" aria-hidden="true">“</span><p><Excerpt text={record.excerpt} terms={tokenize(query)} /></p></div>
    <div className="bss-result-foot"><div className="bss-result-meta"><span><BookOpen size={15} /> {record.documentTitle.replace(" — مثال تدريبي", "")}</span><span><Hash size={15} /> الصفحة {record.page}</span><span><Layers3 size={15} /> مقطع مسترجع تجريبي</span></div>
      <div className="bss-result-actions"><Link className="bss-viewer-link" href={viewerHref(record.documentId, record.page, record.id)}><BookOpen size={15} /> عرض الصفحة</Link><Button size="sm" variant="outline" onClick={() => onCopy(record)} leadingIcon={<ClipboardCopy size={15} />}>نسخ الاستشهاد</Button><Button size="sm" onClick={() => onPreview(record)} leadingIcon={<BookOpenCheck size={16} />}>معاينة المصدر</Button></div>
    </div>
  </article>;
}

function SearchContent() {
  const { can } = useDemoAccess(); const canSearch = can("documents.search"), canViewCitation = can("citations.view");
  const [draft, setDraft] = useState("الغياب والحرمان");
  const [submittedQuery, setSubmittedQuery] = useState("الغياب والحرمان");
  const [options, setOptions] = useState<SearchOptions>(defaultOptions);
  const [selected, setSelected] = useState<Snippet | null>(null);
  const [pending, setPending] = useState(false);
  const [inputError, setInputError] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const pendingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queryInput = useRef<HTMLInputElement | null>(null);
  const docs = documentOptions();
  const matches = useMemo(() => searchDemoSnippets(submittedQuery, options), [submittedQuery, options]);
  const matchingDocuments = new Set(matches.map(m => m.record.documentId)).size;
  useEffect(() => () => { if (pendingTimer.current !== null) clearTimeout(pendingTimer.current); }, []);
  useEffect(() => { if (!canViewCitation) setSelected(null); }, [canViewCitation]);

  function search(value: string) {
    const validation = validateSearchQuery(value);
    if (validation) {
      setInputError(validation === "empty" ? "اكتب عبارة البحث أولًا." : validation === "short" ? "اكتب ثلاثة أحرف على الأقل." : `الحد الأقصى ${maxQueryLength} حرفًا.`);
      queryInput.current?.focus(); return;
    }
    setInputError(""); setDraft(value.trim()); setPending(true);
    if (pendingTimer.current !== null) clearTimeout(pendingTimer.current);
    pendingTimer.current = setTimeout(() => { setSubmittedQuery(value.trim()); setPending(false); pendingTimer.current = null; }, 320);
  }
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (!canSearch) return; search(draft); }
  function setFilter<K extends keyof SearchOptions>(key: K, value: SearchOptions[K]) {
    setOptions(prev => ({ ...prev, [key]: value })); setSelected(null);
  }
  function resetFilters() { setOptions(defaultOptions); }
  async function copyCitation(item: Snippet) {
    if (!canViewCitation) { setNotice({ title: "الاستشهادات غير متاحة", message: "هذا الدور التجريبي لا يمكنه عرض الاستشهادات.", tone: "warning" }); return; }
    try { await navigator.clipboard.writeText(makeCitation(item)); setNotice({ title: "تم نسخ الاستشهاد التجريبي", message: "لا يمثل النص المنسوخ مرجعًا أكاديميًا معتمدًا.", tone: "success" }); }
    catch { setNotice({ title: "تعذر النسخ", message: "تحقق من أذونات الحافظة أو انسخ النص يدويًا.", tone: "warning" }); }
  }
  function clearSearch() { if (pendingTimer.current !== null) clearTimeout(pendingTimer.current); pendingTimer.current = null; setPending(false); setDraft(""); setSubmittedQuery(""); setInputError(""); queryInput.current?.focus(); }
  const activeFilters = Object.entries(options).filter(([key, value]) => value !== defaultOptions[key as keyof SearchOptions]).length;

  return <div className="bss" data-testid="semantic-search-screen">
    <nav aria-label="مسار التنقل" className="bss-breadcrumb"><Link href={ORGANIZATION_ROUTES.home}>الرئيسية</Link><ChevronLeft size={15} /><Link href={ORGANIZATION_ROUTES.sources}>المستندات</Link><ChevronLeft size={15} /><span aria-current="page">البحث الدلالي</span></nav>
    <header className="bss-hero"><div className="bss-hero-copy"><span className="bss-eyebrow"><Sparkles size={17} /> قاعدة المعرفة المؤسسية</span><h1>البحث الدلالي في المستندات</h1><p>ابحث في اللوائح والأدلة، واستعرض المقاطع المرتبطة بسؤالك مع اسم المصدر ورقم الصفحة.</p><div className="bss-hero-pills"><span><ShieldCheck size={16} /> نتائج وفق الصلاحيات</span><span><BookMarked size={16} /> مصادر موثقة عند الربط</span></div></div><div className="bss-hero-decor" aria-hidden="true"><BookOpenCheck size={65} /><span /></div></header>
    <div role="note" className="bss-demo-banner"><Info size={20} /><p><strong>معاينة تصميمية فقط:</strong> المستندات والمقاطع وأرقام الصفحات والدرجات أدناه <strong>بيانات خيالية للتجربة</strong>، وليست مقتبسة من لوائح فعلية. البحث الحالي مطابقة كلمات محلية؛ لا يتصل بـQdrant ولا يجري بحث RAG دلاليًا حقيقيًا.</p></div>
    <section className="bss-search-panel" aria-labelledby="bss-search-heading"><div className="bss-search-header"><div><h2 id="bss-search-heading"><FileSearch size={21} /> ابحث في المعرفة المؤسسية</h2><p>اكتب سؤالك بالعربية أو اختر اقتراحًا جاهزًا لتجربة النتائج.</p></div><Badge tone="info"><Database size={14} /> بيانات تجريبية</Badge></div>
      <form className="bss-search-form" onSubmit={submit} noValidate><label htmlFor="bss-query">عبارة البحث</label><div className="bss-search-row"><Search size={21} aria-hidden="true" /><input ref={queryInput} id="bss-query" type="search" value={draft} maxLength={maxQueryLength + 30} onChange={e => { setDraft(e.target.value); if (inputError) setInputError(""); }} placeholder="مثال: ما ضوابط الغياب والحرمان؟" aria-invalid={Boolean(inputError)} aria-describedby="bss-search-note" /><Button type="submit" loading={pending} disabled={!canSearch} leadingIcon={<Search size={17} />}>بحث في المستندات</Button></div><div id="bss-search-note" className={`bss-search-note ${inputError ? "invalid" : ""}`} role={inputError ? "alert" : undefined}>{inputError || "تُجرى مطابقة نصية محلية على مقاطع افتراضية؛ النتائج ليست استرجاعًا دلاليًا حقيقيًا."}</div></form>
      <div className="bss-suggestions"><span><Sparkles size={15} /> جرّب البحث عن:</span>{searchSuggestions.map(value => <button type="button" key={value} onClick={() => search(value)} disabled={!canSearch}>{value}<ArrowLeft size={14} /></button>)}{draft !== "" && <button type="button" className="bss-clear-query" onClick={clearSearch}><X size={14} /> مسح</button>}</div>
    </section>
    <div className="bss-workspace">
      <aside className="bss-filters" aria-label="تصفية النتائج"><div className="bss-filters-heading"><h2><SlidersHorizontal size={18} /> تصفية النتائج</h2><button type="button" onClick={resetFilters} disabled={!activeFilters}><RotateCcw size={14} /> إعادة ضبط</button></div>
        <fieldset className="bss-filter-group"><legend><Tags size={17} /> تصنيف المستند</legend>{categoryChoices.map(opt => <label key={opt.id} className="bss-radio-line"><input type="radio" name="bss-category" checked={options.category === opt.id} onChange={() => setFilter("category", opt.id)} /><span>{opt.label}</span></label>)}</fieldset>
        <div className="bss-filter-group"><label className="bss-filter-label" htmlFor="bss-doc"><LibraryBig size={17} /> المستند</label><select id="bss-doc" value={options.documentId} onChange={e => setFilter("documentId", e.target.value)}>{docs.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
        <fieldset className="bss-filter-group"><legend><Filter size={17} /> نطاق الصلة التوضيحية</legend>{[{ id: "all", label: "جميع الدرجات" }, { id: "high", label: "مرتفع (90% فأكثر)" }, { id: "medium", label: "متوسط (75–89%)" }].map(item => <label className="bss-radio-line" key={item.id}><input type="radio" name="bss-band" checked={options.band === item.id} onChange={() => setFilter("band", item.id as RelevanceBand)} /><span>{item.label}</span></label>)}</fieldset>
        <div className="bss-filter-group"><p className="bss-filter-help"><LockKeyhole size={16} /> التطبيق الحقيقي يطبّق صلاحيات الوثائق على الخادم قبل إرجاع النتائج.</p><DemoRolePicker id="bss-role-picker" /></div>
      </aside>
      <section className="bss-results" aria-label="نتائج البحث">
        {!canSearch ? <StatePanel state="forbidden" description="صلاحية البحث في الوثائق غير متاحة لهذا الدور التجريبي. لا تكفي محاكاة الواجهة لحماية المستندات في التطبيق الحقيقي." /> :
          pending ? <div className="bss-pending"><StatePanel state="loading" description="جارٍ محاكاة استرجاع المقاطع التدريبية محليًا. لا يجري الاتصال بخادم RAG." /></div> :
            !submittedQuery ? <StatePanel state="idle" title="ابدأ البحث في المستندات" description="اكتب عبارة بحث أو اختر اقتراحًا لإظهار المقاطع التدريبية." /> :
              <><div className="bss-results-head"><div><h2><FileCheck2 size={20} /> نتائج البحث <span>{matches.length}</span></h2><p>عن «{submittedQuery}» — مستندات افتراضية: {matchingDocuments}</p></div><div className="bss-sort"><label htmlFor="bss-sort">ترتيب حسب</label><select id="bss-sort" value={options.sort} onChange={e => setFilter("sort", e.target.value as SortMode)}><option value="relevance">الأكثر صلة</option><option value="document">اسم المستند</option><option value="page">رقم الصفحة</option></select></div></div>
                <div className="bss-overview"><span><BookOpen size={17} /> {matchingDocuments} مستندات</span><span><FileText size={17} /> {matches.length} مقطعًا</span><span><Info size={17} /> درجات تقريبية للعرض فقط</span></div>
                {matches.length === 0 ? <div className="bss-no-results"><StatePanel state="empty" title="لا توجد مقاطع تجريبية مطابقة" description="جرّب مثالًا مقترحًا أو غيّر فئة المستند أو نطاق الصلة. قاعدة البيانات هنا صغيرة وخيالية." onRetry={() => { resetFilters(); search("الغياب والحرمان"); }} retryLabel="عرض مثال الغياب والحرمان" /></div> :
                  <div className="bss-result-list" aria-live="polite" data-testid="semantic-results">{matches.map((match, i) => <ResultCard key={match.record.id} match={match} index={i} query={submittedQuery} onPreview={record => canViewCitation ? setSelected(record) : setNotice({ title: "تفاصيل الاستشهاد غير متاحة", message: "هذا الدور التجريبي لا يسمح بعرض المصادر.", tone: "warning" })} onCopy={copyCitation} />)}</div>}
              </>}
      </section>
    </div>
    <div className="bss-footer-note"><ShieldCheck size={18} /> في النظام الفعلي يجب إظهار استشهادات موثوقة ومصدر قابل للفتح ورقم صفحة صحيح، مع عزل بيانات المؤسسات والتحقق من الصلاحيات في الخادم.</div>
    <Drawer open={selected !== null && canViewCitation} onClose={() => setSelected(null)} title="معاينة المصدر" description="نموذج توضيحي للاستشهاد والصفحة، دون ملف أصلي" position="end">
      {selected && <div className="bss-preview" data-testid="semantic-source-preview"><div className="bss-preview-title"><FileText size={31} /><div><h3>{selected.documentTitle}</h3><p>{selected.section}</p></div></div><Badge tone="info">الصفحة {selected.page}</Badge><h4>مقطع افتراضي</h4><blockquote>{selected.excerpt}</blockquote><p className="bss-preview-warning"><Info size={17} /> هذا النص مختلق لأغراض اختبار الواجهة. لا تتوفر وثيقة PDF حقيقية أو صفحات فعلية في هذه النسخة.</p><div className="bss-preview-actions"><Button variant="outline" leadingIcon={<ClipboardCopy size={17} />} onClick={() => copyCitation(selected)}>نسخ الاستشهاد التجريبي</Button><Button variant="secondary" onClick={() => setSelected(null)} leadingIcon={<Check size={16} />}>إغلاق المعاينة</Button></div><Link href={viewerHref(selected.documentId, selected.page, selected.id)} className="bss-preview-link"><BookOpenCheck size={17} /> فتح المستند عند الصفحة {selected.page}</Link><Link href={ORGANIZATION_ROUTES.sources} className="bss-preview-link"><ArrowUpRight size={17} /> الانتقال إلى مكتبة المستندات</Link></div>}
    </Drawer>
    {notice && <div className="bss-toast"><Toast {...notice} onClose={() => setNotice(null)} /></div>}
  </div>;
}
export function SemanticSearchScreen() {
  const router = useRouter();
  return <DemoAccessProvider initialRole="employee"><ChatLayout variant="feature" onNewChat={() => router.push(ORGANIZATION_ROUTES.home)} onHistory={() => router.push(ORGANIZATION_ROUTES.conversations)}><SearchContent /></ChatLayout></DemoAccessProvider>;
}
