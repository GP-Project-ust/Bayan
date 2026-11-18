import type { Metadata } from "next";
import { ProfileScreen } from "@/components/profile/ProfileScreen";
import "@/components/profile/profile.css";

export const metadata: Metadata = {
  title: "الملف الشخصي | بيان",
  description: "واجهة الملف الشخصي التجريبية في نظام بيان: بيانات المستخدم، الصلاحيات، والتفضيلات والأمان.",
  robots: { index: false, follow: false },
};

export default function ProfilePage() {
  return <ProfileScreen />;
}
