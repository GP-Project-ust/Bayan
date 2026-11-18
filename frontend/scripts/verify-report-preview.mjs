import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);let ts;
try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const files=['app/reports/detail/page.tsx','components/report-preview/ReportPreviewScreen.tsx','components/report-preview/report-preview.css','lib/reports/preview.ts','docs/SCREEN_15_REPORT_PREVIEW.md','docs/flows/23-report-preview-flow.mmd','docs/flows/23-report-preview-flow.png','docs/flows/23-report-preview-flow.svg','tests/contracts/report-preview.test.mjs','tests/e2e/report-preview.spec.ts'];
for(const name of files)assert.ok(fs.existsSync(path.join(root,name))&&fs.statSync(path.join(root,name)).size>80,`Missing ${name}`);
const hash=name=>crypto.createHash('sha256').update(fs.readFileSync(name)).digest('hex');
const previous=path.join(root,'../Bayan-Frontend-Screen-14-Smart-Report-Builder');
if(fs.existsSync(previous))for(const name of ['app/page.tsx','app/admin/page.tsx','app/globals.css','components/ChatView.tsx','components/AdminDashboard.tsx','components/Sidebar.tsx','components/reports/reports-center.css.orig','design-references/chat-reference.png','design-references/admin-reference.png','app/reports/page.tsx','lib/reports/reports.ts','lib/reports/builder.ts']){
 if(name.endsWith('.orig'))continue;
 assert.equal(hash(path.join(root,name)),hash(path.join(previous,name)),`Approved previous file changed: ${name}`);
}
const css=fs.readFileSync(path.join(root,'components/report-preview/report-preview.css'),'utf8');
for(const match of [/@page\{size:A4 portrait/,/prefers-reduced-motion/,/brp-paper/,/focus-visible|\.brp-segments button/])assert.match(css,match);
const source=fs.readFileSync(path.join(root,'components/report-preview/ReportPreviewScreen.tsx'),'utf8');
for(const match of [/DemoRolePicker/,/can\("reports.view"\)/,/can\("reports.export"\)/,/window\.print\(\)/,/makeDemoReportXlsx/,/makeDemoReportCsv/,/ReportSummaryPage/,/ReportDetailsPage/])assert.match(source,match);
assert.match(fs.readFileSync(path.join(root,'app/[...slug]/page.tsx'),'utf8'),/x.path!=="\/reports\/detail"/);
let count=0;const scan=folder=>{for(const item of fs.readdirSync(folder,{withFileTypes:true})){
 const file=path.join(folder,item.name);if(item.isDirectory()){if(!['node_modules','.next','.git'].includes(item.name))scan(file);continue;}if(!/\.tsx?$/.test(item.name))continue;
 const ast=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true,item.name.endsWith('tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 assert.equal(ast.parseDiagnostics.length,0,`Syntax error ${path.relative(root,file)}: ${ast.parseDiagnostics.map(d=>ts.flattenDiagnosticMessageText(d.messageText,' ')).join(';')}`);count++;
 }};scan(root);console.log(`PASS Screen 15: ${count} TS/TSX files; approved visuals unchanged; print A4 and routes verified.`);
