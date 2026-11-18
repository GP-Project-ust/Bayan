import type {Metadata} from 'next';
import {OrganizationsScreen} from '@/components/organizations/OrganizationsScreen';
import '@/components/analytics/analytics.css';
import '@/components/organizations/organizations.css';

export const metadata:Metadata={title:'إدارة المؤسسات المستفيدة | بيان',description:'واجهة تدريبية لإدارة بيانات تشغيل المؤسسات وفصل المستأجرين في نظام بيان.',robots:{index:false,follow:false}};
export default function OrganizationsPage(){return <OrganizationsScreen/>;}
