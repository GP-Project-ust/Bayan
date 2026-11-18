/**
 * Screen 37 — platform-level agent monitoring mock data.
 * Metrics are aggregated from the sanitized synthetic trace fixtures only.
 * No live LangGraph state, tenant identifiers, prompts, SQL, documents,
 * credentials, or model chain-of-thought are read or exposed here.
 */
import { DEMO_AGENT_TRACES, type AgentName, type AgentTrace, type StepStatus } from '../agent-traces/traces';
export type { AgentName };

export const AGENT_MONITORING_NOTICE = 'مؤشرات توضيحية مشتقة من سجلات تتبع اصطناعية مضمّنة؛ لا تمثل أداءً حيًا أو قياسات من خادم بيان.';
export const AGENT_MONITORING_SCOPE = 'مسؤول المنصة يرى مؤشرات مجمّعة غير مرتبطة بمؤسسة أو مستخدم. تفاصيل تتبعات المؤسسة تخضع لصلاحية مستقلة.';

export type AgentState = 'ready' | 'attention' | 'processing' | 'idle';
export type AgentCategory = 'orchestration' | 'data' | 'knowledge' | 'analytics' | 'reporting';
export type AgentDefinition = Readonly<{
  id: AgentName;
  label: string;
  role: string;
  category: AgentCategory;
  description: string;
  responsibility: string;
  input: string;
  output: string;
  integrations: readonly string[];
}>;

export const AGENT_DEFINITIONS: readonly AgentDefinition[] = Object.freeze([
  {
    id: 'Supervisor', label: 'المنسّق', role: 'الوكيل المشرف المركزي', category: 'orchestration',
    description: 'يعمل موجّهًا مركزيًا؛ يحلل نية السؤال ويختار الوكيل أو المسار الأنسب وينسّق تدفق العمل.',
    responsibility: 'توجيه الاستعلامات وإدارة تدفق العمل بين الوكلاء داخل LangGraph.',
    input: 'السؤال العربي وسياق الجلسة وصلاحيات المستخدم.',
    output: 'خطة توجيه ومهمة محددة للوكيل المتخصص.',
    integrations: ['LangGraph', 'حالة التنفيذ المشتركة AgentState', 'سياسات RBAC'],
  },
  {
    id: 'SQL', label: 'وكيل SQL', role: 'وكيل قواعد البيانات', category: 'data',
    description: 'يحوّل السؤال باللغة الطبيعية إلى استعلام بيانات عبر طبقة العروض الذكية، مع مراعاة نطاق الوصول.',
    responsibility: 'تحويل اللغة الطبيعية إلى استعلامات قواعد بيانات وقراءة النتائج المسموح بها.',
    input: 'سؤال المستخدم ومخطط البيانات والعروض الذكية المسموح بها.',
    output: 'نتائج بيانات منظمة قابلة للتحليل.',
    integrations: ['Smart Views', 'PostgreSQL', 'Odoo Education'],
  },
  {
    id: 'RAG', label: 'وكيل RAG', role: 'وكيل الاسترجاع الدلالي', category: 'knowledge',
    description: 'يبحث في المستندات المؤسسية المفهرسة ويجهز إجابات مدعومة بمراجع عند توفرها.',
    responsibility: 'الاسترجاع المعزز بالتوليد والبحث الدلالي في المستندات.',
    input: 'السؤال ومجموعة الوثائق المسموح بها وبيانات الفهرسة.',
    output: 'مقاطع مسترجعة وبيانات استشهاد بالمستند والصفحة عند توفرها.',
    integrations: ['Qdrant', 'Document Indexing', 'Embeddings'],
  },
  {
    id: 'Analyst', label: 'المحلّل', role: 'وكيل التحليل', category: 'analytics',
    description: 'يستخلص الرؤى والاتجاهات الإحصائية من النتائج المنظمة التي يوفرها وكيل SQL.',
    responsibility: 'استخراج الرؤى والاتجاهات الإحصائية من البيانات والمساعدة في اكتشاف القيم الشاذة.',
    input: 'نتائج البيانات والمؤشرات المنظمة.',
    output: 'ملخصات إحصائية واتجاهات وملاحظات تحليلية.',
    integrations: ['SQL Agent outputs', 'Analytics', 'Outlier Detection'],
  },
  {
    id: 'Reporter', label: 'منسّق الإجابة', role: 'وكيل التقارير', category: 'reporting',
    description: 'ينسق مخرجات الوكلاء ويولّد إجابات عربية وتقارير قابلة للعرض والتصدير.',
    responsibility: 'تنسيق المخرجات وتوليد التقارير بصيغ متعددة.',
    input: 'المخرجات المصرح بها من الوكلاء الآخرين وحالة التنفيذ.',
    output: 'إجابة عربية منسقة أو تقرير قابل للتصدير.',
    integrations: ['RTL Response Formatting', 'Report Exporter', 'Citations'],
  },
]);

