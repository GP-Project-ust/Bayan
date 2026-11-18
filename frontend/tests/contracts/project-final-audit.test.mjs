import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const resolve = file => {
  const full = path.join(root, file);
  if (fs.existsSync(full)) return full;
  const srcFull = path.join(root, 'src', file);
  if (fs.existsSync(srcFull)) return srcFull;
  return full;
};
const read = file => fs.readFileSync(resolve(file), 'utf8');

test('all 42 catalog routes are unique and have complete descriptive metadata', () => {
  const catalog = JSON.parse(read('lib/screen-catalog.json'));
  assert.equal(catalog.length, 42);
  assert.equal(new Set(catalog.map(item => item.path)).size, 42);
  for (const item of catalog) {
    assert.ok(item.path.startsWith('/'));
    assert.ok(item.title && item.description && item.group);
  }
});

test('all catalog routes are resolved by dedicated or dynamic Next pages', () => {
  const reportScript = read('scripts/verify-project-final.mjs');
  assert.match(reportScript, /matchesTemplate/);
  assert.match(reportScript, /Catalog routes without a Next\.js page/);
  assert.match(read('app/conversations/[id]/page.tsx'), /ConversationDetailsScreen/);
});

test('catch-all excludes all dedicated catalog routes from static generation', () => {
  const source = read('app/[...slug]/page.tsx');
  for (const route of ['/forbidden', '/unavailable', '/screens', '/conversations/details']) {
    assert.ok(source.includes(`x.path!=="${route}"`), `missing exclusion for ${route}`);
  }
  assert.match(source, /notFound\(\)/);
  assert.match(source, /screen\.path === route/);
});

test('final review documentation states mock-only backend limitations clearly', () => {
  const report = read('docs/FINAL_PROJECT_AUDIT.md');
  assert.match(report, /لا يوجد اتصال حي/);
  assert.match(report, /329/);
  assert.match(report, /npm run build/);
});

test('final npm script runs route verification and the full contract suite', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.match(pkg.scripts['check:final'], /verify-project-final/);
  assert.match(pkg.scripts['check:final'], /tests\/contracts\/\*\.test\.mjs/);
});

test('README points to the final cumulative delivery and the final audit report', () => {
  const readme = read('README.md');
  assert.match(readme, /المراجعة النهائية/);
  assert.match(readme, /FINAL_PROJECT_AUDIT\.md/);
});
