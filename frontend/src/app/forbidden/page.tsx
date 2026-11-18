import type { Metadata } from 'next';
import { ForbiddenScreen } from '@/components/forbidden/ForbiddenScreen';
import '@/components/forbidden/forbidden.css';

export const metadata: Metadata = {
  title: 'غير مصرح بالوصول | بيان',
  description: 'صفحة توضح أن الحساب الحالي لا يمتلك صلاحية الوصول إلى المورد المطلوب.',
  robots: { index: false, follow: false },
};

export default function ForbiddenPage() {
  return <ForbiddenScreen />;
}
