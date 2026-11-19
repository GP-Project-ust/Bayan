'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
    Activity, AlertTriangle, ArrowLeft, Building2, CheckCircle2, ChevronLeft,
    ClipboardCopy, Clock3, Download, FileSearch, FilterX, Info, Layers3, LockKeyhole,
    PauseCircle, PlayCircle, Search, ShieldCheck, SlidersHorizontal, Workflow
} from 'lucide-react';
import { PlatformLayout } from '@/components/layout/PlatformLayout';
import { Button, Dialog, Drawer, Toast } from '@/components/ui';
import { StatePanel } from '@/components/states';
import { DemoAccessProvider, DemoRolePicker, useDemoAccess } from '@/components/access/DemoAccess';
import {
    DEMO_NOTICE, DEMO_ORGANIZATIONS, DEFAULT_ORG_FILTERS, ONBOARDING_LABELS, SECTORS,
    SERVICE_LABELS, STATUS_LABELS, applyDemoStatuses, filterOrganizations, findOrganization,
    organizationStats, organizationsCsv, previewChangeStatus, readDemoStatuses, writeDemoStatuses,
    type Organization, type OrganizationStatus, type OrganizationFilters, type ServiceKey
} from '@/lib/organizations/organizations';
import { PLATFORM_ROUTES, AUXILIARY_ROUTES } from '@/lib/routes';

