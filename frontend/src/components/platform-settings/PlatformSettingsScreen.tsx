'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import {
  Activity, AlertTriangle, ArrowLeft, BellRing, Bot, Check, CheckCircle2, ChevronLeft,
  Download, Globe2, History, Info, LockKeyhole, RotateCcw, Save, Settings2,
  ShieldCheck, SlidersHorizontal, Timer, Undo2,
} from 'lucide-react';
import { PlatformLayout } from '@/components/layout/PlatformLayout';
import { Button, Dialog, Toast } from '@/components/ui';
import { DemoAccessProvider, DemoRolePicker, useDemoAccess } from '@/components/access/DemoAccess';
import { StatePanel } from '@/components/states';
import {
  DEFAULT_PLATFORM_SETTINGS, PLATFORM_SETTINGS_NOTICE, PLATFORM_SETTINGS_STORAGE_KEY,
  PROVIDER_LABELS, TIMEZONE_LABELS, clonePlatformSettings, createSettingsHistoryEntry,
  diffPlatformSettings, parseStoredPlatformSettings, settingsJsonExport,
  validatePlatformSettings, type PlatformLanguage, type PlatformProvider, type PlatformSettings,
  type PlatformTimezone, type SettingsHistoryEntry,
} from '@/lib/platform-settings/settings';

type Tab = 'general' | 'query' | 'audit' | 'ai';
type Notice = { title: string; message: string; tone: 'success' | 'warning' | 'danger' | 'info' };
const number = (value: number) => new Intl.NumberFormat('ar-EG').format(value);
const tabs: Array<{ id: Tab; label: string; icon: typeof Settings2 }> = [
  { id: 'general', label: 'عام', icon: Globe2 },
  { id: 'query', label: 'الاستعلامات', icon: Timer },
  { id: 'audit', label: 'التدقيق والاحتفاظ', icon: ShieldCheck },
  { id: 'ai', label: 'النماذج والحدود', icon: Bot },
];

function Field({ label, hint, children, error, id }: { label: string; hint?: string; children: ReactNode; error?: string; id: string }) {
  return <div className="bps-field">
    <label htmlFor={id}>{label}</label>
    {children}
    {hint && <small>{hint}</small>}
    {error && <span className="bps-field-error" role="alert">{error}</span>}
  </div>;
}
function NumberInput({ id, value, min, max, onChange, suffix }: { id: string; value: number; min: number; max: number; onChange: (value: number) => void; suffix: string }) {
  return <div className="bps-number-input"><input id={id} type="number" inputMode="numeric" min={min} max={max} step="1" value={Number.isFinite(value) ? value : ''} onChange={event => onChange(event.target.value === '' ? Number.NaN : Number(event.target.value))}/><span>{suffix}</span></div>;
}
function Toggle({ id, checked, onChange, label, description }: { id: string; checked: boolean; onChange: (value: boolean) => void; label: string; description: string }) {
  return <label className="bps-toggle" htmlFor={id}><span className="bps-toggle-copy"><strong>{label}</strong><small>{description}</small></span><input id={id} type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)}/><span className="bps-toggle-track" aria-hidden="true"><i/></span></label>;
}

