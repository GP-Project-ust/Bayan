import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(import.meta.url);
let ts;
try { ts = require('typescript'); } catch { ts = require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js'); }
function compile(file) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  const module = { exports: {} };
  new Function('module', 'exports', 'require', js)(module, module.exports, require);
  return module.exports;
}
const settings = compile('lib/platform-settings/settings.ts');

 test('screen 38 is present in the original 42-screen catalog and has the platform-admin role', () => {
  const catalog = JSON.parse(fs.readFileSync(path.join(root, 'lib/screen-catalog.json'), 'utf8'));
  const entry = catalog.find(item => item.path === '/platform/settings');
  assert.ok(entry);
  assert.equal(entry.title, 'إعدادات المنصة');
  assert.deepEqual(entry.roles, ['مسؤول المنصة']);
  assert.equal(catalog.length, 42);
});

test('default settings are Arabic-first and use bounded operational defaults', () => {
  const value = settings.DEFAULT_PLATFORM_SETTINGS;
  assert.equal(value.general.defaultLanguage, 'ar');
  assert.equal(value.general.timezone, 'Asia/Aden');
  assert.equal(value.query.sqlTimeoutSeconds, 30);
  assert.equal(value.query.maxCorrectionAttempts, 2);
  assert.equal(value.query.maxRetryAttempts, 2);
  assert.equal(value.audit.retentionDays, 365);
  assert.equal(value.audit.redactSensitiveFields, true);
  assert.equal(value.audit.immutable, true);
  assert.equal(settings.validatePlatformSettings(value).length, 0);
});

test('SQL timeout accepts only integer values from 5 through 120 seconds', () => {
  for (const value of [5, 30, 120]) {
    const draft = structuredClone(settings.DEFAULT_PLATFORM_SETTINGS);
    draft.query.sqlTimeoutSeconds = value;
    assert.equal(settings.validatePlatformSettings(draft).some(issue => issue.field === 'query.sqlTimeoutSeconds'), false);
  }
  for (const value of [4, 121, 10.5, Number.NaN]) {
    const draft = structuredClone(settings.DEFAULT_PLATFORM_SETTINGS);
    draft.query.sqlTimeoutSeconds = value;
    assert.equal(settings.validatePlatformSettings(draft).some(issue => issue.field === 'query.sqlTimeoutSeconds'), true);
  }
});

test('correction and retry attempts enforce separate limits', () => {
  const draft = structuredClone(settings.DEFAULT_PLATFORM_SETTINGS);
  draft.query.maxCorrectionAttempts = 4;
  draft.query.maxRetryAttempts = 6;
  const fields = settings.validatePlatformSettings(draft).map(issue => issue.field);
  assert.ok(fields.includes('query.maxCorrectionAttempts'));
  assert.ok(fields.includes('query.maxRetryAttempts'));
});

test('audit retention is bounded and immutable audit history cannot be disabled', () => {
  const draft = structuredClone(settings.DEFAULT_PLATFORM_SETTINGS);
  draft.audit.retentionDays = 29;
  draft.audit.immutable = false;
  const fields = settings.validatePlatformSettings(draft).map(issue => issue.field);
  assert.ok(fields.includes('audit.retentionDays'));
  assert.ok(fields.includes('audit.immutable'));
});

test('AI provider, model identifier, request rate and concurrency are validated', () => {
  const draft = structuredClone(settings.DEFAULT_PLATFORM_SETTINGS);
  draft.ai.defaultProvider = 'unknown-provider';
  draft.ai.defaultModel = 'contains spaces and secrets';
  draft.ai.requestsPerMinute = 0;
  draft.ai.maxConcurrentRequests = 65;
  const fields = settings.validatePlatformSettings(draft).map(issue => issue.field);
  for (const field of ['ai.defaultProvider', 'ai.defaultModel', 'ai.requestsPerMinute', 'ai.maxConcurrentRequests']) assert.ok(fields.includes(field));
});

test('diff lists only changed fields and uses readable Arabic labels', () => {
  const before = structuredClone(settings.DEFAULT_PLATFORM_SETTINGS);
  const after = structuredClone(before);
  after.query.sqlTimeoutSeconds = 45;
  after.ai.requestsPerMinute = 90;
  const changes = settings.diffPlatformSettings(before, after);
  assert.equal(changes.length, 2);
  assert.deepEqual(changes.map(change => change.field), ['query.sqlTimeoutSeconds', 'ai.requestsPerMinute']);
  assert.match(changes[0].label, /مهلة تنفيذ SQL/);
  assert.equal(changes[0].before, '30');
  assert.equal(changes[0].after, '45');
});

