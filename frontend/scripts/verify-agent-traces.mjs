import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(import.meta.url);
let ts;try{ts=require('typescript');}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');}
const needed=['app/admin/agent-traces/page.tsx','components/agent-traces/AgentTracesScreen.tsx','components/agent-traces/agent-traces.css','lib/agent-traces/traces.ts','docs/SCREEN_30_AGENT_TRACES.md','docs/flows/38-agent-traces-flow.mmd','docs/flows/38-agent-traces-flow.png','docs/flows/38-agent-traces-flow.svg','tests/contracts/agent-traces.test.mjs','tests/e2e/agent-traces.spec.ts'];
for(const file of needed){const f=path.join(root,file);assert.ok(fs.existsSync(f)&&fs.statSync(f).size>100,`Missing: ${file}`);}
const hashes=JSON.parse(fs.readFileSync(path.join(root,'docs/SCREEN_28_REFERENCE_HASHES.json'),'utf8'));
for(const [file,expected] of Object.entries(hashes)){
 const actual=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex');
 assert.equal(actual,expected,`Approved reference changed: ${file}`);
}
let count=0;function walk(dir){for(const item of fs.readdirSync(dir,{withFileTypes:true})){
 if(item.isDirectory()){if(!['node_modules','.git','.next'].includes(item.name))walk(path.join(dir,item.name));continue;}
 if(!/\.tsx?$/.test(item.name))continue;
 const file=path.join(dir,item.name);const src=fs.readFileSync(file,'utf8');const tree=ts.createSourceFile(file,src,ts.ScriptTarget.Latest,true,item.name.endsWith('tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 assert.equal(tree.parseDiagnostics.length,0,`${file}: ${tree.parseDiagnostics.map(d=>ts.flattenDiagnosticMessageText(d.messageText,' ')).join(' | ')}`);count++;
}}walk(root);
assert.equal(JSON.parse(fs.readFileSync(path.join(root,'lib/screen-catalog.json'),'utf8')).length,42);
const css=fs.readFileSync(path.join(root,'components/agent-traces/agent-traces.css'),'utf8');assert.match(css,/@media\(max-width:720px\)/);assert.match(css,/prefers-reduced-motion/);
console.log(`PASS screen30: ${count} TS/TSX files parsed; approved design unchanged; 42 catalog routes retained.`);
