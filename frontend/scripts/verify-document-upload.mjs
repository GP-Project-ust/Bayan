/** Screen 12 source structure and baseline integrity checks. */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {fileURLToPath} from "node:url";
const require=createRequire(import.meta.url);
let ts;try{ts=require("typescript");}catch{ts=require("/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js");}
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const required=[
 "app/sources/upload/page.tsx","components/document-upload/DocumentUploadScreen.tsx",
 "components/document-upload/document-upload.css","lib/document-upload/upload.ts",
 "docs/SCREEN_12_DOCUMENT_UPLOAD.md","docs/flows/20-document-upload-flow.mmd",
 "docs/flows/20-document-upload-flow.dot","docs/flows/20-document-upload-flow.png",
 "docs/flows/20-document-upload-flow.svg","tests/contracts/document-upload.test.mjs",
 "tests/e2e/document-upload.spec.ts"
];
for(const p of required)assert.ok(fs.existsSync(path.join(root,p))&&fs.statSync(path.join(root,p)).size>60,`Missing ${p}`);
const ui=read("components/document-upload/DocumentUploadScreen.tsx"),model=read("lib/document-upload/upload.ts"),css=read("components/document-upload/document-upload.css");
for(const pattern of [/DemoAccessProvider/,/can\("sources.manage"\)/,/ChatLayout/,/Drawer/,/Dialog/,/setInterval\(/,/clearInterval\(/,/onDrop=\{onDrop\}/,/role="note"/,/data-testid="document-upload-screen"/,/لم تُضف إلى المكتبة أو Qdrant/])assert.match(ui,pattern);
for(const pattern of [/validateUploadFile/,/MAX_FILE_BYTES/,/MAX_BATCH_FILES/,/validateMetadata/,/nextSimulationStage/,/queueStats/])assert.match(model,pattern);
for(const pattern of [/@media\(max-width:1040px\)/,/@media\(max-width:700px\)/,/prefers-reduced-motion:reduce/,/focus-visible/,/bdu-main-grid/])assert.match(css,pattern);
assert.ok(!ui.includes("fetch(")&&!ui.includes("XMLHttpRequest"),"Must not upload in demo");
assert.match(read("components/document-library/DocumentLibraryScreen.tsx"),/href="\/sources\/upload"/);
assert.doesNotMatch(read("components/document-library/DocumentLibraryScreen.tsx"),/واجهة لاحقة/);
assert.match(read("package.json"),/check:document-upload/);
assert.match(read("app/[...slug]/page.tsx"),/x.path!=="\/sources\/upload"/);
const previous=path.join(root,"../Bayan-Frontend-Screen-11-Document-Viewer");
const hash=p=>crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
if(fs.existsSync(previous))for(const filename of [
 "app/page.tsx","app/admin/page.tsx","app/sources/page.tsx","app/semantic-search/page.tsx",
 "app/conversations/page.tsx","app/conversations/[id]/page.tsx","app/login/page.tsx",
 "app/forgot-password/page.tsx","app/reset-password/page.tsx","app/profile/page.tsx",
 "app/notifications/page.tsx","app/settings/page.tsx","components/ChatView.tsx",
 "components/AdminDashboard.tsx","components/Sidebar.tsx","app/globals.css",
 "lib/document-library/library.ts","lib/document-viewer/viewer.ts","lib/semantic-search/search.ts",
 "design-references/chat-reference.png","design-references/admin-reference.png"
 ])assert.equal(hash(path.join(root,filename)),hash(path.join(previous,filename)),`Unexpected change: ${filename}`);
let count=0;function scan(folder){for(const item of fs.readdirSync(folder,{withFileTypes:true})){
 const pathname=path.join(folder,item.name);
 if(item.isDirectory()){if(!["node_modules",".next",".git","test-results"].includes(item.name))scan(pathname);continue;}
 if(!/\.tsx?$/.test(item.name))continue;
 const source=ts.createSourceFile(pathname,fs.readFileSync(pathname,"utf8"),ts.ScriptTarget.Latest,true,item.name.endsWith("tsx")?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 assert.equal(source.parseDiagnostics.length,0,`${path.relative(root,pathname)}: ${source.parseDiagnostics.map(d=>ts.flattenDiagnosticMessageText(d.messageText," ")).join("; ")}`);count++;
}}
scan(root);
console.log(`PASS Screen 12 — ${count} TS/TSX files parse, reference screens and styles preserved; upload UI is an explicit offline demo.`);
