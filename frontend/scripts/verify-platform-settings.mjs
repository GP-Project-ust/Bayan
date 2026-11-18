import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const req = createRequire(import.meta.url);
let ts;
try { ts = req('typescript'); } catch { ts = req('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js'); }
const required = [
  'app/platform/settings/page.tsx',
  'components/platform-settings/PlatformSettingsScreen.tsx',
  'components/platform-settings/platform-settings.css',
  'lib/platform-settings/settings.ts',
  'docs/SCREEN_38_PLATFORM_SETTINGS.md',
  'docs/SCREEN_38_QA_SUMMARY.md',
  'docs/flows/46-platform-settings-flow.mmd',
  'docs/flows/46-platform-settings-flow.dot',
  'docs/flows/46-platform-settings-flow.png',
  'docs/flows/46-platform-settings-flow.svg',
  'tests/contracts/platform-settings.test.mjs',
  'tests/e2e/platform-settings.spec.ts',
];
for (const file of required) assert.ok(fs.existsSync(path.join(root, file)) && fs.statSync(path.join(root, file)).size > 80, `Missing ${file}`);
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'lib/screen-catalog.json'), 'utf8'));
assert.equal(catalog.length, 42);
assert.deepEqual(catalog.find(item => item.path === '/platform/settings').roles, ['مسؤول المنصة']);
const route = fs.readFileSync(path.join(root, 'app/[...slug]/page.tsx'), 'utf8');
assert.match(route, /x\.path!=="\/platform\/settings"/);
const screen = fs.readFileSync(path.join(root, 'components/platform-settings/PlatformSettingsScreen.tsx'), 'utf8');
assert.match(screen, /can\('platform\.manage'\)/);
assert.match(screen, /PLATFORM_SETTINGS_STORAGE_KEY/);
assert.match(screen, /createSettingsHistoryEntry/);
assert.doesNotMatch(screen, /\bfetch\s*\(|XMLHttpRequest|WebSocket|EventSource|axios\./);
const sidebar = fs.readFileSync(path.join(root, 'components/Sidebar.tsx'), 'utf8');
assert.match(sidebar, /href="\/platform\/settings"/);
const hashesPath = path.join(root, 'docs/SCREEN_28_REFERENCE_HASHES.json');
if (fs.existsSync(hashesPath)) {
  const hashes = JSON.parse(fs.readFileSync(hashesPath, 'utf8'));
  for (const [relative, hash] of Object.entries(hashes)) {
    assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root, relative))).digest('hex'), hash, `Reference changed: ${relative}`);
  }
}
let count = 0;
function scan(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) { if (!['node_modules', '.next', '.git'].includes(entry.name)) scan(path.join(dir, entry.name)); continue; }
    if (!/\.tsx?$/.test(entry.name)) continue;
    const file = path.join(dir, entry.name);
    const ast = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    assert.equal(ast.parseDiagnostics.length, 0, `Syntax error: ${file}`); count++;
  }
}
scan(root);
console.log(`PASS screen38: ${count} TypeScript/TSX parse checks; 42-screen catalog preserved; platform role and route verified; approved reference hashes unchanged.`);
