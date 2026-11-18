import type { Metadata } from "next";
import { AuthLayout } from "@/components/layout";
import { LoginScreen } from "@/components/auth/LoginScreen";
import "@/components/auth/login.css";

export const metadata: Metadata = {
  title: "تسجيل الدخول | بيان",
  description: "صفحة تسجيل الدخول إلى نظام بيان — تصميم عربي RTL وفق الهوية البصرية المعتمدة",
};

export default function LoginPage() {
  return <AuthLayout><LoginScreen /></AuthLayout>;
}
