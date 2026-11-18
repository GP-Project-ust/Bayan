/** Bayan domain UI contracts. All values here are presentation data, not API responses. */
export type BayanMessageRole = "user" | "assistant";
export type MessageStatus = "complete" | "pending" | "error";
export interface ChatMessageData {
  id: string;
  role: BayanMessageRole;
  text: string;
  time?: string;
  status?: MessageStatus;
}
export interface SuggestedQuestion { id: string; label: string }
export interface DocumentCitation {
  id: string;
  documentTitle: string;
  page: number;
  excerpt?: string;
  kind?: string;
}
export type ReportFormat = "pdf" | "csv" | "excel-xml";
export type ReportValue = string | number | boolean | null;
export interface ReportColumn { key: string; label: string }
export type ReportRow = Record<string, ReportValue>;
export type SmartViewSecurity = "Public" | "Masked" | "Restricted" | "Blacklist";
export type SmartViewState = "active" | "inactive";
export interface SmartViewData {
  id: string;
  name: string;
  source: string;
  security: SmartViewSecurity;
  state: SmartViewState;
  updatedAt?: string;
}
export type TraceStatus = "success" | "running" | "error" | "skipped";
export type BayanAgent = "Supervisor" | "SQL" | "RAG" | "Analyst" | "Reporter";
export interface AgentTraceStepData {
  id: string;
  agent: BayanAgent;
  label: string;
  status: TraceStatus;
  durationMs?: number;
  summary?: string;
}
