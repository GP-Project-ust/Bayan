/** Screen 09 deterministic structural and syntax checks. No npm packages needed. */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import assert from "node:assert/strict";
import {fileURLToPath} from "node:url";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
let ts;try{ts=require("typescript");}catch{ts=require("/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js");}
const get=p=>fs.readFileSync(path.join(root,p),"utf8");
const required=["app/semantic-search/page.tsx","components/semantic-search/SemanticSearchScreen.tsx","components/semantic-search/semantic-search.css","lib/semantic-search/search.ts","docs/SCREEN_09_SEMANTIC_SEARCH.md","docs/flows/17-semantic-search-flow.dot","docs/flows/17-semantic-search-flow.png","docs/flows/17-semantic-search-flow.svg","tests/contracts/semantic-search.test.mjs","tests/e2e/semantic-search.spec.ts"];
for(const file of required)assert.ok(fs.existsSync(path.join(root,file))&&fs.statSync(path.join(root,file)).size>50,`Missing ${file}`);
const ui=get("components/semantic-search/SemanticSearchScreen.tsx"),css=get("components/semantic-search/semantic-search.css"),logic=get("lib/semantic-search/search.ts");
for(const rex of [/ChatLayout/,/DemoRolePicker/,/can\("documents.search"\)/,/can\("citations.view"\)/,/Drawer/,/StatePanel/,/searchDemoSnippets/,/makeCitation/,/role="note"/,/aria-invalid/,/data-testid="semantic-result"/,/الصفحة/,/Qdrant/])assert.match(ui,rex);
for(const rex of [/@media\(max-width:950px\)/,/@media\(max-width:650px\)/,/prefers-reduced-motion:reduce/,/focus-visible/,/bss-workspace/])assert.match(css,rex);
assert.ok(!ui.includes("fetch(")&&!logic.includes("fetch("),"Screen 09 is intentionally offline");
assert.match(get("package.json"),/check:semantic-search/);
const old=path.join(root,"../Bayan-Frontend-Screen-08-Conversation-Details");
const hash=p=>crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
if(fs.existsSync(old))for(const file of ["app/page.tsx","app/admin/page.tsx","app/conversations/page.tsx","app/conversations/[id]/page.tsx","app/login/page.tsx","app/forgot-password/page.tsx","app/reset-password/page.tsx","app/profile/page.tsx","app/notifications/page.tsx","app/settings/page.tsx","components/ChatView.tsx","components/AdminDashboard.tsx","components/Sidebar.tsx","app/globals.css","design-references/chat-reference.png","design-references/admin-reference.png"]){
 assert.equal(hash(path.join(root,file)),hash(path.join(old,file)),`Approved screen modified: ${file}`);
}
let count=0;
function scan(dir){for(const f of fs.readdirSync(dir,{withFileTypes:true})){
 const abs=path.join(dir,f.name);
 if(f.isDirectory()){if(!["node_modules",".next",".git"].includes(f.name))scan(abs);continue;}
 if(!/\.tsx?$/.test(f.name))continue;
 const source=ts.createSourceFile(abs,fs.readFileSync(abs,"utf8"),ts.ScriptTarget.Latest,true,f.name.endsWith("tsx")?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 assert.equal(source.parseDiagnostics.length,0,`${path.relative(root,abs)}: ${source.parseDiagnostics.map(x=>ts.flattenDiagnosticMessageText(x.messageText," ")).join("; ")}`);count++;
}}
scan(root);
console.log(`PASS Screen 09 — ${count} TS/TSX files parsed; 08 previous screens, reference images and styles unchanged.`);
