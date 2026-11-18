import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const base = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const get = (p) => fs.readFileSync(path.join(base, p), "utf8");
const exists = (p) => fs.existsSync(path.join(base, p));
const required = [
  "app/forgot-password/page.tsx",
  "components/auth/ForgotPasswordScreen.tsx",
  "components/auth/AuthBrandPanel.tsx",
  "components/auth/recovery.css",
  "lib/auth/recovery.ts",
  "tests/e2e/forgot-password.spec.ts",
  "docs/SCREEN_02_FORGOT_PASSWORD.md",
  "docs/flows/10-recovery-preview.mmd",
];
for (const p of required) assert.ok(exists(p), `Missing: ${p}`);
const page = get("app/forgot-password/page.tsx");
const screen = get("components/auth/ForgotPasswordScreen.tsx");
const recovery = get("lib/auth/recovery.ts");
assert.match(page, /AuthLayout/);
assert.match(page, /ForgotPasswordScreen/);
assert.match(screen, /validateRecoveryEmail/);
assert.match(screen, /noValidate/);
assert.match(screen, /aria-busy/);
assert.match(screen, /role="status"/);
assert.match(screen, /role="alert"/);
assert.match(screen, /autoComplete="email"/);
assert.match(screen, /\/login/);
assert.match(screen, /لم نرسل أي رسالة/);
assert.match(screen, /previewEnabled/);
assert.ok(!screen.includes("fetch("), "Recovery preview must not call an API");
assert.ok(!screen.includes("localStorage"), "Recovery email must not be persisted");
assert.ok(!screen.includes("sessionStorage"), "Recovery email must not be persisted");
assert.ok(!screen.includes("Math.random"), "No fake recovery token should be generated");
assert.ok(get("components/auth/recovery.css").includes("@media (max-width:540px)"));
assert.ok(get("components/auth/LoginScreen.tsx").includes('href="/forgot-password"'));
assert.ok(get("app/[...slug]/page.tsx").includes('x.path!=="/forgot-password"'));
assert.equal(JSON.parse(get("lib/screen-catalog.json")).find(s => s.path === "/forgot-password")?.title, "استعادة الحساب");

const sha = (p) => crypto.createHash("sha256").update(fs.readFileSync(path.join(base, p))).digest("hex");
const previous = "/mnt/data/Bayan-Frontend-Screen-01-Login";
for (const p of ["components/ChatView.tsx", "components/AdminDashboard.tsx", "app/globals.css", "components/auth/LoginScreen.tsx", "components/auth/login.css", "design-references/chat-reference.png", "design-references/admin-reference.png"]) {
  const ref = path.join(previous, p);
  if (exists(p) && fs.existsSync(ref)) {
    assert.equal(sha(p), crypto.createHash("sha256").update(fs.readFileSync(ref)).digest("hex"), `Reference changed: ${p}`);
  }
}

const require = createRequire(import.meta.url);
let ts;
try { ts = require("typescript"); } catch { try { ts = require("/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript"); } catch {} }
if (ts) {
  const walk = dir => fs.readdirSync(dir, { withFileTypes:true }).flatMap(e => e.isDirectory() ? ([".next","node_modules"].includes(e.name) ? [] : walk(path.join(dir, e.name))) : [path.join(dir,e.name)]);
  let total = 0;
  for (const file of walk(base).filter(p => /\.tsx?$/.test(p))) {
    const src = ts.createSourceFile(file, fs.readFileSync(file,"utf8"), ts.ScriptTarget.Latest, true, file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    assert.equal(src.parseDiagnostics.length,0,`${path.relative(base,file)}: ${src.parseDiagnostics.map(e=>ts.flattenDiagnosticMessageText(e.messageText," ")).join("; ")}`);
    total++;
  }
  const transpiled = ts.transpileModule(recovery, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const exports = {};
  const fn = new Function("exports", "process", transpiled);
  fn(exports, process);
  assert.equal(exports.validateRecoveryEmail("").email,"يرجى إدخال البريد الإلكتروني.");
  assert.equal(exports.validateRecoveryEmail("bad-email").email,"يرجى إدخال بريد إلكتروني صحيح.");
  assert.equal(exports.validateRecoveryEmail(" user@example.edu ").email,undefined);
  assert.equal(exports.validateRecoveryEmail("a".repeat(245)+"@example.edu").email,"يرجى إدخال بريد إلكتروني صحيح.");
  console.log(`PASS Recovery screen: ${total} TS/TSX files parsed; email validator tested; approved screens unchanged.`);
} else {
  console.log("PASS Recovery structural contracts; TypeScript compiler was unavailable for parser/unit checks.");
}
console.log("Not verified: Next.js production build, actual email delivery, backend reset tokens, or rendered visual match.");
