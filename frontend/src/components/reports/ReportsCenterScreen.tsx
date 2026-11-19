"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDownToLine, ArrowLeft, BarChart3, CalendarDays, CheckCircle2, ChevronLeft, ClipboardList, Clock3, Download, FileText, FileClock, FileSpreadsheet, FileWarning, FilterX, FolderOpen, Info, LockKeyhole, Plus, Search, ShieldCheck, SlidersHorizontal, SortAsc, Sparkles, XCircle } from "lucide-react";
import { ChatLayout } from "@/components/layout";
import { Button, Badge, Drawer, Toast, Dialog } from "@/components/ui";
import { StatePanel } from "@/components/states";
import { ORGANIZATION_ROUTES, buildReportDetailUrl } from "@/lib/routes";
import { DemoAccessProvider, DemoRolePicker, useDemoAccess } from "@/components/access/DemoAccess";
import { canDownloadReport, filterReports, initialReportFilters, makeDemoReportCsv, makeDemoReports, reportKindLabels, reportStats, reportStatusLabels, type DemoReport, type ReportFilters, type ReportKindFilter, type ReportMonthFilter, type ReportSort, type ReportStatus, type ReportStatusFilter } from "@/lib/reports/reports";

type Notice = { title: string; message: string; tone: "success" | "warning" | "info" | "danger" };
const colors: Record<ReportStatus, "success" | "info" | "warning" | "danger"> = { ready: "success", processing: "info", failed: "danger", draft: "warning" };
const fmt = new Intl.DateTimeFormat("ar-EG", { day: "numeric", month: "short", year: "numeric" });
const dateLabel = (date: string) => fmt.format(new Date(`${date}T12:00:00Z`));
const fmtNum = (n: number) => new Intl.NumberFormat("ar-EG").format(n);
function ReportStatusBadge({ status }: { status: ReportStatus }) { const Icon = status === "ready" ? CheckCircle2 : status === "processing" ? Clock3 : status === "failed" ? XCircle : FileClock; return <Badge tone={colors[status]}><Icon size={13} />{reportStatusLabels[status]}</Badge>; }
function ReportPreview({ report, canExport, onExport }: { report: DemoReport; canExport: boolean; onExport: (report: DemoReport) => void }) {
  const available = canDownloadReport(report, canExport), max = Math.max(1, ...report.rows.map(r => r.value));
  return <div className="brc-preview" data-testid="report-details">
    <header className="brc-preview-head"><FileText size={32} /><div><small>{reportKindLabels[report.kind]} · نموذج تدريبي</small><h3>{report.title}</h3><ReportStatusBadge status={report.status} /></div></header>
    <p className="brc-muted">{report.description}</p>
    <dl className="brc-metadata">{[["المعرّف", report.id], ["تاريخ الإنشاء", dateLabel(report.createdAt)], ["الجهة", report.owner], ["الفترة", report.period], ["التصنيف", report.classification], ["المصدر", report.source]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    {report.status === "ready" ? <><section className="brc-detail"><h4><BarChart3 size={17} /> ملخص مؤشرات تدريبية</h4><div className="brc-mini-metrics">{report.metrics.map(m => <div key={m.label}><small>{m.label}</small><strong>{m.value}</strong></div>)}</div></section><section className="brc-detail"><h4>معاينة البيانات</h4>{report.rows.map(row => <div className="brc-data-row" key={row.label}><span>{row.label}</span><div className="brc-bar"><i style={{ width: `${Math.max(3, row.value / max * 100)}%` }} /></div><strong>{fmtNum(row.value)} <small>{row.unit}</small></strong></div>)}</section></> : <div className="brc-not-ready"><Info size={19} /><p>{report.status === "processing" ? "حالة انتظار تدريبية، ولا توجد مهمة إنشاء حقيقية على الخادم." : report.status === "draft" ? "هذه مسودة تدريبية ولم تُنشأ لها نتائج بعد." : "فشل افتراضي لأغراض اختبار الواجهة، وليس خطأ خادم فعليًا."}</p></div>}
    <div className="brc-warning"><Info size={18} /><span>{report.note} جميع الأرقام افتراضية وغير صالحة للاستشهاد الرسمي.</span></div>
    <div className="brc-actions"><Button variant="primary" leadingIcon={<Download size={16} />} disabled={!available} onClick={() => onExport(report)}>تصدير CSV تجريبي</Button><Link className="brc-detail-link brc-detail-link--large" style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "#008795", background: "#eff9fa", border: "1px solid #c9e6e9", padding: "7px 10px", borderRadius: 8, fontSize: 11, fontWeight: 900, whiteSpace: "nowrap" }} href={buildReportDetailUrl(report.id)} data-contract-href="/reports/detail?report=">فتح المعاينة الكاملة <ArrowLeft size={15} /></Link></div>
  </div>;
}
function ReportsBody() {
  const { can } = useDemoAccess(), canView = can("reports.view"), canCreate = can("reports.create"), canExport = can("reports.export");
  const [reports] = useState<DemoReport[]>(() => makeDemoReports());
  const [filters, setFilters] = useState<ReportFilters>(initialReportFilters);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [notice, setNotice] = useState<Notice | null>(null);
  useEffect(() => { if (!canView) { setSelectedId(null); } }, [canView]);
  const visible = useMemo(() => filterReports(reports, filters), [reports, filters]);
  const stats = useMemo(() => reportStats(reports), [reports]);
  const selected = reports.find(r => r.id === selectedId) ?? null;
  const changed = filters.query.trim() !== "" || filters.kind !== "all" || filters.status !== "all" || filters.month !== "all" || filters.sort !== "newest";
  const setFilter = <K extends keyof ReportFilters>(key: K, value: ReportFilters[K]) => setFilters(f => ({ ...f, [key]: value }));
  function download(report: DemoReport) {
    if (!canDownloadReport(report, canExport)) return;
    const blob = new Blob([makeDemoReportCsv(report)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob), link = document.createElement("a"); link.href = url; link.download = `bayan-demo-report-${report.id}.csv`; document.body.appendChild(link); link.click(); link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice({ title: "تم تجهيز CSV تجريبي", message: "الملف تم إنشاؤه من أمثلة محلية خيالية، دون استعلامات أو تقارير حقيقية.", tone: "success" });
  }
  return <div className="brc" data-testid="reports-center-screen">
    <nav className="brc-breadcrumb" aria-label="مسار التنقل"><Link href={ORGANIZATION_ROUTES.home}>الرئيسية</Link><ChevronLeft size={15} /><span aria-current="page">مركز التقارير</span></nav>
    <header className="brc-hero"><div><span className="brc-overline"><Sparkles size={15} /> إعداد التقارير والتحليلات</span><h1>مركز التقارير</h1><p>استعرض التقارير وحالات الإنشاء والبيانات المرتبطة بها، ثم افتح المعاينة أو صدّر نسخة تجريبية.</p><div className="brc-hero-tags"><span><ShieldCheck size={15} /> عرض وفق الصلاحيات</span><span><BarChart3 size={15} /> تقارير أكاديمية وإدارية</span></div></div><span className="brc-hero-symbol" aria-hidden="true"><FileText size={76} /></span></header>
    <div className="brc-disclaimer" role="note"><Info size={21} /><p><strong>بيانات تجريبية:</strong> التقارير والأعداد والمصادر الواردة في هذه الشاشة أمثلة مصطنعة، وليست نتائج من نظام الجامعة أو قاعدة البيانات. يعمل تنزيل CSV محليًا فقط، ويمكنك من المعاينة الكاملة تنزيل Excel تجريبي وحفظ PDF باستخدام الطباعة.</p></div>
    <section className="brc-role-row"><div><LockKeyhole size={18} /> الصلاحيات التجريبية تخص شكل العرض فقط؛ يجب أن يفرض FastAPI صلاحيات كل مؤسسة.</div><DemoRolePicker id="brc-demo-role" /></section>
    {!canView ? <div className="brc-no-access"><StatePanel state="forbidden" title="لا تملك صلاحية عرض تقارير المؤسسة" description="مسؤول المنصة لا يرث صلاحيات الاطلاع على بيانات المؤسسات. حالة منع وصول تجريبية فقط." /></div> : <>
      <section className="brc-stats" aria-label="إحصائيات التقارير التجريبية">{[
        { label: "إجمالي التقارير", value: stats.total, icon: ClipboardList, color: "blue" }, { label: "تقارير جاهزة", value: stats.ready, icon: CheckCircle2, color: "teal" }, { label: "قيد الإنشاء", value: stats.processing, icon: Clock3, color: "blue" }, { label: "مسودات أو تتطلب مراجعة", value: stats.needsAttention, icon: FileWarning, color: "amber" }
      ].map(item => <div className="brc-stat" key={item.label}><span className={`brc-stat-icon brc-stat-icon--${item.color}`}><item.icon size={23} /></span><div><small>{item.label}</small><strong>{item.value}</strong></div></div>)}</section>
      <section className="brc-card" aria-label="تصفية التقارير"><div className="brc-card-head"><div><h2><SlidersHorizontal size={20} /> البحث والتصفية</h2><p>ابحث في العناوين أو الجهات أو مصادر البيانات، وصفِّ التقارير حسب النوع والحالة.</p></div><div className="brc-head-actions"><Link href={ORGANIZATION_ROUTES.analytics} className="brc-secondary-link"><BarChart3 size={17} /> التحليلات</Link>{canCreate && <Link href={ORGANIZATION_ROUTES.reportNew} className="brc-create-link" data-testid="reports-new-link"><Plus size={17} /> تقرير جديد <small>معالج تفاعلي</small></Link>}</div></div>
        <div className="brc-filters"><label className="brc-search"><Search size={19} /><input type="search" aria-label="البحث في التقارير" placeholder="ابحث عن تقرير أو جهة..." value={filters.query} onChange={e => setFilter("query", e.target.value)} /></label>
          <label className="brc-field"><span>نوع التقرير</span><select aria-label="نوع التقرير" value={filters.kind} onChange={e => setFilter("kind", e.target.value as ReportKindFilter)}><option value="all">جميع الأنواع</option>{Object.entries(reportKindLabels).map(([k, v]) => <option value={k} key={k}>{v}</option>)}</select></label>
          <label className="brc-field"><span>حالة التقرير</span><select aria-label="حالة التقرير" value={filters.status} onChange={e => setFilter("status", e.target.value as ReportStatusFilter)}><option value="all">جميع الحالات</option>{Object.entries(reportStatusLabels).map(([k, v]) => <option value={k} key={k}>{v}</option>)}</select></label>
          <label className="brc-field"><span>شهر الإنشاء</span><select aria-label="شهر الإنشاء" value={filters.month} onChange={e => setFilter("month", e.target.value as ReportMonthFilter)}><option value="all">جميع الأشهر</option><option value="2026-11">نوفمبر 2026</option><option value="2026-10">أكتوبر 2026</option><option value="2026-09">سبتمبر 2026</option></select></label>
        </div>
      </section>
      <section className="brc-card" aria-label="التقارير"><div className="brc-card-head"><div><h2><FolderOpen size={20} /> التقارير <span className="brc-count">{visible.length}</span></h2><p>نتائج نموذجية تمثل حالات التقرير من البداية وحتى الجاهزية.</p></div><div className="brc-head-actions">{changed && <button type="button" className="brc-clear" onClick={() => setFilters(initialReportFilters)}><FilterX size={16} /> مسح المرشحات</button>}<label className="brc-sort"><SortAsc size={16} /><select aria-label="ترتيب التقارير" value={filters.sort} onChange={e => setFilter("sort", e.target.value as ReportSort)}><option value="newest">الأحدث أولًا</option><option value="oldest">الأقدم أولًا</option><option value="title">حسب الاسم</option></select></label></div></div>
        {!visible.length ? <div className="brc-empty" data-testid="reports-empty"><FileWarning size={45} /><h3>لا توجد تقارير مطابقة</h3><p>جرّب تغيير البحث أو الفلاتر الحالية.</p><Button variant="outline" onClick={() => setFilters(initialReportFilters)}>إظهار جميع التقارير</Button></div> : <div className="brc-table-scroller"><table className="brc-table" aria-label="التقارير التجريبية"><thead><tr><th>اسم التقرير</th><th>النوع</th><th>الجهة والفترة</th><th>تاريخ الإنشاء</th><th>الحالة</th><th>الإجراءات</th></tr></thead><tbody>{visible.map(r => <tr key={r.id} data-testid="report-row"><td><div className="brc-report-name"><span><FileText size={19} /></span><div><strong>{r.title}</strong><small>{r.description}</small></div></div></td><td><span className="brc-kind">{reportKindLabels[r.kind]}</span></td><td><div className="brc-secondary-cell"><strong>{r.owner}</strong><small>{r.period}</small></div></td><td className="brc-date"><CalendarDays size={15} />{dateLabel(r.createdAt)}</td><td><ReportStatusBadge status={r.status} /></td><td><div className="brc-row-actions"><Button size="sm" variant="outline" onClick={() => setSelectedId(r.id)}>التفاصيل</Button><Link className="brc-detail-link" style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "#008795", background: "#eff9fa", border: "1px solid #c9e6e9", padding: "7px 10px", borderRadius: 8, fontSize: 11, fontWeight: 900, whiteSpace: "nowrap" }} href={buildReportDetailUrl(r.id)} data-contract-href="/reports/detail?report=" aria-label={`معاينة كاملة ${r.title}`}>معاينة كاملة</Link>{canDownloadReport(r, canExport) && <button type="button" title="تصدير CSV تجريبي" aria-label={`تصدير CSV ${r.title}`} onClick={() => download(r)}><ArrowDownToLine size={17} /></button>}</div></td></tr>)}</tbody></table></div>}
        <div className="brc-footer"><span>المعروض {visible.length} من {reports.length} تقرير تدريبي</span><span><ShieldCheck size={15} /> لا توجد طلبات API أو استعلامات حقيقية</span></div>
      </section>
      <div className="brc-footer-link"><p><Info size={16} /> ستُربط حالات الإنشاء بالمُعالج الحقيقي في Backend لاحقًا.</p><Link href={ORGANIZATION_ROUTES.conversations}>سجل المحادثات <ArrowLeft size={17} /></Link></div>
    </>}
    <Drawer open={Boolean(selected) && canView} onClose={() => setSelectedId(null)} title="تفاصيل التقرير" description="معاينة تجريبية؛ ليست تقريرًا رسميًا">{selected && <ReportPreview report={selected} canExport={canExport} onExport={download} />}</Drawer>

    {notice && <div className="brc-toast"><Toast {...notice} onClose={() => setNotice(null)} /></div>}
  </div>;
}
export function ReportsCenterScreen() { return <DemoAccessProvider initialRole="manager"><ChatLayout variant="feature"><ReportsBody /></ChatLayout></DemoAccessProvider>; }
