import type {Metadata} from 'next';
import {AgentTracesScreen} from '@/components/agent-traces/AgentTracesScreen';
import '@/components/analytics/analytics.css';
import '@/components/audit/audit.css';
import '@/components/agent-traces/agent-traces.css';

export const metadata:Metadata={title:'تتبع تنفيذ الوكلاء | بيان',description:'واجهة تدريبية لمراجعة مسارات Supervisor وSQL وRAG وAnalyst وReporter دون كشف بيانات حساسة.',robots:{index:false,follow:false}};
export default function AgentTracesPage(){return <AgentTracesScreen/>;}
