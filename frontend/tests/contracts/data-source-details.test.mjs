import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const require=createRequire(import.meta.url);
let ts;try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}
function load(filename,extras={}){const code=ts.transpileModule(fs.readFileSync(path.join(root,filename),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;const m={exports:{}};new Function('exports','module','require',code)(m.exports,m,(id)=>extras[id]??require(id));return m.exports;}
const sources=load('lib/data-sources/sources.ts');
const details=load('lib/data-sources/details.ts',{'./sources':sources});
const connect=load('lib/data-sources/connect.ts',{'./sources':sources});
const get=(id)=>sources.DEMO_SOURCES.find(s=>s.id===id);
test('IDs are strictly normalized and invalid/missing identifiers rejected',()=>{
 assert.equal(details.normalizeSourceId('SRC-001'),'SRC-001');
 assert.equal(details.normalizeSourceId('SRC-DEMO-test1234'),'SRC-DEMO-test1234');
 for(const bad of ['SRC-../../secret','SRC-1','SRC-DEMO-#','../../','SRC-001?x=1'])assert.equal(details.normalizeSourceId(bad),null,bad);
 assert.equal(details.findDemoSource(sources.DEMO_SOURCES,'SRC-001')?.id,'SRC-001');
 assert.equal(details.findDemoSource(sources.DEMO_SOURCES,'SRC-999'),null);
});
test('original academic source provides labeled fiction-only sample tables and fields',()=>{
 const schema=details.getSourceSchema(get('SRC-001'));
 assert.ok(schema.tables.length>=2);
 assert.ok(schema.tables.some(t=>t.name==='students'));
 assert.match(schema.note,/أمثلة|تعليمية/);
 assert.ok(schema.tables.every(t=>t.rowCountLabel.includes('غير متاح')));
 assert.ok(schema.tables.flatMap(t=>t.fields).some(f=>f.classification==='blocked'));
});
test('sources marked blocked expose no simulated schema, views or fields',()=>{
 const schema=details.getSourceSchema(get('SRC-007'));
 assert.equal(schema.tables.length,0);assert.equal(schema.smartViews.length,0);
 assert.equal(details.sourceDetailSummary(get('SRC-007')).sampleFields,0);
});
test('newly configured local sources do not inherit invented schemas',()=>{
 const good={...connect.DEFAULT_WIZARD,name:'قاعدة بيانات تدريبية جديدة',acknowledged:true};
 const entry=connect.createDemoSource(good,'SRC-DEMO-sample12345');
 assert.equal(details.getSourceSchema(entry).tables.length,0);
 assert.equal(details.getSourceSchema(entry).smartViews.length,0);
 assert.equal(details.findDemoSource([...sources.DEMO_SOURCES,entry],entry.id)?.name,entry.name);
});
test('field classification counts are deterministic and do not count rows',()=>{
 const schema=details.getSourceSchema(get('SRC-001'));
 const sums=details.aggregateClassification(schema.tables);
 assert.equal(sums.length,4);
 assert.deepEqual(sums.map(x=>x.level),['public','masked','restricted','blocked']);
 assert.equal(sums.reduce((s,x)=>s+x.count,0),schema.tables.reduce((s,x)=>s+x.fields.length,0));
});
test('review list restores only allowlisted fields and no free text',()=>{
 const item=details.makeReview(get('SRC-001'),'schema','2026-11-07T18:00:00.000Z');
 const restored=details.restoreReviews({'SRC-001':{...item,apiKey:'secret',note:'private'},'SRC-002':{sourceId:'SRC-002',reason:'unknown',status:'pending',updatedAt:item.updatedAt},'evil':item});
 assert.deepEqual(Object.keys(restored),['SRC-001']);
 assert.equal(restored['SRC-001'].reason,'schema');
 assert.deepEqual(Object.keys(restored['SRC-001']).sort(),['reason','sourceId','status','updatedAt'].sort());
 assert.throws(()=>details.makeReview(get('SRC-007'),'schema',item.updatedAt));
});
test('demonstration tests and descriptive events do not contact a network',()=>{
 assert.match(details.sourceDetailSummary(get('SRC-001')).probe.description,/لم يُرسل أي طلب/);
 assert.match(details.sourceActivity(get('SRC-001'))[0].detail,/لم يُسترجع/);
 assert.match(details.sourceActivity(get('SRC-001'))[1].detail,/لا تمثل فحصًا فعليًا/);
});
test('route and list share details URL and authorization while keeping reference screens intact',()=>{
 const page=fs.readFileSync(path.join(root,'app/admin/data-sources/details/page.tsx'),'utf8');
 const comp=fs.readFileSync(path.join(root,'components/source-details/SourceDetailsScreen.tsx'),'utf8');
 const list=fs.readFileSync(path.join(root,'components/data-sources/DataSourcesScreen.tsx'),'utf8');
 assert.match(page,/searchParams/);assert.match(comp,/can\('sources\.manage'\)/);
 assert.match(comp,/restoreCreatedSources/);assert.match(comp,/SOURCE_REVIEW_STORAGE_KEY/);
 assert.match(comp,/محاكاة اختبار الاتصال/);assert.match(list,/\/admin\/data-sources\/details\?id=/);
 assert.doesNotMatch(comp,/\bfetch\s*\(|\bXMLHttpRequest\b|axios\./);
 assert.doesNotMatch(comp,/password|secretKey|tokenValue/i);
});
