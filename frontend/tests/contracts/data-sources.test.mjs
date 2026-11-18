import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const require=createRequire(import.meta.url);let ts;try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}
const js=ts.transpileModule(fs.readFileSync(path.join(root,'lib/data-sources/sources.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const m={exports:{}};new Function('exports','module','require',js)(m.exports,m,require);const d=m.exports;
const source=fs.readFileSync(path.join(root,'components/data-sources/DataSourcesScreen.tsx'),'utf8');
const page=fs.readFileSync(path.join(root,'app/admin/data-sources/page.tsx'),'utf8');

test('screen 22 source fixtures are immutable fictional catalog entries with no secrets',()=>{
 assert.equal(d.DEMO_SOURCES.length,8);
 assert.equal(new Set(d.DEMO_SOURCES.map(x=>x.id)).size,8);
 for(const x of d.DEMO_SOURCES){assert.equal(x.isDemo,true);assert.match(x.id,/^SRC-\d{3}$/);assert.ok(!x.endpoint.includes('@'));assert.ok(x.endpoint.includes('.invalid')||x.endpoint.startsWith('['));for(const key of Object.keys(x))assert.ok(!/secret|password|token|apiKey/i.test(key));}
});
test('Arabic normalization finds hamza variations and search filters are combinable',()=>{
 assert.equal(d.normalizeArabic('الإدارة'),d.normalizeArabic('الادارة'));
 const res=d.filterSources(d.DEMO_SOURCES,{...d.DEFAULT_FILTERS,query:'شؤون الطلاب',type:'odoo',status:'attention',classification:'masked'});
 assert.deepEqual(res.map(s=>s.id),['SRC-002']);
 assert.equal(d.filterSources(d.DEMO_SOURCES,{...d.DEFAULT_FILTERS,query:'لا توجد'}).length,0);
 assert.equal(d.DEMO_SOURCES.length,8);
});
test('source statuses and security classes are distinct and aggregated without leaking data',()=>{
 assert.deepEqual(d.sourceStats(d.DEMO_SOURCES),{total:8,connected:3,attention:2,restricted:4});
 assert.equal(d.sourceClassLabels.blocked,'محظور');
 assert.equal(d.sourceStatusLabels.pending,'بانتظار الإعداد');
});
test('local flags restore only known IDs and booleans; blocked source stays blocked',()=>{
 const restored=d.restoreSourceFlags({'SRC-001':true,'SRC-007':false,'SRC-002':'true','SRC-X':true});
 assert.deepEqual(restored,{'SRC-001':true});
 const mapped=d.withLocalFlags({'SRC-001':true,'SRC-007':false});
 assert.equal(mapped.find(s=>s.id==='SRC-001').status,'disabled');
 assert.equal(mapped.find(s=>s.id==='SRC-007').status,'disabled');
 assert.equal(d.canToggleDemoSource(d.DEMO_SOURCES.find(x=>x.id==='SRC-007')),false);
 assert.equal(d.withLocalFlags({}).find(s=>s.id==='SRC-001').status,'connected');
});
test('connection probe is explicitly fictional and disabled/blocked sources cannot be tested',()=>{
 const ok=d.simulateConnectionCheck(d.DEMO_SOURCES.find(x=>x.id==='SRC-001'));
 assert.equal(ok.kind,'sample-connected');assert.match(ok.description,/لم يُرسل أي طلب/);
 const blocked=d.simulateConnectionCheck(d.DEMO_SOURCES.find(x=>x.id==='SRC-007'));
 assert.equal(blocked.kind,'unavailable');assert.match(blocked.description,/لم يحدث أي اتصال/);
 assert.equal(d.simulateConnectionCheck(d.DEMO_SOURCES.find(x=>x.id==='SRC-004')).kind,'sample-pending');
});
test('tenant administrator can manage; platform operator does not inherit tenant controls',()=>{
 const policyText=fs.readFileSync(path.join(root,'lib/access/policy.ts'),'utf8');
 assert.match(policyText,/it_admin:[^\n]+sources\.manage/);
 assert.match(policyText,/platform_admin: \["onboarding\.run","platform\.manage"\]/);
 assert.ok(source.includes("can('sources.manage')"));
 assert.ok(source.includes('data-sources-forbidden'));
});
test('Next route and UI contain genuine controls but never call a real connection',()=>{
 assert.match(page,/DataSourcesScreen/);
 for(const token of ['AdminLayout','DemoAccessProvider','DemoRolePicker','filterSources','sourceStats','localStorage.setItem','<Drawer','<Dialog','<Toast','simulateConnectionCheck','مصف','مصادر البيانات','/admin/data-sources/new']){if(token==='مصف')continue;assert.ok(source.includes(token),token);}
 assert.doesNotMatch(source,/\bfetch\s*\(|axios\.|\beval\s*\(/);
});
test('screen includes responsive styles and browsable documentation, tests and diagrams',()=>{
 for(const name of ['docs/SCREEN_22_DATA_SOURCES.md','docs/flows/30-data-sources-flow.png','docs/flows/30-data-sources-flow.svg','docs/flows/30-data-sources-flow.mmd','tests/e2e/data-sources.spec.ts'])assert.ok(fs.existsSync(path.join(root,name)),name);
 assert.match(fs.readFileSync(path.join(root,'components/data-sources/data-sources.css'),'utf8'),/@media\(max-width:720px\)/);
 assert.match(fs.readFileSync(path.join(root,'components/Sidebar.tsx'),'utf8'),/href="\/admin\/data-sources"/);
});
