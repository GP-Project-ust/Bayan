import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const require = createRequire(import.meta.url);
let ts;
try {ts = require("typescript");} catch { ts=require("/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js"); }
const code = fs.readFileSync(path.join(root,"lib/notifications/notifications.ts"),"utf8");
const script = ts.transpileModule(code,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const compiled = {exports:{}};
new Function("module","exports",script)(compiled,compiled.exports);
const {demoNotifications,categories,filterNotifications,notificationStats,setNotificationRead,markAllRead,normalizeSearch}=compiled.exports;

const options=(overrides={})=>({readFilter:"all",category:"all",query:"",...overrides});
test("بيانات التنبيهات أمثلة ثابتة بهويات فريدة ومسارات محلية",()=>{
  assert.ok(demoNotifications.length>=10);
  assert.equal(new Set(demoNotifications.map(item=>item.id)).size,demoNotifications.length);
  for(const item of demoNotifications){
    assert.ok(item.title&&item.summary&&item.details&&item.timeLabel&&item.source);
    assert.ok(Object.hasOwn(categories,item.category));
    assert.ok(["normal","important","urgent"].includes(item.priority));
    assert.ok(typeof item.isRead==="boolean");
    if(item.destination)assert.match(item.destination,/^\/(?!\/)[a-z0-9/-]+$/);
  }
});
test("أرقام الإحصاءات تتغير حسب حالة القراءة",()=>{
  assert.deepEqual(notificationStats(demoNotifications),{total:11,unread:6,important:4,reports:3});
  const updated=setNotificationRead(demoNotifications,"bn-101",true);
  assert.equal(notificationStats(updated).unread,5);
  assert.equal(notificationStats(demoNotifications).unread,6,"immutable state");
});
test("فلاتر المقروء وغير المقروء والفئات",()=>{
  assert.equal(filterNotifications(demoNotifications,options({readFilter:"unread"})).length,6);
  assert.equal(filterNotifications(demoNotifications,options({readFilter:"read"})).length,5);
  assert.equal(filterNotifications(demoNotifications,options({category:"reports"})).length,3);
  assert.equal(filterNotifications(demoNotifications,options({readFilter:"unread",category:"reports"})).length,1);
});
test("البحث العربي يشمل العنوان والتفاصيل والمصدر ويتجاهل التشكيل",()=>{
  assert.ok(filterNotifications(demoNotifications,options({query:"الصلاحيات"})).length>=2);
  assert.ok(filterNotifications(demoNotifications,options({query:"وكيل التقارير"})).length>=1);
  assert.equal(normalizeSearch("مُسْتَنْد"),"مستند");
  assert.equal(filterNotifications(demoNotifications,options({query:"zz-no-such-item"})).length,0);
});
test("القراءة الجماعية والفردية قابلة للتراجع دون تعديل المصدر",()=>{
  const changed=setNotificationRead(demoNotifications,"bn-101",true);
  assert.equal(changed.find(i=>i.id==="bn-101").isRead,true);
  assert.equal(demoNotifications.find(i=>i.id==="bn-101").isRead,false);
  const restored=setNotificationRead(changed,"bn-101",false);
  assert.equal(restored.find(i=>i.id==="bn-101").isRead,false);
  assert.equal(markAllRead(demoNotifications).every(i=>i.isRead),true);
  assert.equal(notificationStats(demoNotifications).unread,6);
});


test("وجهات الإشعارات موجودة ضمن كتالوج شاشات بيان",()=>{
  const catalog=JSON.parse(fs.readFileSync(path.join(root,"lib/screen-catalog.json"),"utf8"));
  const routes=new Set(catalog.map(item=>item.path));
  for(const item of demoNotifications){
    if(item.destination)assert.ok(routes.has(item.destination),`Unknown destination for ${item.id}: ${item.destination}`);
  }
});
