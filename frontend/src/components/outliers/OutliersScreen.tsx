'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
    AlertCircle, AlertTriangle, ArrowLeft, ArrowUpLeft, BarChart3, CalendarDays,
    CheckCheck, ChevronLeft, ClipboardCheck, Download, FilterX, Info, Layers3,
    LockKeyhole, Search, ShieldAlert, ShieldCheck, SlidersHorizontal,
    Sparkles, Table2, TrendingDown, Workflow, ZoomIn
} from 'lucide-react';
import { ChatLayout } from '@/components/layout';
import { Button, Drawer, Toast } from '@/components/ui';
import { StatePanel } from '@/components/states';
import { DemoAccessProvider, DemoRolePicker, useDemoAccess } from '@/components/access/DemoAccess';
import { ORGANIZATION_ROUTES } from '@/lib/routes';
import { availableDepartments, faculties, periodOptions } from '@/lib/analytics/analytics';
import {
    OUTLIERS_DISCLAIMER, filterOutliers, formatValue, initialOutlierFilters,
    makeDemoOutlierCsv, makeDemoOutliers, metricNames, severityNames,
    statusNames, summarizeOutliers, type Outlier, type OutlierFilters, type ReviewStatus,
    type Severity
} from '@/lib/outliers/outliers';

type Notice = { title: string; message: string; tone: 'success' | 'warning' | 'info' | 'danger' };
const fmt = (n: number) => new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 1 }).format(n);
const STORAGE_KEY = 'bayan.demo.outliers.review.v1';
const statusChoices: ReviewStatus[] = ['new', 'reviewing', 'reviewed'];
const severities: Severity[] = ['critical', 'high', 'medium', 'low'];

