import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
let ts;
try{ts=require('typescript');}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');}
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const get=file=>fs.readFileSync(path.join(root,file),'utf8');
const exists=file=>fs.existsSync(path.join(root,file));
for(const file of [
 'app/conversations/page.tsx','components/conversations/ConversationsScreen.tsx','components/conversations/conversations.css',
 'lib/conversations/conversations.ts','tests/contracts/conversations.test.mjs','tests/e2e/conversations.spec.ts',
 'docs/SCREEN_07_CONVERSATIONS.md','docs/flows/15-conversations-flow.mmd','docs/flows/15-conversations-flow.png',
])assert.ok(exists(file),`Missing required screen-07 artifact: ${file}`);
const ui=get('components/conversations/ConversationsScreen.tsx');
const css=get('components/conversations/conversations.css');
assert.match(get('app/conversations/page.tsx'),/ConversationsScreen/);
assert.match(get('app/\[...slug\]/page.tsx'),/x\.path!=="\/conversations"/);
assert.match(get('components/Sidebar.tsx'),/href="\/conversations" className="history-title"/);
for(const token of [/ChatLayout/,/Drawer/,/Dialog/,/DemoRolePicker/,/localStorage/,/aria-live/,/role="status"/,/sendFollowup/,/confirmDelete/,/saveRename/,/toggleConversationStar/,/demoConversations/])assert.match(ui,token);
for(const token of [/focus-visible/,/@media\(max-width:760px\)/,/prefers-reduced-motion/,/kind-documents/,/bayan-conv-empty/])assert.match(css,token);
assert.ok(!ui.includes('fetch('),'Mock conversation history should not contact APIs.');
assert.ok(!ui.includes('document.cookie'),'Must not touch auth cookies.');
assert.match(get('package.json'),/check:conversations/);
const protectedFiles=[
 'app/page.tsx','app/admin/page.tsx','app/login/page.tsx','app/forgot-password/page.tsx',
 'app/reset-password/page.tsx','app/profile/page.tsx','app/notifications/page.tsx','app/settings/page.tsx',
 'components/ChatView.tsx','components/AdminDashboard.tsx','components/TopBar.tsx',
 'components/profile/ProfileScreen.tsx','components/notifications/NotificationsScreen.tsx','components/settings/SettingsScreen.tsx',
 'components/profile/profile.css','components/notifications/notifications.css','components/settings/settings.css',
 'app/globals.css','design-references/chat-reference.png','design-references/admin-reference.png',
];
const old='/mnt/data/Bayan-Frontend-Screen-06-Settings';
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
if(fs.existsSync(old))for(const file of protectedFiles){
 assert.ok(exists(file),`Protected screen missing: ${file}`);
 assert.equal(hash(path.join(root,file)),hash(path.join(old,file)),`Approved source was modified: ${file}`);
}
// Sidebar change is exactly one heading link. Layout, CSS and chat demonstration must be untouched.
if(fs.existsSync(path.join(old,'components/Sidebar.tsx'))){
 const previous=fs.readFileSync(path.join(old,'components/Sidebar.tsx'),'utf8');
 const expected=previous.replace('<div className="history-title"><Clock3 size={24}/> المحادثات السابقة</div>',
   '<Link href="/conversations" className="history-title" onClick={onNavigate} aria-label="فتح سجل المحادثات السابقة"><Clock3 size={24}/> المحادثات السابقة</Link>');
 assert.equal(get('components/Sidebar.tsx'),expected,'Unexpected change to approved sidebar');
}
let checked=0;
function walk(folder){for(const d of fs.readdirSync(folder,{withFileTypes:true})){
 if(d.isDirectory()){if(!new Set(['.next','node_modules','.git']).has(d.name))walk(path.join(folder,d.name));continue;}
 if(!/\.(?:tsx?|jsx?)$/.test(d.name))continue;
 const file=path.join(folder,d.name),kind=file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS;
 const source=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true,kind);
 assert.equal(source.parseDiagnostics.length,0,`Parse error ${path.relative(root,file)}: ${source.parseDiagnostics.map(d=>ts.flattenDiagnosticMessageText(d.messageText,' ')).join(' ; ')}`);
 checked++;
}}
walk(root);
console.log(`Screen 07 conversations structural checks PASS; ${checked} JS/TS files parsed.`);
console.log('Approved chat/admin/account and CSS references unchanged; Next.js runtime QA still required.');
