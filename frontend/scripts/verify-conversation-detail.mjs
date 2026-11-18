import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {fileURLToPath} from "node:url";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
let ts;try{ts=require("typescript");}catch{ts=require("/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js");}
const get=p=>fs.readFileSync(path.join(root,p),"utf8");
const need=["app/conversations/[id]/page.tsx","components/conversation-detail/ConversationDetailsScreen.tsx","components/conversation-detail/detail.css","lib/conversation-detail/detail.ts","docs/SCREEN_08_CONVERSATION_DETAILS.md","docs/flows/16-conversation-detail-flow.mmd","docs/flows/16-conversation-detail-flow.png","tests/e2e/conversation-detail.spec.ts","tests/contracts/conversation-detail.test.mjs"];
need.forEach(p=>assert.ok(fs.existsSync(path.join(root,p)),`Missing ${p}`));
const page=get("app/conversations/[id]/page.tsx"),ui=get("components/conversation-detail/ConversationDetailsScreen.tsx"),css=get("components/conversation-detail/detail.css"),archive=get("components/conversations/ConversationsScreen.tsx");
for(const s of [/params:Promise/,/ConversationDetailsScreen/,/metadata/])assert.match(page,s);
for(const s of [/ChatLayout/,/DemoRolePicker/,/SQLViewer/,/CitationCard/,/AgentTraceViewer/,/MessageBubble/,/getDemoConversation/,/can\("sql.inspect"\)/,/can\("traces.view"\)/,/can\("citations.view"\)/,/localStorage/,/confirmDelete/,/copyTranscript/,/submitFollowup/,/role="tablist"/,/aria-selected/])assert.match(ui,s);
for(const s of [/focus-visible/,/@media\(max-width:650px\)/,/prefers-reduced-motion/,/bcd-columns/,/bcd-message-list/])assert.match(css,s);
assert.match(archive,/href=\{`\/conversations\/\$\{encodeURIComponent\(item.id\)\}`\}/);
assert.ok(!ui.includes("fetch(")&&!ui.includes("document.cookie"));
assert.match(get("package.json"),/check:conversation-detail/);
const old="/mnt/data/Bayan-Frontend-Screen-07-Conversations";
const hash=p=>crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
if(fs.existsSync(old)) for(const p of ["app/page.tsx","app/admin/page.tsx","app/login/page.tsx","app/forgot-password/page.tsx","app/reset-password/page.tsx","app/profile/page.tsx","app/notifications/page.tsx","app/settings/page.tsx","components/ChatView.tsx","components/AdminDashboard.tsx","components/Sidebar.tsx","app/globals.css","design-references/chat-reference.png","design-references/admin-reference.png","lib/conversations/conversations.ts"]){
 assert.equal(hash(path.join(root,p)),hash(path.join(old,p)),`Approved file changed unexpectedly ${p}`);
}
let count=0;
function scan(folder){for(const e of fs.readdirSync(folder,{withFileTypes:true})){
 if(e.isDirectory()){if(!["node_modules",".next",".git"].includes(e.name))scan(path.join(folder,e.name));continue;}
 if(!/\.(ts|tsx)$/.test(e.name))continue;
 const name=path.join(folder,e.name);const source=ts.createSourceFile(name,fs.readFileSync(name,"utf8"),ts.ScriptTarget.Latest,true,e.name.endsWith("tsx")?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 assert.equal(source.parseDiagnostics.length,0,`TS parse error in ${path.relative(root,name)}`);count++;
}}
scan(root);
console.log(`PASS Screen 08 static checks: ${count} TS/TSX files parsed; original pages/images unchanged.`);
