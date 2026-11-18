import type {Metadata} from 'next';
import {ReportsCenterScreen} from '@/components/reports/ReportsCenterScreen';
import '@/components/reports/reports-center.css';
export const metadata: Metadata = {title:'مركز التقارير | بيان',description:'واجهة تقارير تجريبية — لا تتصل ببيانات حقيقية.',robots:{index:false,follow:false}};
export default function ReportsPage(){return <ReportsCenterScreen/>;}
