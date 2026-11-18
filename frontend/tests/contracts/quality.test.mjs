import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const resolve = p => {
  const direct = path.join(root, p);
  if (fs.existsSync(direct)) return direct;
  const srcP = path.join(root, "src", p);
  if (fs.existsSync(srcP)) return srcP;
  return direct;
};
const load = p => JSON.parse(fs.readFileSync(resolve(p), "utf8"));
const screens=load("lib/screen-catalog.json"),cases=load("lib/quality/checklist.json");
test("كل شاشة في الكتالوج لها حالة قبول واحدة فقط",()=>{
 const screenCases=cases.filter(c=>c.type==="screen");
 assert.equal(screenCases.length,42);
 for(const screen of screens)assert.equal(screenCases.filter(c=>c.route===screen.path).length,1,screen.path);
});
test("UC-01 إلى UC-07 مغطاة جميعًا",()=>{
 for(let i=1;i<=7;i++)assert.ok(cases.find(c=>c.id===`UC-${String(i).padStart(2,"0")}`));
});
test("تغطية الخطأ والتحميل والسلامة",()=>{
 for(const id of ["ERR-400","ERR-401","ERR-403","ERR-429","ERR-500","ERR-OFF","SEC-05","A11Y-08"])
 assert.ok(cases.find(c=>c.id===id),id);
});
test("معايير القبول ليست تقييمات اختبار مزعومة",()=>{
 assert.ok(cases.every(c=>!Object.hasOwn(c,"status")&&!Object.hasOwn(c,"passed")));
 assert.ok(cases.every(c=>Array.isArray(c.checks)&&c.checks.length>0));
});
test("الصفحات ذات الأولوية الحرجة معلمة P0",()=>{
 for(const route of ["/","/admin","/login"]){
 const c=cases.find(x=>x.type==="screen"&&x.route===route);
 assert.equal(c?.priority,"P0");
 }
});
