/** Screen 08: demo-only conversation detail helpers. No institutional records. */
import {applyConversationChanges, demoConversations, type ConversationChanges, type ConversationListItem, type ConversationKind, type ConversationMessage} from "@/lib/conversations/conversations";
import type {AgentTraceStepData,ChatMessageData,DocumentCitation} from "@/components/bayan/types";

const idPattern=/^chat-\d{3}$/;
export function getDemoConversation(id:string, changes:ConversationChanges):ConversationListItem|null {
  if(!idPattern.test(id))return null;
  return applyConversationChanges(demoConversations,changes).find(item=>item.id===id)??null;
}
export function isKnownDemoId(id:string):boolean { return idPattern.test(id)&&demoConversations.some(item=>item.id===id); }
export function toChatMessages(messages:readonly ConversationMessage[],id:string):ChatMessageData[]{
  return messages.map((message,index)=>({id:`${id}-${index}`,role:message.sender,text:message.body,time:message.time,status:"complete"}));
}
export function toDemoCitations(sources:readonly {document:string;page:number}[] = []):DocumentCitation[]{
  return sources.map((source,index)=>({id:`demo-source-${index+1}`,documentTitle:source.document,page:source.page,kind:"مصدر تجريبي"}));
}
/** Operational mock events only; no model chain-of-thought and no real telemetry. */
export function buildDemoTrace(kind:ConversationKind):AgentTraceStepData[]{
  const branch=kind==="data"?"SQL":kind==="documents"?"RAG":"Analyst";
  const middle=kind==="documents"?"استرجاع مقاطع توضيحية":kind==="data"?"فحص استعلام توضيحي":"تحضير مؤشرات تجريبية";
  return [
    {id:"demo-supervisor",agent:"Supervisor",label:"تحديد مسار السؤال",status:"success",durationMs:45,summary:"محاكاة لعملية تصنيف نوع السؤال فقط؛ لم يُستدعَ أي نموذج."},
    {id:"demo-branch",agent:branch,label:middle,status:"success",durationMs:110,summary:"خطوة تشغيلية افتراضية ولا تشير إلى تنفيذ استعلام أو بحث حقيقي."},
    {id:"demo-reporter",agent:"Reporter",label:"تنسيق إجابة العرض",status:"success",durationMs:67,summary:"نص توضيحي ثابت من بيانات معاينة الواجهة."},
  ];
}
export function transcriptText(title:string,messages:readonly ConversationMessage[]):string {
  return [`بيان — نسخة توضيحية من المحادثة: ${title}`,"بيانات تجريبية، وليست سجلات حقيقية.","",...messages.flatMap(message=>[
    `${message.sender==="user"?"المستخدم":"مساعد بيان"} (${message.time})`,message.body,""])
  ].join("\n");
}
