import type { Metadata } from 'next';
import { AgentMonitoringScreen } from '@/components/agent-monitoring/AgentMonitoringScreen';
import '@/components/analytics/analytics.css';
import '@/components/organizations/organizations.css';
import '@/components/agent-monitoring/agent-monitoring.css';

export const metadata: Metadata = {
  title: 'مراقبة الوكلاء الذكيين | بيان',
  description: 'لوحة تجريبية لمراجعة أدوار الوكلاء الخمسة ومؤشراتهم المجمّعة دون كشف بيانات المؤسسات.',
  robots: { index: false, follow: false },
};

export default function AgentMonitoringPage() {
  return <AgentMonitoringScreen />;
}
