/**
 * Bayan Enterprise Flexible RBAC Engine — Client Simulation & State Store
 *
 * Implements deterministic permission resolution as specified in:
 * frontend/docs/FLEXIBLE_RBAC_ARCHITECTURE_BLUEPRINT.md
 *
 * Order of Precedence:
 * 1. Scope Validation (Platform vs Organization boundary)
 * 2. Explicit User DENY Override  (Highest priority: vetoes all allowances)
 * 3. Explicit User ALLOW Override (Grants permission within authorized scope)
 * 4. Inherited Roles Evaluation   (Role DENY > Role ALLOW across assigned roles)
 * 5. Implicit Default DENY        (Zero Trust fallback)
 *
 * Storage is local to the browser prototype; real security boundaries must be
 * enforced by FastAPI route dependencies and database query restrictions.
 */

import {
  capabilities,
  capabilityLabels,
  roleIds,
  roleMeta,
  rolePermissions,
  type Capability,
  type RoleId
} from './policy';

export type Scope = 'platform' | 'organization';
export type PermissionEffect = 'ALLOW' | 'DENY';

export type VisualPermissionState =
  | 'inherited_allow'
  | 'inherited_deny'
  | 'override_allow'
  | 'override_deny';

export interface CustomRole {
  id: string;
  tenantId: string; // 'platform' or organization identifier
  nameCode: string;
  nameAr: string;
  descriptionAr: string;
  scope: Scope;
  isSystemRole: boolean;
  baseRole: RoleId;
  capabilities: Capability[];
  createdAt: string;
  updatedAt: string;
}

export interface UserPermissionOverride {
  id: string;
  userId: string;
  tenantId: string;
  capability: Capability;
  effect: PermissionEffect;
  reason: string;
  grantedBy: string;
  grantedByName: string;
  createdAt: string;
  expiresAt?: string;
}

export interface PermissionGroup {
  id: string;
  titleAr: string;
  descriptionAr: string;
  scope: Scope;
  capabilities: Capability[];
  isSystemGroup?: boolean;
}

export interface PlatformAdminAccount {
  id: string;
  name: string;
  email: string;
  phone?: string;
  department?: string;
  twoFactorEnabled?: boolean;
  status: 'active' | 'suspended';
  assignedGroups: string[]; // PermissionGroup IDs
  customOverrides: Record<string, PermissionEffect>;
  joinedAt: string;
  lastActive: string;
}

export type AuditLogEntry = RbacAuditEntry;

export interface RbacAuditEntry {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  scope: Scope;
  tenantId: string;
  operation:
    | 'USER_CREATED'
    | 'USER_UPDATED'
    | 'USER_STATUS_CHANGED'
    | 'ROLE_CREATED'
    | 'ROLE_UPDATED'
    | 'ROLE_DELETED'
    | 'GROUP_CREATED'
    | 'GROUP_UPDATED'
    | 'GROUP_DELETED'
    | 'OVERRIDE_GRANTED'
    | 'OVERRIDE_REMOVED'
    | 'PLATFORM_ADMIN_CREATED'
    | 'PLATFORM_ADMIN_UPDATED'
    | 'PLATFORM_ADMIN_STATUS';
  targetId: string;
  targetName: string;
  details: string;
  reason?: string;
}

export interface PermissionResolution {
  effect: PermissionEffect;
  visualState: VisualPermissionState;
  source: 'user_override' | 'role_inherited' | 'implicit_default';
  sourceRole?: string;
  override?: UserPermissionOverride;
  explanation: string;
}

/* -------------------------------------------------------------------------- */
/* Storage Keys & Event Names                                                 */
/* -------------------------------------------------------------------------- */

export const RBAC_CUSTOM_ROLES_KEY = 'bayan.rbac.custom_roles.v1';
export const RBAC_PERMISSION_GROUPS_KEY = 'bayan.rbac.permission_groups.v1';
export const RBAC_USER_OVERRIDES_KEY = 'bayan.rbac.user_overrides.v1';
export const RBAC_PLATFORM_ADMINS_KEY = 'bayan.rbac.platform_admins.v1';
export const RBAC_AUDIT_LOG_KEY = 'bayan.rbac.audit_log.v1';
export const RBAC_ACTIVE_ROLE_KEY = 'bayan.rbac.active_role.v1';
export const RBAC_STATE_CHANGE_EVENT = 'bayan-rbac-state-change';

/* -------------------------------------------------------------------------- */
/* Default Permission Groups                                                  */
/* -------------------------------------------------------------------------- */

