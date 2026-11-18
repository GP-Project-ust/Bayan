import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {createRequire} from "node:module";
import {fileURLToPath} from "node:url";
const require=createRequire(import.meta.url);
let ts;try{ts=require("typescript");}catch{ts=require("/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js");}
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const source=fs.readFileSync(path.join(root,"lib/document-upload/upload.ts"),"utf8");
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const moduleObj={exports:{}};
new Function("module","exports",js)(moduleObj,moduleObj.exports);
const model=moduleObj.exports;
const sample=(name,size=4096,lastModified=1)=>({name,size,lastModified});

test("accepts supported extensions irrespective of case, rejects unsafe extensions and empty files",()=>{
 for(const file of [sample("sample.PDF"),sample("study.DocX"),sample("policy.Txt")])assert.equal(model.validateUploadFile(file),null);
 for(const file of [sample("danger.exe"),sample("danger.pdf.exe"),sample("noext"),sample("file.pdf",0),sample("../folder.pdf"),sample("a\\b.pdf")])assert.ok(model.validateUploadFile(file),file.name);
});
test("enforces maximum size and rejects unsafe numbers and invalid names",()=>{
 assert.equal(model.validateUploadFile(sample("file.pdf",model.MAX_FILE_BYTES)),null);
 for(const n of [model.MAX_FILE_BYTES+1,-1,Number.NaN,Number.POSITIVE_INFINITY,1.2])assert.ok(model.validateUploadFile(sample("file.pdf",n)));
 assert.ok(model.validateUploadFile(sample("a".repeat(181)+".pdf")));
});
test("batch capacity and duplicate protection, including within the same selection",()=>{
 const meta=model.initialUploadMetadata;
 const first=model.makeDemoUploadItems([sample("file.pdf"),sample("file.pdf"),sample("other.docx")],[],meta,4);
 assert.equal(first.accepted.length,2);assert.equal(first.skipped,1);
 assert.equal(first.accepted[0].stage,"queued");assert.equal(first.accepted[1].stage,"queued");
 assert.equal(first.accepted[0].meta.category,meta.category);
 const additional=Array.from({length:10},(_,i)=>sample(`new-${i}.pdf`,4096,i+2));
 const second=model.makeDemoUploadItems(additional,first.accepted,meta,5);
 assert.equal(second.accepted.length,model.MAX_BATCH_FILES-2);assert.equal(second.skipped,6);
 assert.equal(new Set([...first.accepted,...second.accepted].map(f=>f.id)).size,model.MAX_BATCH_FILES);
});
test("invalid files remain visibly invalid and never turn into valid queued items",()=>{
 const batch=model.makeDemoUploadItems([sample("malware.js"),sample("valid.pdf")],[],model.initialUploadMetadata,12);
 assert.equal(batch.accepted[0].stage,"invalid");assert.match(batch.accepted[0].error,/النوع غير مدعوم/);
 assert.equal(batch.accepted[1].stage,"queued");
 assert.deepEqual(model.queueStats(batch.accepted),{total:2,ready:1,running:0,complete:0,attention:1});
});
test("validates owner, access level, classification and description length",()=>{
 const base=model.initialUploadMetadata;
 assert.equal(model.validateMetadata(base),null);
 assert.ok(model.validateMetadata({...base,owner:"a"}));
 assert.ok(model.validateMetadata({...base,owner:"x".repeat(91)}));
 assert.ok(model.validateMetadata({...base,category:"unsupported"}));
 assert.ok(model.validateMetadata({...base,access:"public_all_tenants"}));
 assert.ok(model.validateMetadata({...base,description:"x".repeat(351)}));
});
test("simulation stage progression terminates and never creates a backend status",()=>{
 let stage="queued";const names=[];
 for(let i=0;i<6;i++){stage=model.nextSimulationStage(stage);names.push(stage);}
 assert.deepEqual(names,["validating","receiving","extracting","chunking","embedding","indexed"]);
 assert.equal(model.nextSimulationStage("indexed"),"indexed");
 assert.equal(model.nextSimulationStage("canceled"),"canceled");
 assert.equal(model.isSimulating("indexed"),false);
 assert.equal(model.stagePercent.indexed,100);
});
test("upload page is explicitly offline, role-gated, and wired to the library",()=>{
 const component=fs.readFileSync(path.join(root,"components/document-upload/DocumentUploadScreen.tsx"),"utf8");
 const library=fs.readFileSync(path.join(root,"components/document-library/DocumentLibraryScreen.tsx"),"utf8");
 const route=fs.readFileSync(path.join(root,"app/sources/upload/page.tsx"),"utf8");
 assert.match(component,/can\("sources\.manage"\)/);
 assert.match(component,/initialRole="it_admin"/);
 assert.match(component,/لا تُرسل أي ملفات إلى الخادم/);
 assert.match(component,/لم تُضف إلى المكتبة أو Qdrant/);
 assert.match(component,/data-testid="upload-file-row"/);
 assert.match(component,/onDrop=\{onDrop\}/);
 assert.match(library,/href="\/sources\/upload"/);
 assert.match(route,/DocumentUploadScreen/);
 assert.doesNotMatch(component,/\bfetch\s*\(|XMLHttpRequest|FileReader|FormData\(|\.arrayBuffer\s*\(|\.text\s*\(/);
 assert.doesNotMatch(component,/dangerouslySetInnerHTML/);
});
