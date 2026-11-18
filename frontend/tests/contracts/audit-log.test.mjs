import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const require=createRequire(import.meta.url);
let ts;try{ts=require('typescript');}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');}
const compiled=ts.transpileModule(fs.readFileSync(path.join(root,'lib/audit/events.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const module={exports:{}};
new Function('exports','module','require',compiled)(module.exports,module,require);
const audit=module.exports;
const events=audit.DEMO_AUDIT_EVENTS;
const base={...audit.DEFAULT_AUDIT_FILTERS};

test('audit data is training-only, distinct, immutable and trace IDs are stable',()=>{
 assert.equal(events.length,18);assert.ok(Object.isFrozen(events));
 assert.equal(new Set(events.map(e=>e.id)).size,events.length);
 assert.equal(new Set(events.map(e=>e.traceId)).size,events.length);
 for(const event of events){assert.match(event.id,/^AUD-DEMO-\d{3}$/);assert.match(event.traceId,/^TRACE-DEMO-\d{4}$/);assert.match(event.timestamp,/^2026-11-\d{2}T/);}
});
test('all audit rows contain no credential or raw prompt fields',()=>{
 for(const event of events){const keys=Object.keys(event);for(const sensitive of ['password','token','cookie','rawQuery','sql','prompt','privateKey','ipAddress'])assert.equal(keys.includes(sensitive),false);}
 assert.match(audit.AUDIT_ORIGIN,/تدريبية/);
});
test('Arabic search normalizes hamza and finds action / actor / trace',()=>{
 assert.equal(audit.normalizeArabicSearch('إدارة'),audit.normalizeArabicSearch('ادارة'));
 assert.equal(audit.filterAuditEvents(events,{...base,query:'تغيير دور'}).length,1);
 assert.equal(audit.filterAuditEvents(events,{...base,query:'TRACE-DEMO-0013'})[0].outcome,'denied');
 assert.ok(audit.filterAuditEvents(events,{...base,query:'مستخدم'}).length>0);
});
test('filter category and result never ignore other conditions',()=>{
 const x=audit.filterAuditEvents(events,{...base,category:'users',outcome:'denied'});
 assert.equal(x.length,1);assert.equal(x[0].id,'AUD-DEMO-008');
 assert.ok(audit.filterAuditEvents(events,{...base,outcome:'failed'}).every(e=>e.outcome==='failed'));
});
test('filter by actor and inclusive date boundaries',()=>{
 const found=audit.filterAuditEvents(events,{...base,actorId:'DEMO-IT-01',from:'2026-11-07',to:'2026-11-07'});
 assert.equal(found.length,3);assert.ok(found.every(e=>e.actorId==='DEMO-IT-01'));
 assert.equal(audit.filterAuditEvents(events,{...base,from:'2026-11-06',to:'2026-11-05'}).length,0);
 assert.equal(audit.filterAuditEvents(events,{...base,from:'not-a-date'}).length,0);
});
test('filtered rows are newest first and input fixtures remain unmodified',()=>{
 const before=events.map(e=>e.id).join('|');const result=audit.filterAuditEvents(events,base);
 assert.equal(result.length,events.length);
 assert.ok(result.every((e,i)=>i===0||result[i-1].timestamp>=e.timestamp));
 assert.equal(before,events.map(e=>e.id).join('|'));
});
test('statistics add up to event counts and categories are known',()=>{
 const stats=audit.auditStats(events);
 assert.equal(stats.total,18);assert.equal(stats.success+stats.failed+stats.denied,stats.total);
 assert.ok(events.every(e=>audit.categoryLabels[e.category]&&audit.outcomeLabels[e.outcome]));
});
test('resolved event IDs are allowlisted and unknown IDs fail closed',()=>{
 assert.equal(audit.resolveAuditEvent('AUD-DEMO-001')?.traceId,'TRACE-DEMO-0001');
 for(const invalid of [null,undefined,'','AUD-DEMO-999','AUD-DEMO-001/../','<script>','TRACE-DEMO-0001'])assert.equal(audit.resolveAuditEvent(invalid),null);
});
test('CSV exports only fields allowed for review and uses Excel formula injection protection',()=>{
 const csv=audit.createAuditCsv(events.slice(0,2));
 assert.ok(csv.startsWith('\uFEFF'));assert.match(csv,/TRACE-DEMO-0001/);
 assert.doesNotMatch(csv,/description|كلمات مرور|raw SQL/);
 for(const prefix of ['=','+','-','@','\t','\r'])assert.equal(audit.escapeAuditCsvCell(prefix+'2+2'),`"'${prefix}2+2"`);
 assert.equal(audit.escapeAuditCsvCell('واحد"اثنان'), '"واحد""اثنان"');
});
test('screen is read-only, checks audit.view and has no network calls',()=>{
 const src=fs.readFileSync(path.join(root,'components/audit/AuditLogScreen.tsx'),'utf8');
 assert.match(src,/can\('audit\.view'\)/);
 assert.match(src,/data-testid="audit-forbidden"/);
 assert.match(src,/createAuditCsv\(filtered\)/);
 assert.doesNotMatch(src,/\bfetch\s*\(|XMLHttpRequest|axios\.|localStorage\.|deleteEvent|updateEvent/);
});
