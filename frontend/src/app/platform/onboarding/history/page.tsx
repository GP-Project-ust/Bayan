import type {Metadata} from 'next';
import {OnboardingHistoryScreen} from '@/components/onboarding-history/OnboardingHistoryScreen';
import '@/components/analytics/analytics.css';
import '@/components/organizations/organizations.css';
import '@/components/onboarding-history/onboarding-history.css';
export const metadata:Metadata={title:'سجل عمليات التهيئة | بيان',description:'سجل محاكاة التهيئة الذكية للمؤسسات: حالات ومراحل ومراجعة وفلاتر وصفية.',robots:{index:false,follow:false}};
export default function OnboardingHistoryPage(){return <OnboardingHistoryScreen/>;}
