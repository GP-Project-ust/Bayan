import type { Metadata } from "next";
import { NotificationsScreen } from "@/components/notifications/NotificationsScreen";
import "@/components/notifications/notifications.css";

export const metadata: Metadata = {
  title: "مركز الإشعارات | بيان",
  description: "مركز إشعارات تجريبي لنظام بيان؛ تصنيف التنبيهات وقراءتها وعرض تفاصيلها.",
  robots: { index:false, follow:false },
};

export default function NotificationsPage() {
  return <NotificationsScreen />;
}
