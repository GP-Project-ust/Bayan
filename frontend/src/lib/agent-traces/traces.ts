/**
 * Screen 30 - Synthetic, sanitized operational trace summaries for UI prototyping.
 * No live LangGraph execution, prompts, model chain-of-thought, SQL text, access
 * tokens, document excerpts or tenant identifiers are recorded here.
 */
export const TRACE_DEMO_NOTICE='سجلات تشغيل اصطناعية لأغراض التصميم؛ لا تمثل نشاطًا من خادم أو تنفيذًا حقيقيًا للوكلاء.';
export type AgentName='Supervisor'|'SQL'|'RAG'|'Analyst'|'Reporter';
export type TraceStatus='success'|'failed'|'denied'|'running';
export type StepStatus='success'|'failed'|'denied'|'skipped'|'running';
export type TraceKind='data'|'documents'|'report'|'mixed';
export type TraceStep=Readonly<{
 id:string;agent:AgentName;label:string;status:StepStatus;durationMs:number|null;
 summary:string;
}>;
export type AgentTrace=Readonly<{
 id:string; startedAt:string;kind:TraceKind;status:TraceStatus;durationMs:number|null;
 description:string;steps:readonly TraceStep[];auditEventId:string|null;
}>;
export const agentLabels:Record<AgentName,string>={Supervisor:'المنسّق',SQL:'استعلام البيانات',RAG:'البحث الدلالي',Analyst:'المحلّل',Reporter:'منسّق الإجابة'};
export const traceStatuses:Record<TraceStatus,string>={success:'ناجح',failed:'فشل',denied:'مرفوض',running:'قيد التنفيذ'};
export const stepStatuses:Record<StepStatus,string>={...traceStatuses,skipped:'تجاوز'};
export const kindLabels:Record<TraceKind,string>={data:'استعلام بيانات',documents:'بحث في المستندات',report:'تقرير تحليلي',mixed:'استعلام مركّب'};
function step(id:string,agent:AgentName,label:string,status:StepStatus,durationMs:number|null,summary:string):TraceStep{
 return Object.freeze({id,agent,label,status,durationMs,summary});
}
/** Correlations are demo fixture keys only; they do not assert real events occurred. */
export const DEMO_AGENT_TRACES:readonly AgentTrace[]=Object.freeze([
 {id:'TRACE-DEMO-0007',startedAt:'2026-11-06T15:28:00+03:00',kind:'documents',status:'success',durationMs:1420,description:'طلب بحث وصفي في اللوائح التدريبية',auditEventId:'AUD-DEMO-007',steps:[
  step('07-1','Supervisor','تصنيف الطلب','success',180,'تحديد مسار البحث في المستندات؛ دون تسجيل نص السؤال.'),
  step('07-2','RAG','استرجاع مراجع مسموحة','success',920,'محاكاة استرجاع مصادر عامة، دون محتوى مستندات فعلي.'),
  step('07-3','Reporter','تهيئة جواب مع مصادر','success',320,'تنسيق إجابة وصفية تجريبية دون اقتباس مستندات.') ]},
 {id:'TRACE-DEMO-0013',startedAt:'2026-11-05T12:33:00+03:00',kind:'data',status:'denied',durationMs:85,description:'محاولة عرض تفاصيل SQL دون صلاحية',auditEventId:'AUD-DEMO-013',steps:[
  step('13-1','Supervisor','التحقق من صلاحية الطلب','denied',85,'رُفض الإجراء في المحاكاة قبل استدعاء وكيل SQL أو تنفيذ استعلام.'),
  step('13-2','SQL','تنفيذ الاستعلام','skipped',null,'لم تُشغَّل هذه الخطوة لأن الإذن غير متاح.') ]},
 {id:'TRACE-DEMO-0012',startedAt:'2026-11-05T14:05:00+03:00',kind:'report',status:'failed',durationMs:1760,description:'طلب تقرير تدريبي تعذّر إتمامه',auditEventId:'AUD-DEMO-012',steps:[
  step('12-1','Supervisor','توجيه طلب التقرير','success',165,'تحديد نوع التقرير ومسار المعالجة.') ,
  step('12-2','SQL','التحقق من البيانات المسموحة','success',490,'محاكاة اعتماد مصدر بيانات تجريبي مسموح.'),
  step('12-3','Analyst','تجميع المؤشرات','failed',1105,'فشل تدريبي في معالجة المؤشرات؛ دون كشف بيانات الطلب.'),
  step('12-4','Reporter','صياغة التقرير النهائي','skipped',null,'تم تجاوز الخطوة بعد فشل المرحلة السابقة.') ]},
 {id:'TRACE-DEMO-0101',startedAt:'2026-11-07T10:42:00+03:00',kind:'data',status:'success',durationMs:940,description:'تجربة استخراج مؤشر عددي من مصدر اصطناعي',auditEventId:null,steps:[
  step('101-1','Supervisor','تحديد نية الاستعلام','success',125,'صُنّف الطلب بوصفه استعلامًا عن رقم إجمالي.'),
  step('101-2','SQL','فحص استعلام آمن للقراءة','success',500,'جرت محاكاة التحقق من استعلام للقراءة فقط؛ لا يوجد SQL تنفيذي.'),
  step('101-3','Reporter','تنسيق النتيجة','success',315,'إرجاع وصف إحصائي تجريبي.') ]},
 {id:'TRACE-DEMO-0102',startedAt:'2026-11-07T09:17:00+03:00',kind:'mixed',status:'success',durationMs:2160,description:'سؤال توضيحي يجمع اللوائح ومؤشرًا عدديًا',auditEventId:null,steps:[
  step('102-1','Supervisor','تخطيط مسار مزدوج','success',180,'توجيه مثال السؤال إلى مساري البيانات والمستندات.'),
  step('102-2','SQL','فحص بيانات المؤسسة','success',660,'استخدام بيانات مختلقة للمعاينة فقط.'),
  step('102-3','RAG','فحص مرجع لائحة','success',710,'معالجة وصفية لمصدر تدريبي بلا نص أصلي.'),
  step('102-4','Analyst','تجميع النتائج','success',330,'دمج ملخصين صناعيين متوافقين.'),
  step('102-5','Reporter','صياغة الإجابة النهائية','success',280,'تنسيق النتيجة من دون إظهار مدخلات خاصة.') ]},
 {id:'TRACE-DEMO-0103',startedAt:'2026-11-07T08:11:00+03:00',kind:'documents',status:'failed',durationMs:510,description:'بحث في فهرس تدريبي غير متاح',auditEventId:null,steps:[
  step('103-1','Supervisor','توجيه طلب المستندات','success',95,'اختيار مسار البحث الدلالي.'),
  step('103-2','RAG','استرجاع المقاطع','failed',415,'مثال لفشل مؤقت في المصدر التدريبي؛ لا بيانات حقيقية.'),
  step('103-3','Reporter','صياغة إجابة بمصادر','skipped',null,'لم تصدر إجابة بسبب غياب المقاطع المتاحة.') ]},
 {id:'TRACE-DEMO-0104',startedAt:'2026-11-06T13:24:00+03:00',kind:'report',status:'success',durationMs:2380,description:'إنشاء تقرير تحليلي افتراضي',auditEventId:null,steps:[
  step('104-1','Supervisor','توجيه طلب التحليل','success',210,'تحديد تقرير إحصائي تدريبي.'),
  step('104-2','SQL','استرداد مؤشرات مقنّعة','success',750,'محاكاة بيانات رقمية دون بيانات شخصية.'),
  step('104-3','Analyst','تلخيص اتجاهات النتائج','success',950,'حساب مثال إحصائي لا يعتمد بيانات مؤسسة حقيقية.'),
  step('104-4','Reporter','صياغة تقرير وصفي','success',470,'إخراج تقرير تدريبي للاستخدام في الواجهة.') ]},
 {id:'TRACE-DEMO-0105',startedAt:'2026-11-07T11:02:00+03:00',kind:'mixed',status:'running',durationMs:null,description:'مثال مرئي لحالة تنفيذ قيد المعالجة',auditEventId:null,steps:[
  step('105-1','Supervisor','تحديد مسار الطلب','success',180,'انتهى تصنيف الطلب في المثال.'),
  step('105-2','SQL','معالجة الاستعلام التجريبي','running',null,'حالة ثابتة للعرض، ولا توجد مهمة تعمل في الخلفية.'),
  step('105-3','Reporter','إعداد الإجابة','skipped',null,'لم تبدأ الخطوة في هذا المثال الثابت.') ]}
]);
export type TraceFilters=Readonly<{query:string;status:TraceStatus|'all';kind:TraceKind|'all';agent:AgentName|'all';from:string;to:string}>;
export const DEFAULT_TRACE_FILTERS:TraceFilters={query:'',status:'all',kind:'all',agent:'all',from:'',to:''};
export function normalizeArabic(value:string):string{return value.normalize('NFKC').replace(/[\u064b-\u065f\u0670]/g,'').replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').replace(/ـ/g,'').toLowerCase().trim();}
export function isValidDate(value:string):boolean{
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const d=new Date(value+'T00:00:00Z');return !Number.isNaN(d.valueOf())&&d.toISOString().slice(0,10)===value;
}
export function invalidTraceRange(filters:TraceFilters){return (!!filters.from&&!isValidDate(filters.from))|| (!!filters.to&&!isValidDate(filters.to))|| (!!filters.from&&!!filters.to&&filters.from>filters.to);}
export function filterTraces(traces:readonly AgentTrace[],filters:TraceFilters):AgentTrace[]{
 if(invalidTraceRange(filters))return [];
 const q=normalizeArabic(filters.query);
 return traces.filter(t=>{
  if(filters.status!=='all'&&t.status!==filters.status)return false;
  if(filters.kind!=='all'&&t.kind!==filters.kind)return false;
  if(filters.agent!=='all'&&!t.steps.some(s=>s.agent===filters.agent))return false;
  const date=t.startedAt.slice(0,10);if(filters.from&&date<filters.from)return false;if(filters.to&&date>filters.to)return false;
  const searchable=[t.id,t.description,kindLabels[t.kind],traceStatuses[t.status],t.auditEventId??'',...t.steps.map(s=>agentLabels[s.agent]+' '+s.agent+' '+s.label)].join(' ');
  return !q||normalizeArabic(searchable).includes(q);
 }).sort((a,b)=>b.startedAt.localeCompare(a.startedAt));
}
export function traceStats(traces:readonly AgentTrace[]){return {total:traces.length,success:traces.filter(t=>t.status==='success').length,failed:traces.filter(t=>t.status==='failed').length,denied:traces.filter(t=>t.status==='denied').length,running:traces.filter(t=>t.status==='running').length};}
export function resolveTraceId(id:unknown,traces:readonly AgentTrace[]=DEMO_AGENT_TRACES):AgentTrace|null{
 return typeof id==='string'&&/^TRACE-DEMO-\d{4}$/.test(id)?traces.find(t=>t.id===id)??null:null;
}
export function safeTraceReference(t:AgentTrace):string{return `تتبع تجريبي: ${t.id} | الحالة: ${traceStatuses[t.status]} | المدة: ${t.durationMs===null?'غير مكتملة':t.durationMs+' ms'}`;}
export function exportTraceCsvCell(value:string):string{
 const safe=/^\s*[=+\-@\t\r]/.test(value)?"'"+value:value;
 return '"'+safe.replaceAll('"','""')+'"';
}
export function createTraceCsv(rows:readonly AgentTrace[]):string{
 const header=['معرّف التتبع','وقت البدء','نوع الطلب','الحالة','المدة بالمللي ثانية','الوكلاء','مرجع حدث التدقيق'];
 return '\uFEFF'+[header,...rows.map(t=>[t.id,t.startedAt,kindLabels[t.kind],traceStatuses[t.status],t.durationMs===null?'—':String(t.durationMs),t.steps.map(s=>s.agent).join(' → '),t.auditEventId??'—'])].map(row=>row.map(exportTraceCsvCell).join(',')).join('\r\n')+'\r\n';
}
