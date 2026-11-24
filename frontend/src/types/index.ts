/**
 * أنواع مشتركة لواجهة بيان البرمجية وعقود المحادثة الدستورية (SSE).
 */

export interface ComponentStatus {
  [name: string]: "up" | "down";
}

export interface HealthResponse {
  status: "ok" | "degraded";
  version: string;
  components: ComponentStatus;
}

/** حالة تنفيذ الوكيل */
export type AgentStatus = "done" | "failed" | "skipped" | string;

/**
 * عقد أثر تنفيذ الوكيل (AgentTraceEntry)
 * متطابق حرفياً مع backend/app/schemas/chat.py و backend/app/core/events.py
 */
export interface AgentTraceEntry {
  agent: string;
  note: string;
  status?: AgentStatus;
  sql?: string | null;
  rows_count?: number | null;
  duration_ms?: number | null;
}

/**
 * جدول نتائج الاستعلام (TablePayload)
 * متطابق حرفياً مع backend/app/schemas/chat.py
 */
export interface TablePayload {
  columns: string[];
  rows: unknown[][];
  truncated: boolean;
}

/**
 * طلب المحادثة الموجه إلى /api/v1/chat/stream
 * متطابق مع backend/app/schemas/chat.py: ChatRequest
 */
export interface ChatRequest {
  question: string;
  conversation_id?: string | null;
}

/**
 * حمولة حدث meta في تدفق SSE
 * متطابق مع backend/app/core/events.py: MetaPayload
 */
export interface MetaPayload {
  conversation_id: string;
  provider: string;
  model: string;
  mode: string;
}

/**
 * حمولة حدث agent_end في تدفق SSE
 * متطابق مع backend/app/core/events.py: AgentEndPayload
 */
export interface AgentEndPayload {
  agent: string;
  status: AgentStatus;
  note: string;
  sql?: string | null;
  rows_count?: number | null;
  duration_ms?: number | null;
}

/**
 * حمولة حدث final في تدفق SSE
 * متطابق مع backend/app/core/events.py: FinalPayload
 */
export interface FinalPayload {
  conversation_id: string;
  answer: string;
  route: string;
  agents: string[];
  table?: TablePayload | null;
}

/**
 * حمولة حدث error في تدفق SSE
 * متطابق مع backend/app/core/events.py: ErrorPayload
 */
export interface ErrorPayload {
  code: string;
  message: string;
}

/**
 * استجابة المحادثة العادية غير المتدفقة
 */
export interface ChatResponse {
  conversation_id: string;
  question: string;
  answer: string;
  route: string;
  agent_trace: AgentTraceEntry[];
  table?: TablePayload | null;
}

/**
 * دوال الاستدعاء الرجعي لأحداث SSE
 */
export interface SSEEventCallbacks {
  onMeta?: (data: MetaPayload) => void;
  onAgentEnd?: (data: AgentEndPayload) => void;
  onFinal?: (data: FinalPayload) => void;
  onError?: (data: ErrorPayload) => void;
  onDisconnect?: (reason: string) => void;
}

/**
 * نموذج رسالة المحادثة في واجهة المستخدم
 */
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  table?: TablePayload | null;
  agentTrace?: AgentTraceEntry[];
  route?: string;
  agents?: string[];
  durationMs?: number | null;
  isStreaming?: boolean;
  /** Set when the reader stopped the stream before the answer completed. */
  stopped?: boolean;
  error?: ErrorPayload | null;
}
