'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
    Activity, AlertTriangle, ArrowLeft, BrainCircuit, CheckCircle2, ChevronLeft, ClipboardCopy,
    Cloud, CloudOff, Database, Download, FilterX, Info, Layers3, LockKeyhole, Search,
    Server, Settings2, ShieldCheck, SlidersHorizontal, TestTube2, WifiOff, XCircle
} from 'lucide-react';
import { PlatformLayout } from '@/components/layout/PlatformLayout';
import { Button, Dialog, Drawer, Toast } from '@/components/ui';
import { DemoAccessProvider, DemoRolePicker, useDemoAccess } from '@/components/access/DemoAccess';
import { StatePanel } from '@/components/states';
import { PLATFORM_ROUTES, AUXILIARY_ROUTES } from '@/lib/routes';
import {
    CAPABILITY_LABELS, CREDENTIAL_LABELS, DEFAULT_PROVIDER_FILTERS, DEMO_MODELS,
    DEMO_PROVIDERS, MODE_LABELS, MODELS_NOTICE, MODEL_DRAFT_STORAGE, PROVIDER_STATUS_LABELS,
    filterModels, filterProviders, getModel, getProvider, modelWithDraft, modelsCsv, parseDrafts,
    previewReadiness, providerStats, serializeDrafts, type CheckResult, type ModelDefinition,
    type ModelDraft, type ModelProvider, type ProviderFilters, type ModelCapability, type ProviderKind,
    type ProviderStatus
} from '@/lib/model-providers/models';

