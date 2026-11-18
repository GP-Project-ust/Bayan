import fs from 'node:fs';
import assert from 'node:assert/strict';

for (const file of [
  'app/screens/page.tsx',
  'components/screens-catalog/ScreensCatalog.tsx',
  'components/screens-catalog/screens-catalog.css',
  'tests/contracts/screens-catalog.test.mjs',
  'tests/e2e/screens-catalog.spec.ts',
]) assert.ok(fs.existsSync(file), `Missing ${file}`);

const catalog = JSON.parse(fs.readFileSync('lib/screen-catalog.json', 'utf8'));
assert.equal(catalog.length, 42, 'The source catalog must remain at 42 entries');
assert.ok(catalog.some(item => item.path === '/screens'));
console.log('Screen catalog verification passed.');
