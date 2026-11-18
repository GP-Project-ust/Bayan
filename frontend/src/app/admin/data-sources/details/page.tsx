import type {Metadata} from 'next';
import {SourceDetailsScreen} from '@/components/source-details/SourceDetailsScreen';
import '@/components/analytics/analytics.css';
import '@/components/data-sources/data-sources.css';
import '@/components/source-details/source-details.css';

export const metadata:Metadata={
 title:'تفاصيل مصدر البيانات | بيان',
 description:'معلومات وصفية تجريبية عن مصدر البيانات والجداول والتصنيفات والعروض الذكية دون اتصال حقيقي.',
 robots:{index:false,follow:false}
};
export default async function DataSourceDetailsPage({searchParams}:{searchParams:Promise<{id?:string}>}){
 const params=await searchParams;
 return <SourceDetailsScreen requestedId={params.id??null}/>;
}