function SeverityChip({ severity }: { severity: Severity }) { return <span className={`bo-severity bo-severity--${severity}`}><span aria-hidden="true" />{severityNames[severity]}</span>; }
function StatusChip({ status }: { status: ReviewStatus }) { return <span className={`bo-status bo-status--${status}`}>{statusNames[status]}</span>; }
function CompareBars({ row }: { row: Outlier }) {
    const max = Math.max(1, row.baseline, row.observed);
    return <div className="bo-compare" data-testid="outlier-comparison" aria-label={`مقارنة بين ${formatValue(row.baseline, row.metric)} مرجع تجريبي و${formatValue(row.observed, row.metric)} قيمة مرصودة تجريبية`}>
        <div className="bo-compare-row"><div className="bo-compare-head"><span>خط الأساس الافتراضي</span><b>{formatValue(row.baseline, row.metric)}</b></div><div className="bo-compare-track"><span className="bo-compare-base" style={{ width: `${row.baseline / max * 100}%` }} /></div></div>
        <div className="bo-compare-row"><div className="bo-compare-head"><span>القيمة في البيانات التجريبية</span><b>{formatValue(row.observed, row.metric)}</b></div><div className="bo-compare-track"><span className="bo-compare-observed" style={{ width: `${row.observed / max * 100}%` }} /></div></div>
        <p>فرق نسبي افتراضي: <strong dir="ltr">{row.deltaPct > 0 ? '+' : ''}{fmt(row.deltaPct)}%</strong> · قيمة الانحراف ليست احتمالًا أو تنبؤًا.</p>
    </div>;
}
function OutliersBody() {
    const { can } = useDemoAccess();
    const canView = can('analytics.view'), canExport = can('reports.export');
    const base = useMemo(() => makeDemoOutliers(), []);
    const [filters, setFilters] = useState<OutlierFilters>(initialOutlierFilters);
    const [reviewStatus, setReviewStatus] = useState<Record<string, ReviewStatus>>({});
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [notice, setNotice] = useState<Notice | null>(null);
    const [showMethod, setShowMethod] = useState(false);
    useEffect(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY); if (!raw) return;
            const parsed: unknown = JSON.parse(raw); if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return;
            const allowed = new Set(base.map(r => r.id)); const cleaned: Record<string, ReviewStatus> = {};
            for (const [id, status] of Object.entries(parsed)) if (allowed.has(id) && statusChoices.includes(status as ReviewStatus)) cleaned[id] = status as ReviewStatus;
            setReviewStatus(cleaned);
        } catch {/* private browsing or invalid local data: use defaults */ }
    }, [base]);
    const cases = useMemo(() => base.map(r => ({ ...r, status: reviewStatus[r.id] ?? r.status })), [base, reviewStatus]);
    const filtered = useMemo(() => filterOutliers(cases, filters), [cases, filters]);
    const summary = useMemo(() => summarizeOutliers(filtered), [filtered]);
    const chosen = cases.find(r => r.id === selectedId) ?? null;
    const departments = useMemo(() => availableDepartments(filters.faculty), [filters.faculty]);
    const trends = periodOptions.map(p => ({ period: p.id, label: p.label, ...summarizeOutliers(cases.filter(r => r.period === p.id)) }));
    const maxTrend = Math.max(1, ...trends.map(t => t.total));
    const filterOne = <K extends keyof OutlierFilters>(key: K, value: OutlierFilters[K]) => setFilters(prev => ({ ...prev, [key]: value }));
    function changeStatus(id: string, status: ReviewStatus) {
        const updated = { ...reviewStatus, [id]: status }; setReviewStatus(updated);
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch {/* local persistence may be disabled */ }
        setNotice({ title: 'تم تحديث حالة المراجعة محليًا', message: 'هذا التغيير محاكاة في المتصفح ولا يحدّث سجل التدقيق أو قاعدة البيانات.', tone: 'success' });
    }
    function downloadCsv() {
        if (!canView || !canExport || !filtered.length) return;
        const blob = new Blob([makeDemoOutlierCsv(filtered)], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'bayan-demo-outliers.csv';
        document.body.append(link); link.click(); link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1200);
        setNotice({ title: 'تم تصدير CSV تجريبي', message: 'يحتوي الملف على الحالات المصطنعة الظاهرة بعد التصفية فقط.', tone: 'success' });
    }
    return <main className="ban bo" dir="rtl" data-testid="outliers-screen">
        <nav aria-label="مسار التنقل" className="ban-breadcrumb"><Link href={ORGANIZATION_ROUTES.home}>الرئيسية</Link><ChevronLeft size={15} /><Link href={ORGANIZATION_ROUTES.analytics} data-contract-href="/analytics">لوحة التحليلات</Link><ChevronLeft size={15} /><span aria-current="page">القيم الشاذة</span></nav>
        <header className="ban-hero bo-hero"><div><span className="ban-eyebrow"><Sparkles size={17} /> التحليل المتقدم · نموذج عرض</span><h1>اكتشاف القيم الشاذة</h1><p>استعرض المؤشرات غير المعتادة، وحدد أولويات المراجعة، وقارن القيمة المرصودة بخط أساس توضيحي.</p><div className="ban-hero-tags"><span><ShieldCheck size={15} /> وفق الدور</span><span><CalendarDays size={15} /> فترات متعددة</span><span><ClipboardCheck size={15} /> متابعة المراجعة</span></div></div><div className="ban-hero-art bo-hero-art" aria-hidden="true"><ShieldAlert size={82} /><i /></div></header>
        <div className="ban-disclaimer" role="note"><Info size={21} /><p><strong>بيانات تجريبية فقط:</strong> {OUTLIERS_DISCLAIMER} لا توجد قراءة من FastAPI أو PostgreSQL أو تنفيذ من وكلاء الذكاء الاصطناعي.</p></div>
        <section className="ban-role"><span><LockKeyhole size={18} /> اختيار الدور هنا لأغراض المعاينة فقط، ولا يحل محل التحقق الأمني في الخادم.</span><DemoRolePicker id="bo-role-picker" /></section>
        {!canView ? <div className="ban-locked" data-testid="outliers-forbidden"><StatePanel state="forbidden" title="لا تملك صلاحية عرض القيم الشاذة" description="يمكنك تغيير الدور التجريبي إلى مدير المؤسسة لمعاينة الشاشة. يجب فرض الصلاحيات الحقيقية في الخادم." /><Link href={ORGANIZATION_ROUTES.analytics} data-contract-href="/analytics">العودة إلى التحليلات <ArrowLeft size={16} /></Link></div> : <>
            <section className="ban-panel bo-filters" aria-label="مرشحات القيم الشاذة">
                <div className="ban-section-header"><div><h2><SlidersHorizontal size={20} /> نطاق المراجعة</h2><p>تتغير الإحصائيات والقائمة بحسب الفلاتر المختارة.</p></div><div className="ban-actions"><button className="ban-link-button" type="button" onClick={() => setFilters(initialOutlierFilters)}><FilterX size={17} /> إعادة ضبط</button><Button variant="outline" leadingIcon={<Download size={16} />} disabled={!canExport || !filtered.length} onClick={downloadCsv}>تنزيل CSV تجريبي</Button></div></div>
                <div className="bo-filter-grid">
                    <label><span>الفترة</span><select aria-label="فترة المراجعة" value={filters.period} onChange={e => filterOne('period', e.target.value as OutlierFilters['period'])}><option value="all">جميع الفترات</option>{periodOptions.map(p => <option value={p.id} key={p.id}>{p.label}</option>)}</select></label>
                    <label><span>الكلية</span><select aria-label="كلية المراجعة" value={filters.faculty} onChange={e => setFilters(f => ({ ...f, faculty: e.target.value as OutlierFilters['faculty'], department: 'all' }))}><option value="all">جميع الكليات</option>{faculties.map(f => <option value={f.id} key={f.id}>{f.label}</option>)}</select></label>
                    <label><span>القسم</span><select aria-label="قسم المراجعة" value={filters.department} onChange={e => filterOne('department', e.target.value)}><option value="all">جميع الأقسام</option>{departments.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}</select></label>
                    <label><span>المؤشر</span><select aria-label="مؤشر المراجعة" value={filters.metric} onChange={e => filterOne('metric', e.target.value as OutlierFilters['metric'])}><option value="all">جميع المؤشرات</option>{Object.entries(metricNames).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
                    <label><span>مستوى الخطورة</span><select aria-label="مستوى الخطورة" value={filters.severity} onChange={e => filterOne('severity', e.target.value as OutlierFilters['severity'])}><option value="all">كل المستويات</option>{severities.map(s => <option value={s} key={s}>{severityNames[s]}</option>)}</select></label>
                    <label><span>حالة المراجعة</span><select aria-label="حالة المراجعة" value={filters.status} onChange={e => filterOne('status', e.target.value as OutlierFilters['status'])}><option value="all">كل الحالات</option>{statusChoices.map(s => <option value={s} key={s}>{statusNames[s]}</option>)}</select></label>
                </div>
                <label className="bo-search"><Search size={18} /><input aria-label="البحث في القيم الشاذة" value={filters.search} onChange={e => filterOne('search', e.target.value)} placeholder="ابحث عن اسم الكلية أو القسم أو رمز الحالة..." /></label>
            </section>
            <section className="bo-kpis" aria-label="مؤشرات الحالات" data-testid="outliers-kpis">
                {[{ name: 'الحالات المعروضة', value: summary.total, icon: Layers3 }, { name: 'حالات حرجة', value: summary.critical, icon: ShieldAlert }, { name: 'خطورة مرتفعة', value: summary.high, icon: AlertTriangle }, { name: 'بانتظار إكمال المراجعة', value: summary.pending, icon: ClipboardCheck }].map((card, i) => { const Icon = card.icon; return <article className={`bo-kpi bo-kpi--${i}`} key={card.name}><div className="bo-kpi-icon"><Icon size={22} /></div><div><small>{card.name}</small><strong>{fmt(card.value)}</strong><span>في النتائج المصفاة</span></div></article>; })}
            </section>
            <div className="bo-main-grid">
                <section className="ban-panel" aria-labelledby="bo-month-title"><div className="ban-section-header"><div><h2 id="bo-month-title"><BarChart3 size={21} /> توزع الحالات حسب الفترة</h2><p>تعداد حالات تجريبية وليس مؤشرًا إحصائيًا لواقع المؤسسة.</p></div><span className="ban-tiny-pill">٣ فترات تدريبية</span></div>
                    <div className="bo-month-chart">{trends.map(t => <div key={t.period} className="bo-month"><div className="bo-month-columns"><span style={{ height: `${Math.max(10, t.total / maxTrend * 100)}%` }} title={`${t.total} حالات`}><b>{fmt(t.total)}</b></span></div><strong>{t.label}</strong><small>{fmt(t.critical)} حرجة</small></div>)}</div>
                    <p className="bo-chart-foot"><Info size={16} /> تغيير الفترة في الأعلى يرشح القائمة والبطاقات. يعرض المخطط العدد المرجعي الكامل لجميع الفترات.</p>
                </section>
                <section className="ban-panel bo-severity-card" aria-labelledby="bo-severity-title"><div className="ban-section-header"><div><h2 id="bo-severity-title"><ShieldAlert size={21} /> توزيع الخطورة</h2><p>بحسب قواعد فرق النسبة الافتراضية.</p></div></div>
                    <div className="bo-severity-list">{severities.map(s => { const n = filtered.filter(r => r.severity === s).length; return <div key={s}><div className="bo-severity-line"><span><SeverityChip severity={s} /></span><b>{fmt(n)}</b></div><div className="bo-severity-track"><span className={`bo-severity-fill bo-severity-fill--${s}`} style={{ width: `${summary.total ? n / summary.total * 100 : 0}%` }} /></div></div>; })}</div>
                    <button className="bo-method-button" type="button" aria-expanded={showMethod} onClick={() => setShowMethod(v => !v)}><Info size={16} />{showMethod ? 'إخفاء طريقة التصنيف' : 'كيف صُنفت الحالات؟'}</button>
                    {showMethod && <p className="bo-method-text">حرجة: 25% فأكثر، مرتفعة: من 15% إلى أقل من 25%، متوسطة: من 9% إلى أقل من 15%، منخفضة: أقل من 9%. هذه عتبات للعرض فقط وليست سياسة فعلية أو نموذج تنبؤ.</p>}
                </section>
            </div>
            <section className="ban-panel bo-table-section" aria-labelledby="bo-table-title">
                <div className="ban-section-header"><div><h2 id="bo-table-title"><Table2 size={21} /> قائمة الحالات غير المعتادة</h2><p>انقر «عرض التفاصيل» لفحص المقارنة وتحديث حالة المراجعة محليًا.</p></div><span className="ban-tiny-pill">{fmt(filtered.length)} حالة</span></div>
                {filtered.length ? <div className="ban-table-wrapper"><table className="ban-table bo-table" data-testid="outliers-table"><thead><tr><th>الحالة</th><th>الكلية / القسم</th><th>المؤشر</th><th>المرجع الافتراضي</th><th>القيمة المعروضة</th><th>الانحراف</th><th>الخطورة</th><th>المراجعة</th><th>الإجراء</th></tr></thead><tbody>{filtered.map(r => <tr key={r.id}><td><strong dir="ltr">{r.id}</strong><small>{periodOptions.find(p => p.id === r.period)?.label}</small></td><td><strong>{r.departmentLabel}</strong><small>{r.facultyLabel}</small></td><td>{r.metricLabel}</td><td className="ban-numeric">{formatValue(r.baseline, r.metric)}</td><td className="ban-numeric">{formatValue(r.observed, r.metric)}</td><td><span className={`bo-delta ${r.deltaPct > 0 ? 'bo-delta--up' : 'bo-delta--down'}`} dir="ltr">{r.deltaPct > 0 ? '+' : ''}{fmt(r.deltaPct)}%</span></td><td><SeverityChip severity={r.severity} /></td><td><StatusChip status={r.status} /></td><td><button type="button" className="ban-row-action" onClick={() => setSelectedId(r.id)} aria-label={`عرض تفاصيل ${r.id}`}><ZoomIn size={15} /> عرض التفاصيل</button></td></tr>)}</tbody></table></div> : <div className="bo-empty" data-testid="outliers-empty"><AlertCircle size={32} /><h3>لا توجد حالات تطابق الفلاتر</h3><p>جرّب إزالة أحد المرشحات أو إعادة ضبط البحث.</p><button className="ban-link-button" type="button" onClick={() => setFilters(initialOutlierFilters)}>عرض الحالات الافتراضية</button></div>}
                <p className="ban-table-note">لا تمثل درجات الخطورة تصنيفًا معتمدًا للطلاب أو الأقسام. مراجعة الحالة محليًا لا تترتب عليها قرارات مؤسسية أو تحديث بيانات حقيقية.</p>
            </section>
            <section className="ban-bottom bo-footer"><div><Workflow size={19} /><p><strong>ماذا بعد؟</strong> تحقق من جودة بيانات المصدر والسياق قبل اعتماد أي استنتاج. لا تساوي هذه المقارنات اكتشافًا إحصائيًا فعليًا؛ الربط مع الوكلاء وقواعد البيانات مرحلة لاحقة.</p></div><div className="ban-bottom-links"><Link href={ORGANIZATION_ROUTES.analytics} data-contract-href="/analytics">العودة إلى لوحة التحليلات <ArrowLeft size={16} /></Link><Link href={ORGANIZATION_ROUTES.reports}>مركز التقارير <ArrowUpLeft size={15} /></Link></div></section>
        </>}
        <Drawer open={Boolean(chosen) && canView} onClose={() => setSelectedId(null)} title={chosen ? `تفاصيل الحالة ${chosen.id}` : 'تفاصيل الحالة'} description="تحليل توضيحي ضمن بيانات افتراضية">
            {chosen && <div className="bo-drawer-body" data-testid="outlier-details"><div className="bo-drawer-head"><SeverityChip severity={chosen.severity} /><StatusChip status={chosen.status} /></div><h3>{chosen.metricLabel} — {chosen.departmentLabel}</h3><p className="bo-drawer-subtitle">{chosen.facultyLabel} · {periodOptions.find(p => p.id === chosen.period)?.label}</p><CompareBars row={chosen} /><div className="bo-explain"><strong><TrendingDown size={17} /> لماذا أُدرجت الحالة؟</strong><p>{chosen.reason} جرى بناء خط الأساس يدويًا لأغراض العرض، ولا يوجد نموذج كشف فعلي.</p></div><div className="bo-explain bo-explain--teal"><strong><ShieldCheck size={17} /> إجراء مراجعة مقترح</strong><p>{chosen.recommendation} لا تنفَّذ أي إجراءات من هذه الواجهة.</p></div><label className="bo-review-select"><span>حالة المراجعة (محليًا فقط)</span><select aria-label="تحديث حالة المراجعة" value={chosen.status} onChange={e => changeStatus(chosen.id, e.target.value as ReviewStatus)}>{statusChoices.map(s => <option key={s} value={s}>{statusNames[s]}</option>)}</select></label><Link href={ORGANIZATION_ROUTES.analytics} data-contract-href="/analytics" className="bo-drawer-link">فتح لوحة التحليلات <ArrowLeft size={16} /></Link><p className="bo-drawer-note"><AlertTriangle size={16} /> لا تُسجل هذه المراجعة في الخادم أو سجل التدقيق.</p></div>}
        </Drawer>
        {notice && <div className="ban-toast"><Toast {...notice} onClose={() => setNotice(null)} /></div>}
    </main>;
}
export function OutliersScreen() { return <DemoAccessProvider initialRole="manager"><ChatLayout variant="feature"><OutliersBody /></ChatLayout></DemoAccessProvider>; }
