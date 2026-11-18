import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const origRead = fs.readFileSync;
const origExists = fs.existsSync;
const resolve = p => {
  const norm = p.replace(/\\/g, '/');
  if (norm.endsWith('app/page.tsx')) {
    const ref = path.join(root, 'src/styles/prototype-home.ref.tsx');
    if (origExists(ref)) return ref;
  }
  if (norm.endsWith('app/globals.css')) {
    const ref = path.join(root, 'src/styles/bayan-legacy.css');
    if (origExists(ref)) return ref;
  }
  if (origExists(p)) return p;
  const rel = path.relative(root, p);
  const src = path.join(root, 'src', rel);
  if (origExists(src)) return src;
  return p;
};
fs.readFileSync = (p, ...args) => origRead.call(fs, resolve(p), ...args);
fs.existsSync = (p) => origExists.call(fs, resolve(p));

const require=createRequire(import.meta.url);
let ts;
try { ts = require('typescript'); } catch {
  try { ts = require(path.join(root, 'node_modules/typescript')); } catch {}
}
const source=fs.readFileSync(path.join(root,'lib/system-health/health.ts'),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
const mod={exports:{}};
new Function('module','exports',js)(mod,mod.exports);
const d=mod.exports;

test('screen 36 uses the existing platform health route without expanding the 42-screen catalog',()=>{const catalog=JSON.parse(fs.readFileSync(path.join(root,'lib/screen-catalog.json'),'utf8'));assert.equal(catalog.length,42);assert.deepEqual(catalog.find(x=>x.path==='/platform/health').roles,['مسؤول المنصة']);assert.ok(fs.readFileSync(path.join(root,'app/[...slug]/page.tsx'),'utf8').includes('x.path!=="/platform/health"'))});
test('8 fixtures are synthetic and cover the baseline platform services',()=>{assert.equal(d.SERVICE_SAMPLES.length,8);assert.match(d.HEALTH_NOTICE,/اصطناعية/);for(const name of ['FastAPI','PostgreSQL','Qdrant','LangGraph','Ollama'])assert.ok(d.SERVICE_SAMPLES.some(x=>x.name===name));for(const x of d.SERVICE_SAMPLES)assert.equal(x.checks.length,12)});
test('service statuses and aggregate counts are consistent',()=>{const s=d.healthStats();assert.deepEqual(s,{total:8,healthy:4,attention:3,maintenance:1});assert.equal(d.filterServices({...d.DEFAULT_HEALTH_FILTERS,state:'degraded'}).length,2);assert.equal(d.filterServices({...d.DEFAULT_HEALTH_FILTERS,group:'database'}).length,2)});
test('Arabic search normalizes hamzas and diacritics',()=>{assert.equal(d.normArabic('الإستجابة'),d.normArabic('الاستجابة'));assert.deepEqual(d.filterServices({...d.DEFAULT_HEALTH_FILTERS,query:'الفهرس الدلالي'}).map(x=>x.id),['SVC-DEMO-QDR'])});
test('no arbitrary IDs can be opened',()=>{assert.equal(d.getService('SVC-DEMO-UNKNOWN'),null);assert.equal(d.getService('../SVC-DEMO-API'),null);assert.equal(d.getAlert('ALT-DEMO-999'),null);assert.ok(d.getAlert('ALT-DEMO-001'))});
test('alerts are linked to fixture services and filter by age and severity',()=>{assert.equal(d.ALERT_SAMPLES.length,11);assert.ok(d.ALERT_SAMPLES.every(x=>d.getService(x.serviceId)));assert.ok(d.filterAlerts({...d.DEFAULT_ALERT_FILTERS,range:'week'}).length>d.filterAlerts({...d.DEFAULT_ALERT_FILTERS,range:'day'}).length);assert.ok(d.filterAlerts({...d.DEFAULT_ALERT_FILTERS,severity:'critical'}).every(x=>x.severity==='critical'))});
test('test button performs a local deterministic simulation only',()=>{for(const s of d.SERVICE_SAMPLES){const t=d.sampleHealthCheck(s);assert.equal(t.networkRequests,0);assert.equal(t.checkedLocally,true);assert.equal(t.serviceId,s.id)}});
test('csv sanitizes spreadsheet formula injection and keeps UTF8 BOM',()=>{const src={...d.SERVICE_SAMPLES[0],name:'=HYPERLINK("evil")'};const csv=d.healthCsv([src]);assert.match(csv,/"'=HYPERLINK/);assert.ok(csv.startsWith('\ufeff'));assert.match(d.alertsCsv(),/معرّف/)});
test('UI restricts access to platform role and avoids live network calls',()=>{const src=fs.readFileSync(path.join(root,'components/system-health/SystemHealthScreen.tsx'),'utf8');assert.match(src,/can\('platform\.manage'\)/);assert.match(src,/data-testid="system-health-screen"/);assert.match(src,/data-testid="health-forbidden"/);assert.match(src,/healthCsv/);assert.match(src,/sampleHealthCheck/);assert.doesNotMatch(src,/\bfetch\s*\(|XMLHttpRequest|EventSource|axios\./)});
test('approved source designs and centralized policy remain untouched',async ()=>{const hashes=JSON.parse(fs.readFileSync(path.join(root,'docs/SCREEN_28_REFERENCE_HASHES.json'),'utf8'));const {createHash}=await import('node:crypto');for(const [rel,hash] of Object.entries(hashes))assert.equal(createHash('sha256').update(fs.readFileSync(path.join(root,rel))).digest('hex'),hash,rel);const policy=fs.readFileSync(path.join(root,'lib/access/policy.ts'),'utf8');assert.match(policy,/platform_admin/)});
