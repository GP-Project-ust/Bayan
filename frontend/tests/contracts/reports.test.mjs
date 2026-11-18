import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {createRequire} from "node:module";
import path from "node:path";
import {fileURLToPath} from "node:url";
const require=createRequire(import.meta.url);
let ts;try{ts=require("typescript");}catch{ts=require("/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js");}
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const code=fs.readFileSync(path.join(root,"lib/reports/reports.ts"),"utf8");
const js=ts.transpileModule(code,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
const obj={exports:{}};
new Function("module","exports","require",js)(obj,obj.exports,()=>{throw Error("Unexpected dependency")});
const lib=obj.exports;
test("12 uniquely identified reports use explicitly fictional titles and sources",()=>{
 const reports=lib.makeDemoReports();assert.equal(reports.length,12);assert.equal(new Set(reports.map(r=>r.id)).size,12);
 assert.ok(reports.every(r=>r.title.includes("مثال تدريبي")&&r.source.includes("تدريبي")));
 assert.ok(reports.every(r=>r.status!=="ready"||r.rows.length>0));
});
test("Arabic normalization, filtering by type/status/month and empty result",()=>{
 const reports=lib.makeDemoReports(),f=lib.initialReportFilters;
 assert.ok(lib.filterReports(reports,{...f,query:"اعداد الطلاب"}).some(r=>r.id==="rep-101"));
 assert.equal(lib.filterReports(reports,{...f,query:"توزيع الطلاب"}).length,1);
 assert.ok(lib.filterReports(reports,{...f,query:"الاداء"}).some(r=>r.id==="rep-102"));
 assert.ok(lib.filterReports(reports,{...f,kind:"academic"}).every(r=>r.kind==="academic"));
 assert.equal(lib.filterReports(reports,{...f,status:"failed"}).length,1);
 assert.ok(lib.filterReports(reports,{...f,month:"2026-11"}).every(r=>r.createdAt.startsWith("2026-11")));
 assert.deepEqual(lib.filterReports(reports,{...f,query:"غير موجود إطلاقا"}),[]);
});
test("sort is stable, default newest, title respects Arabic order",()=>{
 const original=lib.makeDemoReports(),f=lib.initialReportFilters;
 const newest=lib.filterReports(original,f);
 assert.ok(newest.every((r,i)=>i===0||newest[i-1].createdAt>=r.createdAt));
 const byTitle=lib.filterReports(original,{...f,sort:"title"});
 assert.ok(byTitle.every((r,i)=>i===0||byTitle[i-1].title.localeCompare(r.title,"ar")<=0));
 assert.equal(original[0].id,"rep-101");
});
test("stats add up exactly to total",()=>{
 const stats=lib.reportStats(lib.makeDemoReports());
 assert.equal(stats.total,12);assert.equal(stats.ready+stats.processing+stats.needsAttention,stats.total);
});
test("CSV can be exported only for ready report and authorized role",()=>{
 const reports=lib.makeDemoReports(),ready=reports.find(r=>r.status==="ready"),failed=reports.find(r=>r.status==="failed");
 assert.equal(lib.canDownloadReport(ready,false),false);
 assert.equal(lib.canDownloadReport(ready,true),true);
 assert.equal(lib.canDownloadReport(failed,true),false);
 assert.throws(()=>lib.makeDemoReportCsv(failed));
 const csv=lib.makeDemoReportCsv(ready);
 assert.ok(csv.startsWith("\uFEFF"));
 assert.match(csv,/بيانات تجريبية غير رسمية/);
 assert.match(csv,/الهندسة/);
 assert.match(csv,/\r\n/);
});
test("CSV cells escape quotes and spreadsheet formulas",()=>{
 assert.equal(lib.csvCell('x"y'),'"x""y"');
 assert.equal(lib.csvCell("=HYPERLINK(\"bad\")"),'"\'=HYPERLINK(""bad"")"');
 assert.equal(lib.csvCell("-1"),'"\'-1"');
});
test("fictional report data are copied defensively; no network/storage usage",()=>{
 const a=lib.makeDemoReports(),b=lib.makeDemoReports();a[0].rows[0].value=-100;assert.ok(b[0].rows[0].value>0);
 assert.doesNotMatch(code,/fetch\s*\(|localStorage|document\.cookie/);
});
