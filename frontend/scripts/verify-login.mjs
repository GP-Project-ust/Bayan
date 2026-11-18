/** Screen 01 — static implementation checks; DOES NOT prove runtime auth/security. */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {fileURLToPath} from "node:url";
import {createRequire} from "node:module";
const base = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const get = (name) => fs.readFileSync(path.join(base,name), "utf8");
const exists = (name) => fs.existsSync(path.join(base,name)) && fs.statSync(path.join(base,name)).size>50;
const required = ["app/login/page.tsx", "components/auth/LoginScreen.tsx", "components/auth/login.css", "lib/auth/login.ts", "docs/SCREEN_01_LOGIN.md", "tests/e2e/login.spec.ts"];
for (const p of required) assert.ok(exists(p),`Missing: ${p}`);
assert.match(get("app/login/page.tsx"),/AuthLayout/);
assert.match(get("app/login/page.tsx"),/LoginScreen/);
assert.match(get("components/auth/LoginScreen.tsx"),/validateLogin/);
assert.match(get("components/auth/LoginScreen.tsx"),/noValidate/);
assert.match(get("components/auth/LoginScreen.tsx"),/aria-busy/);
assert.match(get("components/auth/LoginScreen.tsx"),/autoComplete="username"/);
assert.match(get("components/auth/LoginScreen.tsx"),/autoComplete="current-password"/);
assert.match(get("components/auth/LoginScreen.tsx"),/role="alert"/);
assert.match(get("components/auth/LoginScreen.tsx"),/NEXT_PUBLIC_BAYAN_DEMO_LOGIN|isDemoLoginEnabled/);
assert.ok(!/localStorage\.setItem\([^,]+,\s*password\)/.test(get("components/auth/LoginScreen.tsx")));
assert.ok(!get("components/auth/LoginScreen.tsx").includes("fetch("),"No real login service is connected");
assert.ok(get("components/auth/login.css").includes("@media(max-width:540px)"));
assert.equal(JSON.parse(get("lib/screen-catalog.json")).find(x=>x.path==="/login")?.title,"تسجيل الدخول");
const sha=(p)=>crypto.createHash("sha256").update(fs.readFileSync(path.join(base,p))).digest("hex");
for(const file of ["components/ChatView.tsx","components/AdminDashboard.tsx","app/globals.css","design-references/chat-reference.png","design-references/admin-reference.png"]){
 const prior=path.join("/mnt/data/Bayan-Design-System-v7",file);
 if(fs.existsSync(prior)) assert.equal(sha(file),crypto.createHash("sha256").update(fs.readFileSync(prior)).digest("hex"),`Reference changed: ${file}`);
}
const require=createRequire(import.meta.url);
let ts;
try {ts=require("typescript");}catch{try{ts=require("/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript");}catch{}}
if(ts){
 let parsed=0;
 const walk=(dir)=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>(["node_modules",".next"].includes(e.name)?[]:e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]));
 for(const p of walk(base).filter(f=>/\.tsx?$/.test(f))){
  const text=fs.readFileSync(p,"utf8");
  const sf=ts.createSourceFile(p,text,ts.ScriptTarget.Latest,true,p.endsWith(".tsx")?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  assert.equal(sf.parseDiagnostics.length,0,`${path.relative(base,p)}: ${sf.parseDiagnostics.map(e=>ts.flattenDiagnosticMessageText(e.messageText," ")).join("; ")}`);
  parsed++;
 }
 console.log(`PASS: Login static contracts; parsed ${parsed} TypeScript/TSX files; protected original references.`);
}else console.log("PASS: Login static contracts (TypeScript parser unavailable).");
console.log("Not verified: npm build, live Next.js rendering, backend login, real sessions, authorization.");
