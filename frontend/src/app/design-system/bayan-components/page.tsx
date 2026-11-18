import Link from "next/link";
import { ArrowUpLeft, Boxes, LayoutDashboard, MessageSquareText, Palette } from "lucide-react";
import { BayanDomainPlayground } from "./playground";
import "@/components/ui/ui.css";
import "@/components/bayan/bayan.css";
import "./showcase.css";

export const metadata={title:"مكونات بيان المتخصصة | Design System"};
export default function BayanComponentsPage(){
  return <main className="bayan-story" dir="rtl">
    <div className="bayan-story-container">
      <nav className="bayan-story-navigation" aria-label="التنقل بين مراحل نظام التصميم">
        <Link href="/design-system" className="bayan-story-brand"><Boxes size={22}/><strong>بيان</strong><span>Design System · المرحلة 4</span></Link>
        <div><Link href="/design-system/components">المكونات العامة</Link><Link href="/design-system/layouts">التخطيطات</Link><Link href="/design-system/states-permissions">الحالات والصلاحيات</Link><Link href="/">المحادثة</Link><Link href="/admin">الإدارة</Link></div>
      </nav>
      <header className="bayan-story-hero"><div><span className="bayan-story-eyebrow">04 / 07 — مكونات النظام المتخصصة</span><h1>مكتبة واجهات <em>بيان</em> الذكية</h1><p>سبعة مكونات React حقيقية لرحلة المستخدم المؤسسي: إرسال السؤال، عرض الإجابة، استعراض SQL والمصادر، تصدير التقارير، إدارة Smart Views، وتتبع الوكلاء. اختبر وظائفها عبر الأمثلة أدناه.</p><div className="bayan-story-tags"><span>RTL</span><span>TypeScript</span><span>Design Tokens</span><span>Mock Data</span></div></div><div className="bayan-story-hero-icon"><Boxes size={65}/><span>Domain UI v1.0</span></div></header>
      <BayanDomainPlayground/>
      <footer className="bayan-story-footer"><Palette size={18}/> <span>الواجهة توضيحية فقط، ولا تجري أي طلبات إلى API أو قواعد بيانات حقيقية. <Link href="/design-system">العودة إلى نظام التصميم <ArrowUpLeft size={15}/></Link></span><Link href="/design-system/layouts"><LayoutDashboard size={16}/> التخطيطات</Link><Link href="/"><MessageSquareText size={16}/> المحادثة الأصلية</Link></footer>
    </div>
  </main>;
}
