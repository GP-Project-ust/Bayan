import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import assert from "node:assert/strict";
import {fileURLToPath} from "node:url";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url),root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
let ts;try{ts=require("typescript");}catch{ts=require("/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js");}
const required=["app/reports/page.tsx","components/reports/ReportsCenterScreen.tsx","components/reports/reports-center.css","lib/reports/reports.ts","tests/contracts/reports.test.mjs","tests/e2e/reports.spec.ts","docs/SCREEN_13_REPORTS_CENTER.md","docs/flows/21-reports-center-flow.mmd","docs/flows/21-reports-center-flow.png","docs/flows/21-reports-center-flow.svg"];
for(const relative of required)assert.ok(fs.existsSync(path.join(root,relative))&&fs.statSync(path.join(root,relative)).size>50,`Missing ${relative}`);
const read=f=>fs.readFileSync(path.join(root,f),"utf8");
const screen=read("components/reports/ReportsCenterScreen.tsx"),logic=read("lib/reports/reports.ts"),css=read("components/reports/reports-center.css");
for(const re of [/DemoAccessProvider/,/can\("reports.view"\)/,/can\("reports.create"\)/,/can\("reports.export"\)/,/filterReports/,/makeDemoReportCsv/,/Drawer/,/StatePanel/,/تجريبية/,/report-row/,/reports\/new/])assert.match(screen,re);
for(const re of [/@media\(max-width:980px\)/,/@media\(max-width:650px\)/,/focus-visible/,/prefers-reduced-motion/,/brc-stats/])assert.match(css,re);
assert.ok(!logic.includes("fetch(")&&!screen.includes("fetch("));
assert.ok(!logic.includes("localStorage")&&!screen.includes("localStorage"));
assert.match(read("app/[...slug]/page.tsx"),/x.path!=="\/reports"/);
const old=path.resolve(root,"../Bayan-Frontend-Screen-12-Document-Upload"),hash=p=>crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
if(fs.existsSync(old))for(const f of ["app/page.tsx","app/admin/page.tsx","app/sources/page.tsx","app/sources/upload/page.tsx","app/sources/document/page.tsx","app/semantic-search/page.tsx","app/login/page.tsx","components/ChatView.tsx","components/AdminDashboard.tsx","components/Sidebar.tsx","app/globals.css","design-references/chat-reference.png","design-references/admin-reference.png"]){assert.equal(hash(path.join(old,f)),hash(path.join(root,f)),`Approved file changed: ${f}`);}
let count=0;function scan(dir){for(const item of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,item.name);if(item.isDirectory()){if(!["node_modules",".next",".git"].includes(item.name))scan(p);continue;}if(!/\.tsx?$/.test(item.name))continue;const source=ts.createSourceFile(p,fs.readFileSync(p,"utf8"),ts.ScriptTarget.Latest,true,item.name.endsWith("tsx")?ts.ScriptKind.TSX:ts.ScriptKind.TS);assert.equal(source.parseDiagnostics.length,0,`${path.relative(root,p)} ${source.parseDiagnostics.map(d=>ts.flattenDiagnosticMessageText(d.messageText," ")).join("; ")}`);count++;}}
scan(root);console.log(`PASS Screen 13: ${count} TS/TSX source files parse, unchanged approved layouts and reference images.`);
