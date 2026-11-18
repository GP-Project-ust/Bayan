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
'app/admin/audit/details/page.tsx','components/audit-details/AuditEventDetailsScreen.tsx',
'components/audit-details/audit-details.css','lib/audit/details.ts',
'docs/SCREEN_29_AUDIT_EVENT_DETAILS.md','docs/flows/37-audit-event-details-flow.mmd',
'docs/flows/37-audit-event-details-flow.svg','docs/flows/37-audit-event-details-flow.png',
'tests/contracts/audit-details.test.mjs','tests/e2e/audit-details.spec.ts'
];
for(const f of needed)assert.ok(fs.existsSync(path.join(root,f))&&fs.statSync(path.join(root,f)).size>100,`Missing: ${f}`);
const baseline=JSON.parse(fs.readFileSync(path.join(root,'docs/SCREEN_28_REFERENCE_HASHES.json'),'utf8'));
for(const [f,digest] of Object.entries(baseline)){
 const actual=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,f))).digest('hex');
 assert.equal(actual,digest,`Modified approved reference: ${f}`);
}
let count=0;
function walk(folder){for(const item of fs.readdirSync(folder,{withFileTypes:true})){
 if(item.isDirectory()){if(!['node_modules','.next','.git'].includes(item.name))walk(path.join(folder,item.name));continue;}
 if(!/\.tsx?$/.test(item.name))continue;
 const file=path.join(folder,item.name),src=fs.readFileSync(file,'utf8');
 const tree=ts.createSourceFile(file,src,ts.ScriptTarget.Latest,true,item.name.endsWith('tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 assert.equal(tree.parseDiagnostics.length,0,`${file}: ${tree.parseDiagnostics.map(e=>ts.flattenDiagnosticMessageText(e.messageText,' ')).join(' | ')}`);count++;
}}
walk(root);
assert.equal(JSON.parse(fs.readFileSync(path.join(root,'lib/screen-catalog.json'))).length,42);
const css=fs.readFileSync(path.join(root,'components/audit-details/audit-details.css'),'utf8');
assert.match(css,/@media\(max-width:720px\)/);assert.match(css,/prefers-reduced-motion/);
console.log(`PASS screen29: ${count} TS/TSX parsed; approved visual files unchanged; catalog retained 42 screens.`);
