import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const read = file => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

test('screen catalog retains the unavailable route and its source description', () => {
  const catalog = JSON.parse(read('lib/screen-catalog.json'));
  const entry = catalog.find(item => item.path === '/unavailable');
  assert.ok(entry, 'missing /unavailable catalog entry');
  assert.equal(entry.title, 'الخدمة غير متاحة');
  assert.match(entry.description, /إعادة المحاولة/);
});

test('unavailable route has metadata and a dedicated 503 screen', () => {
  const page = read('app/unavailable/page.tsx');
  const screen = read('components/unavailable/UnavailableScreen.tsx');
  assert.match(page, /UnavailableScreen/);
  assert.match(page, /robots: \{ index: false, follow: false \}/);
  assert.match(screen, /HTTP 503/);
  assert.match(screen, /BAYAN-503/);
  assert.match(screen, /تعذرًا مؤقتًا/);
});

test('retry action refreshes the route and exposes a disabled pending state', () => {
  const screen = read('components/unavailable/UnavailableScreen.tsx');
  assert.match(screen, /router\.refresh\(\)/);
  assert.match(screen, /disabled=\{retrying\}/);
  assert.match(screen, /إعادة المحاولة الآن/);
});

test('screen uses the shared offline state and responsive styling', () => {
  const screen = read('components/unavailable/UnavailableScreen.tsx');
  const css = read('components/unavailable/unavailable.css');
  assert.match(screen, /state="offline"/);
  assert.match(screen, /onRetry=\{retryConnection\}/);
  assert.match(css, /@media\(max-width:560px\)/);
  assert.match(css, /prefers-reduced-motion/);
});
