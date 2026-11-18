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
const trace=compile('lib/agent-traces/traces.ts');
const audit=compile('lib/audit/events.ts');
test('five agent identifiers and explanatory labels are available',()=>{
 assert.deepEqual(Object.keys(trace.agentLabels),['Supervisor','SQL','RAG','Analyst','Reporter']);
 assert.equal(trace.DEMO_AGENT_TRACES.length,8);
});
test('all demonstration traces have safe, unique IDs and bounded duration fields',()=>{
 const ids=new Set();
 for(const t of trace.DEMO_AGENT_TRACES){assert.match(t.id,/^TRACE-DEMO-\d{4}$/);assert.ok(!ids.has(t.id));ids.add(t.id);assert.ok(t.steps.length>0);assert.ok(t.durationMs===null||t.durationMs>=0);assert.equal(new Set(t.steps.map(s=>s.id)).size,t.steps.length);
 for(const s of t.steps)assert.ok(s.durationMs===null||s.durationMs>=0);}
});
test('traces with audit event references match only allowlisted audit IDs and trace IDs',()=>{
 for(const t of trace.DEMO_AGENT_TRACES.filter(x=>x.auditEventId)){
  const a=audit.resolveAuditEvent(t.auditEventId);assert.ok(a);assert.equal(a.traceId,t.id);
 }
});
test('denied and failed traces do not incorrectly include a completed report or SQL step',()=>{
 const denied=trace.resolveTraceId('TRACE-DEMO-0013');
 assert.equal(denied.status,'denied');assert.equal(denied.steps.find(s=>s.agent==='SQL').status,'skipped');
 const failed=trace.resolveTraceId('TRACE-DEMO-0012');
 assert.equal(failed.status,'failed');assert.equal(failed.steps.find(s=>s.agent==='Reporter').status,'skipped');
});
test('successful traces have elapsed step durations matching overall duration',()=>{
 for(const t of trace.DEMO_AGENT_TRACES.filter(t=>t.status==='success')){
  assert.equal(t.steps.reduce((sum,s)=>sum+(s.durationMs??0),0),t.durationMs);
 }
});
test('running demo cannot be mistaken for live backend activity',()=>{
 const t=trace.resolveTraceId('TRACE-DEMO-0105');assert.equal(t.status,'running');assert.equal(t.durationMs,null);
 assert.ok(trace.TRACE_DEMO_NOTICE.includes('اصطناعية'));
 assert.ok(t.steps.some(s=>s.status==='running'&&s.durationMs===null));
});
test('filtering works for normalized Arabic, status, agent, kind and date',()=>{
 const all=trace.DEMO_AGENT_TRACES;
 const f={...trace.DEFAULT_TRACE_FILTERS,query:'المحلل'};
 assert.equal(trace.filterTraces(all,f).length,3);
 assert.equal(trace.filterTraces(all,{...f,query:'',status:'denied'}).length,1);
 assert.equal(trace.filterTraces(all,{...f,query:'',agent:'RAG',kind:'documents'}).length,2);
 assert.equal(trace.filterTraces(all,{...f,query:'',from:'2026-11-07',to:'2026-11-07'}).length,4);
});
test('invalid, impossible or reversed date ranges return no results',()=>{
 for(const v of ['2026-02-30','2026-99-01','<script>','2026-1-7'])assert.equal(trace.filterTraces(trace.DEMO_AGENT_TRACES,{...trace.DEFAULT_TRACE_FILTERS,from:v}).length,0);
 assert.equal(trace.filterTraces(trace.DEMO_AGENT_TRACES,{...trace.DEFAULT_TRACE_FILTERS,from:'2026-11-07',to:'2026-11-06'}).length,0);
});
test('ID lookup disallows arbitrary values or malformed IDs',()=>{
 assert.equal(trace.resolveTraceId('TRACE-DEMO-0007')?.status,'success');
 for(const bad of [null,undefined,[],123,'TRACE-DEMO-1','TRACE-DEMO-9999','TRACE-DEMO-0007/../../','<img>'])assert.equal(trace.resolveTraceId(bad),null);
});
test('CSV is BOM-prefixed, includes only safe metadata, and escapes spreadsheet formulas',()=>{
 const csv=trace.createTraceCsv(trace.DEMO_AGENT_TRACES);
 assert.equal(csv.charCodeAt(0),0xfeff);assert.match(csv,/TRACE-DEMO-0007/);assert.doesNotMatch(csv,/password|api_key|Authorization:|Bearer /i);
 assert.match(trace.exportTraceCsvCell('=SUM(A1:A2)'),/^"'=SUM/);
 assert.match(trace.exportTraceCsvCell('+1'),/^"'\+1/);
 assert.match(trace.exportTraceCsvCell('"x'),/""x/);
});
test('screen honors traces.view, uses no network API and links to permitted audit details',()=>{
 const s=fs.readFileSync(path.join(root,'components/agent-traces/AgentTracesScreen.tsx'),'utf8');
 assert.match(s,/can\('traces\.view'\)/);assert.match(s,/agent-traces-forbidden/);
 assert.match(s,/admin\/audit\/details\?id=/);assert.match(s,/TRACE_DEMO_NOTICE/);
 assert.doesNotMatch(s,/\bfetch\s*\(|axios\.|XMLHttpRequest|WebSocket|EventSource|localStorage/);
 assert.ok(JSON.parse(fs.readFileSync(path.join(root,'lib/screen-catalog.json'),'utf8')).some(x=>x.path==='/admin/agent-traces'));
 assert.match(fs.readFileSync(path.join(root,'components/audit/AuditLogScreen.tsx'),'utf8'),/href="\/admin\/agent-traces"/);
});