export const PLATFORM_PERMISSION_GROUPS: PermissionGroup[] = [
  {
    id: 'grp_platform_core',
    titleAr: 'إدارة تشغيل المنصة والخدمات',
    descriptionAr: 'الصلاحيات الأساسية لإدارة إعدادات المنصة المركزية والتهيئة الذكية.',
    scope: 'platform',
    capabilities: ['platform.manage', 'onboarding.run']
  },
  {
    id: 'grp_platform_models',
    titleAr: 'إدارة مزودي النماذج والذكاء الاصطناعي',
    descriptionAr: 'التحكم في خوادم Ollama والنماذج اللغوية ونماذج التضمين المتجهي.',
    scope: 'platform',
    capabilities: ['platform.manage']
  },
  {
    id: 'grp_platform_audit',
    titleAr: 'مراقبة وتدقيق عمليات المنصة',
    descriptionAr: 'الاطلاع على سجلات التدقيق المركزية ومراقبة وكلاء الذكاء الاصطناعي.',
    scope: 'platform',
    capabilities: ['platform.manage']
  }
];

export const ORGANIZATION_PERMISSION_GROUPS: PermissionGroup[] = [
  {
    id: 'grp_org_chat_docs',
    titleAr: 'الاستعلامات والبحث في المستندات',
    descriptionAr: 'طرح الأسئلة باللغة الطبيعية واستعراض نصوص اللوائح والمصادر.',
    scope: 'organization',
    capabilities: ['chat.ask', 'documents.search', 'citations.view']
  },
  {
    id: 'grp_org_reports_analytics',
    titleAr: 'التقارير والمؤشرات التحليلية',
    descriptionAr: 'استعراض وتصدير التقارير الأكاديمية والاطلاع على القيم الشاذة.',
    scope: 'organization',
    capabilities: ['reports.view', 'reports.create', 'reports.export', 'analytics.view']
  },
  {
    id: 'grp_org_administration',
    titleAr: 'الإدارة الفنية للمؤسسة',
    descriptionAr: 'إدارة حسابات المستخدمين ومصادر البيانات والعروض الذكية وسجل التدقيق.',
    scope: 'organization',
    capabilities: [
      'users.manage',
      'roles.manage',
      'sources.manage',
      'smartviews.manage',
      'audit.view',
      'traces.view',
      'sql.inspect'
    ]
  }
];

/* -------------------------------------------------------------------------- */
/* Seed Data                                                                  */
/* -------------------------------------------------------------------------- */

export const DEFAULT_CUSTOM_ROLES: CustomRole[] = [
  {
    id: 'role-cust-01',
    tenantId: 'demo-institution',
    nameCode: 'academic_registrar',
    nameAr: 'مسجل الكلية الأكاديمي',
    descriptionAr: 'متابعة بيانات الطلاب والمقررات واستخراج التقارير دون تعديل الصلاحيات الفنية.',
    scope: 'organization',
    isSystemRole: false,
    baseRole: 'employee',
    capabilities: ['chat.ask', 'documents.search', 'citations.view', 'reports.view', 'reports.export'],
    createdAt: '2026-02-01T08:00:00Z',
    updatedAt: '2026-02-01T08:00:00Z'
  },
  {
    id: 'role-cust-02',
    tenantId: 'demo-institution',
    nameCode: 'quality_auditor',
    nameAr: 'مدقق جودة واعتماد أكاديمي',
    descriptionAr: 'الاطلاع على كافة التقارير وسجل التدقيق والتحليلات للتقييم المؤسسي.',
    scope: 'organization',
    isSystemRole: false,
    baseRole: 'manager',
    capabilities: [
      'chat.ask',
      'documents.search',
      'citations.view',
      'reports.view',
      'analytics.view',
      'audit.view'
    ],
    createdAt: '2026-02-10T09:30:00Z',
    updatedAt: '2026-02-10T09:30:00Z'
  }
];

export const DEFAULT_USER_OVERRIDES: UserPermissionOverride[] = [
  {
    id: 'ovr-001',
    userId: 'USR-004', // أ. منى حسان (موظف المؤسسة)
    tenantId: 'demo-institution',
    capability: 'reports.export',
    effect: 'ALLOW',
    reason: 'تكليف رسمي برئاسة لجنة دراسة الاعتماد الأكاديمي للفصل الحالي',
    grantedBy: 'USR-003',
    grantedByName: 'م. أحمد الشامي (مسؤول تقنية المعلومات)',
    createdAt: '2026-02-15T11:00:00Z'
  },
  {
    id: 'ovr-002',
    userId: 'USR-006', // سالم باوزير
    tenantId: 'demo-institution',
    capability: 'documents.search',
    effect: 'DENY',
    reason: 'تقييد مؤقت لصلاحية البحث في المستندات أثناء المراجعة الإدارية السنوية',
    grantedBy: 'USR-003',
    grantedByName: 'م. أحمد الشامي (مسؤول تقنية المعلومات)',
    createdAt: '2026-02-18T14:20:00Z'
  }
];

