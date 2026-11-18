import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {createRequire} from "node:module";
import {fileURLToPath} from "node:url";
import path from "node:path";
const require=createRequire(import.meta.url);
let ts;try{ts=require("typescript");}catch{ts=require("/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js");}
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const code=fs.readFileSync(path.join(root,"lib/semantic-search/search.ts"),"utf8");
const js=ts.transpileModule(code,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const moduleObj={exports:{}};
new Function("module","exports","require",js)(moduleObj,moduleObj.exports,()=>{throw Error("Demo search must be dependency free");});
const s=moduleObj.exports;

test("Arabic normalization handles hamza/diacritics and stable query tokenization",()=>{
 assert.equal(s.normalizeArabic("الإِجْراءات  والْغِياب"),"الاجراءات والغياب");
 assert.ok(s.tokenize("الغياب والحرمان").length>=1);
 assert.deepEqual(s.tokenize("غياب غياب الغياب"),["غياب"]);
});
test("query validation rejects empty, short and excessive input",()=>{
 assert.equal(s.validateSearchQuery(""),"empty");
 assert.equal(s.validateSearchQuery("  ب  "),"short");
 assert.equal(s.validateSearchQuery("ا".repeat(181)),"long");
 assert.equal(s.validateSearchQuery("الغياب والحرمان"),null);
});
test("offline sample data covers four document types with explicit fictional labeling",()=>{
 assert.equal(s.demoSnippets.length,12);
 assert.deepEqual(new Set(s.demoSnippets.map(x=>x.category)),new Set(["regulations","guides","policies","forms"]));
 assert.ok(s.demoSnippets.every(r=>r.page>0&&r.documentTitle.includes("مثال تدريبي")&&r.excerpt.length>=30));
 assert.ok(s.documentOptions().some(x=>x.label.includes("اللائحة الأكاديمية")));
});
test("query returns relevant local snippets without exposing unrelated records",()=>{
 const results=s.searchDemoSnippets("الغياب والحرمان");
 assert.ok(results.length>=2,`Unexpected count ${results.length}`);
 assert.ok(results.some(x=>x.record.documentId==="doc-academic"));
 assert.ok(results.every(x=>x.score<=99&&x.score>=50));
 assert.ok(results.every((x,i,a)=>i===0||a[i-1].score>=x.score));
 assert.deepEqual(s.searchDemoSnippets(""),[]);
 assert.deepEqual(s.searchDemoSnippets("موسيقى الغلاف الجوي بعيدا"),[]);
});
test("category, document, and relevance bands filter results",()=>{
 const base=s.searchDemoSnippets("الغياب والحرمان");
 const filtered=s.searchDemoSnippets("الغياب والحرمان",{...s.defaultOptions,category:"guides"});
 assert.ok(filtered.length>0&&filtered.length<=base.length);
 assert.ok(filtered.every(r=>r.record.category==="guides"));
 const scoped=s.searchDemoSnippets("الغياب والحرمان",{...s.defaultOptions,documentId:"doc-academic"});
 assert.ok(scoped.length>0&&scoped.every(r=>r.record.documentId==="doc-academic"));
 const high=s.searchDemoSnippets("الغياب والحرمان",{...s.defaultOptions,band:"high"});
 assert.ok(high.every(r=>r.score>=90));
 const mid=s.searchDemoSnippets("الغياب والحرمان",{...s.defaultOptions,band:"medium"});
 assert.ok(mid.every(r=>r.score>=75&&r.score<90));
});
test("citations cannot be mistaken for official sources",()=>{
 const citation=s.makeCitation(s.demoSnippets[0]);
 assert.match(citation,/ص 12/);
 assert.match(citation,/مثال تدريبي غير موثّق/);
 assert.match(citation,/اللائحة الأكاديمية/);
 assert.ok(!code.includes("fetch("));
 assert.ok(!code.includes("document.cookie"));
});
