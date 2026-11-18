import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(import.meta.url);
let ts;try{ts=require('typescript');}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');}
const needed=[
 'app/admin/audit/page.tsx','components/audit/AuditLogScreen.tsx','components/audit/audit.css',
 'lib/audit/events.ts','tests/contracts/audit-log.test.mjs','tests/e2e/audit-log.spec.ts',
 'docs/SCREEN_28_AUDIT_LOG.md','docs/flows/36-audit-log-flow.mmd',
 'docs/flows/36-audit-log-flow.svg','docs/flows/36-audit-log-flow.png'
];
for(const file of needed)assert.ok(fs.existsSync(path.join(root,file))&&fs.statSync(path.join(root,file)).size>100,`Missing: ${file}`);
let count=0;
function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){
 if(e.isDirectory()){if(!['node_modules','.next','.git'].includes(e.name))walk(path.join(dir,e.name));}
 else if(e.isFile()&&/\.tsx?$/.test(e.name)){
  const file=path.join(dir,e.name),raw=fs.readFileSync(file,'utf8');
  const tree=ts.createSourceFile(file,raw,ts.ScriptTarget.Latest,true,e.name.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  assert.equal(tree.parseDiagnostics.length,0,`${file}: ${tree.parseDiagnostics.map(x=>ts.flattenDiagnosticMessageText(x.messageText,' ')).join(' | ')}`);count++;
 }
}}
walk(root);
const baseline=JSON.parse(fs.readFileSync(path.join(root,'docs/SCREEN_28_REFERENCE_HASHES.json'),'utf8'));
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
for(const [file,expected] of Object.entries(baseline)){
 assert.equal(sha(path.join(root,file)),expected,`Unwanted modification: ${file}`);
}
const catalog=JSON.parse(fs.readFileSync(path.join(root,'lib/screen-catalog.json'),'utf8'));
assert.equal(catalog.length,42);assert.ok(catalog.find(e=>e.path==='/admin/audit'));
const ui=fs.readFileSync(path.join(root,'components/audit/AuditLogScreen.tsx'),'utf8');
assert.doesNotMatch(ui,/\bfetch\s*\(|axios\.|XMLHttpRequest|localStorage\./);
assert.match(ui,/can\('audit\.view'\)/);assert.match(ui,/DemoRolePicker/);
const css=fs.readFileSync(path.join(root,'components/audit/audit.css'),'utf8');
assert.match(css,/@media\(max-width:720px\)/);assert.match(css,/prefers-reduced-motion/);
console.log(`PASS Screen 28: ${count} TS/TSX files parsed; 42 catalog entries retained; approved reference files unchanged.`);
