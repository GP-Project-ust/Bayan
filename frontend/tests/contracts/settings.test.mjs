import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {createRequire} from "node:module";
import {fileURLToPath} from "node:url";
const require=createRequire(import.meta.url);
let ts;
try{ts=require("typescript");}catch{ts=require("/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js");}
const folder=path.dirname(fileURLToPath(import.meta.url));
const text=fs.readFileSync(path.resolve(folder,"../../lib/settings/preferences.ts"),"utf8");
const output=ts.transpileModule(text,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const mod={exports:{}};
new Function("module","exports",output)(mod,mod.exports);
const {defaultPreferences,demoStorageKey,sanitizePreferences,readDemoPreferences,writeDemoPreferences,effectivePreferences,preferencesEqual}=mod.exports;

test("defaults support Arabic UI without access to SQL",()=>{
  assert.equal(defaultPreferences.showSql,false);
  assert.equal(defaultPreferences.showSources,true);
  assert.equal(defaultPreferences.density,"comfortable");
  assert.equal(defaultPreferences.fontScale,"100");
  assert.match(demoStorageKey,/demo/);
});
test("invalid storage and unknown values are handled without throwing",()=>{
  assert.deepEqual(readDemoPreferences("broken json"),defaultPreferences);
  assert.deepEqual(sanitizePreferences(null),defaultPreferences);
  assert.deepEqual(sanitizePreferences([]),defaultPreferences);
  const result=sanitizePreferences({density:"evil",fontScale:"200",showSql:"true",defaultReportFormat:"exe",token:"SECRET"});
  assert.equal(result.density,"comfortable");
  assert.equal(result.fontScale,"100");
  assert.equal(result.showSql,false);
  assert.equal(result.defaultReportFormat,"pdf");
  assert.equal("token" in result,false);
});
test("only booleans and whitelisted values survive the round trip",()=>{
  const source={...defaultPreferences,density:"compact",fontScale:"120",emailNotifications:true,showSql:true,defaultReportFormat:"csv"};
  const after=readDemoPreferences(writeDemoPreferences(source));
  assert.deepEqual(after,source);
  assert.equal(preferencesEqual(after,source),true);
  assert.equal(preferencesEqual(after,{...source,showSql:false}),false);
});
test("SQL remains hidden for unauthorized preview role",()=>{
  const wanted={...defaultPreferences,showSql:true};
  const noAccess=effectivePreferences(wanted,{sql:false,reports:true,citations:true});
  assert.equal(noAccess.showSql,false);
  assert.equal(wanted.showSql,true); // no accidental mutation
  assert.equal(effectivePreferences(wanted,{sql:true,reports:true,citations:true}).showSql,true);
});
test("citations remain hidden without search privilege",()=>{
  const requested={...defaultPreferences,showSources:true};
  assert.equal(effectivePreferences(requested,{sql:false,reports:false,citations:false}).showSources,false);
  assert.equal(effectivePreferences(requested,{sql:false,reports:false,citations:true}).showSources,true);
});
test("report format is ignored without export privilege",()=>{
  const wanted={...defaultPreferences,defaultReportFormat:"excel"};
  assert.equal(effectivePreferences(wanted,{sql:false,reports:false,citations:true}).defaultReportFormat,"pdf");
  assert.equal(effectivePreferences(wanted,{sql:false,reports:true,citations:true}).defaultReportFormat,"excel");
});
