import Link from "next/link";
import { Activity, ArrowUpLeft, BookOpen, LayoutDashboard, Palette, ShieldCheck } from "lucide-react";
import { DemoAccessProvider } from "@/components/access";
import { AccessStatesPlayground } from "./playground";
import "@/components/ui/ui.css";
import "@/components/states/states.css";
import "@/components/access/access.css";
import "./showcase.css";

export const metadata={title:"حالات النظام والصلاحيات | بيان — المرحلة الخامسة"};
export default function AccessStatesPage(){
  return <main className="b5-showcase" dir="rtl"><div className="b5-container">
    <nav className="b5-topbar"><Link className="b5-logo" href="/design-system"><ShieldCheck size={23}/><b>بيان</b><span>Design System · المرحلة 5</span></Link><div><Link href="/design-system/components">المكونات</Link><Link href="/design-system/bayan-components">مكونات بيان</Link><Link href="/design-system/layouts">التخطيطات</Link><Link href="/screens">الشاشات</Link></div></nav>
    <header className="b5-hero"><div><span className="b5-overline"><Activity size={16}/> 05 / 07 — States & RBAC</span><h1>حالات النظام <em>والصلاحيات</em></h1><p>تجربة تفاعلية لأدوار بيان الأربعة، وحدود الوصول إلى الشاشات، وحالات انتظار ونجاح وخطأ واضحة باللغة العربية. كل ما تراه هنا محاكاة محلية دون تسجيل دخول حقيقي.</p><div className="b5-tags"><span>RTL</span><span>أربعة أدوار</span><span>42 شاشة</span><span>11 حالة واجهة</span></div></div><div className="b5-hero-mark"><ShieldCheck size={69}/><strong>Access UX v1.0</strong></div></header>
    <DemoAccessProvider initialRole="employee"><AccessStatesPlayground/></DemoAccessProvider>
    <footer className="b5-footer"><Palette size={18}/> الهوية البصرية المعتمدة لم تتغير — <Link href="/design-system">الدليل البصري <ArrowUpLeft size={15}/></Link> <Link href="/design-system/bayan-components"><BookOpen size={16}/> المرحلة الرابعة</Link><Link href="/admin"><LayoutDashboard size={16}/> لوحة الإدارة الأصلية</Link></footer>
  </div></main>;
}
