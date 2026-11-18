import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const require=createRequire(import.meta.url);
let ts;try{ts=require('typescript');}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');}
function load(filename,extra={}){
 const code=ts.transpileModule(fs.readFileSync(path.join(root,filename),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const module={exports:{}};new Function('exports','module','require',code)(module.exports,module,id=>extra[id]??require(id));return module.exports;
}
const sources=load('lib/data-sources/sources.ts');
const views=load('lib/smart-views/views.ts',{'../data-sources/sources':sources});
const lookup=Object.fromEntries(sources.DEMO_SOURCES.map(s=>[s.id,s.name]));
const fixture=()=>views.DEMO_VIEWS;
test('Smart Views fixtures match four examples in the previous source-detail schema',()=>{
 const details=load('lib/data-sources/details.ts',{'./sources':sources});
 const inherited=sources.DEMO_SOURCES.flatMap(source=>details.getSourceSchema(source).smartViews.map(view=>({sourceId:source.id,...view})));
 assert.equal(inherited.length,4);
 for(const row of inherited){const item=fixture().find(v=>v.id===row.id);assert.ok(item,row.id);assert.equal(item.sourceId,row.sourceId);assert.deepEqual([...item.fields],[...row.columns]);}
});
test('proposed views are explicitly marked draft and never presented as published',()=>{
 const proposals=fixture().filter(v=>v.kind==='proposal');assert.equal(proposals.length,3);
 assert.ok(proposals.every(v=>v.status==='draft'));
 assert.ok(fixture().every(v=>!v.description.includes('بيانات فعلية')));
});
test('all visible views have safe field identifiers and do not depend on blocked sources',()=>{
 const visibles=views.visibleSmartViews(fixture(),sources.DEMO_SOURCES);
 assert.equal(visibles.length,fixture().length);
 assert.ok(visibles.every(v=>v.fields.every(f=>/^[a-z][a-z0-9_]*$/.test(f))));
 assert.equal(visibles.filter(v=>v.sourceId==='SRC-007').length,0);
 const blocked={...fixture()[0],id:'SV-BAD',sourceId:'SRC-007'};
 assert.equal(views.visibleSmartViews([blocked],sources.DEMO_SOURCES).length,0);
 assert.equal(views.visibleSmartViews([{...blocked,sourceId:'SRC-001',fields:['email;DELETE FROM accounts']}],sources.DEMO_SOURCES).length,0);
});
test('Arabic search is normalized and matches name, field and source',()=>{
 const base=fixture();
 assert.ok(views.filterSmartViews(base,{...views.DEFAULT_VIEW_FILTERS,query:'احصاء التسجيل'},lookup).some(v=>v.id==='SV-DEMO-01'));
 assert.ok(views.filterSmartViews(base,{...views.DEFAULT_VIEW_FILTERS,query:'registered_count'},lookup).some(v=>v.id==='SV-DEMO-01'));
 assert.ok(views.filterSmartViews(base,{...views.DEFAULT_VIEW_FILTERS,query:'شؤون الطلاب'},lookup).some(v=>v.id==='SV-DEMO-03'));
});
test('status, class, source and proposal filters work without mutating fixtures',()=>{
 const base=fixture();const before=JSON.stringify(base);
 assert.ok(views.filterSmartViews(base,{...views.DEFAULT_VIEW_FILTERS,status:'active'},lookup).every(v=>v.status==='active'));
 assert.ok(views.filterSmartViews(base,{...views.DEFAULT_VIEW_FILTERS,classification:'public'},lookup).every(v=>v.classification==='public'));
 assert.ok(views.filterSmartViews(base,{...views.DEFAULT_VIEW_FILTERS,sourceId:'SRC-001'},lookup).every(v=>v.sourceId==='SRC-001'));
 assert.ok(views.filterSmartViews(base,{...views.DEFAULT_VIEW_FILTERS,kind:'proposal'},lookup).every(v=>v.kind==='proposal'));
 assert.equal(JSON.stringify(base),before);
});
test('local state restoration is strictly allowlisted to a single demo view',()=>{
 const restored=views.restoreViewStates({'SV-DEMO-01':'paused','SV-DEMO-02':'active',secret:'token'});
 assert.deepEqual(restored,{'SV-DEMO-01':'paused'});
 assert.deepEqual(views.restoreViewStates({'SV-DEMO-01':'bad'}),{});
 assert.deepEqual(views.restoreViewStates(['paused']),{});
 const updated=views.applyViewStates(fixture(),restored);
 assert.equal(updated.find(v=>v.id==='SV-DEMO-01').status,'paused');
 assert.equal(updated.find(v=>v.id==='SV-DEMO-02').status,'draft');
 assert.equal(fixture()[0].status,'active');
});
test('only safe fixture may be paused; disabled or blocked source cannot activate view',()=>{
 const first=fixture()[0];const source=sources.DEMO_SOURCES.find(s=>s.id==='SRC-001');
 assert.equal(views.canToggleView(first,source),true);
 assert.equal(views.canToggleView(first,{...source,status:'disabled'}),false);
 assert.equal(views.canToggleView(first,{...source,classification:'blocked'}),false);
 assert.equal(views.canToggleView(first,undefined),false);
 assert.equal(views.canToggleView(fixture()[1],source),false);
 assert.equal(views.canToggleView({...first,kind:'proposal'},source),false);
});
test('stats, strict IDs and preview descriptor are deterministic and do not include secrets',()=>{
 assert.equal(views.viewStats(fixture()).total,7);
 assert.equal(views.viewStats(fixture()).active,1);
 assert.equal(views.findSmartView('SV-DEMO-01',fixture())?.id,'SV-DEMO-01');
 assert.equal(views.findSmartView('../../secret',fixture()),null);
 const config=views.buildViewReview(fixture()[0]);
 assert.deepEqual(Object.keys(config).sort(),['name','sourceId','fields','classification','scope','status','illustrative'].sort());
 assert.equal(config.illustrative,true);
 assert.ok(!('credentials' in config));
});
test('route uses shared permission and design system, does not execute SQL or call network',()=>{
 const page=fs.readFileSync(path.join(root,'app/admin/smart-views/page.tsx'),'utf8');
 const ui=fs.readFileSync(path.join(root,'components/smart-views/SmartViewsScreen.tsx'),'utf8');
 const sidebar=fs.readFileSync(path.join(root,'components/Sidebar.tsx'),'utf8');
 assert.match(page,/SmartViewsScreen/);assert.match(ui,/can\('smartviews\.manage'\)/);
 assert.match(ui,/DemoAccessProvider/);assert.match(ui,/visibleSmartViews/);
 assert.match(ui,/VIEW_STORAGE_KEY/);assert.match(sidebar,/href="\/admin\/smart-views"/);
 assert.doesNotMatch(ui,/\bfetch\s*\(|axios\.|XMLHttpRequest\b|executeSQL\(/);
});
