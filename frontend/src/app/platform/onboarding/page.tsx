import type {Metadata} from 'next';
import {OnboardingScreen} from '@/components/onboarding/OnboardingScreen';
import '@/components/analytics/analytics.css';
import '@/components/organizations/organizations.css';
import '@/components/onboarding/onboarding.css';
export const metadata:Metadata={title:'معالج التهيئة الذكية | بيان',description:'محاكاة تعليمية آمنة لمراحل تهيئة مؤسسة في نظام بيان، دون اتصالات أو موارد حقيقية.',robots:{index:false,follow:false}};
export default function OnboardingPage(){return <OnboardingScreen/>;}
