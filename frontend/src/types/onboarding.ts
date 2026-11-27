export type ReviewStatus = "pending" | "approved" | "escalated" | "rejected" | "superseded";

export type OnboardingPhaseKey =
  | "intake"
  | "connection"
  | "discovery"
  | "domains"
  | "concepts"
  | "relationships"
  | "activation"
  | "monitoring"
  | "schema";

export interface OrganizationSummary {
  id: string;
  tenant_id: string;
  name: string;
  sector: string;
  status: "pending" | "active";
  current_phase: OnboardingPhaseKey | string;
  progress: number;
  pending_reviews: number;
  escalations_open: number;
  updated_at: string;
  archived_at?: string | null;
}

export interface DataSourceProfile {
  id: string;
  name: string;
  engine: "postgresql" | "sqlite" | "mysql" | "mariadb" | "sqlserver" | "mssql" | string;
  host: string;
  port: number;
  database: string;
  schema: string;
  username: string;
  read_only: boolean;
  ssl_mode: string;
  status: "pending" | "connected" | string;
  table_count: number;
  latency_ms?: number | null;
  last_tested_at?: string | null;
  secret_stored?: boolean;
}

export interface PhysicalColumn {
  object_ref: string;
  name: string;
  data_type: string;
  nullable: boolean;
  primary_key: boolean;
  foreign_key: boolean;
  unique: boolean;
  label_ar: string;
  description_ar: string;
  semantic_type: string;
  description_source: string;
}

export interface PhysicalTable {
  source_id: string;
  source_name: string;
  schema: string;
  name: string;
  schema_qualified_name: string;
  object_ref: string;
  object_type: "table" | "view";
  label_ar: string;
  description_ar: string;
  entity_type: string;
  fingerprint: string;
  structural_fingerprint: string;
  approximate_row_count?: number | null;
  columns: PhysicalColumn[];
}

export interface SemanticDomain {
  id: string;
  key: string;
  name_ar: string;
  description: string;
  table_refs: string[];
  tables: string[];
  table_count: number;
  physical_table_count?: number;
  view_count?: number;
  status: ReviewStatus;
  classification_confidence?: number;
  domain_evidence?: string[];
}

export interface SemanticConcept {
  id: string;
  physical_ref: string;
  table_ref: string;
  source_type: "table" | "view" | "column";
  technical_name: string;
  name_ar: string;
  description: string;
  synonyms: string[];
  synonyms_en: string[];
  semantic_type: string;
  classification?: string;
  domain_id: string;
  status: ReviewStatus;
  modified_by_operator?: boolean;
}

export interface SemanticRelationship {
  id: string;
  origin: "declared" | "ai_inferred" | "manual";
  status: ReviewStatus;
  constraint_name?: string | null;
  source_table: string;
  source_table_ref: string;
  source_column: string;
  source_column_refs: string[];
  target_table: string;
  target_table_ref: string;
  target_column: string;
  target_column_refs: string[];
  is_composite: boolean;
  cardinality: string;
  confidence: number;
  label: string;
  rationale: string;
}

export interface SchemaChangeItem {
  id: string;
  change_type: string;
  technical_name: string;
  object_ref?: string | null;
  title: string;
  details: string;
  severity: "low" | "medium" | "high" | string;
  status: "pending" | "approved" | "escalated" | "rejected" | "synced" | string;
  detected_at: string;
}

export interface EscalationItem {
  id: string;
  category: string;
  subject: string;
  reason: string;
  related_id?: string | null;
  status: "open" | "resolved" | "dismissed";
  created_at: string;
  created_by: string;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  actor: string;
  object_type: string;
  object_id: string;
  details: string;
  created_at: string;
}

export interface OrganizationDetail {
  id: string;
  tenant_id: string;
  name: string;
  sector: string;
  country: string;
  status: "pending" | "active";
  current_phase: OnboardingPhaseKey | string;
  progress: number;
  pending_reviews: number;
  created_at: string;
  updated_at: string;
  archived_at?: string | null;
  intake: {
    owner_name: string;
    owner_email: string;
    goals: string;
    approved: boolean;
    approved_at?: string | null;
    approved_by?: string | null;
  };
  data_sources: DataSourceProfile[];
  physical_catalog: PhysicalTable[];
  discovery: {
    status: string;
    progress: number;
    stage: string;
    catalog_fingerprint?: string | null;
    structural_fingerprint?: string | null;
    logs: string[];
  };
  domains: SemanticDomain[];
  concepts: SemanticConcept[];
  relationships: SemanticRelationship[];
  activation: {
    activated_at?: string | null;
    activated_by?: string | null;
    handover_note?: string;
    semantic_publication?: {
      tenant_id: string;
      catalog_views: string[];
      approved_objects_count: number;
      rejected_excluded_count: number;
      approved_relationships_count: number;
      semantic_revision: string;
    } | null;
  };
  monitoring: {
    status: string;
    last_checked_at?: string | null;
    baseline_tables?: number;
    current_tables?: number;
    baseline_structural_fingerprint?: string | null;
    current_structural_fingerprint?: string | null;
    history?: Array<{
      checked_at: string;
      status: string;
      changes_detected: number;
      actor: string;
    }>;
  };
  schema_changes: SchemaChangeItem[];
  semantic_sync: {
    status: string;
    last_synced_at?: string | null;
    history?: Array<{
      synced_at: string;
      actor: string;
      applied_changes: number;
      retired_refs: string[];
    }>;
  };
  escalations: EscalationItem[];
  stage_reset_history: Array<{
    id: string;
    target_stage: string;
    target_stage_number: number;
    affected_stages: string[];
    operator_name: string;
    reason: string;
    reset_at: string;
  }>;
  audit_logs: AuditLogEntry[];
}

export interface ActivationReadinessResponse {
  organization_id: string;
  ready: boolean;
  already_active: boolean;
  blockers: Array<{ stage: number; code: string; message: string }>;
  summary: {
    tables: number;
    views: number;
    approved_domains: number;
    approved_concepts: number;
    approved_relationships: number;
    rejected_relationships: number;
  };
}

export interface OfficialCatalogEntry {
  view: string;
  description: string;
  columns: Array<{ name: string; type: string; description: string }>;
  concepts: string[];
  source: string;
}

export interface SemanticSearchHit {
  entry_id: string;
  entry_type: string;
  schema_qualified_name: string;
  label_ar: string;
  description_ar: string;
  classification: string;
  score: number;
}

export interface SystemReadinessResponse {
  status: string;
  env: string;
  catalog_provider_active: string;
  embedding_provider: string;
  embedding_model: string;
  ai_gateway: {
    configured: boolean;
    provider: string;
    model: string;
    official_gateway: string;
    secret_stored: boolean;
  };
}
