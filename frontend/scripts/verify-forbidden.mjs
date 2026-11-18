import fs from 'node:fs';
import assert from 'node:assert/strict';

const exists = file => assert.ok(fs.existsSync(file), `Missing ${file}`);
exists('app/forbidden/page.tsx');
exists('components/forbidden/ForbiddenScreen.tsx');
exists('components/forbidden/forbidden.css');
exists('tests/contracts/forbidden.test.mjs');
exists('tests/e2e/forbidden.spec.ts');
const catalog = JSON.parse(fs.readFileSync('lib/screen-catalog.json', 'utf8'));
assert.equal(catalog.length, 42, 'The screen catalog must remain at 42 entries');
assert.ok(catalog.some(item => item.path === '/forbidden'));
console.log('Screen 39 verification passed.');