export const DEFAULT_PLATFORM_ADMINS: PlatformAdminAccount[] = [
  {
    id: 'PADM-001',
    name: 'م. عبد الله العمري',
    email: 'abdullah.ops@bayan.platform',
    phone: '+967 770 000 001',
    status: 'active',
    assignedGroups: ['grp_platform_core', 'grp_platform_models', 'grp_platform_audit'],
    customOverrides: {},
    joinedAt: '2026-01-01T00:00:00Z',
    lastActive: 'منذ 5 دقائق'
  },
  {
    id: 'PADM-002',
    name: 'أ. سارة اليافعي',
    email: 'sara.ai@bayan.platform',
    phone: '+967 770 000 002',
    status: 'active',
    assignedGroups: ['grp_platform_models'],
    customOverrides: {},
    joinedAt: '2026-01-15T09:00:00Z',
    lastActive: 'منذ ساعتين'
  },
  {
    id: 'PADM-003',
    name: 'م. طارق الزبيري',
    email: 'tareq.infra@bayan.platform',
    phone: '+967 770 000 003',
    status: 'active',
    assignedGroups: ['grp_platform_core', 'grp_platform_audit'],
    customOverrides: {},
    joinedAt: '2026-02-01T10:00:00Z',
    lastActive: 'اليوم، 10:15 ص'
  }
];

export const DEFAULT_AUDIT_ENTRIES: RbacAuditEntry[] = [
  {
    id: 'AUD-001',
    timestamp: '2026-02-18T14:20:00Z',
    actorId: 'USR-003',
    actorName: 'م. أحمد الشامي',
    actorRole: 'مسؤول تقنية المعلومات',
    scope: 'organization',
    tenantId: 'demo-institution',
    operation: 'OVERRIDE_GRANTED',
    targetId: 'USR-006',
    targetName: 'سالم باوزير',
    details: 'حجب صريح (DENY) لصلاحية documents.search',
    reason: 'تقييد مؤقت لصلاحية البحث في المستندات أثناء المراجعة الإدارية السنوية'
  },
  {
    id: 'AUD-002',
    timestamp: '2026-02-15T11:00:00Z',
    actorId: 'USR-003',
    actorName: 'م. أحمد الشامي',
    actorRole: 'مسؤول تقنية المعلومات',
    scope: 'organization',
    tenantId: 'demo-institution',
    operation: 'OVERRIDE_GRANTED',
    targetId: 'USR-004',
    targetName: 'أ. منى حسان',
    details: 'منح استثنائي (ALLOW) لصلاحية reports.export',
    reason: 'تكليف رسمي برئاسة لجنة دراسة الاعتماد الأكاديمي للفصل الحالي'
  },
  {
    id: 'AUD-003',
    timestamp: '2026-02-10T09:30:00Z',
    actorId: 'USR-003',
    actorName: 'م. أحمد الشامي',
    actorRole: 'مسؤول تقنية المعلومات',
    scope: 'organization',
    tenantId: 'demo-institution',
    operation: 'ROLE_CREATED',
    targetId: 'role-cust-02',
    targetName: 'مدقق جودة واعتماد أكاديمي',
    details: 'إنشاء دور مؤسسي مخصص وربط 6 صلاحيات أكاديمية ورقابية',
    reason: 'متطلب إدارة الجودة للاعتماد المؤسسي 2026'
  },
  {
    id: 'AUD-004',
    timestamp: '2026-02-01T08:00:00Z',
    actorId: 'USR-003',
    actorName: 'م. أحمد الشامي',
    actorRole: 'مسؤول تقنية المعلومات',
    scope: 'organization',
    tenantId: 'demo-institution',
    operation: 'ROLE_CREATED',
    targetId: 'role-cust-01',
    targetName: 'مسجل الكلية الأكاديمي',
    details: 'إنشاء دور مؤسسي مخصص مسند لموظفي التسجيل',
    reason: 'تنظيم مهام القبول والتسجيل للفصل الثاني'
  }
];

/* -------------------------------------------------------------------------- */
/* Helper Store Operations                                                    */
/* -------------------------------------------------------------------------- */

function notifyStateChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(RBAC_STATE_CHANGE_EVENT));
  }
}

