import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import crypto from 'node:crypto';import {fileURLToPath} from 'node:url';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);let ts;try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const files=['app/analytics/page.tsx','components/analytics/AnalyticsScreen.tsx','components/analytics/analytics.css','lib/analytics/analytics.ts','docs/SCREEN_16_ANALYTICS.md','docs/flows/24-analytics-flow.mmd','docs/flows/24-analytics-flow.svg','docs/flows/24-analytics-flow.png','tests/contracts/analytics.test.mjs','tests/e2e/analytics.spec.ts'];
for(const f of files)assert.ok(fs.existsSync(path.join(root,f))&&fs.statSync(path.join(root,f)).size>80,`Missing ${f}`);
const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const previous=path.join(root,'../Bayan-Frontend-Screen-15-Report-Preview');
if(fs.existsSync(previous))for(const f of ['app/page.tsx','app/admin/page.tsx','app/globals.css','components/ChatView.tsx','components/AdminDashboard.tsx','components/Sidebar.tsx','design-references/chat-reference.png','design-references/admin-reference.png','app/reports/page.tsx','app/reports/detail/page.tsx','lib/reports/reports.ts','lib/reports/preview.ts'])assert.equal(hash(path.join(root,f)),hash(path.join(previous,f)),`Previous approved file modified: ${f}`);
const css=fs.readFileSync(path.join(root,'components/analytics/analytics.css'),'utf8');
for(const rule of [/\.ban\{/,/max-width:720px/,/max-width:1200px/,/focus-visible/,/prefers-reduced-motion/,/ban-table-wrapper/])assert.match(css,rule);
const code=fs.readFileSync(path.join(root,'components/analytics/AnalyticsScreen.tsx'),'utf8');
for(const rule of [/analytics.view/,/reports.export/,/TrendChart/,/facultyBreakdown/,/departmentBreakdown/,/Drawer/,/دراسية|أكاديمية|التوزيع/])assert.match(code,rule);
let count=0;
const scan=dir=>{for(const file of fs.readdirSync(dir,{withFileTypes:true})){
 const name=path.join(dir,file.name);if(file.isDirectory()){if(!['.next','node_modules','.git'].includes(file.name))scan(name);continue;}if(!/\.tsx?$/.test(file.name))continue;
 const source=ts.createSourceFile(name,fs.readFileSync(name,'utf8'),ts.ScriptTarget.Latest,true,name.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 assert.equal(source.parseDiagnostics.length,0,`TS syntax ${path.relative(root,name)}: ${source.parseDiagnostics.map(d=>ts.flattenDiagnosticMessageText(d.messageText,' ')).join('; ')}`);count++;
}};scan(root);console.log(`PASS Screen 16: ${count} TS/TSX parse clean; previous reference and reports files unchanged; new assets accounted for.`);
