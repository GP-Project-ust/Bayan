import type {Metadata} from 'next';
import {RolesPermissionsScreen} from '@/components/roles-permissions/RolesPermissionsScreen';
import '@/components/analytics/analytics.css';
import '@/components/user-management/users.css';
import '@/components/roles-permissions/roles-permissions.css';

export const metadata:Metadata={
 title:'إدارة الأدوار والصلاحيات | بيان',
 description:'مصفوفة الوصول المؤسسي، مقارنة الأدوار وطلبات مراجعة تجريبية لا تغيّر الصلاحيات الحقيقية.',
 robots:{index:false,follow:false}
};
export default function RolesPermissionsPage(){return <RolesPermissionsScreen/>;}
