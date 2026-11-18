import type {Metadata} from 'next';
import {UserDetailsScreen} from '@/components/user-details/UserDetailsScreen';
import '@/components/analytics/analytics.css';
import '@/components/user-management/users.css';
import '@/components/user-details/user-details.css';

export const metadata:Metadata={
  title:'تفاصيل المستخدم | بيان',
  description:'عرض معلومات الحساب والأدوار والصلاحيات والنشاط التجريبي مع إجراءات الإدارة المحلية.',
  robots:{index:false,follow:false},
};
export default async function UserDetailsPage({searchParams}:{searchParams:Promise<{id?:string;user?:string}>}){
  const params=await searchParams;
  return <UserDetailsScreen requestedId={params.id??params.user??null}/>;
}
