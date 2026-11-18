import type { Metadata } from 'next';
import { UnavailableScreen } from '@/components/unavailable/UnavailableScreen';
import '@/components/unavailable/unavailable.css';

export const metadata: Metadata = {
  title: 'الخدمة غير متاحة | بيان',
  description: 'تنبيه مؤقت عند تعذر الوصول إلى إحدى خدمات بيان.',
  robots: { index: false, follow: false },
};

export default function UnavailablePage() {
  return <UnavailableScreen />;
}
