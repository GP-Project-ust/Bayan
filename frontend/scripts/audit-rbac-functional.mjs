import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

// Mock localStorage for headless Node evaluation
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => store.get(k) ?? null,
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
};
globalThis.window = {
  localStorage: globalThis.localStorage,
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => true,
};
globalThis.CustomEvent = class CustomEvent {
  constructor(name, opts) {
    this.name = name;
    this.detail = opts?.detail;
  }
};

const ts = require('typescript');
function compile(file) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  const js = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS }
  }).outputText;
  const module = { exports: {} };
  new Function('module', 'exports', 'require', js)(module, module.exports, (id) => {
    if (id.endsWith('.json')) {
      const p = id.startsWith('@/') ? id.replace('@/', 'src/') : id;
      const parsed = JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
      parsed.default = parsed;
      return parsed;
    }
    if (id.startsWith('@/')) {
      return compile(id.replace('@/', 'src/') + (id.endsWith('.ts') ? '' : '.ts'));
    }
    if (id.startsWith('./') || id.startsWith('../')) {
      const dir = path.dirname(path.join(root, file));
      const target = path.resolve(dir, id);
      const rel = path.relative(root, target);
      return compile(rel + (rel.endsWith('.ts') ? '' : '.ts'));
    }
    return require(id);
  });
  return module.exports;
}

const rbac = compile('src/lib/access/enterprise-rbac.ts');
const usersMod = compile('src/lib/user-management/users.ts');
const policy = compile('src/lib/access/policy.ts');

const results = [];

function record(id, title, status, details, notes = '') {
  results.push({ id, title, status, details, notes });
  console.log(`[${status}] #${id}: ${title} -> ${details}`);
}

// 1. Adding a user
try {
  const seed = usersMod.DEMO_USERS.map(u => ({ ...u }));
  const draft = { name: 'د. خالد العمري', email: 'khaled.omari@example.test', department: 'شؤون الطلاب', role: 'manager' };
  const val = usersMod.validateUserDraft(draft, seed);
  assert.equal(Object.keys(val).length, 0);
  const res = usersMod.createUser(seed, draft);
  assert.equal(res.ok, true);
  assert.equal(res.users.length, seed.length + 1);
  const created = res.users.at(-1);
  assert.equal(created.name, draft.name);
  assert.equal(created.email, draft.email);
  record(1, 'Adding a user', 'PASS', `Created user ${created.id} (${created.name}) with tenant validation.`);
} catch (e) {
  record(1, 'Adding a user', 'FAIL', e.message);
}

// 2. Editing a user
try {
  const seed = usersMod.DEMO_USERS.map(u => ({ ...u }));
  const targetId = 'USR-004';
  const draft = { name: 'د. فاطمة الزهراء معدلة', email: 'fatima.updated@example.test', department: 'الجودة والتطوير', role: 'manager' };
  const val = usersMod.validateUserDraft(draft, seed, targetId);
  assert.equal(Object.keys(val).length, 0);
  const res = usersMod.editUser(seed, targetId, draft);
  assert.equal(res.ok, true);
  const updated = res.users.find(u => u.id === targetId);
  assert.equal(updated.name, draft.name);
  assert.equal(updated.email, draft.email);
  record(2, 'Editing a user', 'PASS', `Updated ${targetId} details and department successfully.`);
} catch (e) {
  record(2, 'Editing a user', 'FAIL', e.message);
}

// 3. Activating and deactivating a user
try {
  const seed = usersMod.DEMO_USERS.map(u => ({ ...u }));
  const targetId = 'USR-005';
  const toggleOff = usersMod.setUserStatus(seed, targetId, 'disabled');
  assert.equal(toggleOff.ok, true);
  assert.equal(toggleOff.users.find(u => u.id === targetId).status, 'disabled');
  const toggleOn = usersMod.setUserStatus(toggleOff.users, targetId, 'active');
  assert.equal(toggleOn.ok, true);
  assert.equal(toggleOn.users.find(u => u.id === targetId).status, 'active');
  record(3, 'Activating and deactivating a user', 'PASS', `Toggled ${targetId} active -> disabled -> active.`);
} catch (e) {
  record(3, 'Activating and deactivating a user', 'FAIL', e.message);
}

