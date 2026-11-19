'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
    Activity, AlertCircle, ArrowLeft, Building2, CheckCircle2, ChevronLeft,
    ClipboardList, Clock3, CloudOff, Download, FileSearch, FilterX, History,
    Info, Layers3, LockKeyhole, PauseCircle, RefreshCw, Search, ShieldCheck,
    Workflow, XCircle
} from 'lucide-react';
import { PlatformLayout } from '@/components/layout/PlatformLayout';
import { Button, Dialog, Drawer, Toast } from '@/components/ui';
import { DemoAccessProvider, DemoRolePicker, useDemoAccess } from '@/components/access/DemoAccess';
import { StatePanel } from '@/components/states';
import { DEMO_ORGANIZATIONS } from '@/lib/organizations/organizations';
import {
    DEFAULT_HISTORY_FILTERS, DEMO_HISTORY, HISTORY_DEMO_NOTICE, SOURCE_TITLES,
    STAGE_STATUS_LABEL, STATUS_LABEL, canPrepareRetry, filterHistory, findHistory,
    historyCsv, historyStats, prepareRetry, readLocalHistory, stageProgress,
    validHistoryDates, type HistoryFilters, type HistoryRun, type RunStatus,
} from '@/lib/onboarding-history/history';
import { PLATFORM_ROUTES } from '@/lib/routes';

