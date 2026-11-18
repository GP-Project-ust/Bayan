import type {Metadata} from 'next';
import {ConnectDataSourceScreen} from '@/components/connect-data-source/ConnectDataSourceScreen';
import '@/components/analytics/analytics.css';
import '@/components/connect-data-source/connect-data-source.css';
export const metadata:Metadata={title:'ربط مصدر بيانات جديد | بيان',description:'نموذج تدريبي من خمس خطوات لتهيئة مصدر بيانات مؤسسي دون أي اتصال أو تخزين بيانات اعتماد.',robots:{index:false,follow:false}};
export default function ConnectDataSourcePage(){return <ConnectDataSourceScreen/>;}
