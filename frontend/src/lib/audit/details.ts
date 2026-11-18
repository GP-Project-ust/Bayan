/** Screen 29 - safe, demonstration-only audit detail helpers. */
import {DEMO_AUDIT_EVENTS,resolveAuditEvent,type AuditEvent,categoryLabels,outcomeLabels} from './events';

export type AuditDetailTab='overview'|'metadata'|'trace'|'privacy';
export const detailTabs:ReadonlyArray<{id:AuditDetailTab;label:string}>=Object.freeze([
 {id:'overview',label:'نظرة عامة'},{id:'metadata',label:'البيانات الوصفية'},
 {id:'trace',label:'معرّف التتبع'},{id:'privacy',label:'الخصوصية والضوابط'}
]);
export function validateAuditEventId(id:unknown):id is string{
 return typeof id==='string'&&/^AUD-DEMO-\d{3}$/.test(id);
}
export function findAuditEvent(id:unknown):AuditEvent|null{
 return validateAuditEventId(id)?resolveAuditEvent(id):null;
}
export function eventDetailState(id:unknown):'missing'|'invalid'|'not-found'|'found'{
 if(id==null||id==='')return 'missing';
 if(!validateAuditEventId(id))return 'invalid';
 return findAuditEvent(id)?'found':'not-found';
}
/** Nav is based only on allowlisted fixture IDs, never an arbitrary external address. */
export function auditNeighbors(id:string,events:readonly AuditEvent[]=DEMO_AUDIT_EVENTS){
 const i=events.findIndex(e=>e.id===id);
 return i<0?{previous:null,next:null}:{previous:events[i-1]?.id??null,next:events[i+1]?.id??null};
}
export function auditEventSummary(event:AuditEvent){
 return Object.freeze({
  eventId:event.id,actor:event.actor,actorId:event.actorId,
  category:categoryLabels[event.category],action:event.action,
  resource:event.resource,outcome:outcomeLabels[event.outcome],
  timestamp:event.timestamp,channel:event.channel,traceId:event.traceId,
  description:event.description
 });
}
/** Only safe, explicitly allowlisted metadata is exposed in the share text. */
export function shareableAuditReference(event:AuditEvent):string{
 return `مرجع تدقيق تدريبي: ${event.id} | معرّف التتبع: ${event.traceId} | النتيجة: ${outcomeLabels[event.outcome]}`;
}
/** No simulated agent execution facts are fabricated from a mere correlation ID. */
export function traceDetailAvailability(event:AuditEvent){
 return {traceId:event.traceId,hasAgentTrace:false,reason:'لا تتضمن سجلات التدريب خطوات تنفيذ فعلية للوكلاء؛ معرّف التتبع مرجع توضيحي فقط.'} as const;
}