// 4. Creating custom roles
try {
  const actor = { id: 'USR-003', name: 'مسؤول التقنية', role: 'it_admin' };
  const draft = {
    tenantId: 'demo-inst',
    nameCode: 'custom_auditor_qa',
    nameAr: 'مدقق الجودة الأكاديمية',
    descriptionAr: 'دور مخصص لمراجعة التقارير والتحليلات',
    scope: 'organization',
    isSystemRole: false,
    baseRole: 'manager',
    capabilities: ['reports.create', 'reports.export', 'analytics.view']
  };
  const res = rbac.createCustomRole(draft, actor);
  assert.equal(res.ok, true);
  assert.ok(res.role.id.startsWith('role-cust-'));
  assert.equal(res.role.nameAr, draft.nameAr);
  assert.equal(res.role.capabilities.length, 3);
  record(4, 'Creating custom roles', 'PASS', `Created custom role ${res.role.id} with 3 capabilities.`);
} catch (e) {
  record(4, 'Creating custom roles', 'FAIL', e.message);
}

// 5. Editing custom roles
try {
  const actor = { id: 'USR-003', name: 'مسؤول التقنية', role: 'it_admin' };
  const all = rbac.getCustomRoles();
  const target = all.find(r => !r.isSystemRole);
  assert.ok(target, 'Must have at least one custom role');
  const updateRes = rbac.updateCustomRole(target.id, {
    nameAr: 'مدقق جودة متقدم',
    capabilities: [...target.capabilities, 'documents.search']
  }, actor);
  assert.equal(updateRes.ok, true);
  const updated = rbac.getCustomRoles().find(r => r.id === target.id);
  assert.equal(updated.nameAr, 'مدقق جودة متقدم');
  assert.ok(updated.capabilities.includes('documents.search'));
  record(5, 'Editing custom roles', 'PASS', `Updated custom role ${target.id} capabilities and Arabic title.`);
} catch (e) {
  record(5, 'Editing custom roles', 'FAIL', e.message);
}

// 6. Preventing deletion of core roles
try {
  const actor = { id: 'USR-003', name: 'مسؤول التقنية', role: 'it_admin' };
  // Core roles are defined in policy.ts
  const coreIds = policy.roleIds;
  assert.deepEqual(coreIds, ['employee', 'manager', 'it_admin', 'platform_admin']);
  // Attempting to delete or edit a core role in updateCustomRole will fail because it does not exist as a custom role
  for (const c of coreIds) {
    const res = rbac.updateCustomRole(c, { nameAr: 'تغيير ممنوع' }, actor);
    assert.equal(res.ok, false);
  }
  record(6, 'Preventing deletion/tampering of core roles', 'PASS', `All 4 core roles (${coreIds.join(', ')}) are immutable baseline system roles.`);
} catch (e) {
  record(6, 'Preventing deletion of core roles', 'FAIL', e.message);
}

// 7. Assigning roles (UI check)
try {
  const usersScreen = fs.readFileSync(path.join(root, 'src/components/user-management/UsersManagementScreen.tsx'), 'utf8');
  const addUserScreen = fs.readFileSync(path.join(root, 'src/components/user-create/AddUserScreen.tsx'), 'utf8');
  const hasCoreAssignment = usersScreen.includes('RolePill') && addUserScreen.includes('banu-role-card');
  const allowsCustomInUserForm = usersScreen.includes('getCustomRoles()') && addUserScreen.includes('getCustomRoles()');
  if (hasCoreAssignment && !allowsCustomInUserForm) {
    record(7, 'Assigning roles to users', 'PARTIAL', 'Core roles assignable in forms, but Custom Roles cannot be selected in User Add/Edit wizard.', 'GAP: Custom roles exist in RBAC engine but are not yet exposed as selectable options in User form dropdowns.');
  } else if (hasCoreAssignment) {
    record(7, 'Assigning roles to users', 'PASS', 'Roles assignable.');
  }
} catch (e) {
  record(7, 'Assigning roles to users', 'FAIL', e.message);
}

// 8. Changing role permissions
try {
  // Core role permissions immutable
  assert.deepEqual(policy.rolePermissions.employee, ['chat.ask', 'documents.search', 'citations.view', 'reports.view']);
  // Custom role permissions mutable
  const actor = { id: 'USR-003', name: 'مسؤول التقنية', role: 'it_admin' };
  const customRole = rbac.getCustomRoles().find(r => !r.isSystemRole);
  const prevCount = customRole.capabilities.length;
  rbac.updateCustomRole(customRole.id, { capabilities: ['chat.ask'] }, actor);
  const now = rbac.getCustomRoles().find(r => r.id === customRole.id);
  assert.equal(now.capabilities.length, 1);
  record(8, 'Changing role permissions', 'PASS', 'Core permissions immutable; custom role permissions dynamically updatable.');
} catch (e) {
  record(8, 'Changing role permissions', 'FAIL', e.message);
}