function Screen() {
  const { can } = useDemoAccess();
  const allowed = can('platform.manage');
  const [draft, setDraft] = useState<PlatformSettings>(() => clonePlatformSettings(DEFAULT_PLATFORM_SETTINGS));
  const [saved, setSaved] = useState<PlatformSettings>(() => clonePlatformSettings(DEFAULT_PLATFORM_SETTINGS));
  const [history, setHistory] = useState<SettingsHistoryEntry[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('general');
  const [reviewOpen, setReviewOpen] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    try {
      const loaded = parseStoredPlatformSettings(window.localStorage.getItem(PLATFORM_SETTINGS_STORAGE_KEY));
      setSaved(loaded.settings);
      setDraft(clonePlatformSettings(loaded.settings));
      setHistory(loaded.history);
    } catch {
      setNotice({ title: 'تعذر قراءة المسودة المحلية', message: 'استُخدمت القيم الافتراضية لهذه الجلسة دون تغيير إعدادات الخادم.', tone: 'warning' });
    }
    setHydrated(true);
  }, []);

  const issues = useMemo(() => validatePlatformSettings(draft), [draft]);
  const changes = useMemo(() => diffPlatformSettings(saved, draft), [saved, draft]);
  const changed = changes.length > 0;
  const currentErrors = useMemo(() => new Map(issues.map(issue => [issue.field, issue.message])), [issues]);

  function updateGeneral<K extends keyof PlatformSettings['general']>(key: K, value: PlatformSettings['general'][K]) {
    setDraft(current => ({ ...current, general: { ...current.general, [key]: value } }));
  }
  function updateQuery<K extends keyof PlatformSettings['query']>(key: K, value: PlatformSettings['query'][K]) {
    setDraft(current => ({ ...current, query: { ...current.query, [key]: value } }));
  }
  function updateAudit<K extends keyof PlatformSettings['audit']>(key: K, value: PlatformSettings['audit'][K]) {
    setDraft(current => ({ ...current, audit: { ...current.audit, [key]: value, immutable: true } }));
  }
  function updateAi<K extends keyof PlatformSettings['ai']>(key: K, value: PlatformSettings['ai'][K]) {
    setDraft(current => ({ ...current, ai: { ...current.ai, [key]: value } }));
  }

  function beginReview() {
    if (!allowed || !hydrated) return;
    if (!changed) {
      setNotice({ title: 'لا توجد تغييرات', message: 'الإعدادات الحالية مطابقة لآخر نسخة محفوظة.', tone: 'info' });
      return;
    }
    if (issues.length) {
      setNotice({ title: 'تعذر مراجعة التغييرات', message: `توجد ${number(issues.length)} مشكلة في القيم. راجع الحقول المحددة قبل المتابعة.`, tone: 'danger' });
      return;
    }
    setReviewOpen(true);
  }

  function confirmSave() {
    if (!allowed || issues.length || !changed) return;
    const lastSequence = Number(history[0]?.id.split('-').at(-1) ?? 0);
    const entry = createSettingsHistoryEntry(saved, draft, (Number.isFinite(lastSequence) ? lastSequence : 0) + 1);
    if (!entry) { setReviewOpen(false); return; }
    const nextHistory = [entry, ...history].slice(0, 8);
    const nextSaved = clonePlatformSettings(draft);
    try {
      window.localStorage.setItem(PLATFORM_SETTINGS_STORAGE_KEY, JSON.stringify({ settings: nextSaved, history: nextHistory }));
    } catch {
      setNotice({ title: 'تعذر حفظ الإعدادات التجريبية', message: 'قد تكون مساحة التخزين المحلية غير متاحة. لم تُعرض العملية على أنها ناجحة.', tone: 'danger' });
      return;
    }
    setSaved(nextSaved);
    setDraft(clonePlatformSettings(nextSaved));
    setHistory(nextHistory);
    setReviewOpen(false);
    setNotice({ title: 'حُفظت النسخة التجريبية محليًا', message: 'تم حفظ الإعدادات في هذا المتصفح فقط. لم تُرسل أي تغييرات إلى الخادم.', tone: 'success' });
  }

  function discardDraft() {
    setDraft(clonePlatformSettings(saved));
    setNotice({ title: 'تم إلغاء التعديلات', message: 'عادت الحقول إلى آخر نسخة محفوظة محليًا.', tone: 'info' });
  }

  function restorePreviousAsDraft() {
    if (!history.length) return;
    setDraft(clonePlatformSettings(history[0].previousSettings));
    setNotice({ title: 'أُعدّت نسخة سابقة كمسودة', message: 'راجع الفروقات ثم احفظها إذا أردت. لم يتم التراجع عن إعدادات الخادم.', tone: 'warning' });
  }

  function restoreDefaults() {
    setDraft(clonePlatformSettings(DEFAULT_PLATFORM_SETTINGS));
    setNotice({ title: 'استُعيدت القيم الافتراضية كمسودة', message: 'لم تُحفظ التغييرات بعد. راجعها قبل التأكيد.', tone: 'info' });
  }

  function exportJson() {
    if (!allowed) return;
    try {
      const blob = new Blob([settingsJsonExport(draft)], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'bayan-platform-settings-demo.json';
      document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
      setNotice({ title: 'تم تصدير نسخة الإعدادات', message: 'الملف لا يحتوي على مفاتيح API أو كلمات مرور أو بيانات اتصال سرية.', tone: 'success' });
    } catch {
      setNotice({ title: 'تعذر التصدير', message: 'لم يتم إرسال أي بيانات إلى الخادم.', tone: 'danger' });
    }
  }

  const latest = history[0];
  const activeTabConfig = tabs.find(tab => tab.id === activeTab);
  const tabHeading = activeTabConfig?.label ?? '';
  const ActiveTabIcon = activeTabConfig?.icon ?? Settings2;

  return <main className="ban borg bps" dir="rtl" data-testid="platform-settings-screen">
    <nav className="ban-breadcrumb" aria-label="مسار التنقل"><Link href="/platform/agents">إدارة المنصة</Link><ChevronLeft size={15}/><span aria-current="page">إعدادات المنصة</span></nav>
    <header className="ban-hero borg-hero bps-hero">
      <div><span className="ban-eyebrow"><Settings2 size={17}/> Platform Configuration · Settings</span><h1>إعدادات المنصة</h1><p>إدارة القيم العامة وسياسات الاستعلام والاحتفاظ بسجلات التدقيق وحدود تشغيل مزودي النماذج.</p><div className="ban-hero-tags"><span><ShieldCheck size={14}/> مسؤول المنصة</span><span><LockKeyhole size={14}/> لا تتضمن أسرار اتصال</span><span><SlidersHorizontal size={14}/> مراجعة قبل الحفظ</span></div></div>
      <div className="ban-hero-art" aria-hidden="true"><Settings2 size={76}/><i/></div>
    </header>
    <div className="ban-disclaimer" role="note"><Info size={19}/><span><strong>{PLATFORM_SETTINGS_NOTICE}</strong> حفظ هذه الصفحة محلي للعرض؛ تطبيق السياسات الفعلية يتطلب Backend وتفويضًا على الخادم.</span></div>
    <div className="ban-role"><span><ShieldCheck size={17}/> إدارة إعدادات تشغيل المنصة فقط، دون الوصول إلى بيانات المؤسسات الداخلية.</span><DemoRolePicker id="platform-settings-role-picker"/></div>

    {!allowed ? <section className="ban-panel bps-locked" data-testid="platform-settings-forbidden"><StatePanel state="forbidden" title="لا تملك صلاحية إدارة إعدادات المنصة" description="هذه الصفحة مخصصة لمسؤول المنصة ضمن محاكاة RBAC. يجب فرض التفويض الفعلي على الخادم أيضًا."/></section> : <>
      <section className="bps-summary" aria-label="ملخص الإعدادات">
        <article><span><Settings2 size={22}/></span><div><small>مجموعات الإعدادات</small><strong>4</strong><p>عام · استعلامات · تدقيق · نماذج</p></div></article>
        <article><span><Activity size={22}/></span><div><small>التغييرات غير المحفوظة</small><strong>{number(changes.length)}</strong><p>{changed ? 'تحتاج مراجعة قبل الحفظ' : 'لا توجد تغييرات معلقة'}</p></div></article>
        <article><span><History size={22}/></span><div><small>آخر حفظ محلي</small><strong>{latest ? 'متوفر' : 'لا يوجد'}</strong><p>{latest ? latest.timestamp.slice(0, 16).replace('T', ' ') : 'لم تُسجل تغييرات بعد'}</p></div></article>
      </section>

      <section className="ban-panel bps-main-panel">
        <div className="ban-section-header bps-panel-header"><div><h2><SlidersHorizontal size={19}/> ضبط إعدادات المنصة</h2><p>اختر مجموعة الإعدادات وعدّل القيم ضمن النطاقات المسموحة في هذا النموذج.</p></div><div className="bps-header-actions"><Button size="sm" variant="outline" onClick={exportJson} leadingIcon={<Download size={15}/>}>تصدير JSON</Button><Button size="sm" variant="outline" onClick={restoreDefaults} disabled={JSON.stringify(draft) === JSON.stringify(DEFAULT_PLATFORM_SETTINGS)} leadingIcon={<RotateCcw size={15}/>}>استعادة الافتراضي</Button><Button size="sm" variant="outline" onClick={discardDraft} disabled={!changed} leadingIcon={<Undo2 size={15}/>}>إلغاء التعديلات</Button><Button size="sm" onClick={beginReview} disabled={!changed || !hydrated} leadingIcon={<Save size={15}/>}>مراجعة وحفظ</Button></div></div>
        <div className="bps-tabs" role="tablist" aria-label="مجموعات إعدادات المنصة">{tabs.map(({ id, label, icon: Icon }) => <button key={id} type="button" role="tab" aria-selected={activeTab === id} aria-controls={`bps-panel-${id}`} id={`bps-tab-${id}`} className={activeTab === id ? 'active' : ''} onClick={() => setActiveTab(id)}><Icon size={16}/>{label}</button>)}</div>
        <div className="bps-tab-content" role="tabpanel" id={`bps-panel-${activeTab}`} aria-labelledby={`bps-tab-${activeTab}`}>
          <div className="bps-tab-heading"><div><span><ActiveTabIcon size={20}/></span><div><h3>{tabHeading}</h3><p>{activeTab === 'general' ? 'اللغة والمنطقة الزمنية الافتراضية للمنصة.' : activeTab === 'query' ? 'حدود زمن تنفيذ SQL ومحاولات التصحيح وإعادة التنفيذ.' : activeTab === 'audit' ? 'سياسة الاحتفاظ بالسجلات وإخفاء البيانات الحساسة.' : 'المزود والنموذج الافتراضيان وحدود الاستهلاك التشغيلي.'}</p></div></div><span className="bps-draft-badge">{changed ? 'توجد مسودة تغييرات' : 'مطابق لآخر حفظ'}</span></div>

          {activeTab === 'general' && <div className="bps-fields-grid" data-testid="settings-general-fields">
            <Field id="bps-language" label="اللغة الافتراضية" hint="تُستخدم كلغة أولية للمستخدمين الجدد في التصور المقترح." error={currentErrors.get('general.defaultLanguage')}><select id="bps-language" value={draft.general.defaultLanguage} onChange={event => updateGeneral('defaultLanguage', event.target.value as PlatformLanguage)}><option value="ar">العربية</option><option value="en">English</option></select></Field>
            <Field id="bps-timezone" label="المنطقة الزمنية الافتراضية" hint="تُستخدم لعرض التوقيتات في واجهات المنصة." error={currentErrors.get('general.timezone')}><select id="bps-timezone" value={draft.general.timezone} onChange={event => updateGeneral('timezone', event.target.value as PlatformTimezone)}>{Object.entries(TIMEZONE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
            <div className="bps-info-card"><Globe2 size={19}/><div><strong>تفضيل عرض عام</strong><p>لا يغيّر هذا الاختيار لغة مستندات المؤسسة أو محتوى المستخدمين الحاليين في النظام الفعلي.</p></div></div>
          </div>}

          {activeTab === 'query' && <div className="bps-fields-grid" data-testid="settings-query-fields">
            <Field id="bps-sql-timeout" label="مهلة تنفيذ استعلام SQL" hint="النطاق المقترح: 5–120 ثانية." error={currentErrors.get('query.sqlTimeoutSeconds')}><NumberInput id="bps-sql-timeout" value={draft.query.sqlTimeoutSeconds} min={5} max={120} suffix="ثانية" onChange={value => updateQuery('sqlTimeoutSeconds', value)}/></Field>
            <Field id="bps-correction-attempts" label="عدد محاولات التصحيح" hint="عدد مرات محاولة تصحيح الاستعلام قبل إيقاف المسار." error={currentErrors.get('query.maxCorrectionAttempts')}><NumberInput id="bps-correction-attempts" value={draft.query.maxCorrectionAttempts} min={0} max={3} suffix="محاولة" onChange={value => updateQuery('maxCorrectionAttempts', value)}/></Field>
            <Field id="bps-retry-attempts" label="عدد محاولات إعادة التنفيذ" hint="إعادة المحاولة عند الأعطال المؤقتة فقط؛ لا تعني تكرار العمليات غير الآمنة." error={currentErrors.get('query.maxRetryAttempts')}><NumberInput id="bps-retry-attempts" value={draft.query.maxRetryAttempts} min={0} max={5} suffix="محاولة" onChange={value => updateQuery('maxRetryAttempts', value)}/></Field>
            <div className="bps-info-card"><Timer size={19}/><div><strong>حدود تنفيذ آمنة</strong><p>هذه القيم لا تُفرض على SQL أو الوكلاء فعليًا حتى تُقرأ وتُتحقق منها خدمات Backend.</p></div></div>
          </div>}

          {activeTab === 'audit' && <div className="bps-fields-grid" data-testid="settings-audit-fields">
            <Field id="bps-retention" label="مدة الاحتفاظ بسجل التدقيق" hint="النطاق: 30–3650 يومًا. يجب مواءمة المدة مع السياسة القانونية والتنظيمية للمؤسسة." error={currentErrors.get('audit.retentionDays')}><NumberInput id="bps-retention" value={draft.audit.retentionDays} min={30} max={3650} suffix="يوم" onChange={value => updateAudit('retentionDays', value)}/></Field>
            <div className="bps-toggle-card"><Toggle id="bps-redact" checked={draft.audit.redactSensitiveFields} onChange={value => updateAudit('redactSensitiveFields', value)} label="إخفاء الحقول الحساسة" description="إخفاء الأسرار والرموز والبيانات الشخصية من عروض السجل والتصدير."/></div>
            <div className="bps-immutable-card"><span><LockKeyhole size={19}/></span><div><strong>سجلات التدقيق غير قابلة للتعديل</strong><p>هذا القيد ثابت في التصميم؛ لا توفر الشاشة خيار حذف السجلات أو تعديلها. تُدار دورة الاحتفاظ على الخادم وفق سياسة معتمدة.</p></div><CheckCircle2 size={18}/></div>
          </div>}

          {activeTab === 'ai' && <div className="bps-fields-grid" data-testid="settings-ai-fields">
            <Field id="bps-provider" label="مزود النماذج الافتراضي" hint="اختيار وصفي فقط؛ لا يجري اتصال بالمزود." error={currentErrors.get('ai.defaultProvider')}><select id="bps-provider" value={draft.ai.defaultProvider} onChange={event => updateAi('defaultProvider', event.target.value as PlatformProvider)}>{Object.entries(PROVIDER_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
            <Field id="bps-model" label="اسم النموذج الافتراضي" hint="اسم تعريف النموذج فقط، وليس مفتاح API أو عنوان اتصال." error={currentErrors.get('ai.defaultModel')}><input id="bps-model" type="text" dir="ltr" value={draft.ai.defaultModel} onChange={event => updateAi('defaultModel', event.target.value)} placeholder="qwen2.5:14b"/></Field>
            <Field id="bps-rpm" label="حد الطلبات في الدقيقة" hint="النطاق: 1–600 طلب لكل دقيقة." error={currentErrors.get('ai.requestsPerMinute')}><NumberInput id="bps-rpm" value={draft.ai.requestsPerMinute} min={1} max={600} suffix="طلب/دقيقة" onChange={value => updateAi('requestsPerMinute', value)}/></Field>
            <Field id="bps-concurrency" label="الطلبات المتزامنة القصوى" hint="النطاق: 1–64 طلبًا متزامنًا." error={currentErrors.get('ai.maxConcurrentRequests')}><NumberInput id="bps-concurrency" value={draft.ai.maxConcurrentRequests} min={1} max={64} suffix="طلب" onChange={value => updateAi('maxConcurrentRequests', value)}/></Field>
            <div className="bps-info-card bps-info-card--wide"><LockKeyhole size={19}/><div><strong>إدارة الأسرار خارج الواجهة</strong><p>لا توجد حقول لمفاتيح API أو كلمات المرور. تُحفظ بيانات الاعتماد مستقبلًا في مخزن أسرار على الخادم، ولا تُعاد إلى المتصفح.</p><Link href="/platform/models">فتح إدارة مزودي النماذج <ArrowLeft size={14}/></Link></div></div>
          </div>}
        </div>
        {issues.length > 0 && <div className="bps-validation" role="alert"><AlertTriangle size={18}/><div><strong>توجد قيم تحتاج إلى تصحيح</strong><ul>{issues.map(issue => <li key={issue.field}>{issue.message}</li>)}</ul></div></div>}
        <div className="bps-footer-actions"><span><Info size={15}/> {changed ? `${number(changes.length)} تغييرًا بانتظار المراجعة` : 'لا توجد تغييرات معلقة'}</span><div><Button size="sm" variant="outline" disabled={!changed} onClick={discardDraft} leadingIcon={<Undo2 size={15}/>}>إلغاء التعديلات</Button><Button size="sm" disabled={!changed || issues.length > 0 || !hydrated} onClick={beginReview} leadingIcon={<Save size={15}/>}>مراجعة وحفظ التغييرات</Button></div></div>
      </section>

      <section className="ban-panel bps-history-panel">
        <div className="ban-section-header"><div><h2><History size={19}/> سجل تغييرات الإعدادات</h2><p>سجل محلي مختصر للتغييرات التي حُفظت من هذا المتصفح، وليس بديلًا عن Audit Log المركزي.</p></div><Button size="sm" variant="outline" disabled={!history.length} onClick={restorePreviousAsDraft} leadingIcon={<RotateCcw size={15}/>}>استعادة النسخة السابقة كمسودة</Button></div>
        {!history.length ? <div className="bps-history-empty"><History size={24}/><strong>لا توجد تغييرات محفوظة بعد</strong><p>ستظهر هنا مراجعات الإعدادات المحلية بعد تأكيد الحفظ.</p></div> : <div className="bps-history-list" data-testid="settings-history">{history.map((entry, index) => <article key={entry.id}><span className="bps-history-icon"><Check size={17}/></span><div className="bps-history-copy"><strong>{entry.summary}</strong><small><bdi dir="ltr">{entry.id}</bdi> · {entry.timestamp.replace('T', ' ').slice(0, 16)}</small><p>{entry.changes.slice(0, 3).map(change => change.label).join('، ')}{entry.changes.length > 3 ? `، و${entry.changes.length - 3} تغييرات أخرى` : ''}</p></div><span className="bps-history-count">{number(entry.changes.length)} تغييرات</span>{index === 0 && <span className="bps-latest">الأحدث</span>}</article>)}</div>}
      </section>

      <section className="bps-guidance"><article className="ban-panel"><h2><ShieldCheck size={18}/> حدود الصلاحيات والحماية</h2><p>تُعرض هذه الصفحة لمسؤول المنصة في نموذج RBAC. يجب فرض صلاحية إدارة الإعدادات والتحقق من القيم على الخادم، مع عزل إعدادات كل بيئة.</p></article><article className="ban-panel"><h2><BellRing size={18}/> قبل اعتماد الإعدادات فعليًا</h2><p>يجب مراجعة مهلة الاستعلام وحدود النماذج وسياسة الاحتفاظ مع مسؤول الأمن والبيانات، وتسجيل التغييرات في سجل تدقيق غير قابل للتلاعب.</p></article></section>
    </>}

    <Dialog open={reviewOpen && allowed} onClose={() => setReviewOpen(false)} title="مراجعة تغييرات إعدادات المنصة" description="تحقق من القيم قبل حفظ النسخة التجريبية محليًا." footer={<><Button variant="outline" onClick={() => setReviewOpen(false)}>العودة للتعديل</Button><Button onClick={confirmSave} leadingIcon={<CheckCircle2 size={16}/>}>تأكيد الحفظ المحلي</Button></>}>
      <div className="bps-review" data-testid="settings-review-dialog"><div className="bps-review-notice"><Info size={17}/> {PLATFORM_SETTINGS_NOTICE}</div><p>عدد التغييرات: <strong>{number(changes.length)}</strong></p><div className="bps-review-table"><div className="bps-review-head"><span>الإعداد</span><span>القيمة الحالية</span><span>القيمة الجديدة</span></div>{changes.map(change => <div key={change.field}><strong>{change.label}</strong><span>{change.before}</span><b>{change.after}</b></div>)}</div><div className="bps-review-warning"><AlertTriangle size={17}/> لن يتم تطبيق أي تغيير على Backend أو على المؤسسات؛ هذه نسخة محلية للمعاينة فقط.</div></div>
    </Dialog>
    {notice && <div className="bps-toast"><Toast title={notice.title} message={notice.message} tone={notice.tone} onClose={() => setNotice(null)}/></div>}
  </main>;
}

export function PlatformSettingsScreen() {
  return <DemoAccessProvider initialRole="platform_admin"><PlatformLayout><Screen/></PlatformLayout></DemoAccessProvider>;
}
