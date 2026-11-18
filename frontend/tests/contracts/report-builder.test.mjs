import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
let ts;try{ts=require("typescript");}catch{ts=require("/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js");}
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const code=fs.readFileSync(path.join(root,"lib/reports/builder.ts"),"utf8");
const js=ts.transpileModule(code,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
const exports={};const module={exports};
new Function("module","exports","require",js)(module,exports,(name)=>{throw new Error("Unexpected runtime module "+name);});
const lib=module.exports;
const clone=obj=>JSON.parse(JSON.stringify(obj));
test("all fictional sources and metrics have stable unique IDs and valid parent sources",()=>{
 const sources=lib.sourceCatalog,metrics=lib.metricCatalog;
 assert.equal(sources.length,5);assert.equal(metrics.length,10);
 assert.equal(new Set(sources.map(x=>x.id)).size,sources.length);
 assert.equal(new Set(metrics.map(x=>x.id)).size,metrics.length);
 assert.ok(metrics.every(x=>sources.some(s=>s.id===x.sourceId)));
 assert.ok(sources.every(s=>/تدريبي|تجريبي/.test(s.scope)));
});
test("initial builder is empty; demo template meets validation on steps 1–3",()=>{
 assert.equal(lib.emptyBuilderForm.title,"");assert.deepEqual(lib.emptyBuilderForm.sourceIds,[]);
 assert.deepEqual(lib.validateBuilder(lib.sampleTemplate),{});
 assert.equal(lib.steps.length,4);
});
test("removing a source removes orphaned metrics and keeps unrelated metrics",()=>{
 const form={...clone(lib.sampleTemplate),sourceIds:["students","performance"],metricIds:["students_total","performance_average"]};
 const next=lib.selectSource(form,"students");
 assert.deepEqual(next.sourceIds,["performance"]);assert.deepEqual(next.metricIds,["performance_average"]);
});
test("cannot choose a metric from a non-selected source",()=>{
 const form=clone(lib.sampleTemplate);
 const next=lib.selectMetric(form,"attendance_rate");assert.equal(next,form);
 assert.deepEqual(next.metricIds,form.metricIds);
});
test("title and description lengths are validated; name and goal have explicit bounds",()=>{
 const form=clone(lib.sampleTemplate);form.title="قصير";form.objective="نص";
 const e=lib.validateStep(form,1);assert.ok(e.title&&e.objective);
 form.title="ت".repeat(101);form.objective="ا".repeat(501);assert.ok(lib.validateStep(form,1).title&&lib.validateStep(form,1).objective);
});
test("at least one source and its metric required, maximum 6 metrics",()=>{
 const form=clone(lib.sampleTemplate);form.sourceIds=[];form.metricIds=[];
 assert.ok(lib.validateStep(form,2).sourceIds&&lib.validateStep(form,2).metricIds);
 form.sourceIds=["students"];form.metricIds=["attendance_rate"];
 assert.ok(lib.validateStep(form,2).metricIds);
 form.metricIds=["students_total"];assert.deepEqual(lib.validateStep(form,2),{});
});
test("dates require valid Gregorian calendar dates, ordering, and at most 3 years",()=>{
 const form=clone(lib.sampleTemplate);
 form.startDate="2026-02-29";assert.ok(lib.validateStep(form,3).startDate);
 form.startDate="2026-12-02";form.endDate="2026-11-07";assert.ok(lib.validateStep(form,3).endDate);
 form.startDate="2020-01-01";form.endDate="2026-01-01";assert.ok(lib.validateStep(form,3).endDate);
 form.startDate="2026-03-01";form.endDate="2026-03-01";assert.deepEqual(lib.validateStep(form,3),{});
});
test("JSON draft export contains configuration and disclaimer, rejects invalid forms",()=>{
 const json=lib.createDemoDraftJson(clone(lib.sampleTemplate)),parsed=JSON.parse(json);
 assert.equal(parsed.kind,"bayan-report-builder-demo");assert.equal(parsed.version,1);
 assert.equal(parsed.configuration.sourceIds[0],"students");
 assert.match(parsed.notice,/تجريبي/);assert.ok(!json.includes("access_token"));
 assert.throws(()=>lib.createDemoDraftJson(clone(lib.emptyBuilderForm)));
});
test("report builder remains frontend-only; no networking or execution of SQL",()=>{
 const component=fs.readFileSync(path.join(root,"components/report-builder/ReportBuilderScreen.tsx"),"utf8");
 assert.doesNotMatch(component,/fetch\s*\(|axios\.|localStorage|sessionStorage|eval\s*\(/);
 assert.doesNotMatch(code,/fetch\s*\(|axios\.|localStorage|sessionStorage|eval\s*\(/);
 assert.match(component,/can\("reports.create"\)/);
 assert.match(component,/لم يُنشأ|لم يُرسل/);
});
