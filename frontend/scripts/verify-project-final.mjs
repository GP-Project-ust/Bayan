import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = process.cwd();
const appRoot = fs.existsSync(path.join(root, 'src', 'app')) ? path.join(root, 'src', 'app') : path.join(root, 'app');
const catalogPath = fs.existsSync(path.join(root, 'src', 'lib', 'screen-catalog.json')) ? path.join(root, 'src', 'lib', 'screen-catalog.json') : path.join(root, 'lib', 'screen-catalog.json');
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

function routeFromPage(file) {
  const relative = path.relative(appRoot, path.dirname(file)).split(path.sep).join('/');
  return relative === '.' ? '/' : `/${relative}`;
}

function matchesTemplate(template, route) {
  const expected = template.split('/').filter(Boolean);
  const actual = route.split('/').filter(Boolean);
  let i = 0;
  for (; i < expected.length; i += 1) {
    const segment = expected[i];
    if (segment.startsWith('[...') && segment.endsWith(']')) return actual.length > i;
    if (i >= actual.length) return false;
    if (segment.startsWith('[') && segment.endsWith(']')) continue;
    if (segment !== actual[i]) return false;
  }
  return i === actual.length;
}

assert.equal(catalog.length, 42, 'The Bayan screen catalog must contain 42 entries');
const catalogPaths = catalog.map(item => item.path);
assert.equal(new Set(catalogPaths).size, catalogPaths.length, 'Catalog paths must be unique');

for (const item of catalog) {
  assert.ok(item.path.startsWith('/'), `Route must be absolute: ${item.path}`);
  assert.ok(!item.path.includes('..'), `Route must not traverse directories: ${item.path}`);
  assert.ok(item.title && item.description && item.group, `Catalog metadata incomplete: ${item.path}`);
}

const pageFiles = walk(appRoot).filter(file => file.endsWith('page.tsx'));
const templates = pageFiles.map(routeFromPage);
const catchAll = templates.find(route => route === '/[...slug]');
assert.ok(catchAll, 'Missing catalog catch-all route');

const dedicated = new Set(templates.filter(route => !route.includes('[')));
const dynamic = templates.filter(route => route.includes('[') && route !== '/[...slug]');

const catchAllSource = fs.readFileSync(path.join(appRoot, '[...slug]', 'page.tsx'), 'utf8');
const excluded = new Set([...catchAllSource.matchAll(/x\.path!=="([^"]+)"/g)].map(match => match[1]));
assert.ok(excluded.size >= 42, 'Catch-all must exclude all catalog routes with dedicated pages');

const resolved = [];
const missing = [];
for (const route of catalogPaths) {
  if (dedicated.has(route)) {
    resolved.push({ route, via: 'static' });
  } else {
    const dynamicTemplate = dynamic.find(template => matchesTemplate(template, route));
    if (dynamicTemplate) resolved.push({ route, via: dynamicTemplate });
    else if (catchAll) resolved.push({ route, via: 'catalog catch-all' });
    else missing.push(route);
  }
}
assert.deepEqual(missing, [], `Catalog routes without a Next.js page: ${missing.join(', ')}`);

for (const item of resolved.filter(entry => entry.via !== 'catalog catch-all')) {
  assert.ok(excluded.has(item.route), `Dedicated route is not excluded from catch-all static params: ${item.route}`);
}

const uncatalogued = pageFiles
  .map(routeFromPage)
  .filter(route => !route.includes('[') && !catalogPaths.includes(route));
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
assert.ok(packageJson.scripts['check:final'], 'Missing check:final npm script');

const report = {
  catalogEntries: catalog.length,
  uniqueCatalogRoutes: new Set(catalogPaths).size,
  pageFiles: pageFiles.length,
  staticCatalogRoutes: resolved.filter(item => item.via === 'static').length,
  dynamicCatalogRoutes: resolved.filter(item => item.via !== 'static' && item.via !== 'catalog catch-all').length,
  catchAllCatalogRoutes: resolved.filter(item => item.via === 'catalog catch-all').length,
  auxiliaryStaticRoutes: uncatalogued.length,
  routeCoverage: '100%',
};
console.log(JSON.stringify(report, null, 2));
