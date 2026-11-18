import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
let ts;try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const src=fs.readFileSync(path.join(root,'lib/analytics/analytics.ts'),'utf8');
const compiled=ts.transpileModule(src,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
const mod={exports:{}};new Function('module','exports',compiled)(mod,mod.exports);
const a=mod.exports;
const samples=a.makeDemoAnalyticsRows();
const oct=a.filterSnapshot(samples,'2026-10');

test('demo monthly snapshots have six faculties and 12 departments per month',()=>{
 assert.equal(samples.length,36);
 assert.equal(a.periodOptions.length,3);
 for(const p of a.periodOptions){const s=a.summarizeRows(a.filterSnapshot(samples,p.id));assert.equal(s.faculties,6);assert.equal(s.departments,12);}
});
test('October snapshot matches the report preview demo college breakdown, including 6,320 total',()=>{
 const reportText=fs.readFileSync(path.join(root,'lib/reports/reports.ts'),'utf8');
 const expected=[['الهندسة',1250],['الطب',1380],['التجارة',1100],['العلوم',890],['التربية',950],['الآداب',750]];
 const distribution=a.facultyBreakdown(oct);
 assert.deepEqual(distribution.map(f=>[f.label,f.registered]),expected);
 assert.equal(a.summarizeRows(oct).registered,6320);
 for(const [faculty,n] of expected)assert.match(reportText,new RegExp(`label:"${faculty}",value:${n},unit:"طالب"`));
});
test('do not sum student snapshots across time: each period uses only the selected month',()=>{
 const totals=a.periodOptions.map(p=>a.summarizeRows(a.filterSnapshot(samples,p.id)).registered);
 assert.deepEqual(totals,[5850,6125,6320]);
 assert.equal(totals[2],6320);assert.notEqual(totals[0]+totals[1]+totals[2],6320);
 assert.equal(a.previousPeriod('2026-08'),null);
 assert.equal(a.previousPeriod('2026-10'),'2026-09');
});
test('faculty filter narrows to its two departments and can drill to one',()=>{
 const faculty=a.filterSnapshot(samples,'2026-10','engineering');
 assert.equal(faculty.length,2);assert.equal(a.summarizeRows(faculty).registered,1250);
 assert.equal(a.availableDepartments('engineering').length,2);
 const dept=a.filterSnapshot(samples,'2026-10','engineering','software');
 assert.equal(dept.length,1);assert.ok(dept[0].registered>0);
 assert.equal(a.filterSnapshot(samples,'2026-10','engineering','business').length,0);
});
test('success and attendance are weighted and valid; no percentages added',()=>{
 const s=a.summarizeRows(oct);
 const evaluated=oct.reduce((n,r)=>n+r.evaluated,0);
 const passed=oct.reduce((n,r)=>n+r.passed,0);
 const weightedAttendance=oct.reduce((n,r)=>n+r.registered*r.attendance,0)/6320;
 assert.equal(s.evaluated,evaluated);assert.equal(s.passed,passed);
 assert.equal(s.success,Math.round(passed/evaluated*1000)/10);
 assert.equal(s.attendance,Math.round(weightedAttendance*10)/10);
 assert.ok(s.success>0&&s.success<=100&&s.attendance>0&&s.attendance<=100);
});
test('historical trend respects selected month, department and metric',()=>{
 const f={period:'2026-09',faculty:'engineering',department:'software',metric:'attendance'};
 const trend=a.trendFor(samples,f);
 assert.equal(trend.length,2);assert.equal(trend[1].period,'2026-09');
 const expected=a.summarizeRows(a.filterSnapshot(samples,'2026-09','engineering','software'));
 assert.equal(trend[1].attendance,expected.attendance);
});
test('comparison computes percent change, with safe missing-baseline handling',()=>{
 assert.equal(a.comparison(120,100),20);
 assert.equal(a.comparison(80,100),-20);
 assert.equal(a.comparison(120,0),null);
 assert.equal(a.comparison(120,null),null);
});
test('faculty and department totals reconcile exactly with selected snapshot',()=>{
 assert.equal(a.facultyBreakdown(oct).reduce((n,r)=>n+r.registered,0),6320);
 assert.equal(a.departmentBreakdown(oct).reduce((n,r)=>n+r.registered,0),6320);
 const dept=a.departmentBreakdown(oct);assert.equal(dept.length,12);
 assert.ok(dept.every(r=>r.success>=0&&r.success<=100&&r.attendance<=100));
});
test('CSV includes demo warning, just the selected month, BOM and formula escaping',()=>{
 const csv=a.makeDemoAnalyticsCsv(oct,'2026-10');
 assert.ok(csv.startsWith('\uFEFF'));assert.match(csv,/تجريبية/);assert.match(csv,/أكتوبر 2026/);
 assert.match(csv,/الهندسة/);assert.doesNotMatch(csv,/أغسطس 2026/);
 assert.equal(csv.split('\r\n').length,oct.length+6);
 assert.equal(a.safeCsvCell('=1+1'),'"\'=1+1"');
 assert.equal(a.safeCsvCell('x"y'),'"x""y"');
});
test('screen uses manager-only capability, real filter selectors and explicit demo disclaimer',()=>{
 const view=fs.readFileSync(path.join(root,'components/analytics/AnalyticsScreen.tsx'),'utf8');
 const route=fs.readFileSync(path.join(root,'app/analytics/page.tsx'),'utf8');
 const catchall=fs.readFileSync(path.join(root,'app/[...slug]/page.tsx'),'utf8');
 const policy=fs.readFileSync(path.join(root,'lib/access/policy.ts'),'utf8');
 assert.match(view,/can\("analytics.view"\)/);assert.match(view,/can\("reports.export"\)/);
 assert.match(view,/DemoRolePicker/);assert.match(view,/ANALYTICS_DISCLAIMER/);
 assert.match(view,/makeDemoAnalyticsCsv/);assert.doesNotMatch(view,/fetch\s*\(|axios\.|eval\s*\(/);
 for(const needle of ['الشهر المرجعي','القسم الأكاديمي','مؤشر الاتجاه','ترتيب الأقسام','/reports','/analytics/outliers'])assert.ok(view.includes(needle),needle);
 assert.match(route,/AnalyticsScreen/);assert.match(catchall,/x\.path!=="\/analytics"/);
 assert.match(policy,/"analytics.view"/);
});
