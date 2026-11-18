import type {Metadata} from 'next';
import {AnalyticsScreen} from '@/components/analytics/AnalyticsScreen';
import '@/components/analytics/analytics.css';
export const metadata:Metadata={title:'لوحة التحليلات ومؤشرات الأداء | بيان',description:'لوحة مؤشرات جامعية تدريبية عربية، بدون اتصال بمصادر فعلية.',robots:{index:false,follow:false}};
export default function AnalyticsPage(){return <AnalyticsScreen/>;}
