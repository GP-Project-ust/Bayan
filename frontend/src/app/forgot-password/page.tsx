import type { Metadata } from "next";
import { AuthLayout } from "@/components/layout";
import { ForgotPasswordScreen } from "@/components/auth/ForgotPasswordScreen";
import "@/components/auth/login.css";
import "@/components/auth/recovery.css";

export const metadata: Metadata = {
  title: "استعادة كلمة المرور | بيان",
  description: "طلب استعادة الوصول إلى حساب بيان — واجهة عربية RTL تجريبية",
};

export default function ForgotPasswordPage() {
  return <AuthLayout><ForgotPasswordScreen /></AuthLayout>;
}
