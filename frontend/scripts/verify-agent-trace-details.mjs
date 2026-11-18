import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(import.meta.url);
let ts;try{ts=require('typescript');}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');}
const required=[
 'app/admin/agent-traces/details/page.tsx','components/agent-trace-details/AgentTraceDetailsScreen.tsx',
 'components/agent-trace-details/agent-trace-details.css','lib/agent-trace-details/detail.ts',
 'docs/SCREEN_31_AGENT_TRACE_DETAILS.md','docs/flows/39-agent-trace-details-flow.mmd',
 'docs/flows/39-agent-trace-details-flow.png','docs/flows/39-agent-trace-details-flow.svg',
 'tests/contracts/agent-trace-details.test.mjs','tests/e2e/agent-trace-details.spec.ts'
];
for(const rel of required)assert.ok(fs.existsSync(path.join(root,rel))&&fs.statSync(path.join(root,rel)).size>100,`Missing ${rel}`);
const original=JSON.parse(fs.readFileSync(path.join(root,'docs/SCREEN_28_REFERENCE_HASHES.json'),'utf8'));
for(const [rel,expected] of Object.entries(original))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,rel))).digest('hex'),expected,`Reference modified: ${rel}`);
let count=0;function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){
 if(e.isDirectory()){if(!['node_modules','.next','.git'].includes(e.name))walk(path.join(dir,e.name));continue;}
 if(!/\.tsx?$/.test(e.name))continue;
 const file=path.join(dir,e.name),src=fs.readFileSync(file,'utf8'),ast=ts.createSourceFile(file,src,ts.ScriptTarget.Latest,true,e.name.endsWith('tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 assert.equal(ast.parseDiagnostics.length,0,`${file}: ${ast.parseDiagnostics.map(x=>ts.flattenDiagnosticMessageText(x.messageText,' ')).join('; ')}`);count++;
 }}walk(root);
assert.equal(JSON.parse(fs.readFileSync(path.join(root,'lib/screen-catalog.json'),'utf8')).length,42);
const css=fs.readFileSync(path.join(root,'components/agent-trace-details/agent-trace-details.css'),'utf8');
assert.match(css,/@media\(max-width:720px\)/);assert.match(css,/prefers-reduced-motion/);
console.log(`PASS screen31: ${count} TS/TSX parsed; 42 routes intact; original design reference hashes unchanged.`);
