import type {Metadata} from 'next';
import {DataSourcesScreen} from '@/components/data-sources/DataSourcesScreen';
import '@/components/analytics/analytics.css';
import '@/components/data-sources/data-sources.css';
export const metadata:Metadata={title:'إدارة مصادر البيانات | بيان',description:'واجهة تجريبية للمصادر المؤسسية وحالات الاتصال والتصنيف دون أي اتصال حقيقي أو بيانات سرية.',robots:{index:false,follow:false}};
export default function DataSourcesPage(){return <DataSourcesScreen/>;}
