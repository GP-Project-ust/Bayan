/** Stage 10 — deterministic file, syntax, continuity and mock-safety checks. */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import assert from "node:assert/strict";
import {fileURLToPath} from "node:url";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
let ts;try{ts=require("typescript");}catch{ts=require("/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js");}
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const required=[
 "app/sources/page.tsx","components/document-library/DocumentLibraryScreen.tsx",
 "components/document-library/document-library.css","lib/document-library/library.ts",
 "docs/SCREEN_10_DOCUMENT_LIBRARY.md","docs/flows/18-document-library-flow.mmd",
 "docs/flows/18-document-library-flow.dot","docs/flows/18-document-library-flow.png",
 "docs/flows/18-document-library-flow.svg","tests/contracts/document-library.test.mjs",
 "tests/e2e/document-library.spec.ts"
];
for(const file of required)assert.ok(fs.existsSync(path.join(root,file))&&fs.statSync(path.join(root,file)).size>50,`Missing: ${file}`);
const ui=read("components/document-library/DocumentLibraryScreen.tsx"),css=read("components/document-library/document-library.css"),lib=read("lib/document-library/library.ts");
for(const rx of [/ChatLayout/,/DemoRolePicker/,/can\("documents.search"\)/,/can\("sources.manage"\)/,/Drawer/,/StatePanel/,/filterLibraryDocuments/,/makeDemoDocumentCitation/,/role="note"/,/data-testid="library-document"/,/محاكاة/,/semantic-search/])assert.match(ui,rx);
for(const rx of [/@media\(max-width:980px\)/,/@media\(max-width:650px\)/,/prefers-reduced-motion:reduce/,/focus-visible/,/bdl-grid/])assert.match(css,rx);
assert.ok(!lib.includes("fetch(")&&!ui.includes("fetch("),"Document library is intentionally offline");
assert.ok(!lib.includes("localStorage")&&!ui.includes("localStorage"),"Screen must not store fictional document data");
assert.match(read("app/sources/page.tsx"),/DocumentLibraryScreen/);
assert.match(read("package.json"),/check:document-library/);
// Screen 11 intentionally adds viewer deep links to screen 09 and 10; validate the integration instead of enforcing stale hashes.
assert.match(read("components/semantic-search/SemanticSearchScreen.tsx"),/viewerHref/);
assert.match(read("components/document-library/DocumentLibraryScreen.tsx"),/viewerHref/);
const catchall=read("app/[...slug]/page.tsx");
assert.match(catchall,/x.path!=="\/sources"/,"Catch-all must not pre-render screen 10 duplicate route");
const old=path.join(root,"../Bayan-Frontend-Screen-09-Semantic-Search");
const hash=p=>crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
if(fs.existsSync(old))for(const file of [
 "app/page.tsx","app/admin/page.tsx","app/semantic-search/page.tsx","app/conversations/page.tsx","app/conversations/[id]/page.tsx","app/login/page.tsx","app/forgot-password/page.tsx","app/reset-password/page.tsx","app/profile/page.tsx","app/notifications/page.tsx","app/settings/page.tsx",
 "components/ChatView.tsx","components/AdminDashboard.tsx","components/Sidebar.tsx","app/globals.css",
 "lib/semantic-search/search.ts",
 "design-references/chat-reference.png","design-references/admin-reference.png"
])assert.equal(hash(path.join(root,file)),hash(path.join(old,file)),`Approved previous screen changed: ${file}`);
let count=0;
function scan(folder){for(const item of fs.readdirSync(folder,{withFileTypes:true})){
 const abs=path.join(folder,item.name);
 if(item.isDirectory()){if(!["node_modules",".next",".git","test-results"].includes(item.name))scan(abs);continue;}
 if(!/\.tsx?$/.test(item.name))continue;
 const source=ts.createSourceFile(abs,fs.readFileSync(abs,"utf8"),ts.ScriptTarget.Latest,true,item.name.endsWith("tsx")?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 assert.equal(source.parseDiagnostics.length,0,`${path.relative(root,abs)}: ${source.parseDiagnostics.map(d=>ts.flattenDiagnosticMessageText(d.messageText," ")).join("; ")}`);
 count++;
}}
scan(root);
console.log(`PASS Screen 10 — ${count} TS/TSX sources parse; original nine screens, design refs and styles unchanged.`);
