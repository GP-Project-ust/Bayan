import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);let ts;
try{ts=require("typescript");}catch{ts=require("/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js");}
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
function loadModule(filename,resolve=()=>{throw Error("Unexpected import");}){
 const src=fs.readFileSync(path.join(root,filename),"utf8");
 const output=ts.transpileModule(src,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 const module={exports:{}};
 new Function("module","exports","require",output)(module,module.exports,resolve);
 return module.exports;
}
const reports=loadModule("lib/reports/reports.ts");
const preview=loadModule("lib/reports/preview.ts",name=>{
 if(name==="./reports")return reports;throw Error(`Unexpected import ${name}`);
});
const sample=reports.makeDemoReports();
function zipNames(buffer){
 const b=Buffer.from(buffer),names=[];let offset=0;
 while(offset+30<=b.length&&b.readUInt32LE(offset)===0x04034b50){
  const flags=b.readUInt16LE(offset+6),size=b.readUInt32LE(offset+18),len=b.readUInt16LE(offset+26),extra=b.readUInt16LE(offset+28);
  assert.ok(flags&0x0800);const name=b.subarray(offset+30,offset+30+len).toString("utf8");
  const content=b.subarray(offset+30+len+extra,offset+30+len+extra+size).toString("utf8");
  names.push({name,content});offset+=30+len+extra+size;
 }
 assert.ok(offset>0);return names;
}
test("report selection honors stable IDs, invalid and missing links",()=>{
 assert.equal(preview.findDemoReport(sample,"rep-101")?.title,sample[0].title);
 assert.equal(preview.findDemoReport(sample,undefined)?.id,"rep-101");
 assert.equal(preview.findDemoReport(sample,"rep-999"),undefined);
 assert.equal(preview.findDemoReport(sample,"../../etc/passwd"),undefined);
});
test("preview and download require a ready report with data",()=>{
 assert.equal(preview.isReportReady(sample.find(r=>r.id==="rep-101")),true);
 for(const report of sample.filter(r=>r.status!=="ready")){
  assert.equal(preview.isReportReady(report),false);
  assert.throws(()=>preview.makeDemoReportXlsx(report));
 }
});
test("charts preserve order and scale relative to maximum",()=>{
 const rows=preview.chartRows(sample[0]);
 assert.equal(rows.length,sample[0].rows.length);
 assert.equal(Math.max(...rows.map(r=>r.percent)),100);
 assert.ok(rows.every(r=>r.percent>=0&&r.percent<=100));
 assert.equal(rows[0].label,sample[0].rows[0].label);
});
test("aggregate only compatible numeric counts; percentages are excluded",()=>{
 assert.equal(preview.reportTotal(sample[0]),6320);
 assert.equal(preview.canSumRows(sample[0]),true);
 assert.equal(preview.canSumRows(sample[1]),false);
 const mixed={...sample[0],rows:[{label:"a",value:1,unit:"شخص"},{label:"b",value:2,unit:"%"}]};
 assert.equal(preview.canSumRows(mixed),false);
});
test("XLSX is a real ZIP/OOXML workbook with correct sheets and training disclaimer",()=>{
 const data=preview.makeDemoReportXlsx(sample[0]);
 assert.equal(Buffer.from(data).readUInt32LE(0),0x04034b50);
 const zipped=zipNames(data),names=zipped.map(e=>e.name);
 for(const part of ["[Content_Types].xml","_rels/.rels","xl/workbook.xml","xl/_rels/workbook.xml.rels","xl/worksheets/sheet1.xml","xl/styles.xml"]) assert.ok(names.includes(part),part);
 const xml=zipped.find(e=>e.name==="xl/worksheets/sheet1.xml").content;
 assert.match(xml,/rightToLeft="1"/);assert.match(xml,/الهندسة/);assert.match(xml,/تدريبي/);
 assert.match(xml,/<v>1250<\/v>/);assert.doesNotMatch(xml,/<f[>\s]/);
 assert.match(preview.reportFileBase(sample[0].id),/^bayan-demo-rep-\d{3}$/);
});
test("Excel escapes untrusted characters and never emits cell formulas",()=>{
 const edited={...sample[0],rows:[{label:'=HYPERLINK("https://example.org","x")<&',value:5,unit:'"\'&'}],title:'<عنوان>'};
 const xml=zipNames(preview.makeDemoReportXlsx(edited)).find(x=>x.name.endsWith("sheet1.xml")).content;
 assert.match(xml,/&lt;عنوان&gt;/);assert.match(xml,/&amp;/);assert.match(xml,/t="inlineStr"/);
 assert.doesNotMatch(xml,/<f>|<f\s/);
});
test("exports are client-only and cannot access privileged services",()=>{
 const source=fs.readFileSync(path.join(root,"components/report-preview/ReportPreviewScreen.tsx"),"utf8");
 const utils=fs.readFileSync(path.join(root,"lib/reports/preview.ts"),"utf8");
 assert.doesNotMatch(source+utils,/fetch\s*\(|axios\.|eval\s*\(|localStorage|sessionStorage/);
 assert.match(source,/can\("reports.export"\)/);assert.match(source,/can\("reports.view"\)/);
 assert.match(source,/window\.print\(\)/);assert.match(source,/makeDemoReportXlsx/);assert.match(source,/makeDemoReportCsv/);
});
test("paper printing stays A4 portrait and renders both pages",()=>{
 const css=fs.readFileSync(path.join(root,"components/report-preview/report-preview.css"),"utf8");
 const page=fs.readFileSync(path.join(root,"components/report-preview/ReportPreviewScreen.tsx"),"utf8");
 assert.match(css,/@page\{size:A4 portrait/);assert.match(css,/@media print/);
 assert.match(css,/brp-paper\{display:flex!important/);
 assert.match(page,/<ReportSummaryPage/);assert.match(page,/<ReportDetailsPage/);
});
test("full preview navigates from report center and the builder only to an independent example",()=>{
 const center=fs.readFileSync(path.join(root,"components/reports/ReportsCenterScreen.tsx"),"utf8");
 const builder=fs.readFileSync(path.join(root,"components/report-builder/ReportBuilderScreen.tsx"),"utf8");
 assert.match(center,/reports\/detail\?report=/);
 assert.match(builder,/reports\/detail\?report=rep-101/);
 assert.match(builder,/مثال مستقل/);
});
