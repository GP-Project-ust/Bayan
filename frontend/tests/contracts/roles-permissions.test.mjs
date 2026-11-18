import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const origRead = fs.readFileSync;
const origExists = fs.existsSync;
const resolve = p => {
  if (origExists(p)) return p;
  const rel = path.relative(root, p);
  const srcCandidate = path.join(root, 'src', rel);
  if (origExists(srcCandidate)) return srcCandidate;
  return p;
};
fs.readFileSync = (p, ...args) => origRead.call(fs, resolve(p), ...args);
fs.existsSync = (p) => origExists.call(fs, resolve(p));
const require=createRequire(import.meta.url);
let ts;try{ts=require('typescript');}catch{try{ts=require(path.join(root,'node_modules/typescript'));}catch{}}
const transpile=file=>ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
function evaluate(code,resolver){const m={exports:{}};new Function('module','exports','require',code)(m,m.exports,resolver);return m.exports;}
const catalogData = JSON.parse(fs.readFileSync(path.join(root, 'lib/screen-catalog.json'), 'utf8'));
const policy=evaluate(transpile('lib/access/policy.ts'),id=>id==='@/lib/screen-catalog.json'?catalogData:require(id));
const review=evaluate(transpile('lib/access/role-review.ts'),id=>id==='./policy'?policy:require(id));
const ui=fs.readFileSync(path.join(root,'components/roles-permissions/RolesPermissionsScreen.tsx'),'utf8');
const sidebar=fs.readFileSync(path.join(root,'components/Sidebar.tsx'),'utf8');

test('roles 21 defines four independent baseline roles and sixteen capabilities',()=>{
 assert.deepEqual(policy.roleIds,['employee','manager','it_admin','platform_admin']);
 assert.equal(policy.capabilities.length,16);
 assert.equal(review.permissionSections.flatMap(s=>s.capabilities).length,16);
 assert.equal(new Set(review.permissionSections.flatMap(s=>s.capabilities)).size,16);
});
test('tenant administrators never inherit platform grants, and platform role never inherits tenant rights',()=>{
 for(const r of review.institutionRoles){assert.equal(policy.hasPermission(r,'platform.manage'),false);assert.equal(policy.hasPermission(r,'onboarding.run'),false);}
 for(const cap of ['users.manage','roles.manage','sources.manage','documents.search','chat.ask'])assert.equal(policy.hasPermission('platform_admin',cap),false);
 assert.equal(policy.canPreviewRoute('it_admin','/admin/roles'),true);
 assert.equal(policy.canPreviewRoute('platform_admin','/admin/roles'),false);
});
test('comparison handles identical and separated roles without mutating policy',()=>{
 const self=review.compareRoles('manager','manager');assert.equal(self.added.length,0);assert.equal(self.removed.length,0);
 const cross=review.compareRoles('platform_admin','it_admin');
 assert.ok(cross.added.includes('roles.manage'));
 assert.ok(cross.removed.includes('platform.manage'));
 assert.ok(!cross.shared.includes('platform.manage'));
});
test('review proposals cannot edit platform or request platform capability',()=>{
 const initial={role:'employee',capability:'reports.export',action:'grant',reason:'نحتاج مراجعة حق تصدير البيانات للتقرير التجريبي.'};
 assert.equal(review.validateReviewDraft(initial),null);
 for(const bad of [
  {...initial,role:'platform_admin'},
  {...initial,capability:'onboarding.run'},
  {...initial,capability:'platform.manage'},
  {...initial,reason:'قصير'},
  {...initial,action:'revoke'},
  {...initial,capability:'chat.ask'},
 ])assert.notEqual(review.validateReviewDraft(bad),null);
});
test('creating a local review does not change canonical permissions',()=>{
 const original=JSON.stringify(policy.rolePermissions);
 const draft={role:'manager',capability:'sql.inspect',action:'grant',reason:'طلب توضيحي لمراجعة استعلام SQL لأغراض المتابعة.'};
 const result=review.createReviewRequest([],draft,new Date('2026-11-07T10:00:00Z'));
 assert.equal(result.ok,true);
 assert.equal(result.items.length,1);
 assert.match(result.items[0].id,/^REV-/);
 assert.equal(result.items[0].status,'proposal');
 assert.equal(review.restoreReviewRequests(JSON.parse(JSON.stringify(result.items))).length,1);
 assert.equal(JSON.stringify(policy.rolePermissions),original);
 assert.equal(policy.hasPermission('manager','sql.inspect'),false);
});
test('invalid, duplicate and tampered proposals are rejected',()=>{
 const draft={role:'employee',capability:'reports.export',action:'grant',reason:'اقتراح تجربة مراجعة هذه الصلاحية ضمن إجراءات العمل.'};
 const one=review.createReviewRequest([],draft,new Date('2026-11-07T10:00:00Z'));
 assert.equal(one.ok,true);
 assert.equal(review.createReviewRequest(one.items,draft).ok,false);
 for(const tamper of [null,{},'bad',[{...one.items[0],role:'platform_admin'}],[{...one.items[0],capability:'platform.manage'}],[{...one.items[0],reason:'x'}],[one.items[0],one.items[0]]])assert.equal(review.restoreReviewRequests(tamper).length,0);
});
test('screen 21 has actual Next route and full UI states, but never calls backend',()=>{
 const page=fs.readFileSync(path.join(root,'app/admin/roles/page.tsx'),'utf8');
 assert.match(page,/RolesPermissionsScreen/);
 for(const marker of ['DemoAccessProvider','AdminLayout','DemoRolePicker',"can('roles.manage')",'rolePermissions','roleIds','capabilityLabels','compareRoles','validateReviewDraft','createReviewRequest','localStorage.setItem','<Drawer','<Dialog','<Toast','roles-forbidden','مصفوفة الصلاحيات'])assert.ok(ui.includes(marker),marker);
 assert.match(sidebar,/href="\/admin\/roles"/);
 assert.doesNotMatch(ui,/\bfetch\s*\(|axios\.|\beval\s*\(/);
});
test('source includes mobile styles, documentation, diagram and browser tests',()=>{
 for(const name of ['components/roles-permissions/roles-permissions.css','docs/SCREEN_21_ROLES_PERMISSIONS.md','docs/flows/29-roles-permissions-flow.mmd','docs/flows/29-roles-permissions-flow.svg','docs/flows/29-roles-permissions-flow.png','tests/e2e/roles-permissions.spec.ts'])assert.ok(fs.existsSync(path.join(root,name)),name);
 const css=fs.readFileSync(path.join(root,'components/roles-permissions/roles-permissions.css'),'utf8');
 assert.match(css,/@media\(max-width:720px\)/);
 assert.match(css,/\.brp-matrix/);
});
