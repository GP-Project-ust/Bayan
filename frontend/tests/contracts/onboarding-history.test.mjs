import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const require=createRequire(import.meta.url);
let ts;try{ts=require('typescript');}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');}
function compile(file,overrides={}){
 const src=fs.readFileSync(path.join(root,file),'utf8');
 const js=ts.transpileModule(src,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 const mod={exports:{}};new Function('module','exports','require',js)(mod,mod.exports,(name)=>overrides[name]??require(name));return mod.exports;
}
const org=compile('lib/organizations/organizations.ts');
const wizard=compile('lib/onboarding/onboarding.ts',{'../organizations/organizations':org});
const h=compile('lib/onboarding-history/history.ts',{'../organizations/organizations':org,'../onboarding/onboarding':wizard});
const ready=()=>({...wizard.DEFAULT_ONBOARDING_FORM,analysisDone:true,indexingDone:true,acknowledged:true,selectedViews:['student_counts']});
const sampleRun=()=>h.DEMO_HISTORY.find(x=>x.id==='ONB-DEMO-0006');
const createStore=()=>{const data=new Map();return {data,getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};};
test('history path exists in unchanged 42-screen catalog',()=>{
 const catalog=JSON.parse(fs.readFileSync(path.join(root,'lib/screen-catalog.json'),'utf8'));
 assert.equal(catalog.length,42);assert.ok(catalog.some(x=>x.path==='/platform/onboarding/history'));
});
test('eight synthetic runs are consistent, six staged and never include credentials',()=>{
 assert.equal(h.DEMO_HISTORY.length,8);
 const statuses=new Set(h.DEMO_HISTORY.map(x=>x.status));
 assert.deepEqual([...statuses].sort(),['completed','failed','in_progress','paused']);
 for(const x of h.DEMO_HISTORY){assert.equal(x.steps.length,6);assert.equal(x.origin,'fixture');assert.ok(x.steps.every((s,i)=>s.key===i));assert.ok(x.organizationName.includes('التجريب')||x.organizationName.includes('الافتراض'));}
 assert.doesNotMatch(JSON.stringify(h.DEMO_HISTORY),/password|access_token|apiKey|Bearer\s/i);
});
test('statistics reflect all outcome categories',()=>{
 const stat=h.historyStats(h.DEMO_HISTORY);assert.equal(stat.total,8);assert.equal(stat.completed,3);assert.equal(stat.failed,3);assert.equal(stat.attention,2);
});
test('Arabic search works for organization and ID',()=>{
 const filter={...h.DEFAULT_HISTORY_FILTERS,query:'جامعه الافق'};
 assert.deepEqual(h.filterHistory(h.DEMO_HISTORY,filter).map(x=>x.id),['ONB-DEMO-0001']);
 assert.equal(h.filterHistory(h.DEMO_HISTORY,{...filter,query:'ONB-DEMO-0008'}).length,1);
});
test('status, organization, date and failure-step filters combine',()=>{
 assert.equal(h.filterHistory(h.DEMO_HISTORY,{...h.DEFAULT_HISTORY_FILTERS,status:'failed'}).length,3);
 assert.equal(h.filterHistory(h.DEMO_HISTORY,{...h.DEFAULT_HISTORY_FILTERS,organization:'ORG-DEMO-002'}).length,2);
 assert.deepEqual(h.filterHistory(h.DEMO_HISTORY,{...h.DEFAULT_HISTORY_FILTERS,stage:'4'}).map(x=>x.id),['ONB-DEMO-0006']);
 assert.ok(h.filterHistory(h.DEMO_HISTORY,{...h.DEFAULT_HISTORY_FILTERS,from:'2026-11-01',to:'2026-11-07'}).every(x=>x.startedAt.slice(0,10)>='2026-11-01'));
});
test('reversed dates fail validation and disable results',()=>{
 assert.equal(h.validHistoryDates({from:'2026-11-07',to:'2026-10-01'}),false);
 assert.deepEqual(h.filterHistory(h.DEMO_HISTORY,{...h.DEFAULT_HISTORY_FILTERS,from:'2026-11-07',to:'2026-10-01'}),[]);
});
test('ID validation and matching reject malformed and missing runs',()=>{
 assert.equal(h.findHistory(h.DEMO_HISTORY,'ONB-DEMO-0001')?.organizationId,'ORG-DEMO-001');
 assert.equal(h.findHistory(h.DEMO_HISTORY,'ONB-DEMO-9999'),null);
 assert.equal(h.findHistory(h.DEMO_HISTORY,'../ONB-DEMO-0001'),null);
});
test('local simulation completion is persisted without credentials and reloadable',()=>{
 const store=createStore();const result=h.appendCompletedHistory(store,{...ready(),password:'SECRET-SHOULD-NOT-BE-STORED',apiKey:'SECRET'},'ONB-LOCAL-1794072000000-abc1','2026-11-07T10:00:00.000Z');
 assert.equal(result.status,'completed');assert.equal(result.origin,'browser');
 assert.equal(h.readLocalHistory(store).length,1);assert.equal(h.stageProgress(result),6);
 assert.doesNotMatch(store.getItem(h.HISTORY_STORAGE_KEY),/SECRET|password|apiKey|access_token|content|Bearer/i);
});
test('reusing local run ID replaces record and corrupted local history cannot leak data',()=>{
 const store=createStore();const id='ONB-LOCAL-1794072000000-abc1';
 h.appendCompletedHistory(store,ready(),id,'2026-11-07T10:00:00.000Z');
 h.appendCompletedHistory(store,ready(),id,'2026-11-07T10:00:00.000Z');
 assert.equal(h.readLocalHistory(store).length,1);
 store.setItem(h.HISTORY_STORAGE_KEY,JSON.stringify([{id:'ONB-LOCAL-1794072000000-abc1',status:'completed',organizationName:'X',sources:['postgresql'],startedAt:'2026-11-07T10:00:00.000Z',finishedAt:'2026-11-07T10:00:00.000Z'}]));
 assert.deepEqual(h.readLocalHistory(store),[]);
 store.setItem(h.HISTORY_STORAGE_KEY,'{not-json');assert.deepEqual(h.readLocalHistory(store),[]);
});
test('retry prepares a fresh draft only for eligible failure or paused runs',()=>{
 const eligible=sampleRun();assert.equal(h.canPrepareRetry(eligible),true);
 const draft=h.retryDraft(eligible);assert.ok(draft);assert.equal(draft.analysisDone,false);assert.equal(draft.indexingDone,false);assert.deepEqual(draft.selectedViews,[]);
 assert.equal(draft.acknowledged,false);assert.equal(h.canPrepareRetry(h.DEMO_HISTORY[0]),false);
 assert.equal(h.canPrepareRetry(h.DEMO_HISTORY[2]),false); // paused institution only, not eligible
 const store=createStore();assert.equal(h.prepareRetry(store,eligible),true);assert.ok(store.getItem(wizard.DRAFT_KEY));
 assert.doesNotMatch(store.getItem(wizard.DRAFT_KEY),/password|secret|apiKey|Bearer/i);
});
test('CSV escapes spreadsheet formulas and includes only metadata',()=>{
 const csv=h.historyCsv([{...h.DEMO_HISTORY[0],organizationName:'=HYPERLINK("https://example.invalid")'}]);
 assert.match(csv,/"'=HYPERLINK/);assert.match(csv,/\r\n/);assert.doesNotMatch(csv,/password|apiKey|access_token/i);
});
test('history view is platform-only and uses no backend network',()=>{
 const src=fs.readFileSync(path.join(root,'components/onboarding-history/OnboardingHistoryScreen.tsx'),'utf8');
 assert.match(src,/can\('platform\.manage'\)/);assert.match(src,/can\('onboarding\.run'\)/);
 assert.match(src,/DemoRolePicker/);assert.match(src,/PlatformLayout/);assert.match(src,/data-testid="onboarding-history-screen"/);
 assert.match(src,/prepareRetry/);assert.match(src,/historyCsv/);
 assert.doesNotMatch(src,/\bfetch\s*\(|axios\.|XMLHttpRequest|EventSource|WebSocket/);
});
test('wizard stores completed summaries locally and offers history link',()=>{
 const wizardScreen=fs.readFileSync(path.join(root,'components/onboarding/OnboardingScreen.tsx'),'utf8');
 assert.match(wizardScreen,/appendCompletedHistory/);
 assert.match(wizardScreen,/\/platform\/onboarding\/history/);
});
test('invalid calendar dates and incomplete simulation cannot be saved as completed',()=>{
 assert.equal(h.validHistoryDates({from:'2026-02-30',to:'2026-03-01'}),false);
 const store=createStore();
 assert.throws(()=>h.appendCompletedHistory(store,{...ready(),acknowledged:false},'ONB-LOCAL-1794072000000-abc1','2026-11-07T10:00:00.000Z'));
 assert.equal(store.getItem(h.HISTORY_STORAGE_KEY),null);
});
