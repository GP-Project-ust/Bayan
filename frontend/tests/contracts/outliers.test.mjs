import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
let ts;try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js')}
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
function loadModule(file,inject={}){
 const src=fs.readFileSync(path.join(root,file),'utf8');
 const compiled=ts.transpileModule(src,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 const mod={exports:{}};new Function('module','exports','require',compiled)(mod,mod.exports,name=>inject[name]??require(name));return mod.exports;
}
const analytics=loadModule('lib/analytics/analytics.ts');
const a=loadModule('lib/outliers/outliers.ts',{'../analytics/analytics':analytics});
const cases=a.makeDemoOutliers();

test('cases are distinct fixtures across three academic snapshots',()=>{
 assert.equal(cases.length,18);assert.equal(new Set(cases.map(r=>r.id)).size,18);
 assert.equal(cases.filter(r=>r.period==='2026-10').length,12);
 assert.deepEqual(new Set(cases.map(r=>r.period)),new Set(['2026-08','2026-09','2026-10']));
});
test('observed values reconcile exactly to screen 16 demo rows',()=>{
 const rows=analytics.makeDemoAnalyticsRows();
 for(const anomaly of cases){const row=rows.find(r=>r.period===anomaly.period&&r.department===anomaly.department);assert.ok(row);
  assert.equal(anomaly.observed,a.observedMetric(row,anomaly.metric));
  assert.equal(anomaly.facultyLabel,row.facultyLabel);assert.equal(anomaly.departmentLabel,row.departmentLabel);
  assert.ok(anomaly.baseline>0);assert.ok(Number.isFinite(anomaly.deltaPct));
  if(['success','attendance'].includes(anomaly.metric))assert.ok(anomaly.baseline<=100,'percent baseline must not exceed 100');
  else assert.ok(Number.isInteger(anomaly.baseline),'student count baseline must be integral');
 }
});
test('severity is a transparent deterministic threshold of absolute deviation',()=>{
 for(const row of cases)assert.equal(row.severity,a.severityFromDeviation(row.deltaPct));
 assert.equal(a.severityFromDeviation(26),'critical');assert.equal(a.severityFromDeviation(-18),'high');
 assert.equal(a.severityFromDeviation(10),'medium');assert.equal(a.severityFromDeviation(-8),'low');
});
test('default October filter has 12 cases, faculty and department filters are consistent',()=>{
 const defaultRows=a.filterOutliers(cases,a.initialOutlierFilters);assert.equal(defaultRows.length,12);
 const faculty=a.filterOutliers(cases,{...a.initialOutlierFilters,faculty:'engineering'});
 assert.equal(faculty.length,2);assert.ok(faculty.every(x=>x.faculty==='engineering'));
 const dept=a.filterOutliers(cases,{...a.initialOutlierFilters,faculty:'engineering',department:'software'});
 assert.equal(dept.length,1);assert.equal(dept[0].id,'OUT-101');
});
test('search normalizes Arabic; severity and status filters do not bypass other constraints',()=>{
 assert.equal(a.normalizeArabic('إدارة'),a.normalizeArabic('ادارة'));
 const hit=a.filterOutliers(cases,{...a.initialOutlierFilters,search:'الهندسة'});assert.equal(hit.length,2);
 const critical=a.filterOutliers(cases,{...a.initialOutlierFilters,severity:'critical'});
 assert.ok(critical.length>=1);assert.ok(critical.every(x=>x.severity==='critical'));
 const reviewed=a.filterOutliers(cases,{...a.initialOutlierFilters,status:'reviewed'});
 assert.ok(reviewed.every(x=>x.status==='reviewed'));
 assert.equal(a.filterOutliers(cases,{...a.initialOutlierFilters,search:'قيمة غير موجودة للبحث'}).length,0);
});
test('summary counts match filtered rows and do not double count periods',()=>{
 const rows=a.filterOutliers(cases,a.initialOutlierFilters);const stats=a.summarizeOutliers(rows);
 assert.equal(stats.total,12);assert.equal(stats.critical,rows.filter(r=>r.severity==='critical').length);
 assert.equal(stats.pending+stats.reviewed,stats.total);
});
test('CSV is a real UTF-8 BOM snapshot with disclaimer and safely escaped content',()=>{
 const csv=a.makeDemoOutlierCsv(a.filterOutliers(cases,a.initialOutlierFilters));
 assert.ok(csv.startsWith('\uFEFF'));assert.match(csv,/خطوط الأساس/);assert.match(csv,/OUT-101/);
 assert.doesNotMatch(csv,/OUT-117/);assert.match(csv,/أكتوبر 2026/);
 assert.equal(csv.split('\r\n').length,12+5);
 const injection=a.makeDemoOutlierCsv([{...cases[0],departmentLabel:'=DANGEROUS'}]);
 assert.match(injection,/"'=DANGEROUS"/);
});
test('UI route has permission, detail drawer, local demo review and no fake backend',()=>{
 const view=fs.readFileSync(path.join(root,'components/outliers/OutliersScreen.tsx'),'utf8');
 const route=fs.readFileSync(path.join(root,'app/analytics/outliers/page.tsx'),'utf8');
 const catchall=fs.readFileSync(path.join(root,'app/[...slug]/page.tsx'),'utf8');
 const policy=fs.readFileSync(path.join(root,'lib/access/policy.ts'),'utf8');
 for(const needle of ['can(\'analytics.view\')','can(\'reports.export\')','DemoRolePicker','Drawer','OUTLIERS_DISCLAIMER','localStorage','filterOutliers','CompareBars','/analytics']) assert.ok(view.includes(needle),needle);
 assert.doesNotMatch(view,/fetch\s*\(|axios\.|eval\s*\(/);assert.match(route,/OutliersScreen/);
 assert.match(catchall,/x.path!=="\/analytics\/outliers"/);assert.match(policy,/analytics.view/);
});
