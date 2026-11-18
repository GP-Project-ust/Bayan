/** Screen 31 — derived, sanitized view of existing synthetic trace fixtures only.
 * Durations denote per-step elapsed time, NOT real wall-clock timestamps.
 * Do not import secrets, queries, RAG chunks, private prompts or chain-of-thought.
 */
import {DEMO_AGENT_TRACES,resolveTraceId,kindLabels,traceStatuses,stepStatuses,agentLabels, type AgentTrace,type TraceStep} from '../agent-traces/traces';

export type TraceDetailTab='overview'|'timeline'|'diagnostics'|'privacy';
export const traceDetailTabs:readonly {id:TraceDetailTab;label:string}[]=[
 {id:'overview',label:'نظرة عامة'},
 {id:'timeline',label:'الخط الزمني'},
 {id:'diagnostics',label:'نتيجة التنفيذ'},
 {id:'privacy',label:'الخصوصية والأمان'}
];
export type TraceDetailState='missing'|'invalid'|'not-found'|'found';
export function traceDetailState(id:unknown):TraceDetailState{
 if(id===null||id===undefined||id==='')return 'missing';
 if(typeof id!=='string'||!/^TRACE-DEMO-\d{4}$/.test(id))return 'invalid';
 return resolveTraceId(id)?'found':'not-found';
}
export function findTraceDetail(id:unknown):AgentTrace|null{return resolveTraceId(id);}
export function traceNeighbors(id:string):{previous:string|null;next:string|null}|null{
 const sorted=[...DEMO_AGENT_TRACES].sort((a,b)=>b.startedAt.localeCompare(a.startedAt));
 const idx=sorted.findIndex(t=>t.id===id);if(idx<0)return null;
 return {previous:sorted[idx-1]?.id??null,next:sorted[idx+1]?.id??null};
}
export type TimelineEntry=Readonly<{id:string;step:TraceStep;sequence:number;startMs:number|null;endMs:number|null;share:number|null}>;
/** Each known duration is a sequential sum; a running step has NO fabricated elapsed duration. */
export function traceTimeline(trace:AgentTrace):TimelineEntry[]{
 const known=trace.steps.reduce((sum,s)=>sum+(s.durationMs??0),0);
 let elapsed=0;
 return trace.steps.map((step,index)=>{
  const start=step.durationMs===null?null:elapsed;
  if(step.durationMs!==null)elapsed+=step.durationMs;
  return {id:step.id,step,sequence:index+1,startMs:start,endMs:step.durationMs===null?null:elapsed,share:step.durationMs===null||known===0?null:Math.round(step.durationMs/known*1000)/10};
 });
}
export type TraceSummary=Readonly<{id:string;status:string;kind:string;description:string;durationMs:number|null;completed:number;failed:number;skipped:number;running:number;steps:number;agents:string[];auditEventId:string|null;}>;
export function traceSummary(t:AgentTrace):TraceSummary{
 return {id:t.id,status:traceStatuses[t.status],kind:kindLabels[t.kind],description:t.description,durationMs:t.durationMs,
 completed:t.steps.filter(s=>s.status==='success').length,failed:t.steps.filter(s=>s.status==='failed'||s.status==='denied').length,
 skipped:t.steps.filter(s=>s.status==='skipped').length,running:t.steps.filter(s=>s.status==='running').length,
 steps:t.steps.length,agents:[...new Set(t.steps.filter(s=>s.status!=='skipped').map(s=>agentLabels[s.agent]))],auditEventId:t.auditEventId};
}
export function safeTraceDetailReference(t:AgentTrace):string{
 const summary=traceSummary(t);
 return `نظام بيان — تتبع اصطناعي\nالمعرّف: ${summary.id}\nنوع المهمة: ${summary.kind}\nالحالة: ${summary.status}\nالخطوات: ${summary.steps}\nالمدة: ${summary.durationMs===null?'غير مكتملة':summary.durationMs+' ms'}\n${summary.auditEventId?'حدث التدقيق التجريبي: '+summary.auditEventId:''}`.trim();
}
export function explainStep(step:TraceStep):string{
 switch(step.status){
 case 'failed':return 'فشلت هذه الخطوة في السيناريو التجريبي، ولا تتضمن التفاصيل بيانات داخلية.';
 case 'denied':return 'رُفضت هذه الخطوة في محاكاة سياسة الوصول.';
 case 'skipped':return 'لم تُنفذ هذه الخطوة؛ لا توجد مدة زمنية محسوبة لها.';
 case 'running':return 'حالة مرئية ثابتة، ولا توجد عملية حقيقية تعمل في الخلفية.';
 default:return `حالة الخطوة: ${stepStatuses[step.status]}، وفق بيانات العرض التدريبية.`;
 }
}
