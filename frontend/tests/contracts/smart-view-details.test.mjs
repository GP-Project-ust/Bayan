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
 const module={exports:{}};
 new Function('exports','module','require',js)(module.exports,module,id=>mocks[id]??require(id));
 return module.exports;
}
const source=load('lib/data-sources/sources.ts');
const meta=load('lib/data-sources/details.ts',{'./sources':source});
const views=load('lib/smart-views/views.ts',{'../data-sources/sources':source});
const drafts=load('lib/smart-view-create/wizard.ts',{'../data-sources/sources':source,'../data-sources/details':meta,'../smart-views/views':views});
const detail=load('lib/smart-view-details/details.ts',{'../data-sources/sources':source,'../data-sources/details':meta,'../smart-view-create/wizard':drafts,'../smart-views/views':views});
const src=id=>source.DEMO_SOURCES.find(s=>s.id===id);
const demo=views.DEMO_VIEWS[0];
const validForm=()=>({...drafts.DEFAULT_FORM,name:'ملخص الكليات الآمن',description:'معاينة تجريبية لبيانات وصفية للكليات دون بيانات أشخاص.',sourceId:'SRC-001',tableName:'colleges',fields:['college_name'],classification:'restricted',acknowledged:true});
const sampleDraft=()=>drafts.makeLocalDraft(validForm(),'SV-DRAFT-abc12345');

test('valid route IDs are tightly allowlisted, and malformed query IDs rejected',()=>{
 assert.equal(detail.normalizeViewId('SV-DEMO-01'),'SV-DEMO-01');
 assert.equal(detail.normalizeViewId('SV-PROPOSAL-03'),'SV-PROPOSAL-03');
 assert.equal(detail.normalizeViewId(sampleDraft().id),'SV-DRAFT-abc12345');
 for(const id of [undefined,'','SV-DRAFT-../../bad','SV-DEMO-99','SV-DRAFT-ABCDEFGHI','<img>','SRC-001'])assert.equal(detail.normalizeViewId(id),null);
 assert.equal(detail.findDetailView('SV-DEMO-01',views.DEMO_VIEWS)?.name,demo.name);
 assert.equal(detail.findDetailView('SV-DEMO-99',views.DEMO_VIEWS),null);
});

test('draft from screen 26 resolves by shared local storage model',()=>{
 const draft=sampleDraft();
 assert.equal(drafts.restoreLocalDrafts([draft]).length,1);
 assert.equal(detail.findDetailView(draft.id,[...views.DEMO_VIEWS,draft])?.name,draft.name);
 assert.equal(detail.isSavedDraft(draft),true);
 assert.equal(detail.isSavedDraft(demo),false);
 assert.equal(detail.schemaForDraft(draft,src(draft.sourceId))?.name,'colleges');
});

test('preview descriptor is never publishable and never suggests execution',()=>{
 const draft=sampleDraft();
 const descriptor=detail.buildDetailPreview(draft,src(draft.sourceId));
 assert.equal(descriptor.illustrative,true);
 assert.equal(descriptor.noExecution,true);
 assert.equal(descriptor.noPublication,true);
 assert.equal(descriptor.table,'colleges');
 assert.equal(descriptor.schemaOrigin,'training-fixture-only');
 assert.deepEqual(descriptor.fields,['college_name']);
 const sql=detail.illustrativeDraftQuery(draft,src('SRC-001'));
 assert.match(sql,/NO SQL EXECUTION/);
 assert.match(sql,/SELECT "college_name"/);
 assert.equal(detail.illustrativeDraftQuery(demo,src('SRC-001')),null);
 assert.equal(detail.illustrativeDraftQuery({...draft,fields:['full_name']},src('SRC-001')),null);
 const copied=JSON.stringify(detail.safeDetailDescriptor(draft,src(draft.sourceId)));
 assert.doesNotMatch(copied,/password|credential|private_key|INSERT INTO|DELETE FROM/i);
});

