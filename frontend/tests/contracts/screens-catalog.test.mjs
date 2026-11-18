import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const read = file => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

test('screen catalog route exists and retains all 42 source entries', () => {
  const catalog = JSON.parse(read('lib/screen-catalog.json'));
  assert.equal(catalog.length, 42);
  assert.ok(catalog.some(item => item.path === '/screens'));
  assert.ok(catalog.some(item => item.path === '/forbidden'));
  assert.ok(catalog.some(item => item.path === '/unavailable'));
});

test('screen catalog page uses the source catalog and has metadata', () => {
  const page = read('app/screens/page.tsx');
  const component = read('components/screens-catalog/ScreensCatalog.tsx');
  assert.match(page, /ScreensCatalog/);
  assert.match(page, /خريطة الواجهات/);
  assert.match(component, /@\/lib\/screen-catalog\.json/);
  assert.match(component, /screens\.filter/);
});

test('catalog supports text, group, role and priority filtering', () => {
  const component = read('components/screens-catalog/ScreensCatalog.tsx');
  assert.match(component, /item\.group === group/);
  assert.match(component, /item\.roles\?\.includes\(role\)/);
  assert.match(component, /item\.priority === priority/);
  assert.match(component, /searchable\.includes\(q\)/);
});

test('catalog supports grid/list views, direct navigation and empty state', () => {
  const component = read('components/screens-catalog/ScreensCatalog.tsx');
  assert.match(component, /setView\('grid'\)/);
  assert.match(component, /setView\('list'\)/);
  assert.match(component, /href=\{item\.path\}/);
  assert.match(component, /لا توجد شاشات مطابقة/);
});

test('catalog is responsive and accessible', () => {
  const component = read('components/screens-catalog/ScreensCatalog.tsx');
  const css = read('components/screens-catalog/screens-catalog.css');
  assert.match(component, /aria-label="البحث في الشاشات"/);
  assert.match(component, /aria-label="طريقة عرض النتائج"/);
  assert.match(css, /@media\(max-width:620px\)/);
  assert.match(css, /prefers-reduced-motion/);
});
