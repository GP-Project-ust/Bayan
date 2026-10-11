/** أنواع مشتركة لواجهة بيان البرمجية. */

export interface ComponentStatus {
  [name: string]: "up" | "down";
}

export interface HealthResponse {
  status: "ok" | "degraded";
  version: string;
  components: ComponentStatus;
}

export interface AgentTraceEntry {
  agent: string;
  note: string;
}

export interface ChatResponse {
  conversation_id: string;
  question: string;
  answer: string;
  route: string;
  agent_trace: AgentTraceEntry[];
}