const nf = new Intl.NumberFormat('ar');
const stepDate = (iso: string | null) => iso ? new Intl.DateTimeFormat('ar-YE', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Aden' }).format(new Date(iso)) : '—';
const formatDuration = (ms: number | null) => ms === null ? '—' : `${nf.format(ms)} مللي ثانية (توضيحية)`;
const stateIcons: Record<RunStatus, typeof CheckCircle2> = { completed: CheckCircle2, failed: XCircle, in_progress: Activity, paused: PauseCircle };
const PAGE_SIZE = 6;
type ToastMessage = { title: string; message: string; tone: 'success' | 'warning' | 'danger' | 'info' };

function StatusChip({ value }: { value: RunStatus }) { const Icon = stateIcons[value]; return <span className={`boh-status boh-status--${value}`}><Icon size={14} />{STATUS_LABEL[value]}</span>; }
function Detail({ run, onPrepare, prepared }: { run: HistoryRun; onPrepare: (run: HistoryRun) => void; prepared: boolean }) {
    const completed = stageProgress(run);
    return <div className="boh-detail" data-testid="onboarding-run-detail">
        <div className="boh-detail-head"><span className="boh-detail-icon"><Building2 size={25} /></span><div><strong>{run.organizationName}</strong><small dir="ltr">{run.id}</small></div></div>
        <div className="boh-detail-notice"><ShieldCheck size={18} /> بيانات وصفية آمنة فقط. لا يوجد تنفيذ حقيقي أو سجل تدقيق من الخادم.</div>
        <div className="boh-detail-stats"><div><small>حالة التشغيل</small><StatusChip value={run.status} /></div><div><small>الخطوات المكتملة</small><b>{nf.format(completed)} من 6</b></div><div><small>{run.origin === 'browser' ? 'وقت حفظ محاكاة المتصفح' : 'بداية المحاكاة الاصطناعية'}</small><b>{stepDate(run.startedAt)}</b></div><div><small>نهاية المثال</small><b>{stepDate(run.finishedAt)}</b></div><div><small>التصنيف</small><b>{run.classification === 'restricted' ? 'مقيّد' : 'داخلي'}</b></div><div><small>البيانات</small><b>{run.origin === 'fixture' ? 'مثال اصطناعي ثابت' : 'سجل أُنشئ في هذا المتصفح'}</b></div></div>
        <section className="boh-detail-section"><h3><Workflow size={18} /> المراحل الست</h3><ol className="boh-stage-list">{run.steps.map(s => <li key={s.key} className={`boh-stage boh-stage--${s.status}`}><span className="boh-stage-num">{s.key + 1}</span><div><strong>{s.name}</strong><small>{s.note}</small><small>{formatDuration(s.durationMs)}</small></div><em>{STAGE_STATUS_LABEL[s.status]}</em></li>)}</ol></section>
        {run.reason && <div className="boh-reason"><AlertCircle size={18} /><div><b>سبب توضيحي للتوقف</b><p>{run.reason}</p></div></div>}
        <section className="boh-detail-section"><h3><Layers3 size={18} /> إعدادات وصفية</h3><div className="boh-detail-stats"><div><small>المصادر</small><b>{run.sources.map(s => SOURCE_TITLES[s]).join('، ')}</b></div><div><small>قوالب العروض</small><b>{run.views.length} قالب / قوالب تدريبية</b></div><div><small>خطة المستندات</small><b>{run.documentPlan === 'none' ? 'دون مستندات' : run.documentPlan === 'sample3' ? '3 مستندات رمزية' : '12 مستندًا رمزيًا'}</b></div><div><small>طلبات الشبكة</small><b>صفر في هذه المحاكاة</b></div></div></section>
        {canPrepareRetry(run) ? <div className="boh-detail-action"><Button onClick={() => onPrepare(run)} leadingIcon={<RefreshCw size={16} />}>تجهيز مسودة إعادة المحاولة</Button>{prepared && <Link href={PLATFORM_ROUTES.onboarding} className="boh-link">فتح معالج التهيئة <ArrowLeft size={15} /></Link>}<p>لن تعاد مهمة خارجية؛ تُعبأ مسودة جديدة في المتصفح وتُعاد فحوص الجاهزية من البداية.</p></div> : <div className="boh-detail-action boh-detail-readonly"><LockKeyhole size={17} /> لا تتاح إعادة المحاولة لهذا المثال؛ قد يكون مكتملًا أو قيد المحاكاة، أو لا تسمح حالة المؤسسة بذلك.</div>}
    </div>;
}

function Screen() {
    const { can } = useDemoAccess(); const allowed = can('platform.manage') && can('onboarding.run');
    const [local, setLocal] = useState<HistoryRun[]>([]); const [loaded, setLoaded] = useState(false);
    const [filters, setFilters] = useState<HistoryFilters>({ ...DEFAULT_HISTORY_FILTERS });
    const [page, setPage] = useState(1); const [selectedId, setSelectedId] = useState<string | null>(null);
    const [retryTarget, setRetryTarget] = useState<HistoryRun | null>(null);
    const [prepared, setPrepared] = useState<string | null>(null);
    const [notice, setNotice] = useState<ToastMessage | null>(null);
    useEffect(() => { try { setLocal(readLocalHistory(window.localStorage)); } catch { setLocal([]); } setLoaded(true); }, []);
    const all = useMemo(() => [...local, ...DEMO_HISTORY], [local]);
    const total = useMemo(() => historyStats(all), [all]);
    const datesValid = validHistoryDates(filters);
    const filtered = useMemo(() => filterHistory(all, filters), [all, filters]);
    const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const currentPage = Math.min(page, pageCount); const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
    const selected = findHistory(all, selectedId);
    const orgOptions = useMemo(() => [...new Map(all.map(x => [x.organizationId, { id: x.organizationId, name: x.organizationName }])).values()].sort((a, b) => a.name.localeCompare(b.name, 'ar')), [all]);
    function update<K extends keyof HistoryFilters>(k: K, v: HistoryFilters[K]) { setFilters(f => ({ ...f, [k]: v })); setPage(1); }
    function clear() { setFilters({ ...DEFAULT_HISTORY_FILTERS }); setPage(1); }
    function startRetry(run: HistoryRun) { if (!allowed) return; setRetryTarget(run); }
    function confirmRetry() {
        if (!retryTarget || !allowed || !canPrepareRetry(retryTarget)) return; try {
            if (!prepareRetry(window.localStorage, retryTarget)) throw new Error('no draft');
            setPrepared(retryTarget.id); setRetryTarget(null);
            setNotice({ title: 'جُهزت مسودة إعادة المحاولة', message: 'عند فتح المعالج ستجد بيانات وصفية فقط، وستبدأ فحوص الخطوات مجددًا. لا توجد مهمة خلفية.', tone: 'success' });
        } catch { setRetryTarget(null); setNotice({ title: 'تعذّر تجهيز المسودة', message: 'تخزين المتصفح غير متاح. لم يُجر أي اتصال أو إعادة تشغيل حقيقية.', tone: 'danger' }); }
    }
    function exportCsv() {
        if (!allowed || !datesValid || !filtered.length) return; try {
            const blob = new Blob([historyCsv(filtered)], { type: 'text/csv;charset=utf-8' }); const url = URL.createObjectURL(blob);
            const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'bayan-onboarding-history-demo.csv'; document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
            setNotice({ title: 'تم تنزيل CSV تدريبي', message: 'يتضمن بيانات تشغيلية وصفية اصطناعية فقط، ولا يحتوي على أسرار أو سجلات مؤسسة داخلية.', tone: 'success' });
        } catch { setNotice({ title: 'تعذّر التصدير', message: 'لم تُرسل أي بيانات إلى الخادم.', tone: 'danger' }); }
    }
    return <main className="ban borg boh" data-testid="onboarding-history-screen" dir="rtl">
        <nav className="ban-breadcrumb" aria-label="مسار التنقل"><Link href={PLATFORM_ROUTES.organizations}>إدارة المؤسسات</Link><ChevronLeft size={15} /><Link href={PLATFORM_ROUTES.onboarding}>التهيئة الذكية</Link><ChevronLeft size={15} /><span aria-current="page">سجل عمليات التهيئة</span></nav>
        <header className="ban-hero borg-hero boh-hero"><div><span className="ban-eyebrow"><History size={18} /> إدارة المنصة · UC-07</span><h1>سجل عمليات التهيئة</h1><p>تتبع مراحل إعداد المؤسسات، وفحص أمثلة التعثر والمراجعة، وتجهيز إعادة محاولة تدريبية دون الوصول إلى بيانات المؤسسات الداخلية.</p><div className="ban-hero-tags"><span><ShieldCheck size={14} /> فصل الصلاحيات</span><span><CloudOff size={14} /> سجل محاكاة فقط</span><span><LockKeyhole size={14} /> معلومات وصفية</span></div></div><div className="ban-hero-art" aria-hidden="true"><History size={76} /><i /></div></header>
        <div className="ban-disclaimer" role="note"><Info size={19} /><span><strong>{HISTORY_DEMO_NOTICE}</strong> السجلات المحفوظة من المعالج موجودة محليًا في المتصفح فقط.</span></div>
        <div className="ban-role"><span><ShieldCheck size={17} /> صلاحية المعاينة: <b dir="ltr">platform.manage + onboarding.run</b></span><DemoRolePicker id="onboarding-history-role-picker" /></div>
        {!allowed ? <section className="ban-locked" data-testid="onboarding-history-forbidden"><StatePanel state="forbidden" title="ليس لديك صلاحية مراجعة سجل تهيئة المؤسسات" description="السجل مخصص لمسؤول المنصة في نموذج الصلاحيات. لا تُنفّذ مصادقة حقيقية في الواجهة." /><Link href={PLATFORM_ROUTES.organizations}>العودة إلى المؤسسات <ArrowLeft size={16} /></Link></section> : <>
            <section className="boh-stats" aria-label="إحصاءات محاكاة التهيئة">{([
                { label: 'عمليات التهيئة', value: total.total, icon: ClipboardList, kind: 'total' },
                { label: 'اكتملت تجريبيًا', value: total.completed, icon: CheckCircle2, kind: 'complete' },
                { label: 'فشل في المحاكاة', value: total.failed, icon: XCircle, kind: 'failed' },
                { label: 'قيد المعالجة أو المراجعة', value: total.attention, icon: Clock3, kind: 'attention' },
            ] as const).map(({ label, value, icon: Icon, kind }) => <article key={kind} className={`boh-stat boh-stat--${kind}`}><span><Icon size={22} /></span><div><small>{label}</small><strong>{nf.format(value)}</strong><p>سجل وصفي تجريبي</p></div></article>)}</section>
            <section className="ban-panel boh-panel"><div className="ban-section-header"><div><h2><ClipboardList size={21} /> العمليات السابقة</h2><p>أمثلة اصطناعية وسجلات إكمال محلية من المعالج؛ ليست بيانات تدقيق إنتاجية.</p></div><div className="ban-actions"><Link href={PLATFORM_ROUTES.onboarding} className="borg-new-link"><Workflow size={16} /> فتح معالج التهيئة</Link><Button variant="outline" size="sm" disabled={!datesValid || !filtered.length} onClick={exportCsv} leadingIcon={<Download size={16} />}>تصدير CSV تجريبي</Button></div></div>
                <div className="boh-filters">
                    <label className="boh-search"><span><Search size={14} /> البحث</span><input type="search" placeholder="المؤسسة أو رقم العملية أو المصدر..." value={filters.query} onChange={e => update('query', e.target.value)} aria-label="بحث سجل التهيئة" /></label>
                    <label><span>حالة العملية</span><select value={filters.status} onChange={e => update('status', e.target.value as HistoryFilters['status'])}><option value="all">جميع الحالات</option>{(Object.keys(STATUS_LABEL) as RunStatus[]).map(v => <option value={v} key={v}>{STATUS_LABEL[v]}</option>)}</select></label>
                    <label><span>المؤسسة</span><select value={filters.organization} onChange={e => update('organization', e.target.value)}><option value="all">جميع المؤسسات</option>{orgOptions.map(o => <option value={o.id} key={o.id}>{o.name}</option>)}</select></label>
                    <label><span>الخطوة المتعثرة</span><select value={filters.stage} onChange={e => update('stage', e.target.value)}><option value="all">جميع المراحل</option>{['المؤسسة', 'المصادر', 'تحليل المخطط', 'العروض الذكية', 'المستندات', 'المراجعة'].map((s, i) => <option key={s} value={String(i)}>{s}</option>)}</select></label>
                    <label><span>من تاريخ</span><input type="date" value={filters.from} onChange={e => update('from', e.target.value)} /></label>
                    <label><span>إلى تاريخ</span><input type="date" value={filters.to} onChange={e => update('to', e.target.value)} /></label>
                    <label><span>ترتيب النتائج</span><select value={filters.sort} onChange={e => update('sort', e.target.value as HistoryFilters['sort'])}><option value="newest">الأحدث</option><option value="oldest">الأقدم</option><option value="name">المؤسسة أبجديًا</option></select></label>
                </div>
                {!datesValid && <div className="boh-filter-error" role="alert"><AlertCircle size={18} /> نطاق التاريخ غير صحيح: يجب أن يسبق تاريخ البداية تاريخ النهاية.</div>}
                <div className="borg-toolbar"><span>عرض <strong>{nf.format(filtered.length)}</strong> عملية من أصل {nf.format(all.length)} أمثلة محلية واصطناعية</span><button type="button" onClick={clear}><FilterX size={15} /> مسح المرشحات</button></div>
                {!datesValid || !filtered.length ? <div className="borg-empty" data-testid="onboarding-history-empty"><FileSearch size={32} /><strong>{!datesValid ? 'نطاق تاريخ غير صحيح' : 'لا توجد عمليات مطابقة'}</strong><p>تحقق من المرشحات أو امسحها لعرض السجل التجريبي.</p><Button variant="outline" size="sm" onClick={clear}>إظهار جميع العمليات</Button></div> : <div className="borg-table-scroll"><table className="borg-table boh-table"><thead><tr><th>المؤسسة</th><th>معرّف التشغيل</th><th>التاريخ</th><th>الحالة</th><th>التقدم</th><th>نوع السجل</th><th>الإجراء</th></tr></thead><tbody>{visible.map(run => <tr key={run.id}><td><div className="borg-table-name"><span><Building2 size={17} /></span><div><strong>{run.organizationName}</strong><small dir="ltr">{run.organizationId}</small></div></div></td><td><code dir="ltr">{run.id}</code></td><td><span>{stepDate(run.startedAt)}</span></td><td><StatusChip value={run.status} /></td><td><div className="boh-progress"><span><b>{stageProgress(run)} / 6</b></span><div><i style={{ width: `${stageProgress(run) / 6 * 100}%` }} /></div></div></td><td><small>{run.origin === 'browser' ? 'محاكاة محفوظة محليًا' : 'مثال اصطناعي ثابت'}</small></td><td><button className="boh-view" type="button" onClick={() => { setSelectedId(run.id); setPrepared(null); }} aria-label={`فتح تفاصيل ${run.id}`}>تفاصيل <ArrowLeft size={14} /></button></td></tr>)}</tbody></table></div>}
                {filtered.length > PAGE_SIZE && <div className="borg-pagination"><span>صفحة {currentPage} من {pageCount}</span><div><Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setPage(x => Math.max(1, x - 1))}>السابق</Button><Button variant="outline" size="sm" disabled={currentPage === pageCount} onClick={() => setPage(x => Math.min(pageCount, x + 1))}>التالي</Button></div></div>}
            </section>
            <div className="borg-guidance"><section className="ban-panel"><h2><ShieldCheck size={20} /> عزل المؤسسات</h2><p>يُعرض لمسؤول المنصة الوصف التشغيلي فقط، لا محتوى المستندات، أو قواعد بيانات المؤسسة، أو حسابات المستخدمين، أو أسرار الاتصال.</p></section><section className="ban-panel"><h2><RefreshCw size={20} /> معنى إعادة المحاولة</h2><p>تجهيز مسودة جديدة داخل المتصفح لا يعيد تشغيل مهمة حقيقية، ولا يغيّر حالة مؤسسة في النظام. يجب ربط ذلك بخادم مخوّل لاحقًا.</p></section></div>
            <div className="boh-footer"><Link href={PLATFORM_ROUTES.onboarding}>إنشاء محاكاة جديدة <ArrowLeft size={15} /></Link><Link href={PLATFORM_ROUTES.organizations}>العودة إلى إدارة المؤسسات <ArrowLeft size={15} /></Link></div>
        </>}
        <Drawer open={!!selected && allowed} onClose={() => setSelectedId(null)} title="تفاصيل عملية التهيئة" description="مراحل تدريبية ووصف غير حساس للخطوات">{selected && <Detail run={selected} onPrepare={startRetry} prepared={prepared === selected.id} />}</Drawer>
        <Dialog open={!!retryTarget && allowed} onClose={() => setRetryTarget(null)} title="تجهيز إعادة محاولة تدريبية" description="لا يتم الاتصال بأي خدمة أو قاعدة بيانات" footer={<><Button variant="outline" onClick={() => setRetryTarget(null)}>إلغاء</Button><Button onClick={confirmRetry} leadingIcon={<RefreshCw size={15} />}>حفظ مسودة جديدة</Button></>}><p className="boh-confirm">سيتم استبدال مسودة معالج التهيئة الحالية في هذا المتصفح ببيانات وصفية من المثال «{retryTarget?.id}». وستُعاد جميع فحوص التحليل والفهرسة إلى البداية، دون تشغيل مهمة أو تعديل حالة المؤسسة.</p></Dialog>
        {notice && <div className="borg-toast"><Toast title={notice.title} message={notice.message} tone={notice.tone} onClose={() => setNotice(null)} /></div>}
        <span className="borg-sr-only" aria-live="polite">{loaded ? 'اكتمل تحميل سجل العرض' : 'جارٍ تحميل السجلات المحلية'}</span>
    </main>;
}
export function OnboardingHistoryScreen() { return <DemoAccessProvider initialRole="platform_admin"><PlatformLayout><Screen /></PlatformLayout></DemoAccessProvider>; }
