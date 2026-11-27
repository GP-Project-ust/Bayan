import { getApiBaseUrl } from "@/lib/chat/sse-client";
import type {
  ActivationReadinessResponse,
  OfficialCatalogEntry,
  OrganizationDetail,
  OrganizationSummary,
  SemanticSearchHit,
  SystemReadinessResponse,
} from "@/types/onboarding";

export class OnboardingApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function onboardingRequest<T>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    tenantId?: string;
  } = {}
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (options.tenantId) {
    headers["X-Bayan-Tenant-ID"] = options.tenantId;
  }
  const res = await fetch(`${getApiBaseUrl()}/api/v1/onboarding${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });

  if (!res.ok) {
    const raw = await res.json().catch(() => ({}));
    const detail = raw?.detail ?? raw;
    throw new OnboardingApiError(
      res.status,
      String(detail?.code ?? "api_error"),
      String(detail?.message ?? detail ?? `خطأ HTTP ${res.status}`)
    );
  }
  return (await res.json()) as T;
}

export const onboardingApi = {
  getSystemReadiness: () => onboardingRequest<SystemReadinessResponse>("/readiness"),

  listOrganizations: (includeArchived = false) =>
    onboardingRequest<OrganizationSummary[]>(
      `/organizations?include_archived=${includeArchived ? "true" : "false"}`
    ),

  createOrganization: (payload: {
    name: string;
    sector?: string;
    owner_name?: string;
    owner_email?: string;
    goals?: string;
    operator_name: string;
  }) => onboardingRequest<OrganizationDetail>("/organizations", { method: "POST", body: payload }),

  getOrganization: (orgId: string) =>
    onboardingRequest<OrganizationDetail>(`/organizations/${orgId}`, { tenantId: orgId }),

  approveIntake: (orgId: string, operator_name: string) =>
    onboardingRequest<OrganizationDetail>(`/organizations/${orgId}/intake/approve`, {
      method: "POST",
      tenantId: orgId,
      body: { operator_name },
    }),

  addSource: (
    orgId: string,
    payload: {
      name: string;
      engine: string;
      host?: string;
      port?: number;
      database: string;
      schema?: string;
      username?: string;
      read_only: boolean;
      ssl_mode?: string;
    }
  ) =>
    onboardingRequest<OrganizationDetail>(`/organizations/${orgId}/sources`, {
      method: "POST",
      tenantId: orgId,
      body: payload,
    }),

  testSource: (orgId: string, sourceId: string, payload: { operator_name: string; password: string }) =>
    onboardingRequest<{ organization: OrganizationDetail; connection_test: Record<string, unknown> }>(
      `/organizations/${orgId}/sources/${sourceId}/test`,
      { method: "POST", tenantId: orgId, body: payload }
    ),

  removeSource: (orgId: string, sourceId: string) =>
    onboardingRequest<OrganizationDetail>(`/organizations/${orgId}/sources/${sourceId}`, {
      method: "DELETE",
      tenantId: orgId,
    }),

  startDiscovery: (
    orgId: string,
    payload: {
      operator_name: string;
      passwords?: Record<string, string>;
      generate_ai_proposals?: boolean;
      approve_external_ai?: boolean;
    }
  ) =>
    onboardingRequest<OrganizationDetail>(`/organizations/${orgId}/discovery/start`, {
      method: "POST",
      tenantId: orgId,
      body: payload,
    }),

  reviewDomain: (
    orgId: string,
    domainId: string,
    payload: { decision: string; operator_name: string; name_ar?: string; description?: string; note?: string }
  ) =>
    onboardingRequest<OrganizationDetail>(`/organizations/${orgId}/domains/${domainId}/review`, {
      method: "POST",
      tenantId: orgId,
      body: payload,
    }),

  moveTableToDomain: (
    orgId: string,
    payload: { table_ref: string; target_domain_id: string; operator_name: string }
  ) =>
    onboardingRequest<OrganizationDetail>(`/organizations/${orgId}/domains/move-table`, {
      method: "POST",
      tenantId: orgId,
      body: payload,
    }),

  mergeDomains: (
    orgId: string,
    payload: { domain_ids: string[]; name_ar: string; description: string; operator_name: string }
  ) =>
    onboardingRequest<OrganizationDetail>(`/organizations/${orgId}/domains/merge`, {
      method: "POST",
      tenantId: orgId,
      body: payload,
    }),

  bulkApproveStage: (orgId: string, stage: "domains" | "concepts" | "relationships", operator_name: string) =>
    onboardingRequest<OrganizationDetail>(`/organizations/${orgId}/stages/${stage}/approve-all`, {
      method: "POST",
      tenantId: orgId,
      body: { operator_name },
    }),

  generateConcepts: (
    orgId: string,
    payload: { operator_name: string; regenerate?: boolean; use_ai?: boolean; approve_external_ai?: boolean }
  ) =>
    onboardingRequest<OrganizationDetail>(`/organizations/${orgId}/concepts/generate`, {
      method: "POST",
      tenantId: orgId,
      body: payload,
    }),

  reviewConcept: (
    orgId: string,
    conceptId: string,
    payload: {
      decision: string;
      operator_name: string;
      name_ar?: string;
      description?: string;
      synonyms?: string[];
      synonyms_en?: string[];
      classification?: string;
      note?: string;
    }
  ) =>
    onboardingRequest<OrganizationDetail>(`/organizations/${orgId}/concepts/${conceptId}/review`, {
      method: "POST",
      tenantId: orgId,
      body: payload,
    }),

  analyzeRelationships: (orgId: string, payload: { operator_name: string; use_ai?: boolean; approve_external_ai?: boolean }) =>
    onboardingRequest<Record<string, unknown>>(`/organizations/${orgId}/relationships/analyze`, {
      method: "POST",
      tenantId: orgId,
      body: payload,
    }),

  reviewRelationship: (orgId: string, relId: string, payload: { decision: string; operator_name: string; note?: string }) =>
    onboardingRequest<Record<string, unknown>>(`/organizations/${orgId}/relationships/${relId}/review`, {
      method: "POST",
      tenantId: orgId,
      body: payload,
    }),

  createManualRelationship: (
    orgId: string,
    payload: {
      source_column_refs: string[];
      target_column_refs: string[];
      cardinality: string;
      label: string;
      rationale: string;
      operator_name: string;
    }
  ) =>
    onboardingRequest<Record<string, unknown>>(`/organizations/${orgId}/relationships/manual`, {
      method: "POST",
      tenantId: orgId,
      body: payload,
    }),

  resolveEscalation: (
    orgId: string,
    escalationId: string,
    payload: { decision: "confirm" | "dismiss"; operator_name: string; note?: string }
  ) =>
    onboardingRequest<OrganizationDetail>(`/organizations/${orgId}/escalations/${escalationId}/resolve`, {
      method: "POST",
      tenantId: orgId,
      body: payload,
    }),

  resetStage: (orgId: string, stageRef: string, payload: { operator_name: string; reason: string; confirm: boolean }) =>
    onboardingRequest<OrganizationDetail>(`/organizations/${orgId}/stages/${stageRef}/reset`, {
      method: "POST",
      tenantId: orgId,
      body: payload,
    }),

  getActivationReadiness: (orgId: string) =>
    onboardingRequest<ActivationReadinessResponse>(`/organizations/${orgId}/activation/readiness`, {
      tenantId: orgId,
    }),

  activateOrganization: (orgId: string, payload: { operator_name: string; handover_note?: string }) =>
    onboardingRequest<OrganizationDetail>(`/organizations/${orgId}/activate`, {
      method: "POST",
      tenantId: orgId,
      body: payload,
    }),

  getOfficialCatalog: (orgId: string) =>
    onboardingRequest<OfficialCatalogEntry[]>(`/organizations/${orgId}/catalog`, { tenantId: orgId }),

  semanticSearch: (orgId: string, query: string) =>
    onboardingRequest<SemanticSearchHit[]>(
      `/organizations/${orgId}/semantic-search?q=${encodeURIComponent(query)}`,
      { tenantId: orgId }
    ),

  monitorSchema: (orgId: string, payload: { operator_name: string; passwords?: Record<string, string> }) =>
    onboardingRequest<OrganizationDetail>(`/organizations/${orgId}/monitor`, {
      method: "POST",
      tenantId: orgId,
      body: payload,
    }),

  decideSchemaChange: (
    orgId: string,
    changeId: string,
    payload: { decision: string; operator_name: string; note?: string; updated_label_ar?: string }
  ) =>
    onboardingRequest<OrganizationDetail>(`/organizations/${orgId}/schema-changes/${changeId}/decision`, {
      method: "POST",
      tenantId: orgId,
      body: payload,
    }),

  syncSemanticCatalog: (orgId: string, operator_name: string) =>
    onboardingRequest<OrganizationDetail>(`/organizations/${orgId}/sync`, {
      method: "POST",
      tenantId: orgId,
      body: { operator_name },
    }),

  archiveOrganization: (orgId: string, operator_name: string) =>
    onboardingRequest<OrganizationDetail>(`/organizations/${orgId}/archive`, {
      method: "POST",
      tenantId: orgId,
      body: { operator_name },
    }),
};