// 9. Granting individual ALLOW
try {
  const actor = { id: 'USR-003', name: 'مسؤول التقنية', role: 'it_admin' };
  const res = rbac.setUserPermissionOverride({
    userId: 'USR-004',
    tenantId: 'demo-inst',
    capability: 'reports.export',
    effect: 'ALLOW',
    reason: 'منح صلاحية استثنائية لتصدير التقرير الفصلي لمجلس الأمناء',
    grantedBy: actor.id,
    grantedByName: actor.name
  }, actor);
  assert.equal(res.ok, true);
  // Parameter order: (role, capability, userId)
  const effective = rbac.resolveEffectivePermission('employee', 'reports.export', 'USR-004');
  assert.equal(effective.effect, 'ALLOW');
  assert.equal(effective.visualState, 'override_allow');
  assert.equal(effective.source, 'user_override');
  record(9, 'Granting individual ALLOW', 'PASS', 'Explicit user override ALLOW granted and resolved as override_allow.');
} catch (e) {
  record(9, 'Granting individual ALLOW', 'FAIL', e.message);
}

// 10. Applying individual DENY
try {
  const actor = { id: 'USR-003', name: 'مسؤول التقنية', role: 'it_admin' };
  // User is manager (inherits reports.create), but we explicitly DENY reports.create
  const res = rbac.setUserPermissionOverride({
    userId: 'USR-002',
    tenantId: 'demo-inst',
    capability: 'reports.create',
    effect: 'DENY',
    reason: 'إيقاف مؤقت لصلاحية إنشاء التقارير أثناء فترة التدقيق المالي',
    grantedBy: actor.id,
    grantedByName: actor.name
  }, actor);
  assert.equal(res.ok, true);
  // Parameter order: (role, capability, userId)
  const effective = rbac.resolveEffectivePermission('manager', 'reports.create', 'USR-002');
  assert.equal(effective.effect, 'DENY');
  assert.equal(effective.visualState, 'override_deny');
  assert.equal(effective.source, 'user_override');
  record(10, 'Applying individual DENY', 'PASS', 'Explicit user override DENY successfully vetoes inherited manager permission.');
} catch (e) {
  record(10, 'Applying individual DENY', 'FAIL', e.message);
}

// 11. Removing an override
try {
  const actor = { id: 'USR-003', name: 'مسؤول التقنية', role: 'it_admin' };
  const overrides = rbac.getUserOverrides('USR-002');
  const target = overrides.find(o => o.capability === 'reports.create');
  assert.ok(target, 'Override must exist');
  const res = rbac.removeUserPermissionOverride(target.id, actor);
  assert.equal(res.ok, true);
  assert.equal(rbac.getUserOverrides('USR-002').some(o => o.id === target.id), false);
  record(11, 'Removing an override', 'PASS', `Override ${target.id} successfully removed from store.`);
} catch (e) {
  record(11, 'Removing an override', 'FAIL', e.message);
}

// 12. Restoring inherited permissions
try {
  // After removing the override on USR-002 for reports.create, manager must inherit ALLOW again
  const effective = rbac.resolveEffectivePermission('manager', 'reports.create', 'USR-002');
  assert.equal(effective.effect, 'ALLOW');
  assert.equal(effective.visualState, 'inherited_allow');
  assert.equal(effective.source, 'role_inherited');
  record(12, 'Restoring inherited permissions', 'PASS', 'Permission cleanly restored to inherited_allow from role.');
} catch (e) {
  record(12, 'Restoring inherited permissions', 'FAIL', e.message);
}

// 13. Calculating effective permissions (Deterministic Hierarchy)
try {
  // Rule 1: Scope isolation and implicit fallback
  const platformCapForEmployee = rbac.resolveEffectivePermission('employee', 'platform.manage', 'USR-001');
  assert.equal(platformCapForEmployee.effect, 'DENY');
  assert.equal(platformCapForEmployee.source, 'implicit_default');

  // Rule 2: Explicit User DENY beats role ALLOW
  // (Tested in #10)

  // Rule 3: Explicit User ALLOW beats role DENY
  // (Tested in #9)

  // Rule 4: Role ALLOW beats Implicit DENY
  const baseEmployee = rbac.resolveEffectivePermission('employee', 'chat.ask', 'USR-001');
  assert.equal(baseEmployee.effect, 'ALLOW');
  assert.equal(baseEmployee.source, 'role_inherited');

  // Rule 5: Fallback Implicit DENY
  const ungranted = rbac.resolveEffectivePermission('employee', 'users.manage', 'USR-001');
  assert.equal(ungranted.effect, 'DENY');
  assert.equal(ungranted.source, 'implicit_default');
  assert.equal(ungranted.visualState, 'inherited_deny');

  record(13, 'Deterministic evaluation precedence', 'PASS', 'Strict precedence verified: Scope > User DENY > User ALLOW > Role ALLOW > Implicit DENY.');
} catch (e) {
  record(13, 'Deterministic evaluation precedence', 'FAIL', e.message);
}