test('history entry stores a cloned previous snapshot for safe rollback', () => {
  const before = structuredClone(settings.DEFAULT_PLATFORM_SETTINGS);
  const after = structuredClone(before);
  after.general.defaultLanguage = 'en';
  const entry = settings.createSettingsHistoryEntry(before, after, 3, '2026-11-08T20:00:00.000Z');
  assert.ok(entry);
  assert.equal(entry.id, 'CFG-DEMO-0003');
  assert.equal(entry.changes.length, 1);
  assert.equal(entry.previousSettings.general.defaultLanguage, 'ar');
  before.general.defaultLanguage = 'en';
  assert.equal(entry.previousSettings.general.defaultLanguage, 'ar');
  assert.equal(settings.createSettingsHistoryEntry(after, after, 4), null);
});

test('storage parser restores a valid settings snapshot and history', () => {
  const saved = structuredClone(settings.DEFAULT_PLATFORM_SETTINGS);
  saved.query.sqlTimeoutSeconds = 50;
  const entry = settings.createSettingsHistoryEntry(settings.DEFAULT_PLATFORM_SETTINGS, saved, 1, '2026-11-08T20:00:00.000Z');
  const parsed = settings.parseStoredPlatformSettings(JSON.stringify({ settings: saved, history: [entry] }));
  assert.equal(parsed.settings.query.sqlTimeoutSeconds, 50);
  assert.equal(parsed.history.length, 1);
  assert.equal(parsed.history[0].id, 'CFG-DEMO-0001');
});

test('storage parser falls back safely for corrupt or out-of-range local data', () => {
  for (const raw of ['{bad json', JSON.stringify({ settings: { query: { sqlTimeoutSeconds: 999 } } }), JSON.stringify({ settings: null })]) {
    const parsed = settings.parseStoredPlatformSettings(raw);
    assert.deepEqual(parsed.settings, settings.DEFAULT_PLATFORM_SETTINGS);
    assert.deepEqual(parsed.history, []);
  }
  assert.deepEqual(settings.parseStoredPlatformSettings(null).settings, settings.DEFAULT_PLATFORM_SETTINGS);
});

test('settings JSON export contains no credentials, API keys, or connection secrets', () => {
  const json = settings.settingsJsonExport(settings.DEFAULT_PLATFORM_SETTINGS);
  const parsed = JSON.parse(json);
  assert.equal(parsed.schemaVersion, 1);
  assert.deepEqual(parsed.settings, settings.DEFAULT_PLATFORM_SETTINGS);
  assert.doesNotMatch(json, /api[_-]?key|password|secret|bearer|credential|connectionstring/i);
});

test('screen enforces platform.manage, uses local-only storage, and has no live network calls', () => {
  const source = fs.readFileSync(path.join(root, 'components/platform-settings/PlatformSettingsScreen.tsx'), 'utf8');
  assert.match(source, /can\('platform\.manage'\)/);
  assert.match(source, /DemoRolePicker/);
  assert.match(source, /localStorage\.setItem\(PLATFORM_SETTINGS_STORAGE_KEY/);
  assert.match(source, /مراجعة تغييرات إعدادات المنصة/);
  assert.match(source, /data-testid="platform-settings-forbidden"/);
  assert.doesNotMatch(source, /\bfetch\s*\(|XMLHttpRequest|WebSocket|EventSource|axios\./);
  assert.match(source, /لا توجد حقول لمفاتيح API/);
});

test('dedicated route replaces the catalog fallback and sidebar links to platform settings', () => {
  assert.ok(fs.existsSync(path.join(root, 'app/platform/settings/page.tsx')));
  const route = fs.readFileSync(path.join(root, 'app/[...slug]/page.tsx'), 'utf8');
  assert.match(route, /x\.path!=="\/platform\/settings"/);
  const sidebar = fs.readFileSync(path.join(root, 'components/Sidebar.tsx'), 'utf8');
  assert.match(sidebar, /href="\/platform\/settings"/);
});

test('responsive styles and all screen documentation artifacts are included', () => {
  const required = [
    'components/platform-settings/platform-settings.css',
    'docs/SCREEN_38_PLATFORM_SETTINGS.md',
    'docs/SCREEN_38_QA_SUMMARY.md',
    'docs/flows/46-platform-settings-flow.mmd',
    'docs/flows/46-platform-settings-flow.dot',
    'docs/flows/46-platform-settings-flow.svg',
    'docs/flows/46-platform-settings-flow.png',
    'tests/e2e/platform-settings.spec.ts',
  ];
  for (const file of required) assert.ok(fs.existsSync(path.join(root, file)) && fs.statSync(path.join(root, file)).size > 80, `Missing ${file}`);
  const css = fs.readFileSync(path.join(root, 'components/platform-settings/platform-settings.css'), 'utf8');
  assert.match(css, /@media\(max-width:760px\)/);
  assert.match(css, /prefers-reduced-motion/);
});
