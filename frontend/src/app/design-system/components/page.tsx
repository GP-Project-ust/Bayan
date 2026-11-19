import Link from "next/link";
import { ArrowRight, Component, LayoutDashboard, MessageSquareText, Palette } from "lucide-react";
import { ORGANIZATION_ROUTES, AUXILIARY_ROUTES } from "@/lib/routes";
import { ComponentsPlayground } from "./playground";
import "@/components/ui/ui.css";
import "./showcase.css";

export const metadata = { title: "مكتبة المكونات | نظام تصميم بيان" };
export default function ComponentsPage() {
  return <main className="bui-showcase" dir="rtl">
    <div className="bui-showcase-container">
      <nav className="bui-showcase-nav" aria-label="روابط المعاينة">
        <div className="bui-showcase-brand"><Component size={22} /><strong>بيان</strong><span>Design System · المرحلة الثانية</span></div>
        <div className="bui-showcase-links"><Link href={AUXILIARY_ROUTES.designSystem}><Palette size={16} />الهوية البصرية</Link><Link href={ORGANIZATION_ROUTES.home}><MessageSquareText size={16} />المحادثة</Link><Link href={ORGANIZATION_ROUTES.dashboard}><LayoutDashboard size={16} />الإدارة</Link></div>
      </nav>
      <header className="bui-showcase-hero"><div><span className="bui-showcase-step">المرحلة 02 / 07 — مكتبة مكونات حقيقية</span><h1>مكونات واجهات <em>بيان</em></h1><p>عناصر React قابلة لإعادة الاستخدام، ومتوافقة مع العربية وRTL وقيم الألوان المعتمدة. جرّب النماذج هنا، دون التأثير في الواجهتين الأصليتين.</p></div><Link href={AUXILIARY_ROUTES.designSystem} className="bui-showcase-back"><ArrowRight size={17} /> العودة إلى نظام التصميم</Link></header>
      <ComponentsPlayground />
      <footer className="bui-showcase-footer">بيانات المعاينة افتراضية. لا تتصل هذه الصفحة بنظام المصادقة أو قواعد البيانات أو API الفعلي.</footer>
    </div>
  </main>;
}
