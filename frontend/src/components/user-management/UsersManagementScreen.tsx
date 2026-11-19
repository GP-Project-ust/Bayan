'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
    Activity, ArrowLeft, BadgeCheck, ChevronLeft, ChevronRight, Clock3, ContactRound, Eye, FilterX,
    Info, LockKeyhole, Pencil, Plus, Search, Shield, ShieldCheck, SlidersHorizontal,
    UserCog, UserRound, UserRoundMinus, UserRoundPlus, UsersRound, RefreshCcw, Building2
} from 'lucide-react';
import { AdminLayout } from '@/components/layout';
import { Badge, Button, Dialog, Drawer, Toast } from '@/components/ui';
import { StatePanel } from '@/components/states';
import { DemoAccessProvider, DemoRolePicker, useDemoAccess } from '@/components/access/DemoAccess';
import { userDetailsHref } from '@/lib/user-management/details';
import { getUserOverrides, appendAuditEntry, getCustomRoles, type CustomRole } from '@/lib/access/enterprise-rbac';
import {
    DEMO_USERS, USERS_DEMO_NOTE, createUser, demoActorId, demoInstitution, departments,
    editUser, filterUsers, initialUserFilters, restoreUserFixtures, setUserStatus,
    userRoleLabels, userStatusLabels, userTotals, validateUserDraft, type TenantRole,
    type AccountStatus, type UserDraft, type UserFilters, type UserRecord
} from '@/lib/user-management/users';

