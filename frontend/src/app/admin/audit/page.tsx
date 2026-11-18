import type {Metadata} from 'next';
import {AuditLogScreen} from '@/components/audit/AuditLogScreen';
import '@/components/analytics/analytics.css';
import '@/components/audit/audit.css';

export const metadata:Metadata={
 title:'سجل التدقيق | بيان',
 description:'معاينة تجريبية لواجهة سجل تدقيق مؤسسي، تشمل البحث والتصفية والتتبع والتصدير دون الوصول إلى سجلات فعلية.',
 robots:{index:false,follow:false}
};
export default function AuditPage(){return <AuditLogScreen/>;}
