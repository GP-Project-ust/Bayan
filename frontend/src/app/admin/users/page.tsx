import type {Metadata} from 'next';
import {UsersManagementScreen} from '@/components/user-management/UsersManagementScreen';
import '@/components/analytics/analytics.css';
import '@/components/user-management/users.css';
import '@/components/user-details/user-details.css';
export const metadata:Metadata={title:'إدارة المستخدمين | بيان',description:'واجهة إدارية تجريبية لحسابات المؤسسة وأدوارها وحالاتها.',robots:{index:false,follow:false}};
export default function UsersPage(){return <UsersManagementScreen/>;}
