import Link from "next/link";
import { ArrowUpLeft, BookOpen, CheckCircle2, ClipboardCheck, Layers3, MonitorSmartphone, ShieldCheck } from "lucide-react";
import { AUXILIARY_ROUTES } from "@/lib/routes";
import { QualityPlayground } from "./playground";
import "./quality.css";

export const metadata = { title: "التوثيق والاختبارات | بيان — المرحلة السابعة" };

export default function QualityPage() {
  return <main className="b7-page" dir="rtl"><div className="b7-container">
    <nav className="b7-nav" aria-label="التنقل في نظام التصميم"><Link href={AUXILIARY_ROUTES.designSystem} className="b7-logo"><span>بيان</span><small>Design System · 07/07</small></Link><div><Link href={AUXILIARY_ROUTES.designSystemComponents}>المكونات</Link><Link href={AUXILIARY_ROUTES.designSystemBayanComponents}>مكونات بيان</Link><Link href={AUXILIARY_ROUTES.designSystemResponsive}>التجاوب</Link><Link href={AUXILIARY_ROUTES.screens}>الشاشات</Link></div></nav>
    <header className="b7-hero"><div><span className="b7-eyebrow"><ClipboardCheck size={17}/> المرحلة 07 / 07 — Documentation & Testing</span><h1>دليل الجودة <em>واختبارات القبول</em></h1><p>مرجع للتوثيق والمراجعة المنهجية لجميع شاشات بيان ومكوناته، مع معايير قبول قابلة للتسجيل والتصدير. هذه مرحلة توثيق وضبط جودة، وليست إعلانًا عن جاهزية النظام للإنتاج.</p><div className="b7-hero-tags"><span><Layers3 size={15}/> 42 شاشة في الكتالوج</span><span><BookOpen size={15}/> 7 حالات استخدام أساسية</span><span><MonitorSmartphone size={15}/> 3 عروض للشاشة</span><span><ShieldCheck size={15}/> 4 أدوار</span></div></div><div className="b7-hero-mark" aria-hidden="true"><CheckCircle2 size={73}/><span>QUALITY</span><strong>07 / 07</strong></div></header>
    <QualityPlayground/>
    <footer className="b7-footer"><span>بيان · نظام التصميم المعتمد · الدليل النهائي</span><Link href={AUXILIARY_ROUTES.designSystem}>العودة إلى دليل الهوية <ArrowUpLeft size={16}/></Link></footer>
  </div></main>;
}