export const AGENT_LABELS: Record<AgentName, string> = Object.fromEntries(
  AGENT_DEFINITIONS.map(agent => [agent.id, agent.label]),
) as Record<AgentName, string>;
export const AGENT_CATEGORY_LABELS: Record<AgentCategory, string> = {
  orchestration: 'التنسيق', data: 'قواعد البيانات', knowledge: 'الاسترجاع الدلالي',
  analytics: 'التحليل', reporting: 'التقارير',
};
export const AGENT_STATE_LABELS: Record<AgentState, string> = {
  ready: 'مستقر في العينة', attention: 'يحتاج مراجعة في العينة',
  processing: 'نشاط جارٍ في العينة', idle: 'لا توجد خطوات مسجلة',
};
export const STEP_STATE_LABELS: Record<StepStatus, string> = {
  success: 'ناجح', failed: 'فشل', denied: 'مرفوض', running: 'قيد التنفيذ', skipped: 'متجاوز',
};

export type AgentMetrics = Readonly<{
  id: AgentName;
  definition: AgentDefinition;
  traceCount: number;
  stepCount: number;
  success: number;
  failed: number;
  denied: number;
  running: number;
  skipped: number;
  completed: number;
  successRate: number;
  averageDurationMs: number | null;
  state: AgentState;
}>;

export type AgentFilters = Readonly<{
  query: string;
  category: AgentCategory | 'all';
  state: AgentState | 'all';
}>;
export const DEFAULT_AGENT_FILTERS: AgentFilters = { query: '', category: 'all', state: 'all' };

export function normalizeAgentSearch(value: string): string {
  return value.normalize('NFKC').replace(/[\u064b-\u065f\u0670\u0640]/g, '')
    .replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').toLocaleLowerCase('ar').trim();
}

export function getAgentMetrics(traces: readonly AgentTrace[] = DEMO_AGENT_TRACES): AgentMetrics[] {
  return AGENT_DEFINITIONS.map(definition => {
    const matchingTraces = traces.filter(trace => trace.steps.some(step => step.agent === definition.id));
    const steps = matchingTraces.flatMap(trace => trace.steps.filter(step => step.agent === definition.id));
    const success = steps.filter(step => step.status === 'success').length;
    const failed = steps.filter(step => step.status === 'failed').length;
    const denied = steps.filter(step => step.status === 'denied').length;
    const running = steps.filter(step => step.status === 'running').length;
    const skipped = steps.filter(step => step.status === 'skipped').length;
    const completed = success + failed + denied;
    const durations = steps.map(step => step.durationMs).filter((duration): duration is number => duration !== null && Number.isFinite(duration));
    const state: AgentState = failed > 0 ? 'attention' : running > 0 ? 'processing' : steps.length ? 'ready' : 'idle';
    return {
      id: definition.id, definition, traceCount: matchingTraces.length, stepCount: steps.length,
      success, failed, denied, running, skipped, completed,
      successRate: completed ? Math.round((success / completed) * 100) : 0,
      averageDurationMs: durations.length ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length) : null,
      state,
    };
  });
}

export function agentOverviewStats(metrics: readonly AgentMetrics[] = getAgentMetrics()) {
  return {
    agents: metrics.length,
    ready: metrics.filter(agent => agent.state === 'ready').length,
    attention: metrics.filter(agent => agent.state === 'attention').length,
    processing: metrics.filter(agent => agent.state === 'processing').length,
    steps: metrics.reduce((sum, agent) => sum + agent.stepCount, 0),
    success: metrics.reduce((sum, agent) => sum + agent.success, 0),
    failed: metrics.reduce((sum, agent) => sum + agent.failed, 0),
    denied: metrics.reduce((sum, agent) => sum + agent.denied, 0),
    running: metrics.reduce((sum, agent) => sum + agent.running, 0),
    skipped: metrics.reduce((sum, agent) => sum + agent.skipped, 0),
  };
}

export function filterAgents(metrics: readonly AgentMetrics[], filters: AgentFilters): AgentMetrics[] {
  const query = normalizeAgentSearch(filters.query);
  return metrics.filter(agent => {
    if (filters.category !== 'all' && agent.definition.category !== filters.category) return false;
    if (filters.state !== 'all' && agent.state !== filters.state) return false;
    const searchable = [agent.id, agent.definition.label, agent.definition.role, agent.definition.category,
      agent.definition.description, agent.definition.responsibility, ...agent.definition.integrations, AGENT_CATEGORY_LABELS[agent.definition.category],
      AGENT_STATE_LABELS[agent.state]].join(' ');
    return !query || normalizeAgentSearch(searchable).includes(query);
  });
}

function csvCell(value: string | number): string {
  let text = String(value).replace(/[\r\n]/g, ' ').trim();
  if (/^[\s]*[=+@\-\t]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}
export function agentsCsv(metrics: readonly AgentMetrics[]): string {
  const header = ['معرّف الوكيل', 'اسم الوكيل', 'المهمة', 'حالة العينة', 'عدد مسارات العينة', 'عدد الخطوات', 'نجاح', 'فشل', 'رفض', 'قيد التنفيذ', 'متجاوز', 'نسبة النجاح %', 'متوسط المدة ms'];
  const rows = metrics.map(agent => [agent.id, agent.definition.label, agent.definition.responsibility,
    AGENT_STATE_LABELS[agent.state], agent.traceCount, agent.stepCount, agent.success, agent.failed,
    agent.denied, agent.running, agent.skipped, agent.successRate,
    agent.averageDurationMs === null ? '—' : agent.averageDurationMs]);
  return '\ufeff' + [header, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
}
