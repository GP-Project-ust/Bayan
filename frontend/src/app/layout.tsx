import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "بيان — المساعد المؤسسي الذكي",
  description:
    "اسأل عن بيانات جامعتك بالعربية — بيان يحوّل سؤالك إلى استعلام آمن ويجيبك في ثوانٍ",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
