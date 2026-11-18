import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const req=createRequire(import.meta.url);
let ts;try{ts=req('typescript');}catch{ts=req('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');}
const required=[
 'app/platform/agents/page.tsx','components/agent-monitoring/AgentMonitoringScreen.tsx',
 'components/agent-monitoring/agent-monitoring.css','lib/agent-monitoring/agents.ts',
 'docs/SCREEN_37_AGENT_MONITORING.md','docs/flows/45-agent-monitoring-flow.mmd',
 'docs/flows/45-agent-monitoring-flow.dot','docs/flows/45-agent-monitoring-flow.png',
 'docs/flows/45-agent-monitoring-flow.svg','tests/contracts/agent-monitoring.test.mjs',
 'tests/e2e/agent-monitoring.spec.ts'
];
for(const file of required)assert.ok(fs.existsSync(path.join(root,file))&&fs.statSync(path.join(root,file)).size>80,`Missing ${file}`);
const catalog=JSON.parse(fs.readFileSync(path.join(root,'lib/screen-catalog.json'),'utf8'));
assert.equal(catalog.length,42);
assert.deepEqual(catalog.find(x=>x.path==='/platform/agents').roles,['مسؤول المنصة']);
const route=fs.readFileSync(path.join(root,'app/[...slug]/page.tsx'),'utf8');
assert.match(route,/x\.path!=="\/platform\/agents"/);
const screen=fs.readFileSync(path.join(root,'components/agent-monitoring/AgentMonitoringScreen.tsx'),'utf8');
assert.match(screen,/can\('platform\.manage'\)/);
assert.match(screen,/can\('traces\.view'\)/);
assert.doesNotMatch(screen,/\bfetch\s*\(|XMLHttpRequest|WebSocket|EventSource|axios\./);
const hashes=JSON.parse(fs.readFileSync(path.join(root,'docs/SCREEN_28_REFERENCE_HASHES.json'),'utf8'));
for(const [relative,hash] of Object.entries(hashes))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,relative))).digest('hex'),hash,`Reference changed: ${relative}`);
let count=0;
function scan(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
 if(entry.isDirectory()){if(!['node_modules','.next','.git'].includes(entry.name))scan(path.join(dir,entry.name));continue;}
 if(!/\.tsx?$/.test(entry.name))continue;
 const file=path.join(dir,entry.name);const ast=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true,file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 assert.equal(ast.parseDiagnostics.length,0,`Syntax error: ${file}`);count++;
}}
scan(root);
console.log(`PASS screen37: ${count} TypeScript/TSX parse checks; 42-screen catalog preserved; approved references unchanged.`);
