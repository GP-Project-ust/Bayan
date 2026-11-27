"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ChartNoAxesColumnIncreasing, BookOpen, Settings, UsersRound, Layers3, Database,
  ScrollText, Clock3, MessageSquare, PlusCircle, GraduationCap, BookOpenCheck, X, ShieldCheck } from "lucide-react";
import type { ReactNode, Ref } from "react";

export type Screen = "chat" | "admin";

type SidebarProps = {
  mode: Screen; onNewChat?: () => void; onHistory?: (title: string) => void; activeChat?: string;
  compact?: boolean; menuOpen?: boolean; onClose?: () => void; onNavigate?: () => void;
  asideRef?: Ref<HTMLElement>;
};

const chatHistory = [
  { title: "عدد طلاب كلية الهندسة", when: "اليوم، 10:24 ص" },
  { title: "لائحة الغياب والحرمان", when: "أمس، 02:17 م" },
  { title: "تقرير أداء الأقسام", when: "22 يناير، 11:03 ص" },
  { title: "إحصاءات القبول", when: "21 يناير، 09:30 ص" },
];

function NavigationLink({ href, icon, children, selected = false, onNavigate }:{href:string; icon:ReactNode; children:ReactNode;selected?:boolean;onNavigate?:()=>void}) {
  return <Link className={`side-nav-item ${selected ? "active" : ""}`} href={href} onClick={onNavigate} aria-current={selected ? "page" : undefined}>{icon}<span>{children}</span></Link>;
}

export default function Sidebar({ mode, onNewChat, onHistory, activeChat, compact=false, menuOpen=false, onClose, onNavigate, asideRef }: SidebarProps) {
  const path = usePathname();
  return (
    <aside ref={asideRef} id="bayan-primary-sidebar" tabIndex={-1} className="app-sidebar"
      data-open={menuOpen ? "true" : "false"} role={compact && menuOpen ? "dialog" : undefined}
      aria-modal={compact && menuOpen ? true : undefined} aria-label="القائمة الرئيسية">
      <button type="button" className="bayan-mobile-close" onClick={onClose} aria-label="إغلاق القائمة"><X size={23}/></button>
      <Link href="/" className="brand-wrap" onClick={onNavigate}>
        <div className="brand-line"><div className="brand-symbol"><GraduationCap size={57} strokeWidth={1.75}/><BookOpenCheck size={41} strokeWidth={1.7}/></div><div className="brand-word">بيان</div></div>
        <div className="brand-description">مساعد مؤسسي عربي ذكي</div>
      </Link>
      <div className="sidebar-rule" />
      {mode === "chat" ? (
        <>
          <button type="button" className="new-chat-button" onClick={onNewChat}><PlusCircle size={25}/> المحادثة الجديدة</button>
          <nav className="side-navigation">
            <NavigationLink onNavigate={onNavigate} href="/" icon={<Home/>} selected={path === "/"}>الرئيسية</NavigationLink>
            <NavigationLink onNavigate={onNavigate} href="/reports" icon={<ChartNoAxesColumnIncreasing/>}>التقارير</NavigationLink>
            <NavigationLink onNavigate={onNavigate} href="/sources" icon={<BookOpen/>}>المصادر والمراجع</NavigationLink>
            <NavigationLink onNavigate={onNavigate} href="/settings" icon={<Settings/>}>الإعدادات</NavigationLink>
          </nav>
          <div className="sidebar-rule history-rule" />
          <Link href="/conversations" className="history-title" onClick={onNavigate} aria-label="فتح سجل المحادثات السابقة"><Clock3 size={24}/> المحادثات السابقة</Link>
          <div className="history-list">
            {chatHistory.map((chat, i) => <button className={`history-entry ${(activeChat ? chat.title === activeChat : i===0) ? "active" : ""}`} key={chat.title} onClick={() => onHistory?.(chat.title)}>
              <MessageSquare size={21}/><span><strong>{chat.title}</strong><small>{chat.when}</small></span>
            </button>)}
          </div>
        </>
      ) : (
        <nav className="side-navigation admin-navigation">
          <NavigationLink onNavigate={onNavigate} href="/" icon={<Home/>}>الرئيسية</NavigationLink>
          <NavigationLink onNavigate={onNavigate} href="/admin/users" icon={<UsersRound/>} selected={path.startsWith("/admin/users")}>إدارة المستخدمين</NavigationLink>
          <NavigationLink onNavigate={onNavigate} href="/admin/roles" icon={<ShieldCheck/>} selected={path.startsWith("/admin/roles")}>الأدوار والصلاحيات</NavigationLink>
          <NavigationLink onNavigate={onNavigate} href="/admin/data-sources" icon={<Database/>} selected={path.startsWith("/admin/data-sources")}>مصادر البيانات</NavigationLink>
          <NavigationLink onNavigate={onNavigate} href="/admin/smart-views" icon={<Layers3/>}>العروض الذكية</NavigationLink>
          <NavigationLink onNavigate={onNavigate} href="/admin/audit" icon={<ScrollText/>}>سجل التدقيق</NavigationLink>
          <NavigationLink onNavigate={onNavigate} href="/platform/onboarding" icon={<Database/>} selected={path.startsWith("/platform/onboarding")}>التهيئة الذكية</NavigationLink>
          <NavigationLink onNavigate={onNavigate} href="/platform/settings" icon={<Settings/>}>الإعدادات</NavigationLink>
        </nav>
      )}
      {mode === "admin" && <div className="sidebar-rule admin-bottom-rule" />}
      <div className="sidebar-campus" aria-hidden="true" />
      <div className="proposed-mark">تصميم أولي مقترح</div>
    </aside>
  );
}
