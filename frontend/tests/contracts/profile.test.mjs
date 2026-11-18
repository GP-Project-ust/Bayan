import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const require = createRequire(import.meta.url);
let ts;
try { ts = require("typescript"); }
catch { ts = require("/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js"); }
const here = path.dirname(fileURLToPath(import.meta.url));
const source = fs.readFileSync(path.resolve(here,"../../lib/profile/profile.ts"),"utf8");
const output = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const compiled = {exports:{}};
new Function("module","exports",output)(compiled,compiled.exports);
const {validateProfile,cleanProfile,initialProfile,demoIdentity}=compiled.exports;

test("الاسم المعروض بين حرفين و70 حرفًا",()=>{
  assert.match(validateProfile({...initialProfile,displayName:"أ"}).displayName,/حرفين/);
  assert.match(validateProfile({...initialProfile,displayName:"a".repeat(71)}).displayName,/70/);
  assert.equal(validateProfile({...initialProfile,displayName:"هند علي"}).displayName,undefined);
});

test("الهاتف اختياري ويُقبل الدولي الصحيح",()=>{
  assert.deepEqual(validateProfile({...initialProfile,phone:""}),{});
  assert.equal(validateProfile({...initialProfile,phone:"+967711234567"}).phone,undefined);
  assert.equal(validateProfile({...initialProfile,phone:"+967 711 234 567"}).phone,undefined);
  assert.match(validateProfile({...initialProfile,phone:"abcd"}).phone,/رقم هاتف صالح/);
  assert.match(validateProfile({...initialProfile,phone:"123"}).phone,/رقم هاتف صالح/);
});

test("المسمى الوظيفي لا يزيد عن 80 حرفًا",()=>{
  assert.match(validateProfile({...initialProfile,jobTitle:"أ".repeat(81)}).jobTitle,/80/);
});

test("تنظيف القيم يزيل الفراغات الخارجية فقط",()=>{
  assert.deepEqual(cleanProfile({displayName:" هند علي ",jobTitle:" محللة بيانات ",phone:" +967711234567 "}),{displayName:"هند علي",jobTitle:"محللة بيانات",phone:"+967711234567"});
});

test("بريد المعاينة يستخدم نطاق المثال المحجوز",()=>{
  assert.ok(demoIdentity.email.endsWith(".example"));
});
