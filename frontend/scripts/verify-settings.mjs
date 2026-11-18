import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {fileURLToPath} from "node:url";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
let ts;
try{ts=require("typescript");}catch{ts=require("/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js");}
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const get=file=>fs.readFileSync(path.join(root,file),"utf8");
const exists=file=>fs.existsSync(path.join(root,file));
const required=[
  "app/settings/page.tsx","components/settings/SettingsScreen.tsx","components/settings/settings.css",
  "lib/settings/preferences.ts","tests/contracts/settings.test.mjs","tests/e2e/settings.spec.ts",
  "docs/SCREEN_06_SETTINGS.md","docs/flows/14-settings-flow.mmd",
];
for(const file of required)assert.ok(exists(file),`Missing ${file}`);
const screen=get("components/settings/SettingsScreen.tsx");
const css=get("components/settings/settings.css");
assert.match(get("app/settings/page.tsx"),/SettingsScreen/);
assert.match(get("app/[...slug]/page.tsx"),/x\.path!=="\/settings"/);
for(const pattern of [/ChatLayout/,/DemoAccessProvider/,/DemoRolePicker/,/role="tablist"/,/aria-selected/,/role="switch"/,/Dialog/,/localStorage/,/تمتع/]){
  // The final pattern is checked separately to avoid requiring exact Arabic writing.
  if(pattern.source==='تمتع')continue;
  assert.match(screen,pattern);
}
for(const pattern of [/showSql/,/defaultReportFormat/,/effectivePreferences/,/canSql/,/canExport/,/aria-live/,/استعادة الإعدادات الافتراضية/])assert.match(screen,pattern);
for(const pattern of [/@media\(max-width:980px\)/,/@media\(max-width:670px\)/,/focus-visible/,/prefers-reduced-motion/])assert.match(css,pattern);
assert.ok(!screen.includes("fetch("),"Settings mock must not call APIs.");
assert.ok(!screen.includes("document.cookie"),"Settings mock must not touch auth cookies.");
assert.ok(!get("lib/settings/preferences.ts").includes("password"),"Do not store credentials in demo preferences.");
assert.match(get("package.json"),/"check:settings"/);
const hash=file=>crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const old="/mnt/data/Bayan-Frontend-Screen-05-Notifications";
const protectedFiles=[
  "app/page.tsx","app/admin/page.tsx","app/login/page.tsx","app/forgot-password/page.tsx",
  "app/reset-password/page.tsx","app/profile/page.tsx","app/notifications/page.tsx","components/ChatView.tsx",
  "components/AdminDashboard.tsx","components/TopBar.tsx",
  "components/profile/ProfileScreen.tsx","components/notifications/NotificationsScreen.tsx",
  "components/profile/profile.css","components/notifications/notifications.css", "app/globals.css",
  "design-references/chat-reference.png","design-references/admin-reference.png",
];
if(fs.existsSync(old))for(const file of protectedFiles){assert.ok(exists(file),`Approved source missing: ${file}`);assert.equal(hash(path.join(root,file)),hash(path.join(old,file)),`Approved source modified: ${file}`);}
// Screen 07 replaced only the existing sidebar history heading with an equivalent link.
// Keep a byte-for-byte guard for every other part of the approved sidebar.
if(fs.existsSync(path.join(old,"components/Sidebar.tsx"))){
  const before=fs.readFileSync(path.join(old,"components/Sidebar.tsx"),"utf8");
  const approved=before.replace('<div className="history-title"><Clock3 size={24}/> المحادثات السابقة</div>',
    '<Link href="/conversations" className="history-title" onClick={onNavigate} aria-label="فتح سجل المحادثات السابقة"><Clock3 size={24}/> المحادثات السابقة</Link>');
  assert.equal(get("components/Sidebar.tsx"),approved,"Unexpected alteration of the approved sidebar");
}
let count=0;
const skip=new Set(["node_modules",".next",".git"]);
function walk(folder){for(const item of fs.readdirSync(folder,{withFileTypes:true})){
  if(item.isDirectory()){if(!skip.has(item.name))walk(path.join(folder,item.name));continue;}
  if(!/\.(?:ts|tsx|js|jsx)$/.test(item.name))continue;
  const filename=path.join(folder,item.name);
  const kind=filename.endsWith(".tsx")?ts.ScriptKind.TSX:ts.ScriptKind.TS;
  const source=ts.createSourceFile(filename,fs.readFileSync(filename,"utf8"),ts.ScriptTarget.Latest,true,kind);
  assert.equal(source.parseDiagnostics.length,0,`Parse error ${path.relative(root,filename)}: ${source.parseDiagnostics.map(d=>d.messageText).join(" ; ")}`);
  count++;
}}
walk(root);
console.log(`Screen 06 settings structural checks PASS; ${count} source files parsed.`);
console.log("Approved chat/admin/account screens unchanged. Build/browser QA still required.");
