import type {Metadata} from 'next';
import {AddUserScreen} from '@/components/user-create/AddUserScreen';
import '@/components/analytics/analytics.css';
import '@/components/user-create/add-user.css';
export const metadata:Metadata={title:'إضافة مستخدم | بيان',description:'نموذج تجريبي لإضافة مستخدم مؤسسي ومراجعة دوره وصلاحياته',robots:{index:false,follow:false}};
export default function NewUserPage(){return <AddUserScreen/>;}
