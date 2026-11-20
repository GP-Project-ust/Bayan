import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import "@/styles/bayan-tokens.css";
import "@/components/ui/ui.css";
import "@/styles/bayan-responsive.css";
import "@/styles/bayan-legacy.css";
import "@/styles/admin-dashboard.css";

const ibmPlexSansArabic = localFont({
  src: [
    {
      path: "./fonts/IBMPlexSansArabic-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/IBMPlexSansArabic-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "./fonts/IBMPlexSansArabic-SemiBold.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "./fonts/IBMPlexSansArabic-Bold.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-bayan-arabic",
  display: "swap",
});

const alexandria = localFont({
  src: [
    {
      path: "./fonts/Alexandria-Variable.woff2",
      style: "normal",
    },
    {
      path: "./fonts/Alexandria-Latin.woff2",
      style: "normal",
    },
  ],
  variable: "--font-alexandria",
  display: "swap",
  weight: "100 900",
});

const readexPro = localFont({
  src: [
    {
      path: "./fonts/ReadexPro-Variable.woff2",
      style: "normal",
    },
    {
      path: "./fonts/ReadexPro-Latin.woff2",
      style: "normal",
    },
  ],
  variable: "--font-readex-pro",
  display: "swap",
  weight: "160 700",
});

export const metadata: Metadata = {
  title: "بيان — المساعد المؤسسي الذكي",
  description:
    "اسأل عن بيانات جامعتك بالعربية — بيان يحوّل سؤالك إلى استعلام آمن ويجيبك في ثوانٍ",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl" className={`${ibmPlexSansArabic.variable} ${readexPro.variable} ${alexandria.variable}`}>
      <body className={ibmPlexSansArabic.className}>{children}</body>
    </html>
  );
}
