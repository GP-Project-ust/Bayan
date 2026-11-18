import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import assert from "node:assert/strict";
import {fileURLToPath} from "node:url";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url),root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
let ts;try{ts=require("typescript");}catch{ts=require("/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js");}
const required=["app/reports/new/page.tsx","components/report-builder/ReportBuilderScreen.tsx","components/report-builder/report-builder.css","lib/reports/builder.ts","tests/contracts/report-builder.test.mjs","tests/e2e/report-builder.spec.ts","docs/SCREEN_14_SMART_REPORT_BUILDER.md","docs/flows/22-smart-report-builder-flow.mmd","docs/flows/22-smart-report-builder-flow.png","docs/flows/22-smart-report-builder-flow.svg"];
for(const f of required)assert.ok(fs.existsSync(path.join(root,f))&&fs.statSync(path.join(root,f)).size>80,`Missing: ${f}`);
const read=f=>fs.readFileSync(path.join(root,f),"utf8");
const ui=read("components/report-builder/ReportBuilderScreen.tsx"),css=read("components/report-builder/report-builder.css"),lib=read("lib/reports/builder.ts");
for(const re of [/DemoAccessProvider/,/can\("reports.create"\)/,/createDemoDraftJson/,/validateStep/,/selectMetric/,/sourceCatalog/,/ReportBuilderBody/,/Dialog/,/StatePanel/,/لم يُنشأ/,/report-builder-complete/,/تجريبي/])assert.match(ui,re);
for(const re of [/@media\(max-width:690px\)/,/@media\(max-width:1020px\)/,/focus-visible/,/prefers-reduced-motion/,/brb-columns/,/brb-steps/])assert.match(css,re);
for(const re of [/validateBuilder/,/selectSource/,/metricCatalog/,/sourceCatalog/,/validDate/,/createDemoDraftJson/])assert.match(lib,re);
assert.doesNotMatch(ui,/fetch\s*\(|localStorage|sessionStorage/);
assert.match(read("app/[...slug]/page.tsx"),/x.path!=="\/reports\/new"/);
assert.match(read("components/reports/ReportsCenterScreen.tsx"),/href="\/reports\/new"/);
const old=path.resolve(root,"../Bayan-Frontend-Screen-13-Reports-Center"),hash=p=>crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
if(fs.existsSync(old))for(const f of ["app/page.tsx","app/admin/page.tsx","app/reports/page.tsx","app/sources/page.tsx","app/sources/upload/page.tsx","app/semantic-search/page.tsx","app/globals.css","components/ChatView.tsx","components/AdminDashboard.tsx","components/Sidebar.tsx","components/reports/reports-center.css","lib/reports/reports.ts","design-references/chat-reference.png","design-references/admin-reference.png"]){assert.equal(hash(path.join(old,f)),hash(path.join(root,f)),`Approved content changed: ${f}`);}
let count=0;function scan(dir){for(const item of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,item.name);if(item.isDirectory()){if(!["node_modules",".next",".git"].includes(item.name))scan(p);continue;}if(!/\.tsx?$/.test(item.name))continue;const source=ts.createSourceFile(p,fs.readFileSync(p,"utf8"),ts.ScriptTarget.Latest,true,item.name.endsWith("tsx")?ts.ScriptKind.TSX:ts.ScriptKind.TS);assert.equal(source.parseDiagnostics.length,0,`${path.relative(root,p)} ${source.parseDiagnostics.map(d=>ts.flattenDiagnosticMessageText(d.messageText," ")).join("; ")}`);count++;}}
scan(root);console.log(`PASS Screen 14: ${count} TS/TSX sources parse and approved original files are unchanged.`);
