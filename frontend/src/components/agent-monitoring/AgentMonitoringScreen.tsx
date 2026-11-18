'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Activity, AlertTriangle, ArrowLeft, BarChart3, Bot, BrainCircuit, CheckCircle2,
  ChevronLeft, ClipboardCopy, Clock3, Database, Download, FileSearch, FilterX,
  Gauge, Info, Layers3, LockKeyhole, Network, Search, ShieldCheck, Workflow,
  XCircle, Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { PlatformLayout } from '@/components/layout/PlatformLayout';
import { Button, Drawer, Toast } from '@/components/ui';
import { DemoAccessProvider, DemoRolePicker, useDemoAccess } from '@/components/access/DemoAccess';
import { StatePanel } from '@/components/states';
import {
  AGENT_CATEGORY_LABELS, AGENT_MONITORING_NOTICE, AGENT_MONITORING_SCOPE,
  AGENT_STATE_LABELS, DEFAULT_AGENT_FILTERS, agentOverviewStats, agentsCsv, filterAgents,
  getAgentMetrics, type AgentCategory, type AgentFilters, type AgentMetrics, type AgentName,
  type AgentState,
} from '@/lib/agent-monitoring/agents';

type Notice = { title: string; message: string; tone: 'success' | 'warning' | 'danger' | 'info' };
const nf = new Intl.NumberFormat('ar-EG');
const AGENT_ICONS: Record<AgentName, LucideIcon> = {
  Supervisor: Workflow, SQL: Database, RAG: FileSearch, Analyst: BarChart3, Reporter: FileSearch,
};
const STATE_ICONS: Record<AgentState, LucideIcon> = {
  ready: CheckCircle2, attention: AlertTriangle, processing: Activity, idle: Clock3,
};
function duration(value: number | null) {
  if (value === null) return 'غير متاح';
  return value < 1000 ? `${nf.format(value)} مللي ث` : `${(value / 1000).toLocaleString('ar-EG', { maximumFractionDigits: 2 })} ث`;
}
function AgentStateBadge({ state }: { state: AgentState }) {
  const Icon = STATE_ICONS[state];
  return <span className={`bam-state bam-state--${state}`}><Icon size={14}/>{AGENT_STATE_LABELS[state]}</span>;
}
function AgentDetails({ agent, traceAccess, onCopy }: { agent: AgentMetrics; traceAccess: boolean; onCopy: (value: string) => void }) {
  const Icon = AGENT_ICONS[agent.id];
  return <div className="bam-detail" data-testid="agent-detail">
    <div className="bam-detail-heading"><span><Icon size={28}/></span><div><strong>{agent.definition.label}</strong><small dir="ltr">{agent.id}</small><p>{agent.definition.role}</p></div></div>
    <div className="bam-note"><Info size={17}/>{AGENT_MONITORING_NOTICE}</div>
    <div className="bam-detail-grid">
      <div><small>الحالة</small><AgentStateBadge state={agent.state}/></div>
      <div><small>مسارات العينة</small><strong>{nf.format(agent.traceCount)}</strong></div>
      <div><small>الخطوات المسجلة</small><strong>{nf.format(agent.stepCount)}</strong></div>
      <div><small>نسبة النجاح في العينة</small><strong>{nf.format(agent.successRate)}%</strong></div>
      <div><small>متوسط المدة المسجلة</small><strong>{duration(agent.averageDurationMs)}</strong></div>
      <div><small>حالات الفشل</small><strong>{nf.format(agent.failed)}</strong></div>
    </div>
    <section><h3>المهمة والمسؤولية</h3><p>{agent.definition.responsibility}</p><p>{agent.definition.description}</p></section>
    <section><h3>المدخلات والمخرجات</h3><div className="bam-io"><div><small>المدخلات</small><p>{agent.definition.input}</p></div><div><small>المخرجات</small><p>{agent.definition.output}</p></div></div></section>
    <section><h3>التكاملات التصورية</h3><div className="bam-tags">{agent.definition.integrations.map(item => <span key={item}>{item}</span>)}</div></section>
    <section><h3>تفصيل الخطوات في مجموعة العينة</h3><div className="bam-counts">
      <span className="success"><CheckCircle2 size={14}/> ناجح: {nf.format(agent.success)}</span>
      <span className="failed"><XCircle size={14}/> فشل: {nf.format(agent.failed)}</span>
      <span className="denied"><LockKeyhole size={14}/> مرفوض: {nf.format(agent.denied)}</span>
      <span className="running"><Activity size={14}/> جارٍ: {nf.format(agent.running)}</span>
      <span className="skipped"><Clock3 size={14}/> متجاوز: {nf.format(agent.skipped)}</span>
    </div></section>
    <div className="bam-detail-actions">
      <Button size="sm" variant="outline" leadingIcon={<ClipboardCopy size={15}/>} onClick={() => onCopy(agent.id)}>نسخ معرّف الوكيل</Button>
      {traceAccess ? <Link href="/admin/agent-traces" className="bam-trace-link">فتح تتبعات المؤسسة <ArrowLeft size={14}/></Link> : <span className="bam-restricted"><LockKeyhole size={14}/> تفاصيل تتبعات المؤسسة غير متاحة لدور مسؤول المنصة</span>}
    </div>
  </div>;
}

