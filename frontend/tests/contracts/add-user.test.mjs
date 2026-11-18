import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const resolve = p => fs.existsSync(p) ? p : (fs.existsSync(path.join(root, 'src', path.relative(root, p))) ? path.join(root, 'src', path.relative(root, p)) : p);
const readFileSync = (p, enc) => fs.readFileSync(resolve(p), enc);
const existsSync = p => fs.existsSync(resolve(p));
const require=createRequire(import.meta.url);
let ts;try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}
const js=ts.transpileModule(readFileSync(path.join(root,'lib/user-management/users.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const moduleRef={exports:{}};
new Function('module','exports','require',js)(moduleRef,moduleRef.exports,require);
const u=moduleRef.exports;
const valid={name:'سلمى التجريبية',email:'salma.new@example.test',department:'شؤون الطلاب',role:'employee'};
test('screen 19 reuses tenant-bound validation, normalized email and unique identifiers',()=>{
 assert.deepEqual(u.validateUserDraft(valid,u.DEMO_USERS),{});
 const result=u.createUser(u.DEMO_USERS,{...valid,email:' SALMA.NEW@EXAMPLE.TEST '});
 assert.equal(result.ok,true);assert.equal(result.users.length,15);
 assert.equal(result.users.at(-1).id,'USR-015');assert.equal(result.users.at(-1).email,'salma.new@example.test');
 assert.equal(result.users.at(-1).institution,u.demoInstitution);
});
test('invalid email, duplicate, omitted full name and role outside tenant cannot be added',()=>{
 assert.ok(u.validateUserDraft({...valid,email:'sara@example.test'},u.DEMO_USERS).email);
 assert.ok(u.validateUserDraft({...valid,email:'bad@@domain'},u.DEMO_USERS).email);
 assert.ok(u.validateUserDraft({...valid,name:'  '},u.DEMO_USERS).name);
 assert.ok(u.validateUserDraft({...valid,role:'platform_admin'},u.DEMO_USERS).role);
 assert.equal(u.createUser(u.DEMO_USERS,{...valid,role:'platform_admin'}).ok,false);
});
test('created user survives the same local demo-list validation used by screen 18',()=>{
 const created=u.createUser(u.DEMO_USERS,valid);
 assert.equal(created.ok,true);
 const restored=u.restoreUserFixtures(JSON.parse(JSON.stringify(created.users)));
 assert.equal(restored.at(-1).email,valid.email);
 assert.equal(u.createUser(restored,valid).ok,false);
});
test('existing fixture cannot be confused with platform administrator tenant access',()=>{
 assert.equal(Object.hasOwn(u.userRoleLabels,'platform_admin'),false);
 assert.ok(u.DEMO_USERS.every(x=>x.institution===u.demoInstitution));
});
test('wizard has a distinct route, permission guard, review and confirmation, no backend submission',()=>{
 const c=readFileSync(path.join(root,'components/user-create/AddUserScreen.tsx'),'utf8');
 const page=readFileSync(path.join(root,'app/admin/users/new/page.tsx'),'utf8');
 const users=readFileSync(path.join(root,'components/user-management/UsersManagementScreen.tsx'),'utf8');
 const catchall=readFileSync(path.join(root,'app/[...slug]/page.tsx'),'utf8');
 for(const marker of ['can(\'users.manage\')','DemoAccessProvider','DemoRolePicker','AdminLayout','validateUserDraft','createUser','readExisting()','localStorage.setItem','banu-role-options','add-user-account-step','add-user-role-step','add-user-review-step','add-user-success','<Dialog'])assert.ok(c.includes(marker),marker);
 assert.match(page,/AddUserScreen/);
 assert.match(users,/href="\/admin\/users\/new"/);
 assert.match(catchall,/x.path!=="\/admin\/users\/new"/);
 assert.doesNotMatch(c,/\bfetch\s*\(|axios\.|\beval\s*\(/);
});
test('deliverables and documented flows are present',()=>{
 for(const file of ['components/user-create/add-user.css','docs/SCREEN_19_ADD_USER.md','docs/flows/27-add-user-flow.mmd','docs/flows/27-add-user-flow.svg','docs/flows/27-add-user-flow.png','tests/e2e/add-user.spec.ts']) assert.equal(existsSync(path.join(root,file)),true,file);
});
