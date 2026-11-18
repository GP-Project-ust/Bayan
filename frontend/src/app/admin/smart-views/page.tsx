import type {Metadata} from 'next';
import {SmartViewsScreen} from '@/components/smart-views/SmartViewsScreen';
import '@/components/analytics/analytics.css';
import '@/components/data-sources/data-sources.css';
import '@/components/smart-views/smart-views.css';

export const metadata:Metadata={
 title:'إدارة العروض الذكية | بيان',
 description:'إدارة ومراجعة العروض الذكية المؤسسية في نموذج تجريبي، مع فلاتر ومستويات وصول ودون تنفيذ SQL.',
 robots:{index:false,follow:false}
};
export default function SmartViewsPage(){return <SmartViewsScreen/>;}
