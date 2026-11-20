/**
 * Bayan Platform Centralized Routing and Navigation Architecture
 * Strict separation between Organization Domain and Sovereign Platform Domain.
 * Type-safe route constants and dynamic parameter builders.
 */

export const ORGANIZATION_ROUTES = {
  home: "/",
  dashboard: "/admin",
  chat: "/chat",
  prototypeChat: "/prototype-chat",
  
  // Conversations
  conversations: "/conversations",
  conversationDetails: (id: string) => `/conversations/${encodeURIComponent(id)}`,
  conversationLegacyDetails: (id?: string) => (id ? `/conversations/details?id=${encodeURIComponent(id)}` : "/conversations/details"),

  // Users & Access Control
  users: "/admin/users",
  userNew: "/admin/users/new",
  userDetails: (id: string) => `/admin/users/details?id=${encodeURIComponent(id)}`,
  roles: "/admin/roles",

  // Data Sources
  dataSources: "/admin/data-sources",
  dataSourceNew: "/admin/data-sources/new",
  dataSourceDetails: (id: string) => `/admin/data-sources/details?id=${encodeURIComponent(id)}`,

  // Smart Views
  smartViews: "/admin/smart-views",
  smartViewNew: "/admin/smart-views/new",
  smartViewDetails: (id: string) => `/admin/smart-views/details?id=${encodeURIComponent(id)}`,

  // Audit Logs
  audit: "/admin/audit",
  auditDetails: (id: string) => `/admin/audit/details?id=${encodeURIComponent(id)}`,

  // Agent Traces
  agentTraces: "/admin/agent-traces",
  agentTraceDetails: (id: string) => `/admin/agent-traces/details?id=${encodeURIComponent(id)}`,

  // Reports
  reports: "/reports",
  reportNew: "/reports/new",
  reportDetail: (id: string) => `/reports/detail?id=${encodeURIComponent(id)}`,

  // Sources & Knowledge Library
  sources: "/sources",
  sourceDocument: (id: string) => `/sources/document?id=${encodeURIComponent(id)}`,
  sourceUpload: "/sources/upload",

  // Analytics & Insights
  analytics: "/analytics",
  analyticsOutliers: "/analytics/outliers",
  semanticSearch: "/semantic-search",

  // User Settings & Profile
  settings: "/settings",
  profile: "/profile",
  notifications: "/notifications",

  // Authentication
  login: "/login",
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",
} as const;

export const PLATFORM_ROUTES = {
  settings: "/platform/settings",
  organizations: "/platform/organizations",
  models: "/platform/models",
  agents: "/platform/agents",
  health: "/platform/health",
  onboarding: "/platform/onboarding",
  onboardingHistory: "/platform/onboarding/history",
} as const;

export const AUXILIARY_ROUTES = {
  forbidden: "/forbidden",
  unavailable: "/unavailable",
  screens: "/screens",
  designSystem: "/design-system",
  designSystemStatesPermissions: "/design-system/states-permissions",
  designSystemComponents: "/design-system/components",
  designSystemBayanComponents: "/design-system/bayan-components",
  designSystemLayouts: "/design-system/layouts",
  designSystemResponsive: "/design-system/responsive",
  designSystemQuality: "/design-system/quality",
} as const;

export const APP_ROUTES = {
  org: ORGANIZATION_ROUTES,
  platform: PLATFORM_ROUTES,
  auxiliary: AUXILIARY_ROUTES,
} as const;

/**
 * Checks whether a given path belongs to the sovereign Platform scope.
 */
export function isPlatformRoute(pathname: string): boolean {
  return pathname.startsWith("/platform");
}

/**
 * Checks whether a given path belongs to the Organization Administrative scope.
 */
export function isOrganizationAdminRoute(pathname: string): boolean {
  return pathname.startsWith("/admin") && !pathname.startsWith("/platform");
}

/**
 * Type-safe URL builders for dynamic entity detail routes
 */
export function buildConversationUrl(id: string): string {
  return ORGANIZATION_ROUTES.conversationDetails(id);
}

export function buildUserDetailUrl(id: string): string {
  return ORGANIZATION_ROUTES.userDetails(id);
}

export function buildDataSourceDetailUrl(id: string): string {
  return ORGANIZATION_ROUTES.dataSourceDetails(id);
}

export function buildSmartViewDetailUrl(id: string): string {
  return ORGANIZATION_ROUTES.smartViewDetails(id);
}

export function buildAuditDetailUrl(id: string): string {
  return ORGANIZATION_ROUTES.auditDetails(id);
}

export function buildAgentTraceDetailUrl(id: string): string {
  return ORGANIZATION_ROUTES.agentTraceDetails(id);
}

export function buildReportDetailUrl(id: string): string {
  return ORGANIZATION_ROUTES.reportDetail(id);
}

export function buildDocumentDetailUrl(id: string): string {
  return ORGANIZATION_ROUTES.sourceDocument(id);
}
