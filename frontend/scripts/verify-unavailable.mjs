import fs from 'node:fs';
import assert from 'node:assert/strict';

for (const file of [
  'app/unavailable/page.tsx',
  'components/unavailable/UnavailableScreen.tsx',
  'components/unavailable/unavailable.css',
  'tests/contracts/unavailable.test.mjs',
  'tests/e2e/unavailable.spec.ts',
]) assert.ok(fs.existsSync(file), `Missing ${file}`);

const catalog = JSON.parse(fs.readFileSync('lib/screen-catalog.json', 'utf8'));
assert.equal(catalog.length, 42, 'The screen catalog must remain at 42 entries');
assert.ok(catalog.some(item => item.path === '/unavailable'));
console.log('Screen 40 verification passed.');
