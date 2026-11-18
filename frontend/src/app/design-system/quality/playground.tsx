"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ClipboardCheck, Download, RotateCcw, Search, ShieldAlert, CheckCircle2, CircleDashed, CircleX, CirclePause, FileText } from "lucide-react";
import checklist from "@/lib/quality/checklist.json";

type Status = "not_run" | "passed" | "failed" | "blocked";
type Category = "all" | "screen" | "flow" | "accessibility" | "security" | "visual";
type RecordItem = { status: Status; note: string; updatedAt?: string };
type Stored = { version: 1; tester: string; results: Record<string, RecordItem> };

const statusLabels: Record<Status, string> = { not_run: "لم يُختبر", passed: "نجح يدويًا", failed: "فشل", blocked: "معطّل" };
const categories: { id: Category; label: string }[] = [
  { id: "all", label: "جميع الاختبارات" },
  { id: "screen", label: "الشاشات الـ42" },
  { id: "flow", label: "رحلات الاستخدام والأخطاء" },
  { id: "accessibility", label: "إمكانية الوصول" },
  { id: "security", label: "الصلاحيات والأمن" },
  { id: "visual", label: "المطابقة البصرية" },
];
const STORE_KEY = "bayan-design-system-qa-stage7-v1";

export function QualityPlayground() {
  const [tester, setTester] = useState("");
  const [results, setResults] = useState<Record<string, RecordItem>>({});
  const [ready, setReady] = useState(false);
  const [category, setCategory] = useState<Category>("all");
  const [priority, setPriority] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>("UC-01");
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const value = JSON.parse(raw) as Partial<Stored>;
        if (value.version === 1 && value.results && typeof value.results === "object") {
          setResults(value.results);
          setTester(typeof value.tester === "string" ? value.tester : "");
        }
      }
    } catch { /* corrupted or disabled storage: start a new local checklist */ }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(STORE_KEY, JSON.stringify({ version: 1, tester, results } satisfies Stored)); }
    catch { /* local storage is optional; exporting JSON remains available */ }
  }, [ready, tester, results]);

  const filtered = useMemo(() => checklist.filter(item => {
    const text = `${item.title} ${item.route} ${item.id} ${item.source}`.toLowerCase();
    return (category === "all" || item.type === category) &&
      (priority === "all" || item.priority === priority) &&
      (statusFilter === "all" || (results[item.id]?.status ?? "not_run") === statusFilter) &&
      text.includes(query.trim().toLowerCase());
  }), [category, priority, statusFilter, query, results]);

  const counts = useMemo(() => checklist.reduce((acc, item) => {
    const status = results[item.id]?.status ?? "not_run";
    acc[status]++;
    return acc;
  }, { not_run: 0, passed: 0, failed: 0, blocked: 0 } as Record<Status, number>), [results]);

  const current = checklist.find(item => item.id === selected);
  const currentRecord = current ? results[current.id] : undefined;

  const update = (id: string, patch: Partial<RecordItem>) => {
    setResults(old => ({ ...old, [id]: {
      status: old[id]?.status ?? "not_run", note: old[id]?.note ?? "", ...patch,
      updatedAt: new Date().toISOString(),
    } }));
  };

  const exportResults = () => {
    const payload = {
      project: "Bayan Design System", schemaVersion: 1,
      tester: tester.trim() || "غير محدد", exportedAt: new Date().toISOString(),
      totals: counts,
      cases: checklist.map(item => ({ ...item, outcome: results[item.id] ?? { status: "not_run", note: "" } })),
      disclaimer: "نتائج يدوية محلية أدخلها المختبر؛ لا تمثل اختبارات آلية ولا موافقة إصدار إنتاجي.",
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = "bayan-stage7-qa-results.json"; document.body.appendChild(anchor);
    anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
  };

  const clearResults = () => { setResults({}); setTester(""); setConfirmReset(false); };
  return <div className="b7-main" dir="rtl">
    <div className="b7-notice"><ShieldAlert size={21} aria-hidden="true"/><div><strong>اختبارات القبول ليست مكتملة تلقائيًا.</strong><p>كل الحالات تبدأ «لم يُختبر». تغيير النتيجة إجراء يدوي يسجّله المختبر محليًا على جهازه، وليس نتيجة تشغيل Backend أو شهادة أمان أو امتثال.</p></div></div>

    <div className="b7-metrics" aria-label="ملخص حالة الاختبارات">
      <div className="b7-metric"><strong>{checklist.length}</strong><span>حالة قبول مخططة</span><FileText aria-hidden="true"/></div>
      <div className="b7-metric b7-metric--green"><strong>{counts.passed}</strong><span>اجتازت يدويًا</span><CheckCircle2 aria-hidden="true"/></div>
      <div className="b7-metric b7-metric--red"><strong>{counts.failed}</strong><span>فشلت</span><CircleX aria-hidden="true"/></div>
      <div className="b7-metric b7-metric--muted"><strong>{counts.not_run}</strong><span>لم تُختبر</span><CircleDashed aria-hidden="true"/></div>
      <div className="b7-metric b7-metric--amber"><strong>{counts.blocked}</strong><span>معطّلة</span><CirclePause aria-hidden="true"/></div>
    </div>

    <div className="b7-layout">
      <section className="b7-surface b7-list-panel" aria-label="قائمة اختبارات القبول">
        <div className="b7-panel-head"><div><h2>سجل الاختبارات</h2><p>42 شاشة، وحالات الاستخدام UC-01 إلى UC-07، واختبارات العرض والأمن وإمكانية الوصول.</p></div><span className="b7-count">{filtered.length} نتيجة</span></div>
        <div className="b7-filters">
          <label className="b7-search"><Search size={18} aria-hidden="true"/><span className="b7-sr-only">البحث في الاختبارات</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="ابحث عن شاشة أو UC أو مسار..." /></label>
          <label><span>التصنيف</span><select value={category} onChange={e => setCategory(e.target.value as Category)}>{categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</select></label>
          <label><span>الأولوية</span><select value={priority} onChange={e => setPriority(e.target.value)}><option value="all">جميع الأولويات</option><option value="P0">P0 — حرجة</option><option value="P1">P1 — مهمة</option><option value="P2">P2 — لاحقة</option></select></label>
          <label><span>النتيجة</span><select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option value="all">جميع النتائج</option>{(Object.keys(statusLabels) as Status[]).map(s => <option value={s} key={s}>{statusLabels[s]}</option>)}</select></label>
        </div>
        <div className="b7-scroll"><table className="b7-table"><caption className="b7-sr-only">اختبارات النظام وحالة اجتيازها</caption><thead><tr><th scope="col">الاختبار</th><th scope="col">الأولوية</th><th scope="col">النتيجة</th><th scope="col">فتح</th></tr></thead><tbody>{filtered.map(item => {
          const status = results[item.id]?.status ?? "not_run";
          return <tr key={item.id} className={selected === item.id ? "is-selected" : ""}><td><span className="b7-id" dir="ltr">{item.id}</span><strong>{item.title}</strong><small dir="ltr">{item.route}</small></td><td><span className={`b7-priority b7-priority--${item.priority}`}>{item.priority}</span></td><td><span className={`b7-status b7-status--${status}`}>{statusLabels[status]}</span></td><td><button type="button" className="b7-row-button" onClick={() => setSelected(item.id)} aria-label={`تفاصيل اختبار ${item.title}`}>تفاصيل</button></td></tr>;
        })}</tbody></table>{filtered.length === 0 && <p className="b7-empty">لا توجد اختبارات تطابق عوامل البحث الحالية.</p>}</div>
      </section>

      <aside className="b7-surface b7-details" aria-label="تفاصيل الاختبار المختار">
        <div className="b7-panel-head"><div><h2>تفاصيل ومعايير القبول</h2><p>اقرأ المعايير قبل تسجيل أي نتيجة.</p></div><ClipboardCheck size={22} color="var(--bayan-action-primary)"/></div>
        {current ? <div className="b7-details-body" key={current.id}>
          <span className="b7-id" dir="ltr">{current.id} · {current.priority}</span><h3>{current.title}</h3><Link href={current.route} className="b7-route" target="_blank" rel="noopener noreferrer">افتح شاشة المعاينة: <span dir="ltr">{current.route}</span></Link>
          <p className="b7-check-heading">معايير التحقق</p><ul className="b7-criteria">{current.checks.map((check, i) => <li key={i}>{check}</li>)}</ul>
          <label className="b7-field"><span>اسم المختبر</span><input value={tester} onChange={e => setTester(e.target.value)} placeholder="اسم عضو الفريق أو رمز الاختبار"/></label>
          <label className="b7-field"><span>نتيجة الاختبار اليدوي</span><select value={currentRecord?.status ?? "not_run"} onChange={e => update(current.id, { status: e.target.value as Status })}>{(Object.keys(statusLabels) as Status[]).map(s => <option key={s} value={s}>{statusLabels[s]}</option>)}</select></label>
          <label className="b7-field"><span>ملاحظات أو رابط دليل الفحص</span><textarea rows={4} value={currentRecord?.note ?? ""} onChange={e => update(current.id, { note: e.target.value })} placeholder="مثال: العرض 390px، متصفح Chrome، المشكلة أو نتيجة الاختبار..."/></label>
          <p className="b7-timestamp">{currentRecord?.updatedAt ? `آخر تحديث محلي: ${new Date(currentRecord.updatedAt).toLocaleString("ar")}` : "لم تُسجّل نتيجة لهذا الاختبار بعد."}</p>
        </div> : <p className="b7-empty">اختر اختبارًا لعرض معايير قبوله.</p>}
      </aside>
    </div>
    <div className="b7-toolbar"><div><h2>تصدير سجل الجودة</h2><p>يمكن حفظ نتائج الفحص اليدوي في ملف JSON وإرفاقه بتقرير المشروع. لا تُرسَل البيانات إلى خادم.</p></div><div className="b7-toolbar-actions"><button className="b7-action b7-action--primary" onClick={exportResults}><Download size={18}/> تصدير نتائج QA</button>{!confirmReset?<button className="b7-action" onClick={() => setConfirmReset(true)}><RotateCcw size={17}/> إعادة تعيين</button>:<><span>هل تريد مسح كل النتائج المحلية؟</span><button className="b7-action b7-action--danger" onClick={clearResults}>نعم، امسح</button><button className="b7-action" onClick={() => setConfirmReset(false)}>إلغاء</button></>}</div></div>
  </div>;
}
