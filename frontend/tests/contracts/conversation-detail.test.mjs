import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
let ts;try{ts=require("typescript");}catch{ts=require("/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js");}
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
function transpile(file,stub={}){
 const js=ts.transpileModule(fs.readFileSync(path.join(root,file),"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const mod={exports:{}};
 new Function("module","exports","require",js)(mod,mod.exports,name=>{if(name in stub)return stub[name];throw new Error(`Unexpected import ${name}`);});
 return mod.exports;
}
const conversations=transpile("lib/conversations/conversations.ts");
const detail=transpile("lib/conversation-detail/detail.ts",{"@/lib/conversations/conversations":conversations});
test("route id selection and invalid id do not leak other conversations",()=>{
 const {emptyConversationChanges:changes,demoConversations}=conversations;
 assert.equal(detail.getDemoConversation("chat-101",changes).title,demoConversations[0].title);
 assert.equal(detail.getDemoConversation("chat-102",changes).id,"chat-102");
 assert.equal(detail.getDemoConversation("chat-999",changes),null);
 assert.equal(detail.getDemoConversation("..%2Fadmin",changes),null);
 assert.equal(detail.getDemoConversation("__proto__",changes),null);
 assert.equal(detail.isKnownDemoId("chat-102"),true);
 assert.equal(detail.isKnownDemoId("chat-999"),false);
});
test("deleted chat is missing and renamed/starred state is shared with archive",()=>{
 let changes=conversations.renameConversation(conversations.emptyConversationChanges,"chat-101","محادثتي الجديدة");
 changes=conversations.toggleConversationStar(changes,"chat-101");
 assert.equal(detail.getDemoConversation("chat-101",changes).title,"محادثتي الجديدة");
 assert.equal(detail.getDemoConversation("chat-101",changes).starred,true);
 changes=conversations.deleteConversation(changes,"chat-101");
 assert.equal(detail.getDemoConversation("chat-101",changes),null);
});
test("messages are shaped correctly and source page numbers are not fabricated by adapter",()=>{
 const item=detail.getDemoConversation("chat-102",conversations.emptyConversationChanges);
 const messages=detail.toChatMessages(item.messages,item.id);
 assert.equal(messages.length,2);assert.equal(messages[0].role,"user");assert.equal(messages[1].role,"assistant");
 assert.equal(messages[0].text,item.messages[0].body);
 const citations=detail.toDemoCitations(item.sources);
 assert.deepEqual(citations.map(c=>c.page),[8,12]);
 assert.equal(detail.toDemoCitations([]).length,0);
});
test("each demo workflow returns operational steps without model chain-of-thought",()=>{
 for(const kind of ["data","documents","reports"]){
  const steps=detail.buildDemoTrace(kind);
  assert.deepEqual(steps.map(step=>step.agent),["Supervisor",kind==="data"?"SQL":kind==="documents"?"RAG":"Analyst","Reporter"]);
  assert.ok(steps.every(step=>step.status==="success"&&step.summary.includes("محاكاة")||step.summary.includes("افتراضية")||step.summary.includes("توضيحي")));
 }
});
test("transcript is offline plaintext and omits the SQL statement",()=>{
 const item=detail.getDemoConversation("chat-101",conversations.emptyConversationChanges);
 const text=detail.transcriptText(item.title,item.messages);
 assert.match(text,/بيانات تجريبية/);assert.match(text,/المستخدم/);assert.match(text,/مساعد بيان/);
 assert.ok(!text.includes("SELECT college_name"));
});
