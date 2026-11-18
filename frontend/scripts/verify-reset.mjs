import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const base = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const text = (p) => fs.readFileSync(path.join(base,p), "utf8");
const exists = (p) => fs.existsSync(path.join(base,p));
const required = [
  "app/reset-password/page.tsx",
  "components/auth/ResetPasswordScreen.tsx",
  "components/auth/reset-password.css",
  "lib/auth/reset-password.ts",
  "tests/e2e/reset-password.spec.ts",
  "docs/SCREEN_03_RESET_PASSWORD.md",
  "docs/flows/11-reset-password.mmd",
];
for (const p of required) assert.ok(exists(p), `Missing file: ${p}`);
const page = text("app/reset-password/page.tsx");
const screen = text("components/auth/ResetPasswordScreen.tsx");
const helper = text("lib/auth/reset-password.ts");
assert.match(page, /AuthLayout/);
assert.match(page, /robots: \{ index: false/);
assert.match(page, /hasRealToken/);
assert.match(screen, /validateResetForm/);
assert.match(screen, /aria-busy/);
assert.match(screen, /role="meter"/);
assert.match(screen, /autoComplete="new-password"/);
assert.match(screen, /role="status"/);
assert.match(screen, /لم تُرسل/);
for (const forbidden of ["fetch(", "localStorage", "sessionStorage", "Math.random(", "crypto.randomUUID("]) {
  assert.ok(!screen.includes(forbidden), `Demo reset screen must not use ${forbidden}`);
}
assert.match(text("components/auth/reset-password.css"), /@media\(max-width:540px\)/);

// All previously approved screens and shared styles remain byte-for-byte identical.
const prev = "/mnt/data/Bayan-Frontend-Screen-02-Recovery";
const preserved = [
  "app/page.tsx", "app/admin/page.tsx", "app/login/page.tsx", "app/forgot-password/page.tsx",
  "components/ChatView.tsx", "components/AdminDashboard.tsx", "components/auth/LoginScreen.tsx",
  "components/auth/ForgotPasswordScreen.tsx", "components/auth/login.css", "components/auth/recovery.css",
  "app/globals.css", "design-references/chat-reference.png", "design-references/admin-reference.png",
];
for (const p of preserved) {
  if (fs.existsSync(path.join(prev,p))) {
    assert.ok(exists(p), `Original file missing: ${p}`);
    const sha = (fp) => crypto.createHash("sha256").update(fs.readFileSync(fp)).digest("hex");
    assert.equal(sha(path.join(base,p)),sha(path.join(prev,p)), `Original changed: ${p}`);
  }
}
assert.equal(JSON.parse(text("lib/screen-catalog.json")).length,42,"Original main-screen catalog stays at 42; reset is a subflow");

const require = createRequire(import.meta.url);
let ts;
try {ts=require("typescript");} catch {try {ts=require("/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript");} catch {}}
assert.ok(ts,"Global or local TypeScript is required to run checks");
const walk = (dir) => fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()? (["node_modules",".next"].includes(e.name)?[]:walk(path.join(dir,e.name))) : [path.join(dir,e.name)]);
let count=0;
for (const file of walk(base).filter(p=>/\.tsx?$/.test(p))) {
  const source = ts.createSourceFile(file,fs.readFileSync(file,"utf8"),ts.ScriptTarget.Latest,true,file.endsWith(".tsx")?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  assert.equal(source.parseDiagnostics.length,0,`${path.relative(base,file)}: ${source.parseDiagnostics.map(e=>ts.flattenDiagnosticMessageText(e.messageText," ")).join("; ")}`);
  count++;
}
const transpiled = ts.transpileModule(helper,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const exported = {};
new Function("exports","process",transpiled)(exported,process);
const {passwordRules,passwordStrength,validateResetForm,resolveResetPreviewMode} = exported;
assert.equal(passwordRules("مرحبا-123456789!م").every(r=>r.passed),true,"Unicode Arabic password should pass rules");
assert.equal(passwordRules("Abc-123456789!").every(r=>r.passed),true);
assert.equal(passwordStrength("Abc-123456789!").score,4);
assert.equal(passwordStrength("").score,0);
assert.ok(validateResetForm("","").password);
assert.ok(validateResetForm("abc","abc").password);
assert.equal(validateResetForm("Abc-123456789!","different").confirmPassword,"كلمتا المرور غير متطابقتين.");
assert.deepEqual(validateResetForm("Abc-123456789!","Abc-123456789!"),{});
assert.ok(validateResetForm("A".repeat(129)+"1!", "A".repeat(129)+"1!").password,"Reject overly long password");
assert.equal(resolveResetPreviewMode("valid",false,true),"form");
assert.equal(resolveResetPreviewMode("expired",false,true),"expired");
assert.equal(resolveResetPreviewMode("invalid",false,true),"invalid");
assert.equal(resolveResetPreviewMode(undefined,false,true),"missing");
assert.equal(resolveResetPreviewMode("valid",true,true),"unavailable","Never validate real token client-side");
assert.equal(resolveResetPreviewMode("valid",false,false),"unavailable","Preview must be gated in production");
console.log(`PASS Reset screen 03: ${count} TypeScript files parsed, password validation and token handling tested, 42 core screens unchanged.`);
console.log("Not verified here: Next.js production build, email delivery, token verification, real password change, visual match in live browser.");
