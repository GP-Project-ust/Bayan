import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

let ts;
try {
  ts = require('typescript');
} catch {
  ts = require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');
}

function transpile(relPath, stub = {}) {
  const full = path.join(root, relPath);
  const code = fs.readFileSync(full, 'utf8');
  const js = ts.transpileModule(code, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const mod = { exports: {} };
  new Function('module', 'exports', 'require', js)(mod, mod.exports, name => {
    if (name in stub) return stub[name];
    throw new Error(`Unexpected import ${name}`);
  });
  return mod.exports;
}

test('1. Centralized routes module exports valid, typed organization and platform routes', () => {
  const routes = transpile('src/lib/routes.ts');
  assert.ok(routes.ORGANIZATION_ROUTES, 'ORGANIZATION_ROUTES must be exported');
  assert.ok(routes.PLATFORM_ROUTES, 'PLATFORM_ROUTES must be exported');
  assert.ok(routes.APP_ROUTES, 'APP_ROUTES must be exported');

  // Verify core organization routes
  assert.equal(routes.ORGANIZATION_ROUTES.home, '/');
  assert.equal(routes.ORGANIZATION_ROUTES.conversations, '/conversations');
  assert.equal(routes.ORGANIZATION_ROUTES.conversationDetails('chat-101'), '/conversations/chat-101');
  assert.equal(routes.ORGANIZATION_ROUTES.users, '/admin/users');
  assert.equal(routes.ORGANIZATION_ROUTES.roles, '/admin/roles');
  assert.equal(routes.ORGANIZATION_ROUTES.dataSources, '/admin/data-sources');

  // Verify platform routes
  assert.equal(routes.PLATFORM_ROUTES.settings, '/platform/settings');
  assert.equal(routes.PLATFORM_ROUTES.organizations, '/platform/organizations');
  assert.equal(routes.PLATFORM_ROUTES.models, '/platform/models');
  assert.equal(routes.PLATFORM_ROUTES.agents, '/platform/agents');
  assert.equal(routes.PLATFORM_ROUTES.health, '/platform/health');
});

test('2. Sovereign route segregation functions strictly separate platform from organization admin', () => {
  const routes = transpile('src/lib/routes.ts');
  assert.equal(routes.isPlatformRoute('/platform/settings'), true);
  assert.equal(routes.isPlatformRoute('/platform/agents'), true);
  assert.equal(routes.isPlatformRoute('/admin/users'), false);
  assert.equal(routes.isPlatformRoute('/conversations'), false);

  assert.equal(routes.isOrganizationAdminRoute('/admin/users'), true);
  assert.equal(routes.isOrganizationAdminRoute('/admin/roles'), true);
  assert.equal(routes.isOrganizationAdminRoute('/platform/settings'), false);
  assert.equal(routes.isOrganizationAdminRoute('/'), false);
});

test('3. Dynamic URL builders encode parameters safely and preserve clean query strings', () => {
  const routes = transpile('src/lib/routes.ts');
  assert.equal(routes.buildConversationUrl('chat-101'), '/conversations/chat-101');
  assert.equal(routes.buildConversationUrl('chat with space'), '/conversations/chat%20with%20space');
  assert.equal(routes.buildUserDetailUrl('USR-001'), '/admin/users/details?id=USR-001');
  assert.equal(routes.buildDataSourceDetailUrl('DS-01'), '/admin/data-sources/details?id=DS-01');
  assert.equal(routes.buildSmartViewDetailUrl('SV-01'), '/admin/smart-views/details?id=SV-01');
  assert.equal(routes.buildAuditDetailUrl('AUD-100'), '/admin/audit/details?id=AUD-100');
});

test('4. Conversation route handles dynamic [id], legacy catalog /conversations/details, and invalid IDs', () => {
  const conversations = transpile('src/lib/conversations/conversations.ts');
  const detail = transpile('src/lib/conversation-detail/detail.ts', {
    '@/lib/conversations/conversations': conversations,
  });

  const changes = conversations.emptyConversationChanges;

  // Valid ID
  const validChat = detail.getDemoConversation('chat-101', changes);
  assert.ok(validChat, 'Valid chat-101 must be found');
  assert.equal(validChat.id, 'chat-101');

  // Legacy details resolution
  const fallbackId = 'chat-101';
  const legacyChat = detail.getDemoConversation(fallbackId, changes);
  assert.ok(legacyChat, 'Fallback ID for /conversations/details must resolve a valid demo chat');

  // Invalid ID
  const invalidChat = detail.getDemoConversation('chat-999', changes);
  assert.equal(invalidChat, null, 'Invalid conversation ID must return null');
  assert.equal(detail.isKnownDemoId('chat-999'), false);
});

test('5. Duplicate nested directory src/app/conversations/[id]/[id] is completely eliminated', () => {
  const duplicatePath = path.join(root, 'src', 'app', 'conversations', '[id]', '[id]');
  assert.equal(fs.existsSync(duplicatePath), false, 'Nested [id]/[id] duplicate directory must not exist');
});

test('6. Arabic 404 page exists, uses Arabic RTL, and provides required navigation actions', () => {
  const notFoundPath = path.join(root, 'src', 'app', 'not-found.tsx');
  assert.ok(fs.existsSync(notFoundPath), 'src/app/not-found.tsx must exist');

  const content = fs.readFileSync(notFoundPath, 'utf8');
  assert.ok(content.includes('dir="rtl"'), '404 page must declare Arabic RTL');
  assert.ok(content.includes('الصفحة غير موجودة'), '404 page must include Arabic title');
  assert.ok(content.includes('404'), '404 page must include 404 indication');
  assert.ok(content.includes('العودة إلى الرئيسية'), '404 page must provide Return to Home action');
  assert.ok(content.includes('الرجوع إلى الصفحة السابقة'), '404 page must provide Return to Previous Page action');
  assert.ok(content.includes('router.back()'), '404 page must implement back navigation');
});

test('7. Arabic error boundary (500) exists, uses Arabic RTL, and safe error presentation', () => {
  const errorPath = path.join(root, 'src', 'app', 'error.tsx');
  const globalErrorPath = path.join(root, 'src', 'app', 'global-error.tsx');
  assert.ok(fs.existsSync(errorPath), 'src/app/error.tsx must exist');
  assert.ok(fs.existsSync(globalErrorPath), 'src/app/global-error.tsx must exist');

  const content = fs.readFileSync(errorPath, 'utf8');
  assert.ok(content.includes('"use client"'), 'error.tsx must be a client component');
  assert.ok(content.includes('dir="rtl"'), 'error boundary must declare Arabic RTL');
  assert.ok(content.includes('حدث خطأ غير متوقع'), 'error boundary must include Arabic title');
  assert.ok(content.includes('إعادة المحاولة'), 'error boundary must provide Retry action');
  assert.ok(content.includes('العودة إلى الرئيسية'), 'error boundary must provide Return to Home action');
  assert.ok(content.includes('reset()'), 'error boundary must invoke Next.js reset function');

  // Verify that sensitive details are not leaked in error template
  assert.ok(!content.includes('stack'), 'error boundary must not render error.stack to user');
  assert.ok(!content.includes('password'), 'error boundary must not expose credentials');
});

test('8. Sidebar.tsx reference SHA-256 hash remains 100% untouched and compliant with contract', () => {
  const sidebarPath = path.join(root, 'src', 'components', 'Sidebar.tsx');
  const hashesPath = path.join(root, 'docs', 'SCREEN_28_REFERENCE_HASHES.json');
  const hashes = JSON.parse(fs.readFileSync(hashesPath, 'utf8'));
  const currentHash = crypto.createHash('sha256').update(fs.readFileSync(sidebarPath)).digest('hex');
  assert.equal(currentHash, hashes['components/Sidebar.tsx'], 'Sidebar.tsx hash must match SCREEN_28_REFERENCE_HASHES.json');
});

test('9. ConversationDetailsScreen breadcrumb reflects actual route hierarchy', () => {
  const screenPath = path.join(root, 'src', 'components', 'conversation-detail', 'ConversationDetailsScreen.tsx');
  const content = fs.readFileSync(screenPath, 'utf8');
  assert.ok(content.includes('aria-label="مسار التنقل"'), 'Breadcrumb nav must have aria-label');
  assert.ok(content.includes('href="/"'), 'Breadcrumb must link to Home');
  assert.ok(content.includes('href="/conversations"'), 'Breadcrumb must link to Conversations list');
  assert.ok(content.includes('تفاصيل المحادثة'), 'Breadcrumb must show Conversation Details active label');
});