type Notice = { title: string; message: string; tone: 'success' | 'warning' | 'danger' | 'info' };
type LocalActivity = { id: number; action: string; at: string };
const STORAGE_KEY = 'bayan.demo.users.v1';
const PAGE_SIZE = 8;
const emptyDraft: UserDraft = { name: '', email: '', department: departments[0], role: 'employee' };
const roleKeys: TenantRole[] = ['employee', 'manager', 'it_admin'];
function RolePill({ role, customRoleId, customRoles = [] }: { role: TenantRole; customRoleId?: string; customRoles?: CustomRole[] }) {
    const customRole = customRoleId ? customRoles.find(r => r.id === customRoleId) : null;
    if (customRole) {
        return <span className="bum-role bum-role--custom" style={{ background: 'rgba(251, 191, 36, 0.12)', border: '1px solid rgba(251, 191, 36, 0.3)', color: '#fbbf24' }}><Shield size={14} />{customRole.nameAr}</span>;
    }
    return <span className={`bum-role bum-role--${role}`}><Shield size={14} />{userRoleLabels[role]}</span>;
}
function StatusPill({ status }: { status: AccountStatus }) { return <Badge tone={status === 'active' ? 'success' : 'warning'} icon={status === 'active' ? <BadgeCheck /> : <UserRoundMinus />}>{userStatusLabels[status]}</Badge>; }
function DraftFields({ draft, setDraft, errors, customRoles = [], disabledRole = false }: { draft: UserDraft; setDraft: (draft: UserDraft) => void; errors: Record<string, string>; customRoles?: CustomRole[]; disabledRole?: boolean }) {
    return <div className="bum-form-grid">
        <label className="bum-field bum-field-wide"><span>الاسم الكامل <b aria-hidden="true">*</b></span><input autoComplete="off" maxLength={90} value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} placeholder="مثال: أ. أحمد محمد" aria-invalid={!!errors.name} />{errors.name && <small role="alert">{errors.name}</small>}</label>
        <label className="bum-field bum-field-wide"><span>البريد الإلكتروني <b aria-hidden="true">*</b></span><input autoComplete="off" dir="ltr" maxLength={254} type="email" value={draft.email} onChange={e => setDraft({ ...draft, email: e.target.value })} placeholder="employee@example.test" aria-invalid={!!errors.email} />{errors.email && <small role="alert">{errors.email}</small>}</label>
        <label className="bum-field"><span>القسم <b aria-hidden="true">*</b></span><select value={draft.department} onChange={e => setDraft({ ...draft, department: e.target.value })} aria-invalid={!!errors.department}>{departments.map(d => <option key={d}>{d}</option>)}</select>{errors.department && <small>{errors.department}</small>}</label>
        <label className="bum-field">
            <span>الدور <b aria-hidden="true">*</b></span>
            <select
                value={draft.customRoleId ? `custom:${draft.customRoleId}` : draft.role}
                onChange={e => {
                    const val = e.target.value;
                    if (val.startsWith('custom:')) {
                        const cId = val.replace('custom:', '');
                        const cr = customRoles.find(r => r.id === cId);
                        if (cr) {
                            setDraft({ ...draft, role: cr.baseRole as TenantRole, customRoleId: cr.id });
                        }
                    } else {
                        setDraft({ ...draft, role: val as TenantRole, customRoleId: undefined });
                    }
                }}
                disabled={disabledRole}
                aria-invalid={!!errors.role}
            >
                <optgroup label="الأدوار الأساسية للمؤسسة">
                    {roleKeys.map(r => <option key={r} value={r}>{userRoleLabels[r]}</option>)}
                </optgroup>
                {customRoles.filter(r => r.scope === 'organization').length > 0 && (
                    <optgroup label="الأدوار المؤسسية المخصصة">
                        {customRoles.filter(r => r.scope === 'organization').map(cr => <option key={cr.id} value={`custom:${cr.id}`}>{cr.nameAr} (مخصص)</option>)}
                    </optgroup>
                )}
            </select>
            {errors.role && <small>{errors.role}</small>}
        </label>
        <p className="bum-form-hint bum-field-wide"><Info size={16} /> جميع المدخلات تجريبية. لا تُرسل دعوات بالبريد، ولا يُنشأ حساب حقيقي. دور مسؤول المنصة لا يُمنح من شاشة إدارة المؤسسة.</p>
    </div>;
}
function UsersBody() {
    const { can } = useDemoAccess(); const canManage = can('users.manage');
    const [users, setUsers] = useState<UserRecord[]>(() => DEMO_USERS.map(u => ({ ...u })));
    const customRoles = useMemo(() => getCustomRoles().filter(r => r.scope === 'organization'), [users]);
    const [filters, setFilters] = useState<UserFilters>(initialUserFilters);
    const [page, setPage] = useState(1);
    const [openCreate, setOpenCreate] = useState(false);
    const [draft, setDraft] = useState<UserDraft>(emptyDraft);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [detailsId, setDetailsId] = useState<string | null>(null);
    const [editId, setEditId] = useState<string | null>(null);
    const [pendingId, setPendingId] = useState<string | null>(null);
    const [confirmRestore, setConfirmRestore] = useState(false);
    const [notice, setNotice] = useState<Notice | null>(null);
    const [activity, setActivity] = useState<LocalActivity[]>([]);
    useEffect(() => {
        try { const saved = localStorage.getItem(STORAGE_KEY); if (saved !== null) setUsers(restoreUserFixtures(JSON.parse(saved))); }
        catch {/* corrupted or blocked storage: use the demo seed */ }
    }, []);
    const shown = useMemo(() => filterUsers(users, filters), [users, filters]);
    const totalPages = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
    const currentPage = Math.min(page, totalPages);
    const visible = shown.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
    const totals = useMemo(() => userTotals(users), [users]);
    const details = users.find(u => u.id === detailsId) ?? null;
    const editing = users.find(u => u.id === editId) ?? null;
    const pending = users.find(u => u.id === pendingId) ?? null;
    const changing = editing && JSON.stringify({ name: editing.name, email: editing.email, department: editing.department, role: editing.role, customRoleId: editing.customRoleId }) !== JSON.stringify(draft);
    const errors = Object.keys(formErrors).length ? formErrors : {};
    function persist(next: UserRecord[]) { setUsers(next); try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { setNotice({ title: 'تعذر الحفظ في المتصفح', message: 'استمر التعديل مؤقتًا داخل الصفحة فقط.', tone: 'warning' }); } }
    function log(action: string) { setActivity(a => [{ id: Date.now() + Math.random(), action, at: new Intl.DateTimeFormat('ar-EG', { hour: '2-digit', minute: '2-digit' }).format(new Date()) }, ...a].slice(0, 4)); }
    function setOneFilter<K extends keyof UserFilters>(key: K, val: UserFilters[K]) { setFilters(f => ({ ...f, [key]: val })); setPage(1); }
    function startCreate() { setFormErrors({}); setDraft({ ...emptyDraft }); setOpenCreate(true); }
    function startEdit(user: UserRecord) { setFormErrors({}); setDetailsId(null); setDraft({ name: user.name, email: user.email, role: user.role, department: user.department, customRoleId: user.customRoleId }); setEditId(user.id); }
    function submitCreate() {
        if (!canManage) return;
        const validation = validateUserDraft(draft, users); setFormErrors(validation); if (Object.keys(validation).length) return;
        const result = createUser(users, draft); if (!result.ok) { setNotice({ title: 'تعذر الإضافة', message: result.error, tone: 'danger' }); return; }
        persist(result.users); setOpenCreate(false); setDraft({ ...emptyDraft }); log('إضافة مستخدم تجريبي');
        const assignedCustom = draft.customRoleId ? customRoles.find(r => r.id === draft.customRoleId) : null;
        const roleTitle = assignedCustom ? `${assignedCustom.nameAr} (مخصص)` : userRoleLabels[draft.role];
        appendAuditEntry({ actorId: demoActorId, actorName: 'مسؤول التقنية', actorRole: 'مسؤول تقنية المعلومات', scope: 'organization', tenantId: demoInstitution, operation: 'USER_CREATED', targetId: result.users.at(-1)?.id || 'USR-NEW', targetName: draft.name, details: `إضافة مستخدم: ${draft.name} (${draft.email}) - الدور: ${roleTitle}`, reason: 'إضافة حساب' });
        setNotice({ title: 'تمت الإضافة محليًا', message: 'أضيف الحساب الوهمي إلى قائمة المعاينة فقط، دون إرسال بريد أو تعديل قاعدة البيانات.', tone: 'success' });
    }
    function submitEdit() {
        if (!editing || !canManage) return;
        const validation = validateUserDraft(draft, users, editing.id); setFormErrors(validation); if (Object.keys(validation).length) return;
        const result = editUser(users, editing.id, draft); if (!result.ok) { setNotice({ title: 'تعذر التعديل', message: result.error, tone: 'danger' }); return; }
        persist(result.users); setEditId(null); log(`تعديل بيانات ${editing.id}`);
        const assignedCustom = draft.customRoleId ? customRoles.find(r => r.id === draft.customRoleId) : null;
        const roleTitle = assignedCustom ? `${assignedCustom.nameAr} (مخصص)` : userRoleLabels[draft.role];
        appendAuditEntry({ actorId: demoActorId, actorName: 'مسؤول التقنية', actorRole: 'مسؤول تقنية المعلومات', scope: 'organization', tenantId: demoInstitution, operation: 'USER_UPDATED', targetId: editing.id, targetName: draft.name, details: `تعديل بيانات المستخدم: ${draft.name} (${draft.email}) - الدور: ${roleTitle}`, reason: 'تعديل بيانات المستخدم' });
        setNotice({ title: 'تم حفظ التعديل محليًا', message: 'لم تُحدّث صلاحيات فعلية أو بيانات على الخادم.', tone: 'success' });
    }
    function applyStatus() {
        if (!pending || !canManage) return;
        const next = pending.status === 'active' ? 'disabled' : 'active'; const result = setUserStatus(users, pending.id, next);
        if (!result.ok) { setNotice({ title: 'الإجراء غير مسموح في النموذج', message: result.error, tone: 'warning' }); setPendingId(null); return; }
        persist(result.users); setPendingId(null); log(`${next === 'disabled' ? 'تعطيل' : 'تنشيط'} ${pending.id}`);
        appendAuditEntry({ actorId: demoActorId, actorName: 'مسؤول التقنية', actorRole: 'مسؤول تقنية المعلومات', scope: 'organization', tenantId: demoInstitution, operation: 'USER_STATUS_CHANGED', targetId: pending.id, targetName: pending.name, details: `${next === 'disabled' ? 'تعطيل' : 'تنشيط'} حساب المستخدم ${pending.name}`, reason: 'تعديل الحالة التشغيلية' });
        setNotice({ title: next === 'disabled' ? 'تم التعطيل التجريبي' : 'تم التنشيط التجريبي', message: 'تغيرت حالة الحساب محليًا فقط. لا تنقطع أي جلسة حقيقية.', tone: 'success' });
    }
    function restore() { persist(DEMO_USERS.map(u => ({ ...u }))); setConfirmRestore(false); setDetailsId(null); setEditId(null); setPendingId(null); setFilters(initialUserFilters); setPage(1); setActivity([]); setNotice({ title: 'استُعيدت بيانات العرض', message: 'أُعيدت جميع الحسابات الوهمية إلى حالتها الأصلية.', tone: 'success' }); }
    return <div className="ban bum" dir="rtl" data-testid="users-management-screen">
        <nav className="ban-breadcrumb" aria-label="مسار التنقل"><Link href="/admin">لوحة الإدارة</Link><ChevronLeft size={15} /><span aria-current="page">إدارة المستخدمين</span></nav>
        <header className="ban-hero bum-hero"><div><span className="ban-eyebrow"><UsersRound size={17} /> إدارة المؤسسة · نماذج عرض</span><h1>إدارة المستخدمين والأدوار</h1><p>متابعة حسابات المؤسسة، والبحث في المستخدمين، وإدارة بياناتهم وحالاتهم وفق الصلاحيات.</p><div className="ban-hero-tags"><span><Building2 size={15} /> مؤسسة تجريبية</span><span><ShieldCheck size={15} /> أدوار وصلاحيات</span><span><UserCog size={15} /> إجراءات محلية</span></div></div><div className="ban-hero-art" aria-hidden="true"><UsersRound size={76} /></div></header>
        <div className="ban-disclaimer" role="note"><Info size={20} /><p><strong>نموذج تجريبي:</strong> {USERS_DEMO_NOTE} التعديلات تُحفظ في التخزين المحلي لهذا المتصفح، ولا تمثل سجل تدقيق رسميًا.</p></div>
        <section className="ban-role"><span><LockKeyhole size={17} /> إدارة المستخدمين متاحة لمسؤول تقنية المعلومات فقط في هذه المحاكاة؛ يجب تطبيق التحقق الحقيقي في FastAPI.</span><DemoRolePicker id="bum-demo-role" /></section>
        {!canManage ? <div className="ban-locked" data-testid="users-forbidden"><StatePanel state="forbidden" title="لا تملك صلاحية إدارة المستخدمين" description="اختر دور مسؤول تقنية المعلومات من محدد الدور التجريبي لمعاينة الشاشة. مسؤول المنصة لا يرث تلقائيًا حق الوصول إلى حسابات المؤسسة." /><Link href="/admin">العودة إلى لوحة الإدارة <ArrowLeft size={16} /></Link></div> : <>
            <section aria-label="ملخص الحسابات" className="bum-stats">
                {[{ label: 'إجمالي المستخدمين', val: totals.total, icon: <UsersRound />, hint: 'حسابات نموذجية' }, { label: 'الحسابات النشطة', val: totals.active, icon: <BadgeCheck />, hint: 'تسمية تجريبية' }, { label: 'الحسابات المعطّلة', val: totals.disabled, icon: <UserRoundMinus />, hint: 'لا يؤثر على الدخول الحقيقي' }, { label: 'مسؤولو تقنية المعلومات', val: totals.admins, icon: <ShieldCheck />, hint: 'نشطون في بيانات المعاينة' }].map(card => <article className="bum-stat" key={card.label}><span className="bum-stat-icon">{card.icon}</span><div><p>{card.label}</p><strong>{card.val.toLocaleString('ar-EG')}</strong><small>{card.hint}</small></div></article>)}
            </section>
            <section className="ban-panel bum-panel" aria-label="قائمة مستخدمي المؤسسة">
                <div className="ban-section-header"><div><h2><UsersRound size={21} /> قائمة المستخدمين</h2><p>{demoInstitution}</p></div><div className="ban-actions"><Button variant="outline" size="sm" leadingIcon={<RefreshCcw size={16} />} onClick={() => setConfirmRestore(true)}>استعادة بيانات العرض</Button><Link className="bum-full-create-link" href="/admin/users/new"><UserRoundPlus size={16} /> نموذج إضافة مفصل</Link><Button size="sm" leadingIcon={<Plus size={17} />} onClick={startCreate}>إضافة مستخدم</Button></div></div>
                <div className="bum-filters">
                    <label className="bum-field bum-search"><span><Search size={15} /> البحث</span><input aria-label="البحث عن مستخدم" placeholder="الاسم أو البريد أو القسم أو المعرّف..." value={filters.search} onChange={e => setOneFilter('search', e.target.value)} /></label>
                    <label className="bum-field"><span>الدور</span><select aria-label="تصفية حسب الدور" value={filters.role} onChange={e => setOneFilter('role', e.target.value as UserFilters['role'])}><option value="all">جميع الأدوار</option>{roleKeys.map(r => <option key={r} value={r}>{userRoleLabels[r]}</option>)}</select></label>
                    <label className="bum-field"><span>الحالة</span><select aria-label="تصفية حسب الحالة" value={filters.status} onChange={e => setOneFilter('status', e.target.value as UserFilters['status'])}><option value="all">جميع الحالات</option><option value="active">نشط</option><option value="disabled">معطّل</option></select></label>
                    <label className="bum-field"><span>القسم</span><select aria-label="تصفية حسب القسم" value={filters.department} onChange={e => setOneFilter('department', e.target.value)}><option value="all">جميع الأقسام</option>{departments.map(d => <option key={d}>{d}</option>)}</select></label>
                    <label className="bum-field"><span>الترتيب</span><select aria-label="ترتيب المستخدمين" value={filters.sort} onChange={e => setOneFilter('sort', e.target.value as UserFilters['sort'])}><option value="newest">الأحدث إضافة</option><option value="oldest">الأقدم إضافة</option><option value="name">الاسم أبجديًا</option></select></label>
                </div>
                <div className="bum-table-top"><span><SlidersHorizontal size={15} /> النتائج: <b>{shown.length.toLocaleString('ar-EG')}</b> من {users.length.toLocaleString('ar-EG')} مستخدم</span><button type="button" onClick={() => { setFilters(initialUserFilters); setPage(1); }}><FilterX size={15} /> مسح المرشحات</button></div>
                {shown.length === 0 ? <div className="bum-empty" data-testid="users-empty"><Search size={36} /><h3>لا توجد حسابات مطابقة</h3><p>جرّب تغيير كلمات البحث أو المرشحات.</p><Button variant="outline" onClick={() => { setFilters(initialUserFilters); setPage(1); }}>عرض جميع المستخدمين</Button></div> : <div className="bum-table-scroll" tabIndex={0} role="region" aria-label="جدول مستخدمي المؤسسة، يمكن تمريره أفقيًا"><table className="bum-table" data-testid="users-table"><caption className="bui-sr-only">جدول المستخدمين وحالاتهم وأدوارهم وإجراءات الإدارة التجريبية</caption><thead><tr><th>المستخدم</th><th>الدور</th><th>القسم</th><th>الحالة</th><th>آخر نشاط</th><th>الإجراءات</th></tr></thead><tbody>{visible.map(user => <tr key={user.id}>
                    <td><div className="bum-person"><span aria-hidden="true" className="bum-avatar"><UserRound size={18} /></span><div><Link href={userDetailsHref(user.id)} className="bud-users-name-link">{user.name}</Link><small dir="ltr">{user.email}</small>{user.id === demoActorId && <em>حساب الإدارة الحالي (تجريبي)</em>}</div></div></td>
                    <td><div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}><RolePill role={user.role} customRoleId={user.customRoleId} customRoles={customRoles} />{getUserOverrides(user.id).length > 0 && <span title={`${getUserOverrides(user.id).length} استثناءات صلاحيات`} style={{ fontSize: 9, padding: '2px 6px', borderRadius: 6, background: '#fdf6e7', color: '#b27b10', fontWeight: 800, border: '1px solid #f9e2af' }}>★ استثناء ({getUserOverrides(user.id).length})</span>}</div></td><td>{user.department}</td><td><StatusPill status={user.status} /></td><td><span className="bum-lastseen"><Clock3 size={14} />{user.lastSeen}</span></td>
                    <td><div className="bum-actions"><Link className="bud-users-details-link" href={userDetailsHref(user.id)} aria-label={`صفحة تفاصيل ${user.name}`} title="فتح التفاصيل الكاملة"><ContactRound size={17} /></Link><button type="button" onClick={() => setDetailsId(user.id)} aria-label={`تفاصيل ${user.name}`} title="معاينة سريعة"><Eye size={17} /></button><button type="button" onClick={() => startEdit(user)} aria-label={`تعديل ${user.name}`} title="تعديل بيانات المستخدم"><Pencil size={17} /></button><button className={user.status === 'active' ? 'bum-danger-action' : ''} type="button" disabled={user.id === demoActorId} onClick={() => setPendingId(user.id)} aria-label={`${user.status === 'active' ? 'تعطيل' : 'تنشيط'} ${user.name}`} title={user.id === demoActorId ? 'لا يمكن تعديل حالة حساب الإدارة الحالي' : user.status === 'active' ? 'تعطيل' : 'تنشيط'}>{user.status === 'active' ? <UserRoundMinus size={17} /> : <UserRoundPlus size={17} />}</button></div></td>
                </tr>)}</tbody></table></div>}
                <footer className="bum-pagination"><span>الصفحة {currentPage} من {totalPages} · عرض {visible.length} مستخدم</span><div><Button size="sm" variant="outline" disabled={currentPage <= 1} leadingIcon={<ChevronRight size={16} />} onClick={() => setPage(p => Math.max(1, p - 1))}>السابق</Button><Button size="sm" variant="outline" disabled={currentPage >= totalPages} trailingIcon={<ChevronLeft size={16} />} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>التالي</Button></div></footer>
            </section>
            <section className="bum-bottom-grid"><article className="ban-panel"><h2><ShieldCheck size={20} /> قواعد إدارة الأدوار</h2><p>المسموح في هذه الشاشة ثلاثة أدوار مؤسسية. دور مسؤول المنصة منفصل عن إدارة حسابات المؤسسة. كما نحمي آخر مسؤول نشط من التعطيل أو إزالة الدور ضمن المحاكاة.</p><Link href="/admin/roles">استعراض مصفوفة الأدوار <ArrowLeft size={15} /></Link></article><article className="ban-panel"><h2><Activity size={20} /> آخر الإجراءات المحلية</h2>{activity.length ? <ul>{activity.map(a => <li key={a.id}><span>{a.action}</span><time>{a.at}</time></li>)}</ul> : <p>لم تُنفّذ إجراءات داخل جلسة المعاينة الحالية. هذا ليس سجل تدقيق رسميًا.</p>}</article></section>
            <div className="bum-footer-note"><Info size={16} /> تُعرض بيانات هذه الشاشة لغرض تجربة تصميم الإدارة فقط؛ ولا توجد استدعاءات API أو صلاحيات حقيقية أو جلسات مستخدمين.</div>
        </>}
        <Dialog open={openCreate && canManage} onClose={() => setOpenCreate(false)} title="إضافة مستخدم تجريبي" description="إنشاء سجل محلي للعرض فقط، دون إرسال دعوة أو إنشاء حساب فعلي" footer={<><Button variant="outline" onClick={() => setOpenCreate(false)}>إلغاء</Button><Button leadingIcon={<UserRoundPlus size={17} />} onClick={submitCreate}>إضافة إلى النموذج</Button></>}><DraftFields draft={draft} setDraft={setDraft} errors={errors} customRoles={customRoles} /></Dialog>
        <Drawer open={Boolean(details) && canManage} onClose={() => setDetailsId(null)} title="تفاصيل المستخدم" description="بيانات تعريفية تجريبية للمؤسسة">{details && <div className="bum-detail" data-testid="user-details"><div className="bum-detail-avatar"><UserRound size={38} /><div><h3>{details.name}</h3><p>{details.email}</p></div></div><dl>{[['معرّف المستخدم', details.id], ['المؤسسة', details.institution], ['القسم', details.department], ['الدور', details.customRoleId ? (customRoles.find(r => r.id === details.customRoleId)?.nameAr ? `${customRoles.find(r => r.id === details.customRoleId)?.nameAr} (مخصص)` : userRoleLabels[details.role]) : userRoleLabels[details.role]], ['حالة الحساب', userStatusLabels[details.status]], ['تاريخ الإضافة', details.joined], ['آخر نشاط تجريبي', details.lastSeen]].map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl><p className="bum-form-hint"><Info size={16} /> هذه التفاصيل ليست مسترجعة من قاعدة بيانات فعلية.</p><div className="bud-drawer-links"><Link href={userDetailsHref(details.id)} className="bud-users-details-link-full">فتح الصفحة الكاملة <ArrowLeft size={16} /></Link><Button fullWidth variant="outline" onClick={() => startEdit(details)} leadingIcon={<Pencil size={16} />}>تعديل بيانات المستخدم</Button></div></div>}</Drawer>
        <Drawer open={Boolean(editing) && canManage} onClose={() => setEditId(null)} title="تعديل حساب المستخدم" description="تغيير البيانات والدور على نموذج محلي فقط" footer={<><Button variant="outline" onClick={() => setEditId(null)}>إلغاء</Button><Button onClick={submitEdit} disabled={!changing}>حفظ التعديل</Button></>}>
            {editing && <><p className="bum-edit-name"><UserRound size={17} />{editing.name} <span dir="ltr">({editing.id})</span></p><DraftFields draft={draft} setDraft={setDraft} errors={errors} customRoles={customRoles} disabledRole={editing.id === demoActorId} />{editing.id === demoActorId && <p className="bum-protection">لا يمكن تغيير دور حساب مسؤول تقنية المعلومات الحالي من هذه المعاينة.</p>}</>}
        </Drawer>
        <Dialog open={Boolean(pending) && canManage} onClose={() => setPendingId(null)} title={pending?.status === 'active' ? 'تأكيد تعطيل الحساب' : 'تأكيد تنشيط الحساب'} description="تأكيد الإجراء التجريبي على بيانات المتصفح فقط" footer={<><Button variant="outline" onClick={() => setPendingId(null)}>إلغاء</Button><Button variant={pending?.status === 'active' ? 'danger' : 'primary'} onClick={applyStatus}>{pending?.status === 'active' ? 'تأكيد التعطيل' : 'تأكيد التنشيط'}</Button></>}>{pending && <p className="bum-confirm-text">هل تريد {pending.status === 'active' ? 'تعطيل' : 'تنشيط'} الحساب التجريبي <strong>{pending.name}</strong>؟ هذا الإجراء لا يؤثر على تسجيل دخول حقيقي.</p>}</Dialog>
        <Dialog open={confirmRestore && canManage} onClose={() => setConfirmRestore(false)} title="استعادة البيانات الافتراضية" description="سيُزال كل تعديل تجريبي أجريته في هذا المتصفح" footer={<><Button variant="outline" onClick={() => setConfirmRestore(false)}>إلغاء</Button><Button variant="danger" onClick={restore}>استعادة البيانات</Button></>}><p className="bum-confirm-text">ستعود قائمة المستخدمين إلى 14 سجلًا وهميًا، وتُزال الإضافات وتغييرات الأدوار والحالات المحلية.</p></Dialog>
        {notice && <div className="bum-toast"><Toast {...notice} onClose={() => setNotice(null)} /></div>}
    </div>;
}
export function UsersManagementScreen() { return <DemoAccessProvider initialRole="it_admin"><AdminLayout variant="feature"><UsersBody /></AdminLayout></DemoAccessProvider>; }
