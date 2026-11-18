import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('screen catalog retains the forbidden route and its neutral description', () => {
  const catalog = JSON.parse(read('lib/screen-catalog.json'));
  const entry = catalog.find(item => item.path === '/forbidden');
  assert.ok(entry, 'missing /forbidden catalog entry');
  assert.equal(entry.title, 'غير مصرح بالوصول');
  assert.match(entry.description, /دون إظهار بيانات حساسة/);
});

test('forbidden route has metadata and a dedicated screen', () => {
  const page = read('app/forbidden/page.tsx');
  const screen = read('components/forbidden/ForbiddenScreen.tsx');
  assert.match(page, /ForbiddenScreen/);
  assert.match(page, /robots: \{ index: false, follow: false \}/);
  assert.match(screen, /HTTP 403/);
  assert.match(screen, /BAYAN-403/);
  assert.match(screen, /لم يتم عرض محتوى الصفحة أو بياناتها/);
});

test('screen provides safe navigation and accessible copy control', () => {
  const screen = read('components/forbidden/ForbiddenScreen.tsx');
  assert.match(screen, /router\.back\(\)/);
  assert.match(screen, /href="\//);
  assert.match(screen, /aria-live="polite"/);
  assert.match(screen, /navigator\.clipboard\.writeText/);
});

test('screen uses the shared forbidden state and responsive styles', () => {
  const screen = read('components/forbidden/ForbiddenScreen.tsx');
  const css = read('components/forbidden/forbidden.css');
  assert.match(screen, /state="forbidden"/);
  assert.match(css, /@media\(max-width:560px\)/);
  assert.match(css, /prefers-reduced-motion/);
});