export function getCustomRoles(): CustomRole[] {
  if (typeof window === 'undefined') return DEFAULT_CUSTOM_ROLES;
  try {
    const raw = localStorage.getItem(RBAC_CUSTOM_ROLES_KEY);
    if (!raw) {
      localStorage.setItem(RBAC_CUSTOM_ROLES_KEY, JSON.stringify(DEFAULT_CUSTOM_ROLES));
      return DEFAULT_CUSTOM_ROLES;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_CUSTOM_ROLES;
  }
}

export function saveCustomRoles(roles: CustomRole[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(RBAC_CUSTOM_ROLES_KEY, JSON.stringify(roles));
    notifyStateChange();
  } catch {
    /* storage full or unavailable */
  }
}

export function getUserOverrides(userId?: string): UserPermissionOverride[] {
  let list = DEFAULT_USER_OVERRIDES;
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(RBAC_USER_OVERRIDES_KEY);
      if (!raw) {
        localStorage.setItem(RBAC_USER_OVERRIDES_KEY, JSON.stringify(DEFAULT_USER_OVERRIDES));
      } else {
        list = JSON.parse(raw);
      }
    } catch {
      list = DEFAULT_USER_OVERRIDES;
    }
  }
  return userId ? list.filter((o) => o.userId === userId) : list;
}

export function saveUserOverrides(overrides: UserPermissionOverride[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(RBAC_USER_OVERRIDES_KEY, JSON.stringify(overrides));
    notifyStateChange();
  } catch {
    /* storage full or unavailable */
  }
}

export function getPlatformAdmins(): PlatformAdminAccount[] {
  if (typeof window === 'undefined') return DEFAULT_PLATFORM_ADMINS;
  try {
    const raw = localStorage.getItem(RBAC_PLATFORM_ADMINS_KEY);
    if (!raw) {
      localStorage.setItem(RBAC_PLATFORM_ADMINS_KEY, JSON.stringify(DEFAULT_PLATFORM_ADMINS));
      return DEFAULT_PLATFORM_ADMINS;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_PLATFORM_ADMINS;
  }
}

export function savePlatformAdmins(admins: PlatformAdminAccount[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(RBAC_PLATFORM_ADMINS_KEY, JSON.stringify(admins));
    notifyStateChange();
  } catch {
    /* storage full or unavailable */
  }
}

export function getAuditLog(): RbacAuditEntry[] {
  if (typeof window === 'undefined') return DEFAULT_AUDIT_ENTRIES;
  try {
    const raw = localStorage.getItem(RBAC_AUDIT_LOG_KEY);
    if (!raw) {
      localStorage.setItem(RBAC_AUDIT_LOG_KEY, JSON.stringify(DEFAULT_AUDIT_ENTRIES));
      return DEFAULT_AUDIT_ENTRIES;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_AUDIT_ENTRIES;
  }
}

export function appendAuditEntry(entry: Omit<RbacAuditEntry, 'id' | 'timestamp'>) {
  if (typeof window === 'undefined') return;
  try {
    const current = getAuditLog();
    const newEntry: RbacAuditEntry = {
      ...entry,
      id: `AUD-${String(current.length + 1).padStart(3, '0')}`,
      timestamp: new Date().toISOString()
    };
    const updated = [newEntry, ...current];
    localStorage.setItem(RBAC_AUDIT_LOG_KEY, JSON.stringify(updated));
    notifyStateChange();
  } catch {
    /* storage full or unavailable */
  }
}

export function getStoredActiveRole(): RoleId {
  if (typeof window === 'undefined') return 'employee';
  try {
    const stored = localStorage.getItem(RBAC_ACTIVE_ROLE_KEY);
    if (stored && roleIds.includes(stored as RoleId)) {
      return stored as RoleId;
    }
  } catch {
    /* fallback */
  }
  return 'employee';
}

export function setStoredActiveRole(role: RoleId) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(RBAC_ACTIVE_ROLE_KEY, role);
    notifyStateChange();
  } catch {
    /* storage full */
  }
}

/* -------------------------------------------------------------------------- */
/* Deterministic Evaluation Engine                                            */
/* -------------------------------------------------------------------------- */

/**
 * Resolves the effective permission for an identity according to the approved algorithm:
 * 1. Explicit User DENY
 * 2. Explicit User ALLOW
 * 3. Inherited Role DENY
 * 4. Inherited Role ALLOW
 * 5. Default Implicit DENY
 */
