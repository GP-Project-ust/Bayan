import type {Metadata} from 'next';
import {ModelsScreen} from '@/components/model-providers/ModelsScreen';
import '@/components/analytics/analytics.css';
import '@/components/organizations/organizations.css';
import '@/components/model-providers/model-providers.css';
export const metadata:Metadata={title:'مزودو النماذج اللغوية | بيان',description:'معاينة عربية RTL لإدارة مزودي النماذج وحالاتها وحدود الاستخدام، باستخدام بيانات تدريبية فقط.',robots:{index:false,follow:false}};
export default function ModelsPage(){return <ModelsScreen/>;}
