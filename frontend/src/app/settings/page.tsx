import type { Metadata } from "next";
import { SettingsScreen } from "@/components/settings/SettingsScreen";
import "@/components/settings/settings.css";

export const metadata:Metadata = {
  title: "الإعدادات والتفضيلات | بيان",
  description: "إعدادات تجريبية لتفضيلات العرض والإشعارات والمحادثة مع محاكاة صلاحيات بيان.",
  robots: {index:false,follow:false},
};

export default function SettingsPage() {return <SettingsScreen/>;}
