import type { Metadata } from 'next';
import { ScreensCatalog } from '@/components/screens-catalog/ScreensCatalog';
import '@/components/screens-catalog/screens-catalog.css';

export const metadata: Metadata = {
  title: 'خريطة الواجهات | بيان',
  description: 'فهرس تفاعلي لشاشات نظام بيان مع البحث والتصفية حسب القسم والدور.',
  robots: { index: false, follow: false },
};

export default function ScreensPage() {
  return <ScreensCatalog />;
}
