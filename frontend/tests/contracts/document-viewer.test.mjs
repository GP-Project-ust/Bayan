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
 new Function("module","exports","require",js)(moduleObj,moduleObj.exports,id=>{if(!(id in imports))throw Error(`Unexpected dependency ${id}`);return imports[id];});
 return moduleObj.exports;
}
const search=loadModule("lib/semantic-search/search.ts");
const library=loadModule("lib/document-library/library.ts",{"@/lib/semantic-search/search":search});
const viewer=loadModule("lib/document-viewer/viewer.ts",{"@/lib/document-library/library":library,"@/lib/semantic-search/search":search});

test("all known library IDs have stable matching title, pages and snippet references",()=>{
 for(const doc of library.initialLibraryDocuments){
  assert.equal(viewer.getDemoDocument(doc.id)?.title,doc.title);
  assert.ok(doc.snippets.every(s=>s.documentId===doc.id&&s.page<=doc.totalPages));
 }
 assert.equal(viewer.getDemoDocument("doc-nonexistent"),null);
 assert.equal(viewer.getDemoDocument("../../secret"),null);
});
test("deep links preserve document, sample page and matching snippet only",()=>{
 const result=viewer.resolveViewerLocation({doc:"doc-academic",page:"12",snippet:"rag-001"});
 assert.equal(result.document?.id,"doc-academic");assert.equal(result.page,12);assert.equal(result.snippet?.id,"rag-001");
 assert.equal(viewer.resolveViewerLocation({doc:"doc-academic",page:"12",snippet:"rag-006"}).snippet,null);
 assert.equal(viewer.resolveViewerLocation({doc:"doc-students",page:"12",snippet:"rag-001"}).snippet,null);
});
test("page validation rejects negative, decimal, overflow and injected values",()=>{
 for(const v of ["0","-1","1.2","NaN","12xyz","99999","3e1"]){
  assert.equal(viewer.parseDocumentPage(v,38),null,`Accepted ${v}`);
 }
 assert.equal(viewer.parseDocumentPage("38",38),38);
 assert.equal(viewer.parseDocumentPage("39",38),null);
 assert.equal(viewer.resolveViewerLocation({doc:"doc-academic",page:"9999"}).page,12);
});
test("page navigation respects first and last page boundaries",()=>{
 assert.equal(viewer.nextPage(1,-1,38),1);
 assert.equal(viewer.nextPage(38,1,38),38);
 assert.equal(viewer.nextPage(12,1,38),13);
 assert.equal(viewer.nextPage(12,-1,38),11);
});
test("only actual demo-snippet pages expose citations",()=>{
 const doc=viewer.getDemoDocument("doc-academic");
 assert.deepEqual(viewer.pagesWithSnippets(doc),[5,12,17]);
 assert.equal(viewer.snippetsOnPage(doc,13).length,0);
 assert.equal(viewer.getPageCitation(doc,13),null);
 assert.match(viewer.getPageCitation(doc,12),/مثال تدريبي غير موثّق/);
});
test("non-indexed documents never generate invented retrieved text",()=>{
 for(const doc of library.initialLibraryDocuments.filter(d=>d.status!=="indexed")){
  assert.equal(viewer.snippetsOnPage(doc,1).length,0);
  assert.equal(viewer.getPageCitation(doc,1),null);
  assert.deepEqual(viewer.pagesWithSnippets(doc),[]);
 }
});
test("URL helper builds same navigable route for library and search snippets",()=>{
 const href=viewer.viewerHref("doc-academic",12,"rag-001");
 const url=new URL(href,"https://bayan.example");
 assert.equal(url.pathname,"/sources/document");
 assert.equal(url.searchParams.get("doc"),"doc-academic");
 assert.equal(url.searchParams.get("page"),"12");
 assert.equal(url.searchParams.get("snippet"),"rag-001");
});
test("viewer stays offline and expressly discloses illustrative non-PDF status",()=>{
 const ui=fs.readFileSync(path.join(root,"components/document-viewer/DocumentViewerScreen.tsx"),"utf8");
 assert.match(ui,/لا توجد ملفات PDF أصلية/);
 assert.match(ui,/PDF الأصلي غير متاح/);
 assert.match(ui,/لا تتوفر بيانات نصية لهذه الصفحة/);
 assert.ok(!ui.includes("fetch("));assert.ok(!ui.includes("localStorage"));
 assert.ok(!ui.includes("dangerouslySetInnerHTML"));
});
