import fs from 'node:fs';
import path from 'node:path';

function getFiles(dir) {
  let res = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.next', '.git'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) res = res.concat(getFiles(full));
    else if (/\.(tsx|ts)$/.test(entry.name)) res.push(full);
  }
  return res;
}

const files = getFiles('src');
const routesUsage = [];
const hardcodedRoutes = {};
const allDiscoveredPaths = new Set();

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  if (content.includes('ORGANIZATION_ROUTES') || content.includes('PLATFORM_ROUTES') || content.includes('/routes')) {
    routesUsage.push(file);
  }
  
  const re = /href=["'](\/[a-zA-Z0-9_\-\/\?=&]*)["']/g;
  let m;
  const found = [];
  while ((m = re.exec(content)) !== null) {
    found.push(m[1]);
    allDiscoveredPaths.add(m[1]);
  }
  if (found.length > 0) {
    hardcodedRoutes[file] = found;
  }
}

console.log('=== ROUTES AUDIT RESULTS ===');
console.log('1. Files importing/using routes.ts:');
console.log(routesUsage.length ? routesUsage : 'None yet in individual components (centralized definition established in Phase 1).');

console.log('\n2. Hardcoded internal href statistics:');
const fileKeys = Object.keys(hardcodedRoutes);
console.log('Total component/page files with hardcoded href strings:', fileKeys.length);
console.log('Total unique href paths discovered:', allDiscoveredPaths.size);

console.log('\n3. All unique discovered internal paths:');
for (const p of Array.from(allDiscoveredPaths).sort()) {
  console.log('  ' + p);
}
