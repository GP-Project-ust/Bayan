import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
let ts;
try { ts = require("typescript"); }
catch {
  try { ts = require("/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js"); }
  catch { throw new Error("TypeScript not found. Run npm install before check:profile."); }
}

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const contents=(name)=>fs.readFileSync(path.join(root,name),"utf8");
const exists=(name)=>fs.existsSync(path.join(root,name));
const required=[
  "app/profile/page.tsx", "components/profile/ProfileScreen.tsx", "components/profile/profile.css",
  "lib/profile/profile.ts", "tests/e2e/profile.spec.ts",
  "docs/SCREEN_04_PROFILE.md", "docs/flows/12-profile-flow.mmd",
];
for(const file of required) assert.ok(exists(file),`Missing file: ${file}`);
const page=contents("app/profile/page.tsx");
const screen=contents("components/profile/ProfileScreen.tsx");
const css=contents("components/profile/profile.css");
assert.match(page,/ProfileScreen/);
assert.match(page,/robots: \{ index: false/);
assert.match(screen,/ChatLayout/);
assert.match(screen,/DemoAccessProvider/);
assert.match(screen,/validateProfile/);
assert.match(screen,/role="tablist"/);
assert.match(screen,/aria-selected/);
assert.match(screen,/role="switch"/);
assert.match(screen,/Dialog/);
assert.match(screen,/لا توجد جلسة مستخدم حقيقية/);
assert.match(screen,/لم يُرسل إلى الخادم/);
for(const forbidden of ["fetch(","localStorage", "sessionStorage", "document.cookie"]) {
  assert.ok(!screen.includes(forbidden),`Screen 04 is demo only and must not use ${forbidden}`);
}
assert.match(css,/@media\(max-width:660px\)/);
assert.match(contents("components/TopBar.tsx"),/href="\/profile"/);
assert.doesNotMatch(contents("app/[...slug]/page.tsx"),/x\.path!=="\/forgot-password"\)\.map/);

// Ensure previous approved screens/styles and design references remain identical.
const previous="/mnt/data/Bayan-Frontend-Screen-03-Reset-Password";
const invariant=[
 "app/page.tsx", "app/admin/page.tsx", "app/login/page.tsx", "app/forgot-password/page.tsx",
 "app/reset-password/page.tsx", "components/ChatView.tsx", "components/AdminDashboard.tsx",
 "components/auth/LoginScreen.tsx", "components/auth/ForgotPasswordScreen.tsx",
 "components/auth/ResetPasswordScreen.tsx", "components/auth/login.css",
 "components/auth/recovery.css", "components/auth/reset-password.css",
 "app/globals.css", "design-references/chat-reference.png", "design-references/admin-reference.png",
];
const hash=(file)=>crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
if(fs.existsSync(previous))for(const file of invariant){
  assert.ok(exists(file),`Approved asset removed: ${file}`);
  assert.equal(hash(path.join(root,file)),hash(path.join(previous,file)),`Approved asset changed: ${file}`);
}

// Parse all source files with the installed compiler, without relying on external npm.
let n=0;
const ignore=new Set(["node_modules",".next",".git"]);
function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){
  if(e.isDirectory()){if(!ignore.has(e.name))walk(path.join(dir,e.name));continue;}
  if(!/\.(tsx?|jsx?)$/.test(e.name))continue;
  const f=path.join(dir,e.name);
  const text=fs.readFileSync(f,"utf8");
  const kind=/\.tsx$/.test(e.name)?ts.ScriptKind.TSX:ts.ScriptKind.TS;
  const file=ts.createSourceFile(f,text,ts.ScriptTarget.Latest,true,kind);
  assert.equal(file.parseDiagnostics.length,0,`Syntax error: ${path.relative(root,f)} ${file.parseDiagnostics.map(d=>d.messageText).join(" ; ")}`);
  n++;
}}
walk(root);
console.log(`Screen 04 structural checks passed; parsed ${n} TS/TSX/JS source files.`);
console.log("Design references unchanged. Browser/build validation still required.");
