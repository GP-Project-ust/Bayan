import type {Metadata} from 'next';
import {AgentTraceDetailsScreen} from '@/components/agent-trace-details/AgentTraceDetailsScreen';
import '@/components/analytics/analytics.css';
import '@/components/audit/audit.css';
import '@/components/agent-traces/agent-traces.css';
import '@/components/agent-trace-details/agent-trace-details.css';
export const metadata:Metadata={title:'تفاصيل تتبع الوكلاء | بيان',description:'عرض بيانات تشغيلية اصطناعية للخط الزمني والخطوات وحالاتها دون كشف الاستدلال الداخلي.',robots:{index:false,follow:false}};
export default async function AgentTraceDetailsPage({searchParams}:{searchParams:Promise<{id?:string|string[]}>}){
 const params=await searchParams;
 return <AgentTraceDetailsScreen requestedId={typeof params.id==='string'?params.id:params.id===undefined?null:'__INVALID__'}/>;
}
