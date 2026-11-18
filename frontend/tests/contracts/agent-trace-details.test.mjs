import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const require=createRequire(import.meta.url);
let ts;try{ts=require('typescript');}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');}
function compile(file,cache=new Map()){
 if(cache.has(file))return cache.get(file);
 const src=fs.readFileSync(path.join(root,file),'utf8');
 const js=ts.transpileModule(src,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 const m={exports:{}};cache.set(file,m.exports);
 const dir=path.posix.dirname(file);
 const localRequire=(id)=>id.startsWith('.')?compile(path.posix.normalize(path.posix.join(dir,id))+'.ts',cache):require(id);
 new Function('module','exports','require',js)(m,m.exports,localRequire);cache.set(file,m.exports);return m.exports;
}
const data=compile('lib/agent-trace-details/detail.ts');
const raw=compile('lib/agent-traces/traces.ts');
const audit=compile('lib/audit/events.ts');
test('trace detail resolves only known safe fixture identifiers',()=>{
 assert.equal(data.traceDetailState(null),'missing');assert.equal(data.traceDetailState(''),'missing');
 for(const invalid of ['?id=1','TRACE-DEMO-07','../../../etc/passwd',[],123,'<script>'])assert.equal(data.traceDetailState(invalid),'invalid');
 assert.equal(data.traceDetailState('TRACE-DEMO-9999'),'not-found');
 assert.equal(data.traceDetailState('TRACE-DEMO-0007'),'found');
});
test('all eight existing fixtures can be opened without adding new fake traces',()=>{
 assert.equal(raw.DEMO_AGENT_TRACES.length,8);
 for(const t of raw.DEMO_AGENT_TRACES)assert.equal(data.findTraceDetail(t.id)?.id,t.id);
});
test('all detail navigation stays within the same eight fixture IDs',()=>{
 for(const t of raw.DEMO_AGENT_TRACES){const n=data.traceNeighbors(t.id);assert.ok(n);for(const key of ['previous','next'])assert.ok(n[key]===null||raw.DEMO_AGENT_TRACES.some(t=>t.id===n[key]));}
 assert.equal(data.traceNeighbors('TRACE-DEMO-9999'),null);
});
test('successful trace timeline derives sequential elapsed durations exactly',()=>{
 for(const t of raw.DEMO_AGENT_TRACES.filter(x=>x.status==='success')){
  const points=data.traceTimeline(t);
  assert.equal(points.at(-1).endMs,t.durationMs);
  assert.equal(points[0].startMs,0);
  for(let i=1;i<points.length;i++)assert.equal(points[i].startMs,points[i-1].endMs);
 }
});
test('running or skipped steps never invent elapsed time or percentages',()=>{
 for(const t of raw.DEMO_AGENT_TRACES){for(const item of data.traceTimeline(t)){
  if(item.step.durationMs===null){assert.equal(item.startMs,null);assert.equal(item.endMs,null);assert.equal(item.share,null);}
  else{assert.ok(item.endMs>=item.startMs);assert.ok(item.share>=0&&item.share<=100);}
 }}
});
test('sanitized summary does not count skipped step as a participating agent',()=>{
 const t=data.findTraceDetail('TRACE-DEMO-0013');const s=data.traceSummary(t);
 assert.equal(s.agents.length,1);assert.equal(s.failed,1);assert.equal(s.skipped,1);
 assert.equal(s.agents.includes(raw.agentLabels.SQL),false);
});
test('audit correlation only offers real demo audit fixture IDs',()=>{
 for(const t of raw.DEMO_AGENT_TRACES){const s=data.traceSummary(t);if(s.auditEventId){assert.ok(audit.resolveAuditEvent(s.auditEventId));assert.equal(audit.resolveAuditEvent(s.auditEventId).traceId,t.id);}}
});
test('copied reference contains only safe metadata and no raw prompts or secrets',()=>{
 for(const t of raw.DEMO_AGENT_TRACES){const text=data.safeTraceDetailReference(t);assert.match(text,/TRACE-DEMO-/);assert.doesNotMatch(text,/password|api_key|Bearer |SELECT .*FROM|authorization/i);}
});
test('page is permission gated, no network requests, and links to existing trace list',()=>{
 const s=fs.readFileSync(path.join(root,'components/agent-trace-details/AgentTraceDetailsScreen.tsx'),'utf8');
 assert.match(s,/can\('traces\.view'\)/);assert.match(s,/agent-trace-details-forbidden/);
 assert.match(s,/TRACE_DEMO_NOTICE/);assert.match(s,/\/admin\/agent-traces/);
 assert.doesNotMatch(s,/\bfetch\s*\(|axios\.|XMLHttpRequest|WebSocket|EventSource|localStorage/);
 assert.match(s,/لا توجد عملية حية|لا توجد عملية حقيقية/);
 const list=fs.readFileSync(path.join(root,'components/agent-traces/AgentTracesScreen.tsx'),'utf8');
 assert.match(list,/admin\/agent-traces\/details\?id=/);
});
test('safe tabs and privacy statements have no chain-of-thought contents',()=>{
 assert.equal(data.traceDetailTabs.length,4);
 assert.deepEqual(data.traceDetailTabs.map(x=>x.id),['overview','timeline','diagnostics','privacy']);
 const source=fs.readFileSync(path.join(root,'components/agent-trace-details/AgentTraceDetailsScreen.tsx'),'utf8');
 assert.match(source,/الاستدلال الداخلي/);assert.match(source,/للـ?قراءة فقط|للقراءة فقط/);
});
