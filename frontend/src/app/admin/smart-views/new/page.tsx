import type {Metadata} from 'next';
import {CreateSmartViewScreen} from '@/components/smart-view-create/CreateSmartViewScreen';
import '@/components/analytics/analytics.css';
import '@/components/data-sources/data-sources.css';
import '@/components/smart-views/smart-views.css';
import '@/components/smart-view-create/create-smart-view.css';

export const metadata:Metadata={
 title:'إنشاء عرض ذكي تجريبي | بيان',
 description:'إنشاء مسودة آمنة غير منشورة لعرض ذكي من حقول تدريبية مصرح بها داخل نظام بيان.',
 robots:{index:false,follow:false}
};
export default function NewSmartViewPage(){return <CreateSmartViewScreen/>;}
