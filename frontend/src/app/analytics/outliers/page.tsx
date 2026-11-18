import type {Metadata} from 'next';
import {OutliersScreen} from '@/components/outliers/OutliersScreen';
import '@/components/analytics/analytics.css';
import '@/components/outliers/outliers.css';
export const metadata:Metadata={title:'اكتشاف القيم الشاذة | بيان',description:'واجهة تجريبية لحالات ومقارنات غير اعتيادية من بيانات أكاديمية افتراضية.',robots:{index:false,follow:false}};
export default function OutliersPage(){return <OutliersScreen/>;}