type Notice = { title: string; message: string; tone: 'success' | 'warning' | 'danger' | 'info' };
const nf = new Intl.NumberFormat('ar-EG');
const dateFormatter = new Intl.DateTimeFormat('ar', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const SERVICE_LIST: ServiceKey[] = ['chat', 'documents', 'reports', 'analytics'];
const STATUS_LIST: OrganizationStatus[] = ['active', 'onboarding', 'paused'];
function displayDate(s: string | null) { if (!s) return 'غير متاح (مثال تدريبي)'; const d = new Date(`${s}T00:00:00Z`); return Number.isNaN(d.getTime()) ? '—' : dateFormatter.format(d); }
function OrgStatus({ value }: { value: OrganizationStatus }) { const Icon = value === 'active' ? CheckCircle2 : value === 'paused' ? PauseCircle : Clock3; return <span className={`borg-status borg-status--${value}`}><Icon size={15} />{STATUS_LABELS[value]}</span>; }
function OrganizationDetails({ organization, onCopy }: { organization: Organization; onCopy: (text: string) => void }) {
    return <section className="borg-detail" data-testid="organization-details">
        <div className="borg-detail-warning"><ShieldCheck size={17} />{DEMO_NOTICE}</div>
        <div className="borg-detail-heading"><div className="borg-icon-big"><Building2 size={29} /></div><div><strong>{organization.name}</strong><p>{organization.description}</p></div></div>
        <div className="borg-detail-grid">
            <div><span>معرّف المؤسسة</span><strong dir="ltr">{organization.id}</strong></div>
            <div><span>الرمز المختصر</span><strong dir="ltr">{organization.code}</strong></div>
            <div><span>نوع المؤسسة</span><strong>{organization.sector}</strong></div>
            <div><span>المنطقة الوصفية</span><strong>{organization.region}</strong></div>
            <div><span>حالة المؤسسة</span><OrgStatus value={organization.status} /></div>
            <div><span>حالة التهيئة</span><strong>{ONBOARDING_LABELS[organization.onboarding]}</strong></div>
            <div><span>تاريخ إدراج المثال</span><strong>{displayDate(organization.createdAt)}</strong></div>
            <div><span>آخر نشاط تجريبي</span><strong>{displayDate(organization.lastSeenAt)}</strong></div>
        </div>
        <div className="borg-detail-section"><h3><Layers3 size={18} /> الخدمات المفعّلة في المثال</h3><div className="borg-service-tags">{organization.services.length ? organization.services.map(s => <span key={s}>{SERVICE_LABELS[s]}</span>) : <p className="borg-muted">لم تُفعّل خدمات في هذه العينة.</p>}</div></div>
        <div className="borg-detail-section"><h3><LockKeyhole size={18} /> فصل المؤسسات</h3><p>مسؤول المنصة يرى هنا بيانات تشغيلية وصفية فقط. لا تظهر بيانات الطلاب أو المستخدمين أو محتويات قواعد البيانات أو الوثائق أو بيانات الاعتماد.</p></div>
        <div className="borg-detail-actions"><Button size="sm" variant="outline" leadingIcon={<ClipboardCopy size={16} />} onClick={() => onCopy(organization.id)}>نسخ المعرّف</Button><Link href={PLATFORM_ROUTES.onboarding}>فتح معالج التهيئة التجريبي <ArrowLeft size={15} /></Link></div>
    </section>;
}
function Main() {
    const { can } = useDemoAccess(); const allowed = can('platform.manage');
    const [organizations, setOrganizations] = useState<Organization[]>(() => [...DEMO_ORGANIZATIONS]);
    const [filters, setFilters] = useState<OrganizationFilters>(DEFAULT_ORG_FILTERS);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [changingId, setChangingId] = useState<string | null>(null);
    const [notice, setNotice] = useState<Notice | null>(null);
    const [page, setPage] = useState(1);
    const [hydrated, setHydrated] = useState(false);
    useEffect(() => { try { setOrganizations(applyDemoStatuses(DEMO_ORGANIZATIONS, readDemoStatuses(window.localStorage))); } catch { setOrganizations([...DEMO_ORGANIZATIONS]); } setHydrated(true); }, []);
    const results = useMemo(() => filterOrganizations(organizations, filters), [organizations, filters]);
    const stats = useMemo(() => organizationStats(organizations), [organizations]);
    const selected = findOrganization(selectedId, organizations);
    const changing = findOrganization(changingId, organizations);
    const pageCount = Math.max(1, Math.ceil(results.length / 6));
    const currentPage = Math.min(page, pageCount);
    const visible = results.slice((currentPage - 1) * 6, currentPage * 6);
    function update<K extends keyof OrganizationFilters>(k: K, v: OrganizationFilters[K]) { setFilters(f => ({ ...f, [k]: v })); setPage(1); }
    function clear() { setFilters(DEFAULT_ORG_FILTERS); setPage(1); }
    async function copy(value: string) { try { if (!navigator.clipboard?.writeText) throw new Error('clipboard'); await navigator.clipboard.writeText(value); setNotice({ title: 'تم نسخ المعرّف', message: 'المعرّف تجريبي وغير مرتبط بمؤسسة فعلية.', tone: 'success' }); } catch { setNotice({ title: 'تعذّر النسخ', message: 'قد يحتاج المتصفح إلى السماح بالحافظة.', tone: 'warning' }); } }
    function commitStatus() {
        if (!allowed || !changing) return;
        const next: OrganizationStatus = changing.status === 'active' ? 'paused' : 'active';
        const result = previewChangeStatus(changing, next);
        if (!result.ok) { setNotice({ title: 'لا يمكن تغيير الحالة', message: result.reason, tone: 'warning' }); setChangingId(null); return; }
        const updated = organizations.map(o => o.id === changing.id ? result.value : o);
        try { writeDemoStatuses(window.localStorage, updated); } catch { setNotice({ title: 'تعذّر حفظ التغيير', message: 'لم تتغير بيانات العرض لأن التخزين المحلي غير متاح.', tone: 'danger' }); setChangingId(null); return; }
        setOrganizations(updated); setChangingId(null); setNotice({ title: 'تم تحديث الحالة التجريبية', message: 'لا يوجد أي تعطيل أو تنشيط حقيقي للخدمات.', tone: 'success' });
    }
    function exportCsv() { if (!allowed || !results.length) return; try { const csv = organizationsCsv(results); const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'bayan-organizations-demo.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); setNotice({ title: 'تم تصدير بيانات العرض', message: `تم تنزيل ${nf.format(results.length)} مؤسسة اصطناعية بمعلومات وصفية فقط.`, tone: 'success' }); } catch { setNotice({ title: 'تعذّر التصدير', message: 'لم تُرسل بيانات إلى أي خادم.', tone: 'danger' }); } }
    return <div className="ban borg" dir="rtl" data-testid="organizations-screen">
        <nav className="ban-breadcrumb" aria-label="مسار التنقل"><Link href={AUXILIARY_ROUTES.screens}>خريطة الواجهات</Link><ChevronLeft size={15} /><span>إدارة المنصة</span><ChevronLeft size={15} /><span aria-current="page">المؤسسات المستفيدة</span></nav>
        <header className="ban-hero borg-hero"><div><span className="ban-eyebrow"><Building2 size={17} /> إدارة المنصة · UC-07</span><h1>إدارة المؤسسات المستفيدة</h1><p>استعراض الجهات المشتركة والخدمات المتاحة ومراحل التهيئة، مع فصل كامل بين بيانات تشغيل المنصة وبيانات المؤسسات الداخلية.</p><div className="ban-hero-tags"><span><ShieldCheck size={14} /> عزل المؤسسات</span><span><LockKeyhole size={14} /> بيانات وصفية فقط</span><span><Activity size={14} /> تشغيل تجريبي</span></div></div><div className="ban-hero-art" aria-hidden="true"><Building2 size={79} /><i /></div></header>
        <div className="ban-disclaimer" role="note"><Info size={19} /><span><strong>{DEMO_NOTICE}</strong> لا يوجد تسجيل مؤسسات حقيقي أو اتصال بالخادم أو صلاحيات إنتاجية.</span></div>
        <div className="ban-role"><span><ShieldCheck size={17} /> الواجهة مخصصة لمسؤول المنصة فقط؛ ولا تمنحه حق الاطلاع على محتوى المستأجرين.</span><DemoRolePicker id="organizations-role-picker" /></div>
        {!allowed ? <section className="ban-locked" data-testid="organizations-forbidden"><StatePanel state="forbidden" title="ليس لديك صلاحية إدارة مؤسسات المنصة" description="صلاحية platform.manage مطلوبة للمعاينة. يجب فرض RBAC وعزل المؤسسات في Backend أيضًا." /><Link href={AUXILIARY_ROUTES.screens}>العودة إلى خريطة الواجهات <ArrowLeft size={16} /></Link></section> : <>
            <section className="borg-stats" aria-label="مؤشرات المؤسسات التجريبية">
                {([{ label: 'إجمالي المؤسسات', value: stats.total, icon: Building2, type: 'total' }, { label: 'مؤسسات نشطة', value: stats.active, icon: CheckCircle2, type: 'active' }, { label: 'قيد التهيئة', value: stats.onboarding, icon: Clock3, type: 'onboarding' }, { label: 'مؤسسات موقوفة', value: stats.paused, icon: PauseCircle, type: 'paused' }] as const).map(({ label, value, icon: Icon, type }) => <article key={type} className={`borg-stat borg-stat--${type}`}><span><Icon size={23} /></span><div><small>{label}</small><strong>{nf.format(value)}</strong><p>مؤسسة افتراضية</p></div></article>)}
            </section>
            <section className="ban-panel borg-panel"><div className="ban-section-header"><div><h2><SlidersHorizontal size={20} /> قائمة المؤسسات</h2><p>عرض وتشخيص البيانات التعريفية وحالات الخدمات من دون بيانات أعمال أو حسابات حقيقية.</p></div><div className="ban-actions"><Link className="borg-new-link" href={PLATFORM_ROUTES.onboarding}><Workflow size={16} /> معالج التهيئة</Link><Button variant="outline" size="sm" disabled={!results.length} onClick={exportCsv} leadingIcon={<Download size={16} />}>تصدير CSV</Button></div></div>
                <div className="borg-filters">
                    <label><span><Search size={14} /> بحث عن مؤسسة</span><input type="search" value={filters.query} onChange={e => update('query', e.target.value)} placeholder="الاسم أو الرمز أو المنطقة..." /></label>
                    <label><span>حالة المؤسسة</span><select value={filters.status} onChange={e => update('status', e.target.value as OrganizationFilters['status'])}><option value="all">كل الحالات</option>{STATUS_LIST.map(k => <option key={k} value={k}>{STATUS_LABELS[k]}</option>)}</select></label>
                    <label><span>نوع المؤسسة</span><select value={filters.sector} onChange={e => update('sector', e.target.value)}><option value="all">كل الأنواع</option>{SECTORS.map(s => <option key={s} value={s}>{s}</option>)}</select></label>
                    <label><span>الخدمة</span><select value={filters.service} onChange={e => update('service', e.target.value as OrganizationFilters['service'])}><option value="all">جميع الخدمات</option>{SERVICE_LIST.map(k => <option key={k} value={k}>{SERVICE_LABELS[k]}</option>)}</select></label>
                    <label><span>ترتيب النتائج</span><select value={filters.sort} onChange={e => update('sort', e.target.value as OrganizationFilters['sort'])}><option value="recent">الأحدث تسجيلًا</option><option value="oldest">الأقدم تسجيلًا</option><option value="name">اسم المؤسسة</option></select></label>
                </div>
                <div className="borg-toolbar"><span>عرض <strong>{nf.format(results.length)}</strong> من أصل {nf.format(organizations.length)} مؤسسات تجريبية</span><button type="button" onClick={clear}><FilterX size={15} /> مسح المرشحات</button></div>
                {!results.length ? <div className="borg-empty" data-testid="organizations-empty"><FileSearch size={30} /><strong>لم نعثر على مؤسسات مطابقة</strong><p>جرّب تغيير مرشحات البحث.</p><Button variant="outline" size="sm" onClick={clear}>عرض جميع المؤسسات</Button></div> :
                    <div className="borg-table-scroll"><table className="borg-table"><thead><tr><th>المؤسسة</th><th>القطاع / المنطقة</th><th>الحالة</th><th>التهيئة</th><th>الخدمات</th><th>آخر نشاط تجريبي</th><th>الإجراءات</th></tr></thead><tbody>{visible.map(o => <tr key={o.id}><td><div className="borg-table-name"><span><Building2 size={17} /></span><div><strong>{o.name}</strong><small dir="ltr">{o.id}</small></div></div></td><td><strong>{o.sector}</strong><small>{o.region}</small></td><td><OrgStatus value={o.status} /></td><td><span className="borg-onboarding"><Workflow size={13} />{ONBOARDING_LABELS[o.onboarding]}</span></td><td><div className="borg-mini-services" title={o.services.map(x => SERVICE_LABELS[x]).join('، ')}>{o.services.length ? o.services.slice(0, 2).map(s => <span key={s}>{SERVICE_LABELS[s]}</span>) : <small>—</small>}{o.services.length > 2 && <span>+{o.services.length - 2}</span>}</div></td><td><small>{displayDate(o.lastSeenAt)}</small></td><td><div className="borg-row-actions"><button type="button" onClick={() => setSelectedId(o.id)} aria-label={`عرض تفاصيل ${o.name}`}>تفاصيل <ArrowLeft size={13} /></button>{o.status !== 'onboarding' && <button type="button" className="borg-status-action" onClick={() => setChangingId(o.id)}>{o.status === 'active' ? 'إيقاف تجريبي' : 'تنشيط تجريبي'}</button>}</div></td></tr>)}</tbody></table></div>}
                {results.length > 6 && <div className="borg-pagination"><span>صفحة {nf.format(currentPage)} من {nf.format(pageCount)}</span><div><Button size="sm" variant="outline" disabled={currentPage <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>السابق</Button><Button size="sm" variant="outline" disabled={currentPage >= pageCount} onClick={() => setPage(p => Math.min(pageCount, p + 1))}>التالي</Button></div></div>}
            </section>
            <div className="borg-guidance"><section className="ban-panel"><h2><ShieldCheck size={20} /> نطاق مسؤول المنصة</h2><p>بيانات تعريفية للمؤسسات، وحالة التهيئة، وتفعيل الخدمات على مستوى المنصة فقط. لا صلاحية تلقائية لقراءة معلومات الطلاب أو المستندات أو نتائج استعلامات المؤسسات.</p></section><section className="ban-panel"><h2><Workflow size={20} /> استكمال التهيئة</h2><p>المؤسسات قيد التهيئة لا يمكن تغيير حالتها يدويًا في هذا النموذج. استخدم <Link href={PLATFORM_ROUTES.onboarding}>معالج التهيئة</Link> لاستعراض تدفق العمل المستقبلي.</p></section></div>
        </>}
        <Drawer open={!!selected && allowed} onClose={() => setSelectedId(null)} title="تفاصيل المؤسسة التجريبية" description="بيانات وصفية آمنة — دون محتوى داخلي للمؤسسة">{selected && <OrganizationDetails organization={selected} onCopy={copy} />}</Drawer>
        <Dialog open={!!changing && allowed} onClose={() => setChangingId(null)} title="تأكيد تغيير حالة المؤسسة" description="محاكاة محلية لا تؤثر في أي خدمة فعلية" footer={<><Button variant="outline" onClick={() => setChangingId(null)}>إلغاء</Button><Button variant={changing?.status === 'active' ? 'danger' : 'primary'} onClick={commitStatus}>{changing?.status === 'active' ? 'تأكيد الإيقاف التجريبي' : 'تأكيد التنشيط التجريبي'}</Button></>}><p className="borg-confirm">هل تريد {changing?.status === 'active' ? 'إيقاف' : 'تنشيط'} المؤسسة «{changing?.name}» في بيانات العرض المحلية فقط؟ لن تتغير أي خدمة حقيقية، ولا تُرسل طلبات شبكة.</p></Dialog>
        {notice && <div className="borg-toast"><Toast title={notice.title} message={notice.message} tone={notice.tone} onClose={() => setNotice(null)} /></div>}
        <span className="borg-sr-only" aria-live="polite">{hydrated ? 'تم تحميل بيانات العرض التجريبية' : 'جارٍ تهيئة بيانات العرض'}</span>
    </div>;
}
export function OrganizationsScreen() { return <DemoAccessProvider initialRole="platform_admin"><PlatformLayout><Main /></PlatformLayout></DemoAccessProvider>; }