function Screen() {
  const { can } = useDemoAccess();
  const allowed = can('platform.manage');
  const traceAccess = can('traces.view');
  const [filters, setFilters] = useState<AgentFilters>({ ...DEFAULT_AGENT_FILTERS });
  const [selectedId, setSelectedId] = useState<AgentName | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const metrics = useMemo(() => getAgentMetrics(), []);
  const stats = useMemo(() => agentOverviewStats(metrics), [metrics]);
  const results = useMemo(() => filterAgents(metrics, filters), [metrics, filters]);
  const selected = selectedId ? metrics.find(agent => agent.id === selectedId) ?? null : null;

  function update<K extends keyof AgentFilters>(key: K, value: AgentFilters[K]) {
    setFilters(old => ({ ...old, [key]: value }));
  }
  function clearFilters() { setFilters({ ...DEFAULT_AGENT_FILTERS }); }
  async function copy(value: string) {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(value);
      setNotice({ title: 'تم نسخ المعرّف', message: 'المعرّف وصفي ولا يكشف بيانات مؤسسة أو مستخدم.', tone: 'success' });
    } catch {
      setNotice({ title: 'تعذّر النسخ', message: 'قد يلزم السماح للمتصفح باستخدام الحافظة.', tone: 'warning' });
    }
  }
  function exportCsv() {
    if (!allowed || !results.length) return;
    try {
      const blob = new Blob([agentsCsv(results)], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url; anchor.download = 'bayan-agent-monitoring-demo.csv';
      document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
      setNotice({ title: 'تم تصدير ملخصات اصطناعية', message: `يتضمن الملف ${nf.format(results.length)} وكلاء ومؤشرات مجمّعة فقط.`, tone: 'success' });
    } catch {
      setNotice({ title: 'تعذّر التصدير', message: 'لم يتم إرسال أي بيانات إلى الخادم.', tone: 'danger' });
    }
  }

  return <main className="ban bam" dir="rtl" data-testid="agent-monitoring-screen">
    <nav className="ban-breadcrumb" aria-label="مسار التنقل">
      <Link href="/platform/organizations">إدارة المنصة</Link><ChevronLeft size={15}/><span aria-current="page">مراقبة الوكلاء</span>
    </nav>
    <header className="ban-hero bam-hero">
      <div><span className="ban-eyebrow"><Bot size={17}/> مراقبة الذكاء الاصطناعي · FR-27</span>
        <h1>مراقبة الوكلاء الذكيين</h1>
        <p>لوحة تشغيلية لمراجعة أدوار الوكلاء الخمسة ومؤشرات تنفيذهم المجمّعة، مع فصل بيانات المنصة عن محتوى المؤسسات.</p>
        <div className="ban-hero-tags"><span><Network size={14}/> خمسة وكلاء متخصصين</span><span><ShieldCheck size={14}/> مؤشرات مجمّعة</span><span><LockKeyhole size={14}/> دون بيانات مستأجرين</span></div>
      </div><div className="ban-hero-art" aria-hidden="true"><BrainCircuit size={78}/><i/></div>
    </header>
    <div className="ban-disclaimer" role="note"><Info size={19}/><span><strong>{AGENT_MONITORING_NOTICE}</strong> الأرقام ونسب النجاح ومدد التنفيذ محسوبة من مجموعة أمثلة اصطناعية ثابتة؛ وليست قياسات تشغيل حالية.</span></div>
    <div className="ban-role"><span><ShieldCheck size={17}/>{AGENT_MONITORING_SCOPE}</span><DemoRolePicker id="agent-monitoring-role-picker"/></div>

    {!allowed ? <section className="ban-locked" data-testid="agent-monitoring-forbidden">
      <StatePanel state="forbidden" title="لا تملك صلاحية مراقبة وكلاء المنصة" description="تتطلب معاينة هذه اللوحة صلاحية platform.manage. يجب تطبيق التفويض الحقيقي وعزل المؤسسات على الخادم أيضًا."/>
      <Link href="/screens">العودة إلى خريطة الواجهات <ArrowLeft size={16}/></Link>
    </section> : <>
      <section className="bam-kpis" aria-label="ملخص مؤشرات العينة">
        {([
          { label: 'الوكلاء المتخصصون', value: stats.agents, hint: 'وفق بنية بيان', icon: Bot, kind: 'agents' },
          { label: 'خطوات التنفيذ', value: stats.steps, hint: 'في 8 مسارات اصطناعية', icon: Workflow, kind: 'steps' },
          { label: 'خطوات ناجحة', value: stats.success, hint: 'من مجموعة العينة', icon: CheckCircle2, kind: 'success' },
          { label: 'خطوات فاشلة', value: stats.failed, hint: 'تحتاج مراجعة في المثال', icon: AlertTriangle, kind: 'failed' },
        ] as const).map(({ label, value, hint, icon: Icon, kind }) => <article className={`bam-kpi bam-kpi--${kind}`} key={kind}>
          <span><Icon size={23}/></span><div><small>{label}</small><strong>{nf.format(value)}</strong><p>{hint}</p></div>
        </article>)}
      </section>

      <section className="ban-panel bam-flow-panel" aria-labelledby="bam-flow-title">
        <div className="ban-section-header"><div><h2 id="bam-flow-title"><Workflow size={19}/> المسار المعماري للوكلاء</h2><p>تمثيل توضيحي لتوجيه الطلب؛ لا يلزم مرور كل طلب عبر جميع الوكلاء.</p></div><span className="bam-flow-tag"><Network size={14}/> LangGraph · Multi-Agent</span></div>
        <div className="bam-flow" aria-label="Supervisor يوجه الطلب إلى SQL أو RAG؛ وقد يمر مسار SQL عبر Analyst، ثم ينسق Reporter المخرجات">
          <div className="bam-flow-node bam-flow-node--supervisor"><Workflow size={20}/><strong>Supervisor</strong><small>التوجيه والتنسيق</small></div>
          <span className="bam-flow-arrow" aria-hidden="true">←</span>
          <div className="bam-flow-paths">
            <div className="bam-flow-lane"><div className="bam-flow-node"><Database size={19}/><strong>SQL</strong><small>قواعد البيانات</small></div><span className="bam-flow-lane-arrow" aria-hidden="true">←</span><div className="bam-flow-node"><BarChart3 size={19}/><strong>Analyst</strong><small>تحليل نتائج SQL عند الحاجة</small></div></div>
            <div className="bam-flow-lane"><div className="bam-flow-node"><FileSearch size={19}/><strong>RAG</strong><small>المستندات والمراجع</small></div><span className="bam-flow-lane-note">قد يمر ناتج RAG مباشرة إلى Reporter</span></div>
          </div>
          <span className="bam-flow-arrow" aria-hidden="true">←</span>
          <div className="bam-flow-node bam-flow-node--reporter"><FileSearch size={19}/><strong>Reporter</strong><small>تنسيق الإجابة والتقرير</small></div>
        </div>
        <p className="bam-flow-note"><Info size={15}/> يختار Supervisor الوكيل المتخصص الأنسب؛ يعمل Analyst على الرؤى المستخلصة من بيانات SQL عند الحاجة، بينما ينسق Reporter مخرجات الوكلاء. لا يلزم تنفيذ جميع المسارات في كل طلب.</p>
      </section>

      <section className="ban-panel bam-agents-panel" aria-labelledby="bam-agents-title">
        <div className="ban-section-header"><div><h2 id="bam-agents-title"><Bot size={20}/> قائمة الوكلاء ومؤشراتهم</h2><p>اضغط على بطاقة أو اسم وكيل لعرض مهمته ومدخلاته ومخرجاته ومؤشراته التجريبية.</p></div>
          <div className="ban-actions"><Link className="bam-nav-link" href="/platform/health"><Activity size={16}/> صحة الخدمات</Link><Link className="bam-nav-link" href="/platform/models"><BrainCircuit size={16}/> مزودو النماذج</Link><Button size="sm" variant="outline" disabled={!results.length} onClick={exportCsv} leadingIcon={<Download size={15}/>}>تصدير CSV</Button></div>
        </div>
        <div className="bam-filters">
          <label><span><Search size={15}/> البحث عن وكيل</span><input type="search" aria-label="البحث عن وكيل" placeholder="الاسم أو المهمة أو المسؤولية..." value={filters.query} onChange={event => update('query', event.target.value)}/></label>
          <label><span>مجموعة الوكيل</span><select aria-label="تصفية مجموعة الوكيل" value={filters.category} onChange={event => update('category', event.target.value as AgentCategory | 'all')}><option value="all">كل المجموعات</option>{Object.entries(AGENT_CATEGORY_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
          <label><span>الحالة في العينة</span><select aria-label="تصفية حالة الوكيل" value={filters.state} onChange={event => update('state', event.target.value as AgentState | 'all')}><option value="all">كل الحالات</option>{Object.entries(AGENT_STATE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        </div>
        <div className="bam-toolbar"><span><Layers3 size={15}/> {nf.format(results.length)} من {nf.format(metrics.length)} وكلاء</span><Button size="sm" variant="ghost" onClick={clearFilters} leadingIcon={<FilterX size={15}/>}>إعادة ضبط المرشحات</Button></div>
        {!results.length ? <div className="bam-empty" role="status"><Search size={28}/><strong>لا توجد نتائج مطابقة</strong><p>جرّب تغيير عبارة البحث أو المرشحات.</p><Button size="sm" variant="outline" onClick={clearFilters}>عرض جميع الوكلاء</Button></div> : <div className="bam-agent-grid">
          {results.map(agent => { const Icon = AGENT_ICONS[agent.id]; return <button type="button" key={agent.id} className="bam-agent-card" onClick={() => setSelectedId(agent.id)} aria-label={`تفاصيل الوكيل ${agent.definition.label}`} data-testid={`agent-card-${agent.id}`}>
            <div className="bam-agent-card-top"><span className="bam-agent-icon"><Icon size={23}/></span><AgentStateBadge state={agent.state}/></div>
            <div className="bam-agent-name"><div><strong>{agent.definition.label}</strong><small dir="ltr">{agent.id}</small></div><span>{agent.definition.role}</span></div>
            <p className="bam-agent-description">{agent.definition.responsibility}</p>
            <div className="bam-agent-metrics"><div><small>خطوات العينة</small><strong>{nf.format(agent.stepCount)}</strong></div><div><small>مسارات العينة</small><strong>{nf.format(agent.traceCount)}</strong></div><div><small>متوسط المدة</small><strong>{duration(agent.averageDurationMs)}</strong></div></div>
            <div className="bam-rate"><div><span>نسبة النجاح في العينة</span><strong>{nf.format(agent.successRate)}%</strong></div><span className="bam-rate-track"><i style={{ width: `${agent.successRate}%` }}/></span></div>
            <div className="bam-agent-card-footer"><span className="bam-failure-count"><AlertTriangle size={14}/> {nf.format(agent.failed)} فشل</span><span>عرض التفاصيل <ArrowLeft size={14}/></span></div>
          </button>; })}
        </div>}
      </section>

      <section className="bam-bottom-grid">
        <article className="ban-panel bam-performance"><div className="ban-section-header"><div><h2><Gauge size={19}/> مقارنة نسب النجاح</h2><p>النسبة محسوبة من الخطوات المنتهية فقط؛ ولا تشمل المتجاوزة أو الجارية.</p></div></div>
          <div className="bam-bars">{metrics.map(agent => <div className="bam-bar-row" key={agent.id}><div><strong>{agent.definition.label}</strong><b>{nf.format(agent.successRate)}%</b></div><span><i style={{ width: `${agent.successRate}%` }}/></span></div>)}</div>
          <div className="bam-footnote"><Info size={15}/> نسب النجاح مؤشرات وصفية لمجموعة التتبعات الاصطناعية الحالية، ولا تصلح لتقييم أداء إنتاجي.</div>
        </article>
        <article className="ban-panel bam-state-summary"><div className="ban-section-header"><div><h2><Activity size={19}/> توزيع الحالات في العينة</h2><p>حالة الوكيل مستنتجة من خطوات الأمثلة فقط.</p></div></div>
          <div className="bam-state-list"><div><span className="ready"><CheckCircle2 size={17}/> مستقر في العينة</span><strong>{nf.format(stats.ready)}</strong></div><div><span className="attention"><AlertTriangle size={17}/> يحتاج مراجعة</span><strong>{nf.format(stats.attention)}</strong></div><div><span className="processing"><Activity size={17}/> نشاط جارٍ</span><strong>{nf.format(stats.processing)}</strong></div></div>
          <div className="bam-count-summary"><span>خطوات ناجحة <b>{nf.format(stats.success)}</b></span><span>فاشلة <b>{nf.format(stats.failed)}</b></span><span>مرفوضة <b>{nf.format(stats.denied)}</b></span><span>متجاوزة <b>{nf.format(stats.skipped)}</b></span></div>
        </article>
      </section>
      <section className="bam-guidance">
        <article className="ban-panel"><h2><ShieldCheck size={19}/> حدود الرؤية والصلاحيات</h2><p>{AGENT_MONITORING_SCOPE} لا تعرض هذه اللوحة أسئلة المستخدمين أو محتوى الوثائق أو نصوص SQL أو معرفات المؤسسات أو تفاصيل التنفيذ الخام.</p></article>
        <article className="ban-panel"><h2><Zap size={19}/> التكامل التشغيلي المقترح</h2><p>عند الربط الفعلي، تُستبدل العينات بمقاييس مجمعة من خدمة مراقبة موثوقة، وتُحمى تفاصيل التتبع بسياسة المؤسسة وRBAC على الخادم.</p><div className="bam-guidance-links"><Link href="/platform/health">مراقبة صحة الخدمات <ArrowLeft size={14}/></Link><Link href="/platform/models">إدارة مزودي النماذج <ArrowLeft size={14}/></Link></div></article>
      </section>
    </>}
    <Drawer open={!!selected && allowed} onClose={() => setSelectedId(null)} title="تفاصيل الوكيل" description="ملخص وصفي ومؤشرات من عينات اصطناعية فقط" footer={<Button size="sm" variant="outline" onClick={() => setSelectedId(null)}>إغلاق</Button>}>
      {selected && <AgentDetails key={selected.id} agent={selected} traceAccess={traceAccess} onCopy={value => void copy(value)}/>}
    </Drawer>
    {notice && <div className="bam-toast"><Toast title={notice.title} message={notice.message} tone={notice.tone} onClose={() => setNotice(null)}/></div>}
  </main>;
}

export function AgentMonitoringScreen() {
  return <DemoAccessProvider initialRole="platform_admin"><PlatformLayout><Screen/></PlatformLayout></DemoAccessProvider>;
}
