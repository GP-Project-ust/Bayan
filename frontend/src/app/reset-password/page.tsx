import type { Metadata } from "next";
import { AuthLayout } from "@/components/layout";
import { ResetPasswordScreen } from "@/components/auth/ResetPasswordScreen";
import { isResetPreviewEnabled, resolveResetPreviewMode } from "@/lib/auth/reset-password";
import "@/components/auth/login.css";
import "@/components/auth/recovery.css";
import "@/components/auth/reset-password.css";

export const metadata: Metadata = {
  title: "إعادة تعيين كلمة المرور | بيان",
  description: "واجهة تغيير كلمة المرور في مشروع بيان — نموذج UX آمن للمعاينة ولا يتصل بالخادم",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

type ResetParams = { preview?: string | string[]; token?: string | string[] };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<ResetParams>;
}) {
  const params = await searchParams;
  // Do not read, log, store, reflect or accept URL tokens in this demo.
  const hasRealToken = params.token !== undefined;
  const preview = typeof params.preview === "string" ? params.preview : undefined;
  const mode = resolveResetPreviewMode(preview, hasRealToken, isResetPreviewEnabled());
  return <AuthLayout><ResetPasswordScreen initialMode={mode} /></AuthLayout>;
}
