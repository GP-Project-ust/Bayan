import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const require=createRequire(import.meta.url);
let ts;try{ts=require('typescript');}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');}
function compile(file){const src=fs.readFileSync(path.join(root,file),'utf8');const js=ts.transpileModule(src,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;const m={exports:{}};new Function('module','exports','require',js)(m,m.exports,require);return m.exports;}
const org=compile('lib/organizations/organizations.ts');
const policyText=fs.readFileSync(path.join(root,'lib/access/policy.ts'),'utf8');
const screen=fs.readFileSync(path.join(root,'components/organizations/OrganizationsScreen.tsx'),'utf8');
test('eight completely synthetic organizations with distinct identifiers and safe metadata',()=>{
 assert.equal(org.DEMO_ORGANIZATIONS.length,8);assert.equal(new Set(org.DEMO_ORGANIZATIONS.map(x=>x.id)).size,8);
 for(const x of org.DEMO_ORGANIZATIONS){assert.match(x.id,/^ORG-DEMO-\d{3}$/);assert.ok(x.description);assert.ok(x.services.every(s=>['chat','documents','reports','analytics'].includes(s)));}
 const json=JSON.stringify(org.DEMO_ORGANIZATIONS);assert.doesNotMatch(json,/api[_-]?key|password|secret|connectionstring|access[_-]?token|Bearer\s/i);
});
test('status summary exactly partitions the sample list',()=>{const stats=org.organizationStats(org.DEMO_ORGANIZATIONS);assert.equal(stats.total,stats.active+stats.paused+stats.onboarding);assert.equal(stats.total,8);});
test('Arabic search normalizes hamza, diacritics and alef variants',()=>{
 const x=org.filterOrganizations(org.DEMO_ORGANIZATIONS,{...org.DEFAULT_ORG_FILTERS,query:'جامعة'});
 assert.ok(x.length>=2);
 assert.deepEqual(org.normalizeArabic('إدارة'),org.normalizeArabic('اداره'));
 assert.equal(org.filterOrganizations(org.DEMO_ORGANIZATIONS,{...org.DEFAULT_ORG_FILTERS,query:'ليست-موجودة'}).length,0);
});
test('filters independently support status, sector and enabled service',()=>{
 const f=org.DEFAULT_ORG_FILTERS;const sample=org.DEMO_ORGANIZATIONS;
 assert.equal(org.filterOrganizations(sample,{...f,status:'paused'}).length,2);
 assert.ok(org.filterOrganizations(sample,{...f,sector:'جامعة'}).every(x=>x.sector==='جامعة'));
 assert.ok(org.filterOrganizations(sample,{...f,service:'documents'}).every(x=>x.services.includes('documents')));
 assert.ok(org.filterOrganizations(sample,{...f,sector:'جامعة',status:'active'}).every(x=>x.sector==='جامعة'&&x.status==='active'));
});
test('organization identifiers strictly validate known sample records',()=>{
 assert.equal(org.findOrganization('ORG-DEMO-001')?.sector,'جامعة');
 for(const bad of [null,undefined,1,'ORG-DEMO-1','ORG-DEMO-999','<script>','../ORG-DEMO-001'])assert.equal(org.findOrganization(bad),null);
});
test('status preview does not mutate input and blocks onboarding transitions',()=>{
 const data=org.DEMO_ORGANIZATIONS;const active=data.find(o=>o.status==='active');const onboarding=data.find(o=>o.status==='onboarding');
 const change=org.previewChangeStatus(active,'paused');assert.equal(change.ok,true);assert.equal(change.value.status,'paused');assert.equal(active.status,'active');
 assert.equal(org.previewChangeStatus(onboarding,'active').ok,false);
 assert.equal(org.previewChangeStatus(active,'onboarding').ok,false);
 assert.equal(org.previewChangeStatus(active,'active').ok,false);
});
test('local status read validates schema and ignores invalid, unknown and onboarding keys',()=>{
 const storage={getItem:()=>JSON.stringify({'ORG-DEMO-001':'paused','ORG-DEMO-002':'paused','ORG-UNKNOWN':'active','ORG-DEMO-003':'javascript:1'})};
 assert.deepEqual(org.readDemoStatuses(storage),{'ORG-DEMO-001':'paused'});
 assert.deepEqual(org.readDemoStatuses({getItem:()=>'{invalid'}),{});
 assert.deepEqual(org.readDemoStatuses({getItem:()=>JSON.stringify([])}),{});
});
test('local status updates preserve onboarding status and original fixture',()=>{
 const values=org.applyDemoStatuses(org.DEMO_ORGANIZATIONS,{'ORG-DEMO-001':'paused','ORG-DEMO-002':'paused'});
 assert.equal(values[0].status,'paused');assert.equal(values[1].status,'onboarding');assert.equal(org.DEMO_ORGANIZATIONS[0].status,'active');
 let stored='';org.writeDemoStatuses({setItem:(k,v)=>{assert.match(k,/organizations-status/);stored=v;}},values);
 const parsed=JSON.parse(stored);assert.equal(parsed['ORG-DEMO-001'],'paused');assert.equal(parsed['ORG-DEMO-002'],undefined);
});
test('CSV is protected against spreadsheet formulas, contains no sensitive tenant data',()=>{
 const csv=org.organizationsCsv(org.DEMO_ORGANIZATIONS);assert.equal(csv.charCodeAt(0),0xFEFF);assert.match(csv,/ORG-DEMO-001/);assert.doesNotMatch(csv,/password|secret|api_key|Bearer /i);
 assert.match(org.safeCsvCell('=SUM(A1:A2)'),/^"'=SUM/);assert.match(org.safeCsvCell('+X'),/^"'\+X/);assert.match(org.safeCsvCell('"x'),/""x/);
});
test('platform role is separate from tenant roles and organization page gates content',()=>{
 assert.match(policyText,/platform_admin:\s*\["onboarding.run","platform.manage"\]/);
 assert.match(screen,/can\('platform\.manage'\)/);assert.match(screen,/organizations-forbidden/);
 assert.match(screen,/DemoRolePicker/);assert.match(screen,/PlatformLayout/);
 assert.doesNotMatch(screen,/\bfetch\s*\(|axios\.|XMLHttpRequest|WebSocket|EventSource/);
});
