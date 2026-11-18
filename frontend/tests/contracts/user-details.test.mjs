import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const resolve = p => fs.existsSync(p) ? p : (fs.existsSync(path.join(root, 'src', path.relative(root, p))) ? path.join(root, 'src', path.relative(root, p)) : p);
const readFileSync = (p, enc) => fs.readFileSync(resolve(p), enc);
const existsSync = p => fs.existsSync(resolve(p));
const require=createRequire(import.meta.url);
let ts;try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}
function load(relative){
 const js=ts.transpileModule(readFileSync(path.join(root,relative),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const mod={exports:{}};new Function('module','exports','require',js)(mod,mod.exports,require);return mod.exports;
}
const users=load('lib/user-management/users.ts');
const details=load('lib/user-management/details.ts');
const source=readFileSync(path.join(root,'components/user-details/UserDetailsScreen.tsx'),'utf8');

test('screen 20 accepts only demo tenant user ids and safely constructs details routes',()=>{
 assert.equal(details.normalizeRequestedUserId('USR-003'),'USR-003');
 assert.equal(details.normalizeRequestedUserId('  USR-014 '),'USR-014');
 for(const input of [null,undefined,'','usr-014','USR-1','USR-001?role=it_admin','USR-014/../../admin','USR-000<script>'])assert.equal(details.normalizeRequestedUserId(input),null);
 assert.equal(details.userDetailsHref('USR-001'),'/admin/users/details?id=USR-001');
 assert.throws(()=>details.userDetailsHref('USR-001&status=active'));
});
test('screen 20 resolves account identity from the same fixture and rejects missing users',()=>{
 assert.equal(details.findUserById(users.DEMO_USERS,'USR-003')?.name,'م. خالد الشهري');
 assert.equal(details.findUserById(users.DEMO_USERS,'USR-999'),null);
 assert.equal(details.findUserById(users.DEMO_USERS,'foo'),null);
});
test('screen 20 reflects create, edit and status changes made to the shared user collection',()=>{
 const draft={name:'أحمد بيانات العرض',email:'ahmad@example.test',department:'شؤون الطلاب',role:'employee'};
 const created=users.createUser(users.DEMO_USERS,draft);assert.equal(created.ok,true);
 const account=details.findUserById(created.users,'USR-015');assert.equal(account?.name,draft.name);
 const edited=users.editUser(created.users,'USR-015',{...draft,role:'manager'});assert.equal(edited.ok,true);
 const disabled=users.setUserStatus(edited.users,'USR-015','disabled');assert.equal(disabled.ok,true);
 const restored=users.restoreUserFixtures(JSON.parse(JSON.stringify(disabled.users)));
 assert.equal(details.findUserById(restored,'USR-015')?.status,'disabled');
 assert.equal(details.findUserById(restored,'USR-015')?.role,'manager');
});
test('screen 20 does not permit accidental downgrade or disabling of current administrative actor',()=>{
 assert.equal(details.roleChangeAllowed(users.DEMO_USERS[2],users.demoActorId),false);
 assert.equal(users.setUserStatus(users.DEMO_USERS,users.demoActorId,'disabled').ok,false);
 const result=users.editUser(users.DEMO_USERS,'USR-003',{name:users.DEMO_USERS[2].name,email:users.DEMO_USERS[2].email,department:'تقنية المعلومات',role:'employee'});
 assert.equal(result.ok,false);
});
test('screen 20 prevents disabling last active IT administrator',()=>{
 const reduced=users.DEMO_USERS.map(u=>u.id==='USR-007'?{...u,status:'disabled'}:u);
 assert.equal(users.setUserStatus(reduced,'USR-003','disabled').ok,false);
});
test('preview timeline distinguishes fixture entries from local actions and never claims official audit',()=>{
 const activity=details.fixtureActivity(users.DEMO_USERS[0]);assert.equal(activity.length,2);
 assert.ok(activity.every(x=>x.kind==='fixture'));
 assert.match(activity[0].detail,/ليس من سجل التدقيق/);
 assert.match(source,/هذه ليست سجلات Audit Log الفعلية/);
});
test('screen 20 has self-contained Next.js route, shared storage, RBAC guard, three tabs and confirmations',()=>{
 const page=readFileSync(path.join(root,'app/admin/users/details/page.tsx'),'utf8');
 const listing=readFileSync(path.join(root,'components/user-management/UsersManagementScreen.tsx'),'utf8');
 const creation=readFileSync(path.join(root,'components/user-create/AddUserScreen.tsx'),'utf8');
 const fallback=readFileSync(path.join(root,'app/[...slug]/page.tsx'),'utf8');
 assert.match(page,/UserDetailsScreen/);
 for(const marker of ['can(\'users.manage\')','DemoRolePicker','AdminLayout','USER_DETAILS_STORAGE_KEY','validateUserDraft','editUser','setUserStatus','user-details-not-found','user-details-forbidden','user-permissions','user-activity','<Dialog','localStorage.setItem']) assert.ok(source.includes(marker),marker);
 assert.match(listing,/userDetailsHref\(user.id\)/);
 assert.match(creation,/userDetailsHref\(created.id\)/);
 assert.match(fallback,/x.path!=="\/admin\/users\/details"/);
 assert.doesNotMatch(source,/\bfetch\s*\(|axios\.|\beval\s*\(/);
});
test('screen 20 deliverables and flow are present',()=>{
 for(const f of ['components/user-details/user-details.css','docs/SCREEN_20_USER_DETAILS.md','docs/flows/28-user-details-flow.mmd','docs/flows/28-user-details-flow.svg','docs/flows/28-user-details-flow.png','tests/e2e/user-details.spec.ts'])assert.equal(existsSync(path.join(root,f)),true,f);
});