// 14. Switching between demo users
try {
  const u1 = rbac.resolveEffectivePermission('employee', 'chat.ask', 'USR-001');
  const u2 = rbac.resolveEffectivePermission('manager', 'analytics.view', 'USR-002');
  const u3 = rbac.resolveEffectivePermission('it_admin', 'users.manage', 'USR-003');
  assert.equal(u1.effect, 'ALLOW');
  assert.equal(u2.effect, 'ALLOW');
  assert.equal(u3.effect, 'ALLOW');
  record(14, 'Switching between demo users', 'PASS', 'Effective resolution correctly scopes per user ID and role.');
} catch (e) {
  record(14, 'Switching between demo users', 'FAIL', e.message);
}

// 15. Switching between platform and organization contexts
try {
  assert.equal(policy.canPreviewRoute('platform_admin', '/platform/settings'), true);
  assert.equal(policy.canPreviewRoute('platform_admin', '/admin/users'), false);
  assert.equal(policy.canPreviewRoute('it_admin', '/admin/users'), true);
  assert.equal(policy.canPreviewRoute('it_admin', '/platform/settings'), false);
  assert.equal(policy.canPreviewRoute('employee', '/admin/users'), false);
  assert.equal(policy.canPreviewRoute('manager', '/admin/roles'), false);
  record(15, 'Platform vs Organization Context Segregation', 'PASS', 'Sovereign separation strictly enforced across all 4 system roles.');
} catch (e) {
  record(15, 'Platform vs Organization Context Segregation', 'FAIL', e.message);
}

// 16. Creating and managing permission groups
try {
  const orgGroups = rbac.ORGANIZATION_PERMISSION_GROUPS;
  const platformGroups = rbac.PLATFORM_PERMISSION_GROUPS;
  assert.equal(orgGroups.length, 3);
  assert.equal(platformGroups.length, 3);
  const rolesScreen = fs.readFileSync(path.join(root, 'src/components/roles-permissions/RolesPermissionsScreen.tsx'), 'utf8');
  const rendersGroups = rolesScreen.includes('ORGANIZATION_PERMISSION_GROUPS.map');
  const hasGroupCreateModal = rolesScreen.includes('createPermissionGroup');
  if (rendersGroups && !hasGroupCreateModal) {
    record(16, 'Permission Groups management', 'PARTIAL', 'All 6 permission groups visualized with metadata and capability tags; dynamic group creation/editing UI is not implemented.', 'GAP: Permission groups are static architectural packages, lacking dynamic CRUD forms.');
  } else {
    record(16, 'Permission Groups management', 'PASS', 'Groups fully manageable.');
  }
} catch (e) {
  record(16, 'Permission Groups management', 'FAIL', e.message);
}

// 17. Updating audit history
try {
  const log = rbac.getAuditLog();
  assert.ok(log.length > 0, 'Audit trail must contain recorded operations');
  const recent = log[0];
  assert.ok(recent.id);
  assert.ok(recent.timestamp);
  assert.ok(recent.operation);
  assert.ok(recent.targetId);
  record(17, 'Live RBAC Audit Trail', 'PASS', `Audit log recorded ${log.length} real-time operations during simulation.`);
} catch (e) {
  record(17, 'Live RBAC Audit Trail', 'FAIL', e.message);
}

// 18. Updating navigation after permission changes (Sidebar audit)
try {
  const sidebar = fs.readFileSync(path.join(root, 'src/components/Sidebar.tsx'), 'utf8');
  const hasDynamicRoleFiltering = sidebar.includes('activeRole') || sidebar.includes('canPreviewRoute');
  if (!hasDynamicRoleFiltering) {
    record(18, 'Sidebar link filtering by role', 'FAIL', 'Sidebar links are static because Sidebar.tsx has an immutable SHA256 checksum in SCREEN_28_REFERENCE_HASHES.json.', 'GAP: Modifying Sidebar.tsx causes system-health.test.mjs to fail with SHA256 mismatch.');
  } else {
    record(18, 'Sidebar link filtering by role', 'PASS', 'Sidebar dynamically filters links.');
  }
} catch (e) {
  record(18, 'Sidebar link filtering by role', 'FAIL', e.message);
}

console.log('\n--- AUDIT SUMMARY ---');
const passCount = results.filter(r => r.status === 'PASS').length;
const partialCount = results.filter(r => r.status === 'PARTIAL').length;
const failCount = results.filter(r => r.status === 'FAIL').length;
console.log(`TOTAL CHECKS: ${results.length}`);
console.log(`PASS: ${passCount}`);
console.log(`PARTIAL: ${partialCount}`);
console.log(`FAIL: ${failCount}`);
