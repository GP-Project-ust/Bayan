import type { Metadata } from 'next';
import { PlatformSettingsScreen } from '@/components/platform-settings/PlatformSettingsScreen';
import '@/components/analytics/analytics.css';
import '@/components/organizations/organizations.css';
import '@/components/platform-settings/platform-settings.css';

export const metadata: Metadata = {
  title: 'إعدادات المنصة | بيان',
  description: 'إدارة تجريبية لإعدادات المنصة العامة وسياسات الاستعلام والتدقيق ومزودي النماذج.',
  robots: { index: false, follow: false },
};

export default function PlatformSettingsPage() {
  return <PlatformSettingsScreen />;
}
