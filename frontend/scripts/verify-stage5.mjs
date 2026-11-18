/** Stage 5 structure + policy check. Requires npm install for TypeScript tests. */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const must=[
  "lib/access/policy.ts","components/access/DemoAccess.tsx","components/access/access.css",
  "components/states/StatePanel.tsx","components/states/states.css",
  "app/design-system/states-permissions/page.tsx","app/design-system/states-permissions/playground.tsx",
  "app/design-system/states-permissions/showcase.css","docs/BAYAN_DESIGN_SYSTEM_STAGE_5.md"
];
for(const file of must)assert.ok(fs.statSync(path.join(root,file)).size>100,`Missing or empty: ${file}`);
for(const file of ["design-references/chat-reference.png","design-references/admin-reference.png","public/assets/campus-chat.png","public/assets/campus-admin-top.png"])assert.ok(fs.statSync(path.join(root,file)).size>1000,`Missing reference image: ${file}`);
assert.ok(read("components/FeaturePage.tsx").includes("canPreviewRoute"),"Demo routes should use the access-preview guard");
assert.ok(read("app/layout.tsx").includes("states.css"),"Shared state styling should be available");
assert.equal(JSON.parse(read("lib/screen-catalog.json")).length,42,"The 42-screen catalog changed unexpectedly");
const require=createRequire(import.meta.url);
let ts;
try{ts=require("typescript")}catch{console.log("PASS structural checks. Optional syntax/policy tests require: npm install");process.exit(0)}
for(const file of must.filter(f=>f.endsWith(".ts")||f.endsWith(".tsx"))){
 const source=ts.createSourceFile(file,read(file),ts.ScriptTarget.Latest,true,file.endsWith(".tsx")?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 assert.equal(source.parseDiagnostics.length,0,`Syntax errors in ${file}: ${source.parseDiagnostics.map(d=>d.messageText).join("; ")}`);
}
const compiled=ts.transpileModule(read("lib/access/policy.ts"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}});
const module={exports:{}};
const localRequire=(id)=>id==="@/lib/screen-catalog.json"?{default:JSON.parse(read("lib/screen-catalog.json"))}:require(id);
const run=new Function("require","module","exports",compiled.outputText);run(localRequire,module,module.exports);
const p=module.exports;
assert.deepEqual(p.roleIds,["employee","manager","it_admin","platform_admin"]);
assert.equal(p.hasPermission("employee","chat.ask"),true);
assert.equal(p.hasPermission("employee","users.manage"),false);
assert.equal(p.hasPermission("manager","reports.create"),true);
assert.equal(p.hasPermission("manager","onboarding.run"),false);
assert.equal(p.hasPermission("it_admin","audit.view"),true);
assert.equal(p.hasPermission("it_admin","analytics.view"),false);
assert.equal(p.hasPermission("platform_admin","platform.manage"),true);
assert.equal(p.hasPermission("platform_admin","users.manage"),false);
assert.equal(p.canPreviewRoute("employee","/admin/users"),false);
assert.equal(p.canPreviewRoute("it_admin","/admin/users"),true);
assert.equal(p.canPreviewRoute("manager","/reports/new"),true);
assert.equal(p.canPreviewRoute("manager","/platform/onboarding"),false);
assert.equal(p.canPreviewRoute("platform_admin","/platform/onboarding"),true);
assert.equal(p.canPreviewRoute("platform_admin","/admin/users"),false);
assert.equal(p.canPreviewRoute("employee","/design-system/states-permissions"),true);
assert.equal(p.visiblePreviewRoutes("employee").length>6,true);
console.log("PASS stage 5: required files, 42 routes, TypeScript syntax, role/capability matrix and route guards");
