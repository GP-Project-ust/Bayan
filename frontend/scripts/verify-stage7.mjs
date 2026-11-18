/** Stage 7 — dependency-free QA contract checks. Does not assert WCAG or production readiness. */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = p => fs.readFileSync(path.join(root,p), "utf8");
const json = p => JSON.parse(read(p));
const exists = p => fs.existsSync(path.join(root,p)) && fs.statSync(path.join(root,p)).size > 100;
const catalog = json("lib/screen-catalog.json");
const cases = json("lib/quality/checklist.json");
assert.equal(catalog.length, 42, "Expected 42 screens in catalog");
assert.equal(cases.filter(item=>item.type==="screen").length, 42);
assert.equal(new Set(cases.map(item=>item.id)).size, cases.length, "Case ids should be unique");
assert.equal(new Set(catalog.map(item=>item.path)).size, catalog.length,"Route paths should be unique");
assert.deepEqual(new Set(cases.filter(item=>item.type==="screen").map(item=>item.route)),new Set(catalog.map(item=>item.path)),"Every catalog screen must have one acceptance case");
const allowed = new Set(["screen", "flow", "accessibility", "security", "visual"]);
for (const item of cases) {
  assert.ok(/^(SCR-\d{2}|UC-\d{2}|ERR-[\dA-Z]+|A11Y-\d{2}|SEC-\d{2}|VIS-\d{2})$/.test(item.id),`Invalid case id ${item.id}`);
  assert.ok(allowed.has(item.type),`Invalid case category ${item.id}`);
  assert.ok(["P0","P1","P2"].includes(item.priority));
  assert.ok(item.title?.length>2 && item.route?.startsWith("/") && item.checks?.length>=1);
}
for(let i=1;i<=7;i++)assert.ok(cases.some(item=>item.id===`UC-${String(i).padStart(2,"0")}`),`Missing use case UC-${i}`);
assert.equal(cases.filter(item=>item.type==="visual").length,4);
const must=[
 "app/design-system/quality/page.tsx", "app/design-system/quality/playground.tsx", "app/design-system/quality/quality.css",
 "docs/DESIGN_SYSTEM_HANDBOOK.md", "docs/BAYAN_DESIGN_SYSTEM_STAGE_7.md", "docs/COMPONENT_API_REFERENCE.md",
 "docs/QA_ACCEPTANCE_MATRIX.md", "docs/ACCESSIBILITY_TEST_PLAN.md", "docs/VISUAL_REGRESSION_PROTOCOL.md",
 "docs/RELEASE_READINESS_CHECKLIST.md", "docs/INTEGRATION_HANDOFF.md", "playwright.config.ts", "tests/e2e/bayan-ui.spec.ts",
 "design-references/chat-reference.png", "design-references/admin-reference.png", "public/design-references/chat-reference.png", "public/design-references/admin-reference.png",
];
for(const p of must)assert.ok(exists(p),`Required file missing: ${p}`);
assert.ok(read("app/design-system/page.tsx").includes('href="/design-system/quality"'), "Design System homepage must link to Stage 7");
assert.ok(read("app/design-system/quality/playground.tsx").includes('"not_run" | "passed" | "failed" | "blocked"'), "Status specification missing");
assert.ok(read("app/design-system/quality/playground.tsx").includes("localStorage"), "Local QA persistence missing");
assert.ok(read("app/design-system/quality/playground.tsx").includes("exportResults"), "Result export missing");
assert.ok(read("app/layout.tsx").includes('lang="ar" dir="rtl"'),"App must use Arabic RTL");
const tokens=read("styles/bayan-tokens.css");
for(const [name,color] of Object.entries({"--bayan-brand-navy":"#0A2342","--bayan-brand-turquoise":"#00A6B2","--bayan-surface-app":"#F5F9FD","--bayan-surface-card":"#FFFFFF"})) {
 assert.ok(tokens.includes(`${name}: ${color}`),`Approved token changed unexpectedly: ${name}`);
}
const hash = p => crypto.createHash("sha256").update(fs.readFileSync(path.join(root,p))).digest("hex");
for(const name of ["chat-reference.png","admin-reference.png"])
 assert.equal(hash(`design-references/${name}`),hash(`public/design-references/${name}`),`Reference copy mismatch: ${name}`);
// optional whole-project TS/TSX parsing using global TypeScript, not a replacement for tsc.
const require=createRequire(import.meta.url);
let ts;
try { ts=require("typescript"); } catch { try {ts=require("/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript");} catch {} }
let parsed=0;
function walk(dir) { return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.name==="node_modules"||e.name===".next"?[]:e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]); }
if(ts) for(const abs of walk(root).filter(p=>/\.tsx?$/.test(p))){
 const rel=path.relative(root,abs),s=fs.readFileSync(abs,"utf8");
 const f=ts.createSourceFile(rel,s,ts.ScriptTarget.Latest,true,rel.endsWith(".tsx")?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 assert.equal(f.parseDiagnostics.length,0,`${rel}: ${f.parseDiagnostics.map(d=>ts.flattenDiagnosticMessageText(d.messageText," ")).join("; ")}`);
 parsed++;
}
console.log(`PASS Stage 7 static contracts — ${catalog.length} routes, ${cases.length} acceptance cases, 7 use-cases, references + tokens${ts?`, parsed ${parsed} TypeScript sources`:" (TypeScript parser unavailable)"}`);
console.log("NOTE: No Next.js build, live browser, visual pixel-diff, WCAG certification, backend authorization or API integration was claimed by this check.");
