import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const require=createRequire(import.meta.url);
let ts;try{ts=require('typescript');}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');}
function compile(file,overrides={}){
 const source=fs.readFileSync(path.join(root,file),'utf8');
 const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 const module={exports:{}};
 const localRequire=(id)=>Object.hasOwn(overrides,id)?overrides[id]:require(id);
 new Function('module','exports','require',js)(module,module.exports,localRequire);
 return module.exports;
}
const trace=compile('lib/agent-traces/traces.ts');
const agents=compile('lib/agent-monitoring/agents.ts',{'../agent-traces/traces':trace});

test('screen 37 is a dedicated platform route already defined in the 42-screen catalog',()=>{
 const catalog=JSON.parse(fs.readFileSync(path.join(root,'lib/screen-catalog.json'),'utf8'));
 assert.equal(catalog.length,42);
 assert.deepEqual(catalog.find(x=>x.path==='/platform/agents').roles,['مسؤول المنصة']);
 assert.ok(fs.readFileSync(path.join(root,'app/[...slug]/page.tsx'),'utf8').includes('x.path!=="/platform/agents"'));
});

test('five agents follow the project roles and documented responsibilities',()=>{
 assert.deepEqual(agents.AGENT_DEFINITIONS.map(x=>x.id),['Supervisor','SQL','RAG','Analyst','Reporter']);
 assert.match(agents.AGENT_DEFINITIONS.find(x=>x.id==='Supervisor').responsibility,/توجيه الاستعلامات/);
 assert.match(agents.AGENT_DEFINITIONS.find(x=>x.id==='SQL').responsibility,/استعلامات قواعد بيانات/);
 assert.match(agents.AGENT_DEFINITIONS.find(x=>x.id==='RAG').responsibility,/البحث الدلالي/);
 assert.match(agents.AGENT_DEFINITIONS.find(x=>x.id==='Analyst').responsibility,/الاتجاهات الإحصائية/);
 assert.match(agents.AGENT_DEFINITIONS.find(x=>x.id==='Reporter').responsibility,/التقارير/);
});

test('aggregated metrics are internally consistent with the eight synthetic trace fixtures',()=>{
 const metrics=agents.getAgentMetrics();
 assert.equal(metrics.length,5);
 assert.deepEqual(metrics.map(x=>[x.id,x.stepCount,x.success,x.failed,x.denied,x.running,x.skipped]),[
  ['Supervisor',8,7,0,1,0,0],['SQL',6,4,0,0,1,1],['RAG',3,2,1,0,0,0],['Analyst',3,2,1,0,0,0],['Reporter',7,4,0,0,0,3],
 ]);
 assert.deepEqual(agents.agentOverviewStats(metrics),{agents:5,ready:2,attention:2,processing:1,steps:27,success:19,failed:2,denied:1,running:1,skipped:4});
});

test('success rate excludes running and skipped steps from its denominator',()=>{
 const metrics=agents.getAgentMetrics();
 assert.equal(metrics.find(x=>x.id==='RAG').successRate,67);
 assert.equal(metrics.find(x=>x.id==='Analyst').successRate,67);
 assert.equal(metrics.find(x=>x.id==='SQL').successRate,100);
 assert.equal(metrics.find(x=>x.id==='Reporter').successRate,100);
});

test('agent state is derived from failed and running sample steps, not live health claims',()=>{
 const byId=Object.fromEntries(agents.getAgentMetrics().map(x=>[x.id,x]));
 assert.equal(byId.RAG.state,'attention');
 assert.equal(byId.Analyst.state,'attention');
 assert.equal(byId.SQL.state,'processing');
 assert.equal(byId.Supervisor.state,'ready');
 assert.match(agents.AGENT_STATE_LABELS.ready,/في العينة/);
 assert.match(agents.AGENT_MONITORING_NOTICE,/اصطناعية/);
});

test('Arabic search and category/state filters return only matching agents',()=>{
 const all=agents.getAgentMetrics();
 assert.deepEqual(agents.filterAgents(all,{...agents.DEFAULT_AGENT_FILTERS,query:'الاسترجاع الدلالي'}).map(x=>x.id),['RAG']);
 assert.deepEqual(agents.filterAgents(all,{...agents.DEFAULT_AGENT_FILTERS,category:'analytics'}).map(x=>x.id),['Analyst']);
 assert.deepEqual(agents.filterAgents(all,{...agents.DEFAULT_AGENT_FILTERS,state:'attention'}).map(x=>x.id),['RAG','Analyst']);
 assert.deepEqual(agents.filterAgents(all,{...agents.DEFAULT_AGENT_FILTERS,query:'Qdrant'}).map(x=>x.id),['RAG']);
});

test('empty trace input produces idle agents without fabricated durations',()=>{
 const metrics=agents.getAgentMetrics([]);
 assert.ok(metrics.every(x=>x.state==='idle'&&x.stepCount===0&&x.averageDurationMs===null&&x.successRate===0));
});

test('CSV contains aggregated metadata only and protects spreadsheet formula injection',()=>{
 const metrics=agents.getAgentMetrics();
 const csv=agents.agentsCsv(metrics);
 assert.equal(csv.charCodeAt(0),0xfeff);
 assert.match(csv,/Supervisor/);
 assert.doesNotMatch(csv,/password|apiKey|token|Bearer|prompt|tenant_id/i);
 const injected={...metrics[0],definition:{...metrics[0].definition,label:'=HYPERLINK("example.invalid")'}};
 assert.match(agents.agentsCsv([injected]),/"'=HYPERLINK/);
});

test('UI enforces platform.manage, offers trace details only when traces.view is allowed, and has no live network calls',()=>{
 const source=fs.readFileSync(path.join(root,'components/agent-monitoring/AgentMonitoringScreen.tsx'),'utf8');
 assert.match(source,/can\('platform\.manage'\)/);
 assert.match(source,/can\('traces\.view'\)/);
 assert.match(source,/traceAccess \?/);
 assert.match(source,/data-testid="agent-monitoring-screen"/);
 assert.match(source,/data-testid="agent-monitoring-forbidden"/);
 assert.match(source,/\/platform\/health/);
 assert.match(source,/\/platform\/models/);
 assert.doesNotMatch(source,/\bfetch\s*\(|XMLHttpRequest|WebSocket|EventSource|axios\.|localStorage/);
});

test('platform health links to agent monitoring without changing the shared permission matrix',()=>{
 const health=fs.readFileSync(path.join(root,'components/system-health/SystemHealthScreen.tsx'),'utf8');
 const policy=fs.readFileSync(path.join(root,'lib/access/policy.ts'),'utf8');
 assert.match(health,/href="\/platform\/agents"/);
 assert.match(policy,/"platform\.manage"/);
 assert.match(policy,/"traces\.view"/);
 assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root,'lib/screen-catalog.json'),'utf8')).find(x=>x.path==='/platform/agents').roles,['مسؤول المنصة']);
});

test('route, docs, flow diagram and e2e test are included',()=>{
 for(const file of ['app/platform/agents/page.tsx','components/agent-monitoring/AgentMonitoringScreen.tsx','components/agent-monitoring/agent-monitoring.css','lib/agent-monitoring/agents.ts','docs/SCREEN_37_AGENT_MONITORING.md','docs/flows/45-agent-monitoring-flow.mmd','docs/flows/45-agent-monitoring-flow.png','docs/flows/45-agent-monitoring-flow.svg','tests/e2e/agent-monitoring.spec.ts'])
  assert.ok(fs.existsSync(path.join(root,file))&&fs.statSync(path.join(root,file)).size>80,`Missing ${file}`);
});