export function resolveEffectivePermission(
  role: RoleId,
  capability: Capability,
  userId?: string,
  assignedCustomRoleIds: string[] = []
): PermissionResolution {
  // If a specific userId is provided, evaluate explicit user-level overrides
  if (userId) {
    const allOverrides = getUserOverrides();
    const userOverride = allOverrides.find(
      (o) => o.userId === userId && o.capability === capability
    );

    if (userOverride) {
      if (userOverride.effect === 'DENY') {
        return {
          effect: 'DENY',
          visualState: 'override_deny',
          source: 'user_override',
          override: userOverride,
          explanation: `استثناء حجب صريح للمستخدم: ${userOverride.reason}`
        };
      }
      if (userOverride.effect === 'ALLOW') {
        return {
          effect: 'ALLOW',
          visualState: 'override_allow',
          source: 'user_override',
          override: userOverride,
          explanation: `استثناء منح صريح للمستخدم: ${userOverride.reason}`
        };
      }
    }
  }

  // Evaluate assigned custom roles (if any)
  const customRoles = getCustomRoles();
  for (const cRoleId of assignedCustomRoleIds) {
    const cRole = customRoles.find((r) => r.id === cRoleId);
    if (cRole && cRole.capabilities.includes(capability)) {
      return {
        effect: 'ALLOW',
        visualState: 'inherited_allow',
        source: 'role_inherited',
        sourceRole: cRole.nameAr,
        explanation: `موروثة من الدور المخصص: ${cRole.nameAr}`
      };
    }
  }

  // Evaluate baseline system role permissions from policy.ts
  const hasBase = rolePermissions[role].includes(capability);
  if (hasBase) {
    return {
      effect: 'ALLOW',
      visualState: 'inherited_allow',
      source: 'role_inherited',
      sourceRole: roleMeta[role].label,
      explanation: `موروثة من الدور الأساسي: ${roleMeta[role].label}`
    };
  }

  // Fallback to default implicit DENY
  return {
    effect: 'DENY',
    visualState: 'inherited_deny',
    source: 'implicit_default',
    explanation: `محجوبة افتراضياً: لا يملك الدور «${roleMeta[role].label}» هذه الصلاحية.`
  };
}

/* -------------------------------------------------------------------------- */
/* High-Level Mutation Operations                                             */
/* -------------------------------------------------------------------------- */

