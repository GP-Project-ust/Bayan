import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const require=createRequire(import.meta.url);
let ts;try{ts=require('typescript');}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');}
function compile(file,imports={}){
 const compiled=ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const mod={exports:{}};new Function('exports','module','require',compiled)(mod.exports,mod,name=>imports[name]||require(name));return mod.exports;
}
const events=compile('lib/audit/events.ts');
const detail=compile('lib/audit/details.ts',{'./events':events});
test('IDs are strictly validated against the demonstration allowlist',()=>{
 assert.equal(detail.findAuditEvent('AUD-DEMO-001')?.traceId,'TRACE-DEMO-0001');
 for(const x of [null,undefined,'',123,'AUD-DEMO-1','AUD-DEMO-001/../../','AUD-DEMO-999','<img src=x>',['AUD-DEMO-001']])assert.equal(detail.findAuditEvent(x),null);
});
test('missing, invalid, non-existent and valid detail links have distinct states',()=>{
 assert.equal(detail.eventDetailState(null),'missing');assert.equal(detail.eventDetailState(''),'missing');
 assert.equal(detail.eventDetailState('x'),'invalid');assert.equal(detail.eventDetailState('AUD-DEMO-999'),'not-found');
 assert.equal(detail.eventDetailState('AUD-DEMO-013'),'found');
});
test('details share only safe audit metadata, without raw prompts or secrets',()=>{
 const v=detail.auditEventSummary(events.DEMO_AUDIT_EVENTS[0]);
 assert.deepEqual(Object.keys(v).sort(),['eventId','actor','actorId','category','action','resource','outcome','timestamp','channel','traceId','description'].sort());
 assert.doesNotMatch(JSON.stringify(v),/password|api.key|Bearer|cookie|secret|prompt|rawQuery/);
 assert.equal(v.outcome,'نجاح');
});
test('navigation only connects allowlisted fixture IDs',()=>{
 assert.deepEqual(detail.auditNeighbors('AUD-DEMO-001'),{previous:null,next:'AUD-DEMO-002'});
 assert.deepEqual(detail.auditNeighbors('AUD-DEMO-018'),{previous:'AUD-DEMO-017',next:null});
 assert.deepEqual(detail.auditNeighbors('AUD-DEMO-888'),{previous:null,next:null});
});
test('correlation reference never invents agent execution details',()=>{
 const v=detail.traceDetailAvailability(events.DEMO_AUDIT_EVENTS[12]);
 assert.equal(v.traceId,'TRACE-DEMO-0013');assert.equal(v.hasAgentTrace,false);
 assert.match(v.reason,/لا تتضمن سجلات التدريب/);
});
test('share reference includes only stable ID, trace and outcome',()=>{
 const v=detail.shareableAuditReference(events.DEMO_AUDIT_EVENTS[12]);
 assert.match(v,/AUD-DEMO-013/);assert.match(v,/TRACE-DEMO-0013/);assert.match(v,/مرفوض/);
 assert.doesNotMatch(v,/SQL|password|description/);
});
test('screen enforces audit.view before showing event details, no network or mutable audit events',()=>{
 const s=fs.readFileSync(path.join(root,'components/audit-details/AuditEventDetailsScreen.tsx'),'utf8');
 assert.match(s,/can\('audit\.view'\)/);assert.match(s,/data-testid="audit-detail-forbidden"/);
 assert.match(s,/bad-tab-panel/);assert.match(s,/traceDetailAvailability/);
 assert.doesNotMatch(s,/\bfetch\s*\(|axios\.|XMLHttpRequest|localStorage\.|deleteAuditEvent|updateAuditEvent/);
});
test('the original audit table provides a full page link to this detail',()=>{
 const s=fs.readFileSync(path.join(root,'components/audit/AuditLogScreen.tsx'),'utf8');
 assert.match(s,/admin\/audit\/details\?id=\$\{event\.id\}/);
 const c=fs.readFileSync(path.join(root,'lib/screen-catalog.json'),'utf8');assert.ok(JSON.parse(c).some(x=>x.path==='/admin/audit/details'));
});
test('each detail tab is unique and accessible by id',()=>{
 assert.equal(detail.detailTabs.length,4);
 assert.equal(new Set(detail.detailTabs.map(x=>x.id)).size,4);
});
