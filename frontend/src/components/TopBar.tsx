"use client";
import type { Ref } from "react";
import Link from "next/link";
import { Bell, ChevronDown, Menu, UserRound, X } from "lucide-react";

export default function TopBar({
  admin = false, userLabel, menuOpen = false, onMenuToggle, menuButtonRef,
}: {
  admin?: boolean; userLabel?: string; menuOpen?: boolean;
  onMenuToggle?: () => void; menuButtonRef?: Ref<HTMLButtonElement>;
}) {
  return <header className="topbar">
    <button ref={menuButtonRef} type="button" className="bayan-mobile-menu-button"
      data-bayan-menu-toggle aria-controls="bayan-primary-sidebar" aria-expanded={menuOpen}
      aria-label={menuOpen ? "إغلاق القائمة" : "فتح القائمة الرئيسية"} onClick={onMenuToggle}>
      {menuOpen ? <X size={24}/> : <Menu size={24}/>}
    </button>
    <Link href="/profile" className="user-menu" aria-label={`الملف الشخصي: ${userLabel ?? (admin ? "مسؤول النظام" : "مستخدم الجامعة")}`}>
      <span className="avatar-circle"><UserRound size={23} fill="currentColor"/></span>
      <ChevronDown size={17}/><b>{userLabel ?? (admin ? "مسؤول النظام" : "مستخدم الجامعة")}</b>
    </Link>
    <span className="topbar-split" aria-hidden="true"/>
    <Link href="/notifications" className="notification-icon" aria-label="فتح مركز الإشعارات"><Bell size={26}/><i aria-hidden="true"/></Link>
  </header>;
}