/** Add a new custom role with audit trail */
export function createCustomRole(
  draft: Omit<CustomRole, 'id' | 'createdAt' | 'updatedAt'>,
  actor: { id: string; name: string; role: RoleId }
): { ok: boolean; role?: CustomRole; error?: string } {
  const current = getCustomRoles();
  if (!draft.nameAr.trim()) {
    return { ok: false, error: 'يرجى إدخال اسم الدور بالعربية.' };
  }
  if (current.some((r) => r.nameAr.trim() === draft.nameAr.trim())) {
    return { ok: false, error: 'يوجد دور مخصص آخر بنفس الاسم في المؤسسة.' };
  }

  const newRole: CustomRole = {
    ...draft,
    id: `role-cust-${String(current.length + 1).padStart(2, '0')}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  saveCustomRoles([...current, newRole]);

  appendAuditEntry({
    actorId: actor.id,
    actorName: actor.name,
    actorRole: roleMeta[actor.role].label,
    scope: draft.scope,
    tenantId: draft.tenantId,
    operation: 'ROLE_CREATED',
    targetId: newRole.id,
    targetName: newRole.nameAr,
    details: `إنشاء دور مخصص وتعيين ${newRole.capabilities.length} صلاحيات`,
    reason: newRole.descriptionAr || 'إضافة دور جديد'
  });

  return { ok: true, role: newRole };
}

/** Update an existing custom role with audit trail */
export function updateCustomRole(
  roleId: string,
  updates: Partial<Pick<CustomRole, 'nameAr' | 'descriptionAr' | 'capabilities'>>,
  actor: { id: string; name: string; role: RoleId }
): { ok: boolean; error?: string } {
  const current = getCustomRoles();
  const idx = current.findIndex((r) => r.id === roleId);
  if (idx === -1) return { ok: false, error: 'الدور المطلوب غير موجود.' };

  const target = current[idx];
  if (target.isSystemRole) {
    return { ok: false, error: 'لا يمكن تعديل الأدوار المدمجة في النظام.' };
  }

  const updatedRole: CustomRole = {
    ...target,
    ...updates,
    updatedAt: new Date().toISOString()
  };

  const next = [...current];
  next[idx] = updatedRole;
  saveCustomRoles(next);

  appendAuditEntry({
    actorId: actor.id,
    actorName: actor.name,
    actorRole: roleMeta[actor.role].label,
    scope: target.scope,
    tenantId: target.tenantId,
    operation: 'ROLE_UPDATED',
    targetId: target.id,
    targetName: updatedRole.nameAr,
    details: `تحديث صلاحيات الدور (إجمالي الصلاحيات: ${updatedRole.capabilities.length})`,
    reason: 'تحديث الصلاحيات المؤسسية'
  });

  return { ok: true };
}

/** Set or replace an explicit user permission override */
export function setUserPermissionOverride(
  overrideDraft: Omit<UserPermissionOverride, 'id' | 'createdAt'>,
  actor: { id: string; name: string; role: RoleId }
): { ok: boolean; override?: UserPermissionOverride; error?: string } {
  if (!overrideDraft.reason.trim() || overrideDraft.reason.trim().length < 5) {
    return { ok: false, error: 'يلزم كتابة سبب مبرر لمنح أو حجب الصلاحية (5 أحرف على الأقل).' };
  }

  const current = getUserOverrides();
  // Remove any existing override for the same user and capability
  const filtered = current.filter(
    (o) => !(o.userId === overrideDraft.userId && o.capability === overrideDraft.capability)
  );

  const newOverride: UserPermissionOverride = {
    ...overrideDraft,
    id: `ovr-${String(current.length + 1).padStart(3, '0')}`,
    createdAt: new Date().toISOString()
  };

  saveUserOverrides([...filtered, newOverride]);

  appendAuditEntry({
    actorId: actor.id,
    actorName: actor.name,
    actorRole: roleMeta[actor.role].label,
    scope: 'organization',
    tenantId: overrideDraft.tenantId,
    operation: 'OVERRIDE_GRANTED',
    targetId: overrideDraft.userId,
    targetName: overrideDraft.capability,
    details: `تعيين استثناء ${overrideDraft.effect === 'ALLOW' ? 'منح صريح (ALLOW)' : 'حجب صريح (DENY)'} للصلاحية ${capabilityLabels[overrideDraft.capability]}`,
    reason: overrideDraft.reason
  });

  return { ok: true, override: newOverride };
}

/** Remove an explicit user override and restore inheritance */
export function removeUserPermissionOverride(
  overrideId: string,
  actor: { id: string; name: string; role: RoleId }
): { ok: boolean; error?: string } {
  const current = getUserOverrides();
  const target = current.find((o) => o.id === overrideId);
  if (!target) return { ok: false, error: 'الاستثناء المطلوب غير موجود.' };

  const next = current.filter((o) => o.id !== overrideId);
  saveUserOverrides(next);

  appendAuditEntry({
    actorId: actor.id,
    actorName: actor.name,
    actorRole: roleMeta[actor.role].label,
    scope: 'organization',
    tenantId: target.tenantId,
    operation: 'OVERRIDE_REMOVED',
    targetId: target.userId,
    targetName: target.capability,
    details: `إلغاء الاستثناء واستعادة التوريث الطبيعي للأدوار للصلاحية ${capabilityLabels[target.capability]}`,
    reason: 'إلغاء الاستثناء الإداري واستعادة الصلاحيات الموروثة'
  });

  return { ok: true };
}

/** Toggle platform administrator status with anti-lockout check */
export function togglePlatformAdminStatus(
  adminId: string,
  actor: { id: string; name: string; role: RoleId }
): { ok: boolean; error?: string } {
  const current = getPlatformAdmins();
  const target = current.find((a) => a.id === adminId);
  if (!target) return { ok: false, error: 'حساب مسؤول المنصة غير موجود.' };

  if (target.status === 'active') {
    const activeCount = current.filter((a) => a.status === 'active').length;
    if (activeCount <= 1) {
      return {
        ok: false,
        error: 'إجراء محظور أمنياً: لا يمكن تعطيل آخر مسؤول منصة نشط في النظام لتفادي القفل الإداري.'
      };
    }
  }

  const nextStatus = target.status === 'active' ? 'suspended' : 'active';
  const updated = current.map((a) =>
    a.id === adminId ? { ...a, status: nextStatus as 'active' | 'suspended' } : a
  );

  savePlatformAdmins(updated);

  appendAuditEntry({
    actorId: actor.id,
    actorName: actor.name,
    actorRole: roleMeta[actor.role].label,
    scope: 'platform',
    tenantId: 'platform',
    operation: 'PLATFORM_ADMIN_STATUS',
    targetId: target.id,
    targetName: target.name,
    details: `تعديل حالة حساب مسؤول المنصة إلى «${nextStatus === 'active' ? 'نشط' : 'معلّق'}»`,
    reason: 'تعديل الحالة التشغيلية لحساب مسؤول المنصة'
  });

  return { ok: true };
}

/** Add a new platform admin account */
export function addPlatformAdminAccount(
  draft: Omit<PlatformAdminAccount, 'id' | 'joinedAt' | 'lastActive'>,
  actor: { id: string; name: string; role: RoleId }
): { ok: boolean; admin?: PlatformAdminAccount; error?: string } {
  const current = getPlatformAdmins();
  if (!draft.name.trim() || !draft.email.trim()) {
    return { ok: false, error: 'يرجى إدخال الاسم والبريد الإلكتروني لمسؤول المنصة.' };
  }
  if (current.some((a) => a.email.toLowerCase() === draft.email.toLowerCase().trim())) {
    return { ok: false, error: 'يوجد مسؤول منصة مسجل بالفعل بهذا البريد الإلكتروني.' };
  }

  const newAdmin: PlatformAdminAccount = {
    ...draft,
    email: draft.email.toLowerCase().trim(),
    id: `PADM-${String(current.length + 1).padStart(3, '0')}`,
    joinedAt: new Date().toISOString(),
    lastActive: 'الآن'
  };

  savePlatformAdmins([...current, newAdmin]);

  appendAuditEntry({
    actorId: actor.id,
    actorName: actor.name,
    actorRole: roleMeta[actor.role].label,
    scope: 'platform',
    tenantId: 'platform',
    operation: 'PLATFORM_ADMIN_CREATED',
    targetId: newAdmin.id,
    targetName: newAdmin.name,
    details: `تسجيل مسؤول منصة جديد وإسناد ${newAdmin.assignedGroups.length} مجموعات صلاحيات تشغيلية`,
    reason: 'إضافة عضو جديد لفريق تشغيل المنصة'
  });

  return { ok: true, admin: newAdmin };
}

/** Delete a custom role and clean up any user assignments to prevent dangling roles */
export function deleteCustomRole(
  roleId: string,
  actor: { id: string; name: string; role: RoleId | string }
): { ok: boolean; error?: string } {
  if (roleIds.includes(roleId as RoleId)) {
    return { ok: false, error: 'لا يمكن حذف الأدوار الأساسية للنظام.' };
  }
  const current = getCustomRoles();
  const target = current.find((r) => r.id === roleId);
  if (!target) return { ok: false, error: 'الدور المطلوب غير موجود.' };
  if (target.isSystemRole) {
    return { ok: false, error: 'لا يمكن حذف الأدوار المدمجة المحمية.' };
  }

  const next = current.filter((r) => r.id !== roleId);
  saveCustomRoles(next);

  // Clean up any user assignment referencing this deleted role
  if (typeof window !== 'undefined') {
    try {
      const rawUsers = localStorage.getItem('bayan.demo.users.v1');
      if (rawUsers) {
        const users = JSON.parse(rawUsers);
        let changed = false;
        const cleaned = users.map((u: any) => {
          if (u.customRoleId === roleId) {
            changed = true;
            return { ...u, customRoleId: undefined };
          }
          return u;
        });
        if (changed) {
          localStorage.setItem('bayan.demo.users.v1', JSON.stringify(cleaned));
        }
      }
    } catch {
      /* ignore */
    }
  }

  const actorRoleLabel = roleIds.includes(actor.role as RoleId)
    ? roleMeta[actor.role as RoleId].label
    : actor.role;

  appendAuditEntry({
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actorRoleLabel,
    scope: target.scope,
    tenantId: target.tenantId,
    operation: 'ROLE_DELETED',
    targetId: target.id,
    targetName: target.nameAr,
    details: `حذف الدور المخصص (${target.nameAr}) وتطهير أي إسنادات للمستخدمين تجنباً للأدوار المعلقة`,
    reason: 'إلغاء الدور المؤسسي المخصص'
  });

  return { ok: true };
}

export const DEFAULT_PERMISSION_GROUPS: PermissionGroup[] = [
  ...ORGANIZATION_PERMISSION_GROUPS.map((g) => ({ ...g, isSystemGroup: true })),
  ...PLATFORM_PERMISSION_GROUPS.map((g) => ({ ...g, isSystemGroup: true }))
];

export function getPermissionGroups(scope?: Scope): PermissionGroup[] {
  let list = DEFAULT_PERMISSION_GROUPS;
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(RBAC_PERMISSION_GROUPS_KEY);
      if (!raw) {
        localStorage.setItem(RBAC_PERMISSION_GROUPS_KEY, JSON.stringify(DEFAULT_PERMISSION_GROUPS));
      } else {
        list = JSON.parse(raw);
      }
    } catch {
      list = DEFAULT_PERMISSION_GROUPS;
    }
  }
  return scope ? list.filter((g) => g.scope === scope) : list;
}

export function savePermissionGroups(groups: PermissionGroup[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(RBAC_PERMISSION_GROUPS_KEY, JSON.stringify(groups));
    notifyStateChange();
  } catch {
    /* storage full */
  }
}

export function createPermissionGroup(
  draft: {
    titleAr: string;
    descriptionAr: string;
    scope: Scope;
    capabilities: Capability[];
  },
  actor: { id: string; name: string; role: RoleId | string }
): { ok: boolean; group?: PermissionGroup; error?: string } {
  const current = getPermissionGroups();
  const trimmedTitle = draft.titleAr.trim();
  if (!trimmedTitle || trimmedTitle.length < 3) {
    return { ok: false, error: 'يجب أن يكون اسم مجموعة الصلاحيات 3 أحرف على الأقل.' };
  }
  if (current.some((g) => g.scope === draft.scope && g.titleAr.trim() === trimmedTitle)) {
    return { ok: false, error: 'توجد مجموعة صلاحيات أخرى بنفس الاسم في نفس النطاق.' };
  }
  if (!draft.capabilities || draft.capabilities.length === 0) {
    return { ok: false, error: 'يرجى اختيار صلاحية واحدة على الأقل للمجموعة.' };
  }

  const newGroup: PermissionGroup = {
    id: `grp_custom_${Date.now()}`,
    titleAr: trimmedTitle,
    descriptionAr: draft.descriptionAr.trim(),
    scope: draft.scope,
    capabilities: draft.capabilities,
    isSystemGroup: false
  };

  const next = [...current, newGroup];
  savePermissionGroups(next);

  const actorRoleLabel = roleIds.includes(actor.role as RoleId)
    ? roleMeta[actor.role as RoleId].label
    : actor.role;

  appendAuditEntry({
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actorRoleLabel,
    scope: draft.scope,
    tenantId: draft.scope === 'platform' ? 'platform' : 'demo-institution',
    operation: 'GROUP_CREATED',
    targetId: newGroup.id,
    targetName: newGroup.titleAr,
    details: `إنشاء مجموعة صلاحيات مخصصة جديدة (${newGroup.titleAr}) تضم ${newGroup.capabilities.length} صلاحيات`,
    reason: 'إنشاء حزمة وظيفية مخصصة'
  });

  return { ok: true, group: newGroup };
}

export function updatePermissionGroup(
  groupId: string,
  updates: Partial<Pick<PermissionGroup, 'titleAr' | 'descriptionAr' | 'capabilities'>>,
  actor: { id: string; name: string; role: RoleId | string }
): { ok: boolean; group?: PermissionGroup; error?: string } {
  const current = getPermissionGroups();
  const idx = current.findIndex((g) => g.id === groupId);
  if (idx === -1) return { ok: false, error: 'مجموعة الصلاحيات غير موجودة.' };

  const target = current[idx];
  if (updates.titleAr) {
    const trimmed = updates.titleAr.trim();
    if (trimmed.length < 3) {
      return { ok: false, error: 'يجب أن يكون اسم مجموعة الصلاحيات 3 أحرف على الأقل.' };
    }
    if (current.some((g) => g.id !== groupId && g.scope === target.scope && g.titleAr.trim() === trimmed)) {
      return { ok: false, error: 'توجد مجموعة صلاحيات أخرى بنفس الاسم في نفس النطاق.' };
    }
  }

  const updatedGroup: PermissionGroup = {
    ...target,
    ...updates,
    titleAr: updates.titleAr ? updates.titleAr.trim() : target.titleAr,
    descriptionAr: updates.descriptionAr !== undefined ? updates.descriptionAr.trim() : target.descriptionAr
  };

  const next = [...current];
  next[idx] = updatedGroup;
  savePermissionGroups(next);

  const actorRoleLabel = roleIds.includes(actor.role as RoleId)
    ? roleMeta[actor.role as RoleId].label
    : actor.role;

  appendAuditEntry({
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actorRoleLabel,
    scope: target.scope,
    tenantId: target.scope === 'platform' ? 'platform' : 'demo-institution',
    operation: 'GROUP_UPDATED',
    targetId: target.id,
    targetName: updatedGroup.titleAr,
    details: `تحديث مجموعة الصلاحيات (${updatedGroup.titleAr}) - عدد الصلاحيات: ${updatedGroup.capabilities.length}`,
    reason: 'تحديث الحزمة الوظيفية'
  });

  return { ok: true, group: updatedGroup };
}

export function deletePermissionGroup(
  groupId: string,
  actor: { id: string; name: string; role: RoleId | string }
): { ok: boolean; error?: string } {
  const current = getPermissionGroups();
  const target = current.find((g) => g.id === groupId);
  if (!target) return { ok: false, error: 'مجموعة الصلاحيات غير موجودة.' };
  if (target.isSystemGroup) {
    return { ok: false, error: 'لا يمكن حذف مجموعات الصلاحيات الأساسية للنظام.' };
  }

  const next = current.filter((g) => g.id !== groupId);
  savePermissionGroups(next);

  const actorRoleLabel = roleIds.includes(actor.role as RoleId)
    ? roleMeta[actor.role as RoleId].label
    : actor.role;

  appendAuditEntry({
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actorRoleLabel,
    scope: target.scope,
    tenantId: target.scope === 'platform' ? 'platform' : 'demo-institution',
    operation: 'GROUP_DELETED',
    targetId: target.id,
    targetName: target.titleAr,
    details: `حذف مجموعة الصلاحيات المخصصة (${target.titleAr})`,
    reason: 'إلغاء حزمة الصلاحيات'
  });

  return { ok: true };
}