test('blocked or disabled source never produces a preview or rows',()=>{
 const banned={...src('SRC-001'),classification:'blocked'};
 const disabled={...src('SRC-001'),status:'disabled'};
 for(const item of [banned,disabled,undefined]){
  assert.equal(detail.buildDetailPreview(demo,item),null);
  assert.deepEqual(detail.syntheticRows(demo,item),[]);
  assert.equal(detail.runLocalInspection(demo,item).verdict,'blocked');
 }
});

test('fabricated rows have an allowlist and never contain individual records',()=>{
 const draft=sampleDraft();
 const rows=detail.syntheticRows(draft,src('SRC-001'));
 assert.equal(rows.length,2);assert.deepEqual(Object.keys(rows[0]),['college_name']);
 assert.match(rows[0].college_name,/افتراضية/);
 assert.deepEqual(detail.syntheticRows({...draft,fields:['full_name']},src('SRC-001')),[]);
 assert.deepEqual(detail.syntheticRows({...draft,fields:['unknown_column']},src('SRC-001')),[]);
});

test('classification mismatch causes review and never fabricates rows',()=>{
 const inspect=detail.runLocalInspection(demo,src('SRC-001'));
 assert.equal(inspect.verdict,'review');
 assert.deepEqual(inspect.rows,[]);
 assert.equal(inspect.checks.find(c=>c.id==='classification').result,'warning');
 assert.equal(inspect.checks.find(c=>c.id==='publication').result,'warning');
});

test('well formed local draft passes training-only check, without publication',()=>{
 const draft=sampleDraft();
 const inspect=detail.runLocalInspection(draft,src('SRC-001'));
 assert.equal(inspect.verdict,'valid-training-example');
 assert.equal(inspect.checks.filter(c=>c.result==='pass').length,3);
 assert.equal(inspect.rows.length,2);
 assert.match(inspect.message,/محلي/);
});

test('unrecognized table/field cannot be smuggled through a locally forged draft',()=>{
 const draft=sampleDraft();
 const forged={...draft,tableName:'payments'};
 assert.equal(detail.schemaForDraft(forged,src('SRC-001')),null);
 assert.equal(detail.buildDetailPreview(forged,src('SRC-001')),null);
 const forbidden={...draft,fields:['student_id']};
 assert.equal(detail.schemaForDraft(forbidden,src('SRC-001')),null);
 assert.deepEqual(detail.syntheticRows(forbidden,src('SRC-001')),[]);
});

test('real page and list/new screen links exist, no remote network or SQL calls',()=>{
 const page=fs.readFileSync(path.join(root,'app/admin/smart-views/details/page.tsx'),'utf8');
 const ui=fs.readFileSync(path.join(root,'components/smart-view-details/SmartViewDetailsScreen.tsx'),'utf8');
 const listing=fs.readFileSync(path.join(root,'components/smart-views/SmartViewsScreen.tsx'),'utf8');
 const create=fs.readFileSync(path.join(root,'components/smart-view-create/CreateSmartViewScreen.tsx'),'utf8');
 assert.match(page,/SmartViewDetailsScreen/);
 assert.match(page,/searchParams/);
 assert.match(ui,/can\('smartviews\.manage'\)/);
 assert.match(ui,/runLocalInspection/);
 assert.match(ui,/DRAFT_STORAGE_KEY/);
 assert.match(listing,/\/admin\/smart-views\/details\?id=/);
 assert.match(create,/\/admin\/smart-views\/details\?id=/);
 assert.doesNotMatch(ui,/\bfetch\s*\(|XMLHttpRequest|axios\.|executeSQL\(|\.query\s*\(/);
 assert.doesNotMatch(fs.readFileSync(path.join(root,'lib/smart-view-details/details.ts'),'utf8'),/\bfetch\s*\(|XMLHttpRequest|axios\.|executeSQL\(/);
});
