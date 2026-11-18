/** Stage 6: deterministic structural checks (no Next.js installation required).
 * If TypeScript is present, also parse every TS/TSX source for syntax errors.
 * A real browser/build audit is still required before shipping production.
 */
import fs from "node:fs";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const contents = file => fs.readFileSync(path.join(root,file), "utf8");
const exists = file => fs.existsSync(path.join(root,file)) && fs.statSync(path.join(root,file)).size > 100;
const stage6 = [
  "styles/bayan-responsive.css",
  "app/design-system/responsive/page.tsx",
  "app/design-system/responsive/playground.tsx",
  "app/design-system/responsive/showcase.css",
  "docs/BAYAN_DESIGN_SYSTEM_STAGE_6.md"
];
for (const f of stage6) assert.ok(exists(f),`Missing stage 6 file: ${f}`);
for (const f of ["public/design-references/chat-reference.png","public/design-references/admin-reference.png","public/assets/campus-sidebar.png"])
  assert.ok(exists(f),`Missing original image: ${f}`);
assert.ok(contents("app/layout.tsx").includes("bayan-responsive.css"),"Responsive CSS is not loaded by the root layout");
const shell=contents("components/layout/AppShell.tsx");
const sidebar=contents("components/Sidebar.tsx");
const css=contents("styles/bayan-responsive.css");
assert.ok(shell.includes('matchMedia("(max-width: 900px)")'),"Compact CSS and JS breakpoints must match");
assert.ok(css.includes("@media (max-width:900px)"),"Missing CSS breakpoint");
assert.ok(shell.includes('event.key === "Escape"'),"Mobile drawer must close on Escape");
assert.ok(shell.includes("inert = compact && !menuOpen"),"Closed drawer should not be tabbable");
assert.ok(shell.includes("bayan-skip-link"),"Missing skip-navigation link");
assert.ok(shell.includes("menuButtonRef"),"Missing focus restoration hook");
assert.ok(sidebar.includes('role={compact && menuOpen ? "dialog"'),"Mobile drawer must announce modal dialog semantics");
assert.ok(contents("components/TopBar.tsx").includes('aria-expanded={menuOpen}'),"Missing expanded state on menu toggle");
assert.ok(contents("components/AdminDashboard.tsx").includes('tabIndex={0}><table'),"Admin tables need keyboard-accessible scroll containers");
assert.ok(contents("components/FeaturePage.tsx").includes("useOverlay(Boolean(modal)"),"Feature dialogs need Escape and focus trap");
assert.ok(css.includes("prefers-reduced-motion:reduce"),"Missing reduced-motion support");
assert.ok(css.includes("prefers-contrast:more"),"Missing high-contrast support");
const require = createRequire(import.meta.url);
let ts;
try { ts=require("typescript"); } catch {
  try {ts=require("/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript");} catch { /* optional syntax parse */ }
}
function walk(dir) {
  return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
    if(entry.name==="node_modules" || entry.name===".next")return [];
    const abs=path.join(dir,entry.name);
    return entry.isDirectory()?walk(abs):[abs];
  });
}
let count=0;
if(ts) for(const abs of walk(root).filter(f=>/\.tsx?$/.test(f))){
  const rel=path.relative(root,abs),source=fs.readFileSync(abs,"utf8");
  const parsed=ts.createSourceFile(rel,source,ts.ScriptTarget.Latest,true,rel.endsWith(".tsx")?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  assert.equal(parsed.parseDiagnostics.length,0,`${rel}: ${parsed.parseDiagnostics.map(d=>ts.flattenDiagnosticMessageText(d.messageText," ")).join("; ")}`);
  count++;
}
console.log(`PASS Stage 6: responsive layout, modal focus, mobile navigation, reduced motion, reference assets${ts?`, TS/TSX syntax in ${count} files`:""}`);
