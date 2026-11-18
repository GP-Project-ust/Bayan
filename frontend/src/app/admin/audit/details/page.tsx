import type {Metadata} from 'next';
import {AuditEventDetailsScreen} from '@/components/audit-details/AuditEventDetailsScreen';
import '@/components/analytics/analytics.css';
import '@/components/audit/audit.css';
import '@/components/audit-details/audit-details.css';

export const metadata:Metadata={
 title:'تفاصيل حدث التدقيق | بيان',
 description:'تفاصيل حدث تدريبي للقراءة فقط، مع معلومات الفاعل والتوقيت والنتيجة ومعرّف التتبع، دون بيانات حساسة.',
 robots:{index:false,follow:false}
};
export default async function AuditEventDetailsPage({searchParams}:{searchParams:Promise<{id?:string|string[]}>}){
 const params=await searchParams;
 return <AuditEventDetailsScreen requestedId={typeof params.id==='string'?params.id:params.id===undefined?null:'__INVALID__'}/>;
}
