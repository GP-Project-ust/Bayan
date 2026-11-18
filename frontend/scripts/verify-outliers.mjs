import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);let ts;try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const required=['app/analytics/outliers/page.tsx','components/outliers/OutliersScreen.tsx','components/outliers/outliers.css','lib/outliers/outliers.ts','docs/SCREEN_17_OUTLIERS.md','docs/flows/25-outliers-flow.png','docs/flows/25-outliers-flow.svg','docs/flows/25-outliers-flow.mmd','tests/contracts/outliers.test.mjs','tests/e2e/outliers.spec.ts'];
for(const rel of required)assert.ok(fs.existsSync(path.join(root,rel))&&fs.statSync(path.join(root,rel)).size>80,`Missing ${rel}`);
const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const previous=path.join(root,'../Bayan-Frontend-Screen-16-Analytics');
if(fs.existsSync(path.join(previous,'app/page.tsx')))for(const rel of ['app/page.tsx','app/admin/page.tsx','app/globals.css','components/ChatView.tsx','components/AdminDashboard.tsx','components/Sidebar.tsx','design-references/chat-reference.png','design-references/admin-reference.png','components/analytics/AnalyticsScreen.tsx','components/analytics/analytics.css','lib/analytics/analytics.ts'])assert.equal(hash(path.join(root,rel)),hash(path.join(previous,rel)),`Previous reference changed: ${rel}`);
let parsed=0;function scan(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const abs=path.join(dir,entry.name);if(entry.isDirectory()){if(!['node_modules','.next','.git'].includes(entry.name))scan(abs);continue;}if(!/\.tsx?$/.test(entry.name))continue;const source=ts.createSourceFile(abs,fs.readFileSync(abs,'utf8'),ts.ScriptTarget.Latest,true,entry.name.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);assert.equal(source.parseDiagnostics.length,0,`Syntax: ${path.relative(root,abs)}: ${source.parseDiagnostics.map(d=>ts.flattenDiagnosticMessageText(d.messageText,' ')).join(' ')}`);parsed++;}}
scan(root);
console.log(`PASS Screen 17: ${parsed} TS/TSX parse clean, previous design and analytics untouched, deliverables present.`);
