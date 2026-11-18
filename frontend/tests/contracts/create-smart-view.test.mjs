import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const require=createRequire(import.meta.url);
let ts;try{ts=require('typescript');}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');}
function load(file,mocks={}){
 const js=ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const module={exports:{}};new Function('exports','module','require',js)(module.exports,module,id=>mocks[id]??require(id));return module.exports;
}
const source=load('lib/data-sources/sources.ts');
const details=load('lib/data-sources/details.ts',{'./sources':source});
const views=load('lib/smart-views/views.ts',{'../data-sources/sources':source});
const wiz=load('lib/smart-view-create/wizard.ts',{'../data-sources/sources':source,'../data-sources/details':details,'../smart-views/views':views});
const fixture=()=>({...wiz.DEFAULT_FORM,name:'ملخص الكليات الآمن',description:'مثال توضيحي لحقول الكليات دون ربط ببيانات طلبة حقيقية.',sourceId:'SRC-001',tableName:'colleges',fields:['college_name'],classification:'restricted',acknowledged:true});

test('eligible sources exclude blocked/disabled and unknown local schemas',()=>{
 const sources=wiz.eligibleSources(source.DEMO_SOURCES);
 assert.ok(sources.length>=4);
 assert.ok(sources.every(x=>x.classification!=='blocked'&&x.status!=='disabled'&&details.getSourceSchema(x).tables.length>0));
 assert.ok(!sources.some(x=>x.id==='SRC-007'));
 const local={...source.DEMO_SOURCES[0],id:'SRC-DEMO-123456',name:'Local fixture',isDemo:true};
 assert.ok(!wiz.eligibleSources([local]).length);
});
test('blocked and restricted columns never appear in selectable fields',()=>{
 const demo=source.DEMO_SOURCES.find(s=>s.id==='SRC-001');
 const students=wiz.availableTables(demo).find(x=>x.name==='students');
 assert.ok(students);
 assert.deepEqual(wiz.safeFields(students).map(x=>x.name),['enrollment_status']);
 assert.ok(!wiz.safeFields(students).some(x=>x.name==='full_name'||x.name==='student_id'));
});
test('valid wizard requires title, description, known source, table, allowed fields and acknowledgement',()=>{
 const f=fixture();assert.ok(wiz.validateAll(f).valid);
 assert.ok(!wiz.validateAll({...f,name:'أ'}).valid);
 assert.ok(!wiz.validateAll({...f,description:'قصير'}).valid);
 assert.ok(!wiz.validateAll({...f,sourceId:'SRC-007'}).valid);
 assert.ok(!wiz.validateAll({...f,sourceId:'SRC-DEMO-missing'}).valid);
 assert.ok(!wiz.validateAll({...f,fields:['student_id']}).valid);
 assert.ok(!wiz.validateAll({...f,fields:['college_name','college_name']}).valid);
 assert.ok(!wiz.validateAll({...f,acknowledged:false}).valid);
 assert.ok(!wiz.validateAll({...f,name:views.DEMO_VIEWS[0].name}).valid);
});
test('classification may never be less restrictive than source or selected fields',()=>{
 const f=fixture();assert.equal(wiz.getRequiredClass(source.DEMO_SOURCES[0],[{name:'college_name',kind:'TEXT',classification:'public',description:''}]),'restricted');
 assert.ok(!wiz.validateAll({...f,classification:'public'}).valid);
 assert.equal(wiz.clampClassification('public','masked'),'masked');
 assert.equal(wiz.clampClassification('restricted','public'),'restricted');
});
test('filters only refer to selected fields and fixed operators/values',()=>{
 const f=fixture();
 assert.ok(wiz.validateAll({...f,filterOperator:'eq',filterField:'college_name',filterValue:'2026'}).valid);
 assert.ok(!wiz.validateAll({...f,filterOperator:'eq',filterField:'full_name'}).valid);
 assert.ok(!wiz.validateAll({...f,filterOperator:'drop',filterField:'college_name'}).valid);
 assert.ok(!wiz.validateAll({...f,filterOperator:'eq',filterField:'college_name',filterValue:'test@example.com'}).valid);
});
test('descriptor is explicitly non-publishable and illustrative SQL is parameterized',()=>{
 const f={...fixture(),filterOperator:'eq',filterField:'college_name',filterValue:'approved'};
 const descriptor=wiz.buildDraftDescriptor(f);
 assert.equal(descriptor.illustrative,true);assert.equal(descriptor.publishable,false);
 assert.equal(descriptor.filter.value,'parameter-only');
 const sql=wiz.illustrativeSql(f);
 assert.match(sql,/NO QUERY EXECUTION/);
 assert.match(sql,/:filter_value/);
 assert.ok(!sql.includes('approved'));
 assert.ok(!sql.includes('INSERT')&&!sql.includes('DROP'));
 const docs=source.DEMO_SOURCES.find(x=>x.id==='SRC-003');
 const docsSchema=wiz.availableTables(docs);
 const field=wiz.safeFields(docsSchema[0])[0];
 assert.equal(wiz.illustrativeSql({...f,sourceId:docs.id,tableName:docsSchema[0].name,fields:[field.name],filterOperator:'none'}),null);
});
test('draft creation and restoration persist only strictly validated allowlisted fields',()=>{
 const f=fixture();const item=wiz.makeLocalDraft(f,'SV-DRAFT-abc12345');
 assert.equal(item.status,'draft');assert.equal(item.kind,'proposal');
 assert.equal(item.tableName,'colleges');
 const restored=wiz.restoreLocalDrafts([item]);assert.equal(restored.length,1);
 assert.deepEqual(restored[0].fields,['college_name']);
 assert.equal(wiz.addLocalDraft([],item).length,1);
 assert.throws(()=>wiz.addLocalDraft([item],item));
 assert.equal(wiz.restoreLocalDrafts([{...item,fields:['student_id']}]).length,0);
 assert.equal(wiz.restoreLocalDrafts([{...item,tableName:'students'}]).length,0);
 assert.equal(wiz.restoreLocalDrafts([{...item,classification:'public'}]).length,0);
 assert.equal(wiz.restoreLocalDrafts([{...item,status:'active'}]).length,0);
 assert.equal(wiz.restoreLocalDrafts([{...item,filterOperator:'eq',filterField:'full_name'}]).length,0);
 assert.equal(wiz.restoreLocalDrafts([{...item,credentials:'secret',fields:['college_name']}]).length,1);
 assert.ok(!('credentials' in wiz.restoreLocalDrafts([{...item,credentials:'secret'}])[0]));
});
test('maximum 12 local drafts; duplicate display names are rejected',()=>{
 const first=wiz.makeLocalDraft(fixture(),'SV-DRAFT-abc12345');
 const dozen=Array.from({length:12},(_,i)=>({...first,id:`SV-DRAFT-${String(i).padStart(8,'0')}`,name:`ملخص كليات ${i} تجريبي`}));
 assert.throws(()=>wiz.addLocalDraft(dozen,{...first,id:'SV-DRAFT-xyz98765'}));
 assert.equal(wiz.restoreLocalDrafts(dozen).length,12);
 assert.equal(wiz.restoreLocalDrafts({...first}).length,0);
});
test('app has linked real page and list integration, without database or HTTP calls',()=>{
 const page=fs.readFileSync(path.join(root,'app/admin/smart-views/new/page.tsx'),'utf8');
 const ui=fs.readFileSync(path.join(root,'components/smart-view-create/CreateSmartViewScreen.tsx'),'utf8');
 const listing=fs.readFileSync(path.join(root,'components/smart-views/SmartViewsScreen.tsx'),'utf8');
 assert.match(page,/CreateSmartViewScreen/);
 assert.match(ui,/can\('smartviews\.manage'\)/);
 assert.match(ui,/DRAFT_STORAGE_KEY/);
 assert.match(listing,/restoreLocalDrafts/);
 assert.match(listing,/href="\/admin\/smart-views\/new"/);
 assert.doesNotMatch(ui,/\bfetch\s*\(|XMLHttpRequest|axios\.|executeSQL\(/);
});
