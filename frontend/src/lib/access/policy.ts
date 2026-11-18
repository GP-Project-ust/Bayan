/**
 * Bayan stage 5 — UI authorization specification, for prototyping only.
 * NEVER use this matrix or route guards as the sole security boundary.
 * Enforce identity, tenant isolation, table/document classification, and
 * permissions on authenticated FastAPI routes and database queries.
 */
import catalog from "@/lib/screen-catalog.json";

export const roleIds = ["employee", "manager", "it_admin", "platform_admin"] as const;
export type RoleId = (typeof roleIds)[number];

export const roleMeta: Record<RoleId,{label:string;description:string}> = {
  employee: {label:"موظف المؤسسة",description:"استعلامات العمل اليومية والبحث في اللوائح المصرح بها."},
  manager: {label:"مدير المؤسسة",description:"الاستعلام والتحليل وإنشاء التقارير والمؤشرات المؤسسية."},
  it_admin: {label:"مسؤول تقنية المعلومات",description:"إدارة حسابات المؤسسة ومصادرها والعروض الذكية والتدقيق."},
  platform_admin: {label:"مسؤول المنصة",description:"إدارة تشغيل المنصة والتهيئة الذكية والمؤسسات والنماذج."},
};

export const capabilities = [
  "chat.ask", "documents.search", "citations.view", "reports.view",
  "reports.create", "reports.export", "analytics.view", "sql.inspect",
  "users.manage", "roles.manage", "sources.manage", "smartviews.manage",
  "audit.view", "traces.view", "onboarding.run", "platform.manage",
] as const;
export type Capability = (typeof capabilities)[number];

export const capabilityLabels:Record<Capability,string> = {
  "chat.ask":"طرح الاستعلامات العربية", "documents.search":"البحث في المستندات", "citations.view":"عرض المصادر", "reports.view":"استعراض التقارير",
  "reports.create":"إنشاء التقارير", "reports.export":"تصدير التقارير", "analytics.view":"التحليلات والقيم الشاذة", "sql.inspect":"فحص استعلام SQL المصرح به",
  "users.manage":"إدارة المستخدمين", "roles.manage":"إدارة الأدوار", "sources.manage":"إدارة مصادر البيانات", "smartviews.manage":"إدارة العروض الذكية",
  "audit.view":"مراجعة سجل التدقيق", "traces.view":"تتبع خطوات الوكلاء", "onboarding.run":"تشغيل التهيئة الذكية", "platform.manage":"إدارة خدمات المنصة",
};

const shared:Capability[] = ["chat.ask","documents.search","citations.view","reports.view"];
export const rolePermissions:Record<RoleId, readonly Capability[]> = {
  employee: shared,
  manager: [...shared, "reports.create","reports.export","analytics.view"],
  it_admin: [...shared,"sql.inspect","users.manage","roles.manage","sources.manage","smartviews.manage","audit.view","traces.view"],
  platform_admin: ["onboarding.run","platform.manage"],
};

export function hasPermission(role:RoleId, capability:Capability):boolean {
  return rolePermissions[role].includes(capability);
}

/** Catalog defines display routing for mockups, not authenticated access. */
export function canPreviewRoute(role:RoleId,path:string):boolean {
  if (path.startsWith("/design-system")) return true;
  if (path === "/login" || path === "/forgot-password" || path === "/forbidden" || path === "/unavailable" || path === "/screens") return true;
  const screen = catalog.find(x=>x.path===path);
  if (!screen || !screen.roles.includes(roleMeta[role].label)) return false;
  // The earlier screen catalog is broad. Enforce conservative role separation
  // in this UI preview: platform operators do not automatically inherit
  // access to tenant content or tenant administration screens.
  if (path.startsWith("/platform")) return role === "platform_admin";
  if (path.startsWith("/admin")) return role === "it_admin";
  if (role === "platform_admin") return ["/profile", "/settings", "/notifications"].includes(path);
  return true;
}

export function visiblePreviewRoutes(role:RoleId) {
  return catalog.filter(x=>canPreviewRoute(role,x.path));
}

export function isRoleId(value:string):value is RoleId {
  return roleIds.some(id=>id===value);
}
