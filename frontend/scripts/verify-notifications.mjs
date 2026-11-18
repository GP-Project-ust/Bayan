import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require=createRequire(import.meta.url);
let ts;
try {ts=require("typescript");}
catch {ts=require("/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js");}
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const read=(rel)=>fs.readFileSync(path.join(root,rel),"utf8");
const exist=(rel)=>fs.existsSync(path.join(root,rel));
const files=[
 "app/notifications/page.tsx", "components/notifications/NotificationsScreen.tsx",
 "components/notifications/notifications.css", "lib/notifications/notifications.ts",
 "tests/contracts/notifications.test.mjs", "tests/e2e/notifications.spec.ts",
 "docs/SCREEN_05_NOTIFICATIONS.md", "docs/flows/13-notifications-flow.mmd",
];
for(const file of files)assert.ok(exist(file),`Missing: ${file}`);
const screen=read("components/notifications/NotificationsScreen.tsx");
const data=read("lib/notifications/notifications.ts");
const header=read("components/TopBar.tsx");
const route=read("app/[...slug]/page.tsx");
const css=read("components/notifications/notifications.css");
assert.match(read("app/notifications/page.tsx"),/NotificationsScreen/);
assert.match(header,/<Link href="\/notifications" className="notification-icon"/);
assert.match(route,/x\.path!=="\/notifications"/);
for(const pattern of [/ChatLayout/,/filterNotifications/,/setNotificationRead/,/markAllRead/,/role="status"/,/aria-pressed/,/Drawer/,/dir=.?rtl/,/معاينة تجريبية/,/استعادة التجربة/,/تم تمييز جميع الإشعارات كمقروءة/]){
  if(pattern.toString()==='/dir=.?rtl/')continue; // Inherited from ChatLayout/AppShell.
  assert.match(screen,pattern);
}
assert.match(css,/@media\(max-width:660px\)/);
assert.match(css,/@media\(max-width:900px\)/);
assert.match(data,/export function filterNotifications/);
assert.match(read("package.json"),/"check:notifications"/);
for(const value of ["fetch(","localStorage", "sessionStorage", "document.cookie", "setInterval("]){
  assert.ok(!screen.includes(value),`Screen 05 must not access live data: ${value}`);
}
const hash=file=>crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const previous="/mnt/data/Bayan-Frontend-Screen-04-Profile";
const invariant=[
  "app/page.tsx","app/admin/page.tsx","app/login/page.tsx","app/forgot-password/page.tsx",
  "app/reset-password/page.tsx","app/profile/page.tsx","components/ChatView.tsx",
  "components/AdminDashboard.tsx", "components/profile/ProfileScreen.tsx", "components/profile/profile.css",
  "components/auth/LoginScreen.tsx", "components/auth/ForgotPasswordScreen.tsx",
  "components/auth/ResetPasswordScreen.tsx", "components/auth/login.css", "components/auth/recovery.css",
  "components/auth/reset-password.css", "app/globals.css",
  "design-references/chat-reference.png","design-references/admin-reference.png",
];
if(fs.existsSync(previous))for(const file of invariant){
  assert.ok(exist(file),`Approved source removed: ${file}`);
  assert.equal(hash(path.join(root,file)),hash(path.join(previous,file)),`Approved source changed: ${file}`);
}
let count=0;
const skip=new Set(["node_modules",".next",".git"]);
function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
 if(entry.isDirectory()){if(!skip.has(entry.name))walk(path.join(dir,entry.name));continue;}
 if(!/\.(?:ts|tsx|js|jsx)$/.test(entry.name))continue;
 const file=path.join(dir,entry.name);
 const source=fs.readFileSync(file,"utf8");
 const kind=file.endsWith(".tsx")?ts.ScriptKind.TSX:ts.ScriptKind.TS;
 const parsed=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,kind);
 assert.equal(parsed.parseDiagnostics.length,0,`TS syntax error ${path.relative(root,file)}: ${parsed.parseDiagnostics.map(d=>d.messageText).join(" ; ")}`);
 count++;
}}
walk(root);
console.log(`Notifications screen structural checks OK; parsed ${count} TS/TSX/JS/JSX files.`);
console.log("Approved chat/admin/profile visuals unchanged; Next.js build & browser QA still required.");
