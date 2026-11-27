import type { Metadata } from "next";
import { OnboardingWorkspace } from "@/components/onboarding";

export const metadata: Metadata = {
  title: "التهيئة الذكية والمعرفة الدلالية | بيان",
  description: "منصة بيان المدمجة لإدارة مسار التهيئة الذكية (المراحل 0–8) وفهرس pgvector و Catalog v2.",
};

export default function OnboardingPage() {
  return <OnboardingWorkspace />;
}
