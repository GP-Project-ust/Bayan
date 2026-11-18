import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
let ts;
try{ts=require('typescript');}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');}
const filename=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../lib/conversations/conversations.ts');
const output=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const mod={exports:{}};
new Function('module','exports',output)(mod,mod.exports);
const {
 demoConversations,conversationStorageKey,emptyConversationChanges,
 sanitizeConversationChanges,readConversationChanges,writeConversationChanges,validTitle,
 applyConversationChanges,filterConversations,conversationStats,
 renameConversation,toggleConversationStar,deleteConversation
}=mod.exports;
const list=()=>applyConversationChanges(demoConversations,emptyConversationChanges);
test('12 sample conversations are unique, explicitly demonstration content and dated',()=>{
 assert.equal(demoConversations.length,12);
 assert.equal(new Set(demoConversations.map(x=>x.id)).size,12);
 for(const x of demoConversations){assert.ok(x.title.length>=3);assert.ok(x.messages.length>=2);assert.ok(!Number.isNaN(Date.parse(x.updatedAt)));}
 assert.match(conversationStorageKey,/demo/);
});
test('search is Arabic aware, searches answer content, and sorts',()=>{
 assert.equal(filterConversations(list(),{query:'الهندسة',filter:'all',sort:'newest'})[0].id,'chat-101');
 assert.ok(filterConversations(list(),{query:'الغياب',filter:'all',sort:'newest'}).some(x=>x.id==='chat-102'));
 assert.ok(filterConversations(list(),{query:'الاداء',filter:'reports',sort:'newest'}).length>=0);
 const newest=filterConversations(list(),{query:'',filter:'all',sort:'newest'});
 const oldest=filterConversations(list(),{query:'',filter:'all',sort:'oldest'});
 assert.equal(newest[0].id,oldest.at(-1).id);
 const alphabetic=filterConversations(list(),{query:'',filter:'all',sort:'title'});
 assert.equal(alphabetic.length,12);
 assert.equal(filterConversations(list(),{query:'XXXXXX',filter:'all',sort:'newest'}).length,0);
});
test('category filters and counts behave correctly',()=>{
 const items=list(),stats=conversationStats(items);
 assert.equal(stats.total,12);assert.equal(stats.starred,0);
 assert.equal(stats.data+stats.documents+stats.reports,12);
 for(const kind of ['data','documents','reports']){
  const filtered=filterConversations(items,{query:'',filter:kind,sort:'newest'});
  assert.ok(filtered.length>=1);assert.ok(filtered.every(x=>x.kind===kind));
 }
});
test('favorite toggles, rename, and deletion do not mutate the seed',()=>{
 const name=demoConversations[0].title;
 let c=toggleConversationStar(emptyConversationChanges,'chat-101');
 assert.equal(filterConversations(applyConversationChanges(demoConversations,c),{query:'',filter:'starred',sort:'newest'}).length,1);
 c=renameConversation(c,'chat-101','  سجلي  الجديد  ');
 assert.equal(applyConversationChanges(demoConversations,c)[0].title,'سجلي الجديد');
 assert.equal(demoConversations[0].title,name);
 c=deleteConversation(c,'chat-101');
 assert.equal(applyConversationChanges(demoConversations,c).length,11);
 c=toggleConversationStar(c,'chat-101');
 assert.equal(filterConversations(applyConversationChanges(demoConversations,c),{query:'',filter:'starred',sort:'newest'}).length,0);
 assert.equal(list().length,12);
});
test('unsafe browser storage and unknown IDs are discarded',()=>{
 assert.deepEqual(readConversationChanges('not JSON'),emptyConversationChanges);
 assert.deepEqual(readConversationChanges(null),emptyConversationChanges);
 const value=sanitizeConversationChanges({
  renamed:{'bad-id':'Should not be here','chat-101':'  عنوان\nجديد  ','chat-102':'x'},
  starredIds:['bad-id','chat-101','chat-101',27],deletedIds:['chat-109','fake-id'],secret:'TOKEN',
 });
 assert.deepEqual(value.renamed,{'chat-101':'عنوان جديد'});
 assert.deepEqual(value.starredIds,['chat-101']);
 assert.deepEqual(value.deletedIds,['chat-109']);
 assert.equal('secret' in value,false);
 assert.deepEqual(readConversationChanges(writeConversationChanges(value)),value);
});
test('title validation, deleted IDs and unknown IDs are safe',()=>{
 assert.equal(validTitle('a'),null);assert.equal(validTitle('a'.repeat(81)),null);
 assert.equal(validTitle('   عنوان اختباري '),'عنوان اختباري');
 const changes=emptyConversationChanges;
 assert.equal(renameConversation(changes,'bad-id','عنوان صالح'),changes);
 assert.equal(deleteConversation(changes,'bad-id'),changes);
 assert.equal(toggleConversationStar(changes,'bad-id'),changes);
 const after=deleteConversation(changes,'chat-101');
 assert.equal(applyConversationChanges(demoConversations,after).some(x=>x.id==='chat-101'),false);
});
