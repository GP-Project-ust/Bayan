import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {createRequire} from "node:module";
import {fileURLToPath} from "node:url";
import path from "node:path";
const require=createRequire(import.meta.url);
let ts;try{ts=require("typescript");}catch{ts=require("/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js");}
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
function loadModule(src,imports={}){
  const js=ts.transpileModule(fs.readFileSync(path.join(root,src),"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const moduleObj={exports:{}};
  new Function("module","exports","require",js)(moduleObj,moduleObj.exports,id=>{if(!(id in imports))throw new Error(`Unexpected dependency: ${id}`);return imports[id];});
  return moduleObj.exports;
}
const search=loadModule("lib/semantic-search/search.ts");
const lib=loadModule("lib/document-library/library.ts",{"@/lib/semantic-search/search":search});

test("library reuses every screen-09 document ID and consistent fictional titles/sections",()=>{
 const docs=lib.makeDemoLibrary(),unique=new Set(search.demoSnippets.map(x=>x.documentId));
 assert.equal(new Set(docs.map(d=>d.id)).size,docs.length);
 assert.ok(docs.length>=9);
 for(const id of unique){const doc=docs.find(x=>x.id===id);assert.ok(doc,`Missing ${id}`);
  assert.equal(doc.title,search.demoSnippets.find(s=>s.documentId===id).documentTitle);
  assert.equal(doc.status,"indexed");
  assert.ok(doc.snippets.every(s=>s.documentId===id&&s.page<=doc.totalPages));}
 assert.ok(docs.every(d=>d.title.includes("مثال تدريبي")&&d.description.length>=20));
});
test("category filters and Arabic normalization match library documents",()=>{
 const docs=lib.makeDemoLibrary();
 const academic=lib.filterLibraryDocuments(docs,{...lib.defaultLibraryFilters,query:"اللائحة الأكاديمية"});
 assert.ok(academic.some(x=>x.id==="doc-academic"));
 const guide=lib.filterLibraryDocuments(docs,{...lib.defaultLibraryFilters,category:"guides"});
 assert.ok(guide.length>0&&guide.every(x=>x.category==="guides"));
 assert.deepEqual(lib.filterLibraryDocuments(docs,{...lib.defaultLibraryFilters,query:"كائنات غير موجودة في الكواكب"}),[]);
});
test("status filters and stats are internally consistent",()=>{
 const docs=lib.makeDemoLibrary(),stats=lib.libraryStats(docs);
 assert.equal(stats.total,docs.length);
 assert.equal(stats.indexed+stats.processing+stats.attention,docs.length);
 for(const status of ["indexed","pending","processing","failed"]){
  const results=lib.filterLibraryDocuments(docs,{...lib.defaultLibraryFilters,status});
  assert.ok(results.length>=1);
  assert.ok(results.every(doc=>doc.status===status));
 }
});
test("sort order is deterministic and original docs cannot be mutated by search",()=>{
 const docs=lib.makeDemoLibrary();
 const sorted=lib.filterLibraryDocuments(docs,{...lib.defaultLibraryFilters,sort:"title"});
 assert.ok(sorted.every((doc,i)=>i===0||sorted[i-1].title.localeCompare(doc.title,"ar")<=0));
 const byPages=lib.filterLibraryDocuments(docs,{...lib.defaultLibraryFilters,sort:"pages"});
 assert.ok(byPages.every((doc,i)=>i===0||byPages[i-1].totalPages>=doc.totalPages));
 assert.equal(docs[0].id,lib.makeDemoLibrary()[0].id);
});
test("reindex state simulation does not alter underlying snippet records",()=>{
 const docs=lib.makeDemoLibrary();
 const target=docs.find(x=>x.status==="failed");assert.ok(target);
 const newDocs=lib.changeDocumentStatus(docs,target.id,"processing");
 assert.equal(docs.find(x=>x.id===target.id).status,"failed");
 assert.equal(newDocs.find(x=>x.id===target.id).status,"processing");
 assert.equal(newDocs.find(x=>x.id===target.id).snippets.length,0);
});
test("citations always explicitly disclose fictional origin and enforce page range",()=>{
 const doc=lib.makeDemoLibrary().find(x=>x.id==="doc-academic"),page=doc.snippets[0].page;
 assert.equal(lib.validDocumentPage(doc,page),true);
 assert.equal(lib.validDocumentPage(doc,0),false);
 assert.equal(lib.validDocumentPage(doc,doc.totalPages+1),false);
 assert.equal(lib.validDocumentPage(doc,1.4),false);
 assert.match(lib.makeDemoDocumentCitation(doc,page),/مثال تدريبي غير موثّق/);
 assert.match(lib.makeDemoDocumentCitation(doc,page),/ص 12/);
});
test("document-library logic never contacts a backend or writes to storage",()=>{
 const source=fs.readFileSync(path.join(root,"lib/document-library/library.ts"),"utf8");
 assert.ok(!source.includes("fetch("));assert.ok(!source.includes("localStorage"));
 assert.ok(!source.includes("document.cookie"));
});
