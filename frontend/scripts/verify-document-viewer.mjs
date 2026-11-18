/** Screen 11 — project structure, source AST, scope and baseline checks. */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import assert from "node:assert/strict";
import {fileURLToPath} from "node:url";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
let ts;try{ts=require("typescript");}catch{ts=require("/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js");}
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const needed=[
 "app/sources/document/page.tsx","components/document-viewer/DocumentViewerScreen.tsx",
 "components/document-viewer/document-viewer.css","lib/document-viewer/viewer.ts",
 "docs/SCREEN_11_DOCUMENT_VIEWER.md","docs/flows/19-document-viewer-flow.mmd",
 "docs/flows/19-document-viewer-flow.dot","docs/flows/19-document-viewer-flow.png",
 "docs/flows/19-document-viewer-flow.svg","tests/contracts/document-viewer.test.mjs",
 "tests/e2e/document-viewer.spec.ts"
];
for(const p of needed)assert.ok(fs.existsSync(path.join(root,p))&&fs.statSync(path.join(root,p)).size>60,`Missing ${p}`);
const viewer=read("components/document-viewer/DocumentViewerScreen.tsx"),model=read("lib/document-viewer/viewer.ts"),css=read("components/document-viewer/document-viewer.css");
for(const regex of [/ChatLayout/,/DemoAccessProvider/,/can\("documents.search"\)/,/can\("citations.view"\)/,/getPageCitation/,/parseDocumentPage/,/getDemoDocument/,/BookOpenCheck/,/role="note"/,/data-testid="viewer-paper"/,/PDF الأصلي غير متاح/,/لا تتوفر بيانات نصية لهذه الصفحة/])assert.match(viewer,regex);
for(const regex of [/@media\(max-width:980px\)/,/@media\(max-width:650px\)/,/prefers-reduced-motion:reduce/,/focus-visible/,/bdv-layout/])assert.match(css,regex);
assert.ok(!viewer.includes("fetch(")&&!model.includes("fetch("),"Viewer remains an offline demo");
assert.match(read("app/sources/document/page.tsx"),/DocumentViewerScreen/);
assert.match(read("app\/\[\.\.\.slug\]\/page.tsx"),/x.path!=="\/sources\/document"/);
assert.match(read("components/document-library/DocumentLibraryScreen.tsx"),/viewerHref/);
assert.match(read("components/semantic-search/SemanticSearchScreen.tsx"),/viewerHref/);
assert.match(read("package.json"),/check:document-viewer/);
const previous=path.join(root,"../Bayan-Frontend-Screen-10-Document-Library");
const hash=p=>crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
if(fs.existsSync(previous))for(const filename of [
 "app/page.tsx","app/admin/page.tsx","app/sources/page.tsx","app/semantic-search/page.tsx",
 "app/conversations/page.tsx","app/conversations/[id]/page.tsx","app/login/page.tsx",
 "app/forgot-password/page.tsx","app/reset-password/page.tsx","app/profile/page.tsx",
 "app/notifications/page.tsx","app/settings/page.tsx","components/ChatView.tsx",
 "components/AdminDashboard.tsx","components/Sidebar.tsx","app/globals.css",
 "lib/document-library/library.ts","lib/semantic-search/search.ts",
 "design-references/chat-reference.png","design-references/admin-reference.png"
])assert.equal(hash(path.join(root,filename)),hash(path.join(previous,filename)),`Unexpected change: ${filename}`);
let count=0;
function scan(folder){for(const item of fs.readdirSync(folder,{withFileTypes:true})){
 const pathname=path.join(folder,item.name);
 if(item.isDirectory()){if(!["node_modules",".next",".git","test-results"].includes(item.name))scan(pathname);continue;}
 if(!/\.tsx?$/.test(item.name))continue;
 const source=ts.createSourceFile(pathname,fs.readFileSync(pathname,"utf8"),ts.ScriptTarget.Latest,true,item.name.endsWith("tsx")?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 assert.equal(source.parseDiagnostics.length,0,`${path.relative(root,pathname)}: ${source.parseDiagnostics.map(d=>ts.flattenDiagnosticMessageText(d.messageText," ")).join("; ")}`);
 count++;
}}
scan(root);
console.log(`PASS Screen 11 — ${count} TypeScript/TSX files parse; reference screens and global stylesheet preserved, navigation integrated.`);
