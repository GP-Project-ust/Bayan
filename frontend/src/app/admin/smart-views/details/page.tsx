import type {Metadata} from 'next';
import {SmartViewDetailsScreen} from '@/components/smart-view-details/SmartViewDetailsScreen';
import '@/components/analytics/analytics.css';
import '@/components/data-sources/data-sources.css';
import '@/components/smart-views/smart-views.css';
import '@/components/smart-view-details/smart-view-details.css';

export const metadata:Metadata={
 title:'تفاصيل العرض الذكي واختباره | بيان',
 description:'معاينة وصفية لحقول العروض الذكية وفحص التصنيف محليًا دون SQL حقيقي.',
 robots:{index:false,follow:false}
};
export default async function SmartViewDetailsPage({searchParams}:{searchParams:Promise<{id?:string|string[]}>}){
 const params=await searchParams;
 const id=typeof params?.id==='string'?params.id:null;
 return <SmartViewDetailsScreen requestedId={id}/>;
}