const fnum = (n: number) => new Intl.NumberFormat('ar').format(n);
type Notice = { title: string; message: string; tone: 'success' | 'warning' | 'danger' | 'info' };
function Status({ status }: { status: ProviderStatus }) { const Icon = status === 'ready' ? CheckCircle2 : status === 'degraded' ? AlertTriangle : status === 'offline' ? WifiOff : CloudOff; return <span className={`bmp-status bmp-status--${status}`}><Icon size={14} />{PROVIDER_STATUS_LABELS[status]}</span>; }
function ProviderDrawer({ provider, models, onCheck, onCopy }: { provider: ModelProvider; models: readonly ModelDefinition[]; onCheck: () => void; onCopy: (value: string) => void }) {
    return <div className="bmp-detail" data-testid="model-provider-detail">
        <div className="bmp-detail-identity"><span><Server size={25} /></span><div><strong>{provider.name}</strong><small dir="ltr">{provider.id}</small></div></div>
        <div className="bmp-alert"><ShieldCheck size={18} /> بيانات وصفية فقط، ولا يُكشف أي مفتاح API. الحالة المعروضة اصطناعية.</div>
        <div className="bmp-kv">
            <div><small>نمط التشغيل</small><strong>{MODE_LABELS[provider.kind]}</strong></div>
            <div><small>الحالة التجريبية</small><Status status={provider.status} /></div>
            <div><small>النطاق الوصفي</small><strong>{provider.location}</strong></div>
            <div><small>إدارة بيانات الاعتماد</small><strong>{CREDENTIAL_LABELS[provider.credentials]}</strong></div>
            <div><small>آخر حالة مسجلة في المثال</small><strong>{provider.lastCheck ?? 'غير متوفر'}</strong></div>
            <div><small>النماذج المرتبطة</small><strong>{fnum(models.length)} نماذج تدريبية</strong></div>
        </div>
        <p className="bmp-description">{provider.description}</p>
        <section className="bmp-list"><h3><Layers3 size={17} /> النماذج التابعة</h3>{models.map(m => <div key={m.id}><strong dir="ltr">{m.name}</strong><span>{m.capabilities.map(c => CAPABILITY_LABELS[c]).join(' · ')}</span></div>)}</section>
        <div className="bmp-actions"><Button variant="outline" size="sm" onClick={() => onCopy(provider.id)} leadingIcon={<ClipboardCopy size={15} />}>نسخ المعرّف</Button><Button size="sm" onClick={onCheck} leadingIcon={<TestTube2 size={15} />}>فحص جاهزية تجريبي</Button></div>
    </div>;
}
function Screen() {
    const { can } = useDemoAccess(); const allowed = can('platform.manage');
    const [filters, setFilters] = useState<ProviderFilters>({ ...DEFAULT_PROVIDER_FILTERS });
    const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
    const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
    const [editEnabled, setEditEnabled] = useState(true), [editRpm, setEditRpm] = useState(60);
    const [drafts, setDrafts] = useState<Record<string, ModelDraft>>({});
    const [resetConfirm, setResetConfirm] = useState(false);
    const [check, setCheck] = useState<{ label: string; result: CheckResult } | null>(null);
    const [notice, setNotice] = useState<Notice | null>(null); const [loaded, setLoaded] = useState(false);
    useEffect(() => { try { setDrafts(parseDrafts(window.localStorage.getItem(MODEL_DRAFT_STORAGE))); } catch { setDrafts({}); } setLoaded(true); }, []);
    const providers = useMemo(() => filterProviders(filters), [filters]);
    const models = useMemo(() => filterModels(filters), [filters]);
    const stats = useMemo(() => providerStats(), []);
    const selectedProvider = getProvider(selectedProviderId);
    const selectedModel = getModel(selectedModelId);
    function update<K extends keyof ProviderFilters>(key: K, value: ProviderFilters[K]) { setFilters(f => ({ ...f, [key]: value })); }
    function selectModel(model: ModelDefinition) { const d = modelWithDraft(model, drafts); setEditEnabled(d.enabled); setEditRpm(d.rpm); setSelectedModelId(model.id); }
    function closeModel() { setSelectedModelId(null); }
    function saveDraft() {
        if (!allowed || !selectedModel) return;
        if (!Number.isInteger(editRpm) || editRpm < 1 || editRpm > 500) { setNotice({ title: 'حد استخدام غير صالح', message: 'يجب أن يكون عدد الطلبات بين 1 و500 طلب في الدقيقة.', tone: 'warning' }); return; }
        const updated = { ...drafts, [selectedModel.id]: { modelId: selectedModel.id, enabled: editEnabled, rpm: editRpm } };
        try { window.localStorage.setItem(MODEL_DRAFT_STORAGE, serializeDrafts(updated)); setDrafts(updated); closeModel(); setNotice({ title: 'حُفظت مسودة النموذج محليًا', message: 'لم تتغير إعدادات الخادم، ولم يُفعّل أي نموذج حقيقي.', tone: 'success' }); }
        catch { setNotice({ title: 'تعذّر الحفظ', message: 'التخزين المحلي غير متاح؛ لم تتغير إعدادات النماذج.', tone: 'danger' }); }
    }
    function confirmReset() { if (!allowed) return; try { window.localStorage.removeItem(MODEL_DRAFT_STORAGE); setDrafts({}); setResetConfirm(false); setNotice({ title: 'استُعيدت مسودات العرض الافتراضية', message: 'لم تُرسل أي بيانات إلى خدمة خارجية.', tone: 'success' }); } catch { setResetConfirm(false); setNotice({ title: 'تعذّر الاستعادة', message: 'الرجاء التحقق من إعدادات المتصفح.', tone: 'danger' }); } }
    function checkProvider(p: ModelProvider, model?: ModelDefinition) { if (!allowed) return; const result = previewReadiness(p, model); setCheck({ label: model?.name ?? p.name, result }); setSelectedProviderId(null); setSelectedModelId(null); }
    async function copy(text: string) { try { if (!navigator.clipboard?.writeText) throw Error(); await navigator.clipboard.writeText(text); setNotice({ title: 'نُسخ المعرّف', message: 'هذا معرّف تجريبي، وليس مفتاح API.', tone: 'success' }); } catch { setNotice({ title: 'تعذّر النسخ', message: 'الحافظة غير متاحة في المتصفح.', tone: 'warning' }); } }
    function exportCsv() { if (!allowed || !models.length) return; try { const csv = modelsCsv(models, drafts); const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); const a = document.createElement('a'); a.href = url; a.download = 'bayan-models-demo.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); setNotice({ title: 'تم تصدير CSV تدريبي', message: 'يضم بيانات وصفية ومسودات محلية فقط. لا يحتوي مفاتيح أو إعدادات اتصال حساسة.', tone: 'success' }); } catch { setNotice({ title: 'تعذّر التصدير', message: 'لم تُرسل معلومات إلى أي خادم.', tone: 'danger' }); } }
    return <main className="ban borg bmp" dir="rtl" data-testid="models-screen">
        <nav className="ban-breadcrumb" aria-label="مسار التنقل"><Link href={PLATFORM_ROUTES.organizations}>إدارة المؤسسات</Link><ChevronLeft size={15} /><span>إدارة المنصة</span><ChevronLeft size={15} /><span aria-current="page">مزودو النماذج</span></nav>
        <header className="ban-hero borg-hero bmp-hero"><div><span className="ban-eyebrow"><BrainCircuit size={17} /> إدارة المنصة · FR-13</span><h1>إدارة مزودي النماذج اللغوية</h1><p>مراجعة المزودين والنماذج وحدود الاستهلاك والتكوين، مع معاينة حالات الجاهزية دون أي استدعاء لخدمة حقيقية.</p><div className="ban-hero-tags"><span><ShieldCheck size={14} /> صلاحيات مسؤول المنصة</span><span><LockKeyhole size={14} /> مفاتيح الخادم محمية</span><span><CloudOff size={14} /> بيانات تدريبية فقط</span></div></div><div className="ban-hero-art" aria-hidden="true"><BrainCircuit size={79} /><i /></div></header>
        <div className="ban-disclaimer" role="note"><Info size={19} /><span><strong>{MODELS_NOTICE}</strong> لا تُعرض بيانات خدمة حقيقية أو أزمنة استجابة مقاسة.</span></div>
        <div className="ban-role"><span><ShieldCheck size={17} /> الدور المصرّح له بالمعاينة: مسؤول المنصة · <code>platform.manage</code></span><DemoRolePicker id="models-role-picker" /></div>
        {!allowed ? <section className="ban-locked" data-testid="models-forbidden"><StatePanel state="forbidden" title="لا تملك صلاحية إدارة النماذج" description="هذه الصفحة مخصصة لمسؤول المنصة في محاكاة RBAC. الحماية الحقيقية على الخادم لم تُنفّذ بعد." /><Link href={AUXILIARY_ROUTES.screens}>العودة إلى خريطة الواجهات <ArrowLeft size={16} /></Link></section> : <>
            <section className="bmp-stats" aria-label="مؤشرات النماذج التجريبية">
                {([{ title: 'مزودو النماذج', value: stats.total, icon: Server, kind: 'all' }, { title: 'جاهزية توضيحية', value: stats.ready, icon: CheckCircle2, kind: 'ready' }, { title: 'بحاجة إلى مراجعة', value: stats.attention, icon: AlertTriangle, kind: 'warn' }, { title: 'النماذج التدريبية', value: stats.models, icon: BrainCircuit, kind: 'models' }] as const).map(({ title, value, icon: Icon, kind }) => <article className={`bmp-stat bmp-stat--${kind}`} key={kind}><span><Icon size={23} /></span><div><small>{title}</small><strong>{fnum(value)}</strong><p>قيم افتراضية للعرض</p></div></article>)}
            </section>
            <section className="ban-panel bmp-panel"><div className="ban-section-header"><div><h2><SlidersHorizontal size={19} /> البحث والتصفية</h2><p>تصفية المزودين والنماذج دون أي اتصال شبكي.</p></div><div className="bmp-panel-buttons"><Button variant="outline" size="sm" leadingIcon={<FilterX size={16} />} onClick={() => setFilters({ ...DEFAULT_PROVIDER_FILTERS })}>مسح المرشحات</Button><Button size="sm" variant="outline" leadingIcon={<Download size={16} />} disabled={!models.length} onClick={exportCsv}>تصدير CSV</Button></div></div>
                <div className="bmp-filters">
                    <label className="bmp-search"><span><Search size={14} /> بحث عن مزود أو نموذج</span><input value={filters.query} onChange={e => update('query', e.target.value)} placeholder="اسم المزود أو معرّف النموذج..." /></label>
                    <label><span>نوع التشغيل</span><select value={filters.kind} onChange={e => update('kind', e.target.value as ProviderKind | 'all')}><option value="all">جميع الأنواع</option>{(Object.keys(MODE_LABELS) as ProviderKind[]).map(k => <option value={k} key={k}>{MODE_LABELS[k]}</option>)}</select></label>
                    <label><span>حالة الخدمة</span><select value={filters.status} onChange={e => update('status', e.target.value as ProviderStatus | 'all')}><option value="all">جميع الحالات</option>{(Object.keys(PROVIDER_STATUS_LABELS) as ProviderStatus[]).map(k => <option value={k} key={k}>{PROVIDER_STATUS_LABELS[k]}</option>)}</select></label>
                    <label><span>نوع المهمة</span><select value={filters.capability} onChange={e => update('capability', e.target.value as ModelCapability | 'all')}><option value="all">جميع المهام</option>{(Object.keys(CAPABILITY_LABELS) as ModelCapability[]).map(k => <option value={k} key={k}>{CAPABILITY_LABELS[k]}</option>)}</select></label>
                </div>
            </section>
            <section className="ban-panel bmp-panel"><div className="ban-section-header"><div><h2><Server size={20} /> مزودو النماذج</h2><p>عدد المزودين المطابقين: {fnum(providers.length)} من {fnum(DEMO_PROVIDERS.length)}.</p></div><Link className="bmp-inline-link" href={PLATFORM_ROUTES.organizations}>المؤسسات والخدمات <ArrowLeft size={15} /></Link></div>
                {!providers.length ? <div className="bmp-empty"><Search size={26} /><strong>لا يوجد مزود يطابق المرشحات</strong><p>جرّب تغيير البحث أو نوع التشغيل.</p></div> : <div className="bmp-table-scroll"><table className="bmp-table"><thead><tr><th>المزود</th><th>التشغيل</th><th>الحالة</th><th>النماذج</th><th>إدارة الاعتماد</th><th>إجراء</th></tr></thead><tbody>{providers.map(p => <tr key={p.id}><td><div className="bmp-name"><span>{p.kind === 'local' ? <Server size={19} /> : <Cloud size={19} />}</span><div><strong>{p.name}</strong><small dir="ltr">{p.id}</small></div></div></td><td>{MODE_LABELS[p.kind]}</td><td><Status status={p.status} /></td><td>{fnum(DEMO_MODELS.filter(m => m.providerId === p.id).length)}</td><td><span className="bmp-private"><LockKeyhole size={13} />{CREDENTIAL_LABELS[p.credentials]}</span></td><td><div className="bmp-row-actions"><button type="button" onClick={() => setSelectedProviderId(p.id)}>تفاصيل</button><button type="button" onClick={() => checkProvider(p)}><TestTube2 size={13} /> فحص تجريبي</button></div></td></tr>)}</tbody></table></div>}
            </section>
            <section className="ban-panel bmp-panel"><div className="ban-section-header"><div><h2><BrainCircuit size={20} /> نماذج التشغيل وحدود الاستخدام</h2><p>حدود الاستخدام والقدرات هنا قيم توضيحية، ولا تعكس حصصًا حقيقية أو توفرًا تجاريًا.</p></div><div className="bmp-inline-stat"><Database size={16} /> {fnum(models.length)} نموذج</div></div>
                {!models.length ? <div className="bmp-empty"><Search size={24} /><strong>لا توجد نماذج مطابقة</strong></div> : <div className="bmp-table-scroll"><table className="bmp-table bmp-model-table"><thead><tr><th>النموذج</th><th>المزود</th><th>المهام</th><th>سياق رمزي</th><th>حد الاستخدام</th><th>الحالة</th><th>الإجراءات</th></tr></thead><tbody>{models.map(m => { const d = modelWithDraft(m, drafts); return <tr key={m.id}><td><strong dir="ltr" className="bmp-model-name">{m.name}</strong><small dir="ltr">{m.id}</small></td><td>{getProvider(m.providerId)?.name}</td><td><div className="bmp-capabilities">{m.capabilities.map(c => <span key={c}>{CAPABILITY_LABELS[c]}</span>)}</div></td><td dir="ltr">{m.contextTokens.toLocaleString('en-US')}</td><td>{fnum(d.rpm)} طلب/دقيقة</td><td><span className={`bmp-enable bmp-enable--${d.enabled ? 'on' : 'off'}`}>{d.enabled ? 'مفعّل محليًا' : 'معطّل محليًا'}</span></td><td><div className="bmp-row-actions"><button type="button" onClick={() => selectModel(m)}><Settings2 size={13} /> مسودة الإعداد</button><button type="button" onClick={() => checkProvider(getProvider(m.providerId)!, d)}><TestTube2 size={13} /> فحص</button></div></td></tr>; })}</tbody></table></div>}
                <div className="bmp-actions-footer"><p><Info size={16} /> لا تؤثر مسودات الحدود أو التفعيل على النماذج الحقيقية.</p><Button size="sm" variant="outline" disabled={!Object.keys(drafts).length} onClick={() => setResetConfirm(true)}>استعادة مسودات العرض</Button></div>
            </section>
            <div className="bmp-guidance"><section className="ban-panel"><h2><Activity size={18} /> صحة خدمات المنصة</h2><p>تابع الحالات والتنبيهات التشغيلية التدريبية عبر لوحة صحة الخدمات.</p><Link href={PLATFORM_ROUTES.health} className="bmp-inline-link">فتح لوحة صحة الخدمات <ArrowLeft size={15} /></Link></section><section className="ban-panel"><h2><LockKeyhole size={18} /> حماية بيانات الاعتماد</h2><p>لا توجد حقول كلمة مرور أو مفاتيح API في هذه الواجهة. عند الربط الحقيقي، يجب إدارة الأسرار في الخادم أو مخزن أسرار معتمد، وتطبيق مصادقة وصلاحيات وسجل تدقيق.</p></section><section className="ban-panel"><h2><Activity size={18} /> حدود المحاكاة</h2><p>لا تُقاس استجابة المزود، ولا تُرسل مطالبات إلى نموذج، ولا تُغيّر إعدادات LangGraph. مؤشر الجاهزية يعتمد على حالة العينة المكتوبة فقط.</p></section></div>
        </>}
        <Drawer open={!!selectedProvider && allowed} onClose={() => setSelectedProviderId(null)} title="تفاصيل مزود النموذج" description="بيانات إعداد تجريبية وآمنة للقراءة فقط">{selectedProvider && <ProviderDrawer provider={selectedProvider} models={DEMO_MODELS.filter(m => m.providerId === selectedProvider.id)} onCheck={() => checkProvider(selectedProvider)} onCopy={copy} />}</Drawer>
        <Drawer open={!!selectedModel && allowed} onClose={closeModel} title="مسودة إعداد النموذج" description="تفعيل وحدود استخدام محفوظة محليًا فقط">
            {selectedModel && <div className="bmp-detail" data-testid="model-draft-editor"><div className="bmp-detail-identity"><span><BrainCircuit size={25} /></span><div><strong dir="ltr">{selectedModel.name}</strong><small>{selectedModel.description}</small></div></div><div className="bmp-alert"><LockKeyhole size={18} /> لا تُخزّن بيانات اعتماد ولا يُنفّذ تغيير في الخادم.</div><div className="bmp-kv"><div><small>المزود</small><strong>{getProvider(selectedModel.providerId)?.name}</strong></div><div><small>نافذة السياق</small><strong>{fnum(selectedModel.contextTokens)} رمز</strong></div><div><small>حد الإخراج</small><strong>{fnum(selectedModel.maxOutputTokens)} رمز</strong></div><div><small>المهام</small><strong>{selectedModel.capabilities.map(c => CAPABILITY_LABELS[c]).join('، ')}</strong></div></div><label className="bmp-edit-checkbox"><input type="checkbox" checked={editEnabled} onChange={e => setEditEnabled(e.target.checked)} /> السماح في العرض التجريبي</label><label className="bmp-edit-field"><span>عدد الطلبات لكل دقيقة — مسودة</span><input type="number" min={1} max={500} step={1} value={editRpm} onChange={e => setEditRpm(e.target.value === '' ? 0 : Number(e.target.value))} /><small>عدد صحيح من 1 إلى 500. لا يُرسل إلى المزود.</small></label><div className="bmp-actions"><Button variant="outline" onClick={closeModel}>إلغاء</Button><Button onClick={saveDraft}>حفظ المسودة محليًا</Button></div></div>}
        </Drawer>
        <Dialog open={!!check && allowed} onClose={() => setCheck(null)} title="نتيجة فحص الجاهزية التوضيحي" description="الفحص محلي بالكامل ولا يستخدم الإنترنت" footer={<Button onClick={() => setCheck(null)}>إغلاق</Button>}>
            {check && <div className={`bmp-check bmp-check--${check.result.state}`} data-testid="model-readiness-result"><strong>{check.label}</strong><h3>{check.result.title}</h3><p>{check.result.message}</p><span><CloudOff size={17} /> طلبات الشبكة: {check.result.networkRequests} — لم يُنفّذ أي اتصال أو استدلال.</span></div>}
        </Dialog>
        <Dialog open={resetConfirm && allowed} onClose={() => setResetConfirm(false)} title="استعادة الإعدادات الافتراضية" description="حذف المسودات المحلية فقط" footer={<><Button variant="outline" onClick={() => setResetConfirm(false)}>إلغاء</Button><Button variant="danger" onClick={confirmReset}>حذف المسودات</Button></>}><p className="bmp-description">ستُزال تعديلات التفعيل وحدود الاستخدام التجريبية من هذا المتصفح فقط. لن تتأثر أي خدمة حقيقية.</p></Dialog>
        {notice && <div className="bmp-toast"><Toast title={notice.title} message={notice.message} tone={notice.tone} onClose={() => setNotice(null)} /></div>}
        <span className="bmp-sr-only" aria-live="polite">{loaded ? 'تم تحميل مسودات النماذج المحلية' : 'جارٍ تحميل إعدادات العرض'}</span>
    </main>;
}
export function ModelsScreen() { return <DemoAccessProvider initialRole="platform_admin"><PlatformLayout><Screen /></PlatformLayout></DemoAccessProvider>; }
