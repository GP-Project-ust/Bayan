import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);let ts;try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const source=fs.readFileSync(path.join(root,'lib/user-management/users.ts'),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
const mod={exports:{}};new Function('module','exports','require',js)(mod,mod.exports,require);
const a=mod.exports;
test('fictional seeded tenant users, three tenant roles and protected acting IT admin',()=>{
 assert.equal(a.DEMO_USERS.length,14);
 assert.equal(new Set(a.DEMO_USERS.map(u=>u.id)).size,14);
 assert.ok(a.DEMO_USERS.every(u=>u.email.endsWith('@example.test')&&u.institution===a.demoInstitution));
 assert.deepEqual(Object.keys(a.userRoleLabels).sort(),['employee','it_admin','manager']);
 assert.equal(a.DEMO_USERS.find(u=>u.id===a.demoActorId).role,'it_admin');
});
test('search normalizes Arabic and filters role, status, department',()=>{
 assert.equal(a.normalizeArabic('الإدارة'),a.normalizeArabic('الاداره'));
 const search=a.filterUsers(a.DEMO_USERS,{...a.initialUserFilters,search:'القحطاني'});
 assert.equal(search.length,1);assert.equal(search[0].id,'USR-002');
 const f=a.filterUsers(a.DEMO_USERS,{...a.initialUserFilters,role:'it_admin',status:'active',department:'تقنية المعلومات'});
 assert.equal(f.length,2);assert.ok(f.every(u=>u.role==='it_admin'&&u.status==='active'));
 assert.equal(a.filterUsers(a.DEMO_USERS,{...a.initialUserFilters,search:'كلمة ليس لها نتيجة'}).length,0);
});
test('email duplicate and invalid draft denied; platform-admin cannot be assigned',()=>{
 const users=a.DEMO_USERS;
 const good={name:'أحمد المطور',email:'ahmed@example.test',role:'employee',department:'شؤون الطلاب'};
 assert.deepEqual(a.validateUserDraft(good,users),{});
 assert.ok(a.validateUserDraft({...good,email:'SARA@example.test'},users).email);
 assert.ok(a.validateUserDraft({...good,email:'bad@@example.test'},users).email);
 assert.ok(a.validateUserDraft({...good,role:'platform_admin'},users).role);
 assert.ok(a.validateUserDraft({...good,name:'أ'},users).name);
 assert.ok(a.validateUserDraft({...good,department:'قسم مخترع'},users).department);
});
test('adding and editing fictional user preserves normalized unique email',()=>{
 const draft={name:'أحمد المبرمج',email:' Ahmad@Example.Test ',role:'employee',department:'شؤون الطلاب'};
 const created=a.createUser(a.DEMO_USERS,draft);assert.equal(created.ok,true);
 const added=created.users.at(-1);assert.equal(added.id,'USR-015');assert.equal(added.email,'ahmad@example.test');
 const duplicate=a.createUser(created.users,draft);assert.equal(duplicate.ok,false);
 const edited=a.editUser(created.users,added.id,{...draft,role:'manager',department:'المالية'});assert.equal(edited.ok,true);
 assert.equal(edited.users.at(-1).role,'manager');assert.equal(edited.users.at(-1).department,'المالية');
 assert.equal(a.DEMO_USERS.length,14,'fixture remains immutable');
});
test('cannot disable self or remove acting-admin role',()=>{
 assert.deepEqual(a.setUserStatus(a.DEMO_USERS,a.demoActorId,'disabled').ok,false);
 const me=a.DEMO_USERS.find(u=>u.id===a.demoActorId);
 assert.deepEqual(a.editUser(a.DEMO_USERS,me.id,{name:me.name,email:me.email,department:me.department,role:'employee'}).ok,false);
});
test('last active institutional IT admin cannot be disabled/demoted',()=>{
 const withOne=a.DEMO_USERS.map(u=>u.id==='USR-007'?{...u,status:'disabled'}:u);
 assert.equal(a.setUserStatus(withOne,'USR-003','disabled','USR-099').ok,false);
 const me=withOne.find(u=>u.id==='USR-003');
 assert.equal(a.editUser(withOne,'USR-003',{name:me.name,email:me.email,department:me.department,role:'manager'},'USR-099').ok,false);
});
test('restore from storage rejects invalid tenant, duplicate ID and removed admin',()=>{
 assert.equal(a.restoreUserFixtures(null).length,14);
 assert.equal(a.restoreUserFixtures([...a.DEMO_USERS,...a.DEMO_USERS]).length,14);
 const wrong=a.DEMO_USERS.map(u=>({...u,institution:'مؤسسة أخرى'}));assert.equal(a.restoreUserFixtures(wrong).length,14);
 const missing=a.DEMO_USERS.filter(u=>u.id!==a.demoActorId);assert.equal(a.restoreUserFixtures(missing).length,14);
 const valid=a.DEMO_USERS.map(u=>({...u}));valid[0].status='disabled';assert.equal(a.restoreUserFixtures(valid)[0].status,'disabled');
});
test('screen uses role gate, local preview persistence and explicit confirmation dialogs',()=>{
 const ui=fs.readFileSync(path.join(root,'components/user-management/UsersManagementScreen.tsx'),'utf8');
 const page=fs.readFileSync(path.join(root,'app/admin/users/page.tsx'),'utf8');
 const catchall=fs.readFileSync(path.join(root,'app/[...slug]/page.tsx'),'utf8');
 for(const needle of ['can(\'users.manage\')','DemoAccessProvider','DemoRolePicker','AdminLayout','<Drawer','<Dialog','localStorage','setUserStatus','createUser','editUser','USERS_DEMO_NOTE'])assert.ok(ui.includes(needle),needle);
 assert.match(page,/UsersManagementScreen/);assert.match(catchall,/x.path!=="\/admin\/users"/);
 assert.doesNotMatch(ui,/fetch\s*\(|axios\.|eval\s*\(/);
});
