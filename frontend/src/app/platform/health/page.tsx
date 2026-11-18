import type {Metadata} from 'next';
import {SystemHealthScreen} from '@/components/system-health/SystemHealthScreen';
import '@/components/analytics/analytics.css';
import '@/components/organizations/organizations.css';
import '@/components/system-health/system-health.css';
export const metadata:Metadata={title:'مراقبة صحة خدمات النظام | بيان',description:'لوحة محاكاة تجريبية لحالة الخدمات العامة دون تنفيذ فحص اتصال حقيقي.',robots:{index:false,follow:false}};
export default function HealthPage(){return <SystemHealthScreen/>;}
