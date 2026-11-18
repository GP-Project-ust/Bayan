"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";

type AppShellProps = {
  mode: "chat" | "admin";
  children: ReactNode;
  layoutClassName: string;
  workspaceClassName: string;
  onNewChat?: () => void;
  onHistory?: (title: string) => void;
  activeChat?: string;
  userLabel?: string;
};

/**
 * Desktop: the approved permanent right sidebar is unchanged.
 * Tablet/mobile <= 900px: an accessible temporary navigation drawer.
 * This layer controls presentation only, never authorizes backend requests.
 */
export function AppShell({
  mode, children, layoutClassName, workspaceClassName,
  onNewChat, onHistory, activeChat, userLabel,
}: AppShellProps) {
  const pathname = usePathname();
  const [compact, setCompact] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);
  const workspaceRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 900px)");
    const update = () => {
      setCompact(media.matches);
      if (!media.matches) setMenuOpen(false);
    };
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  // Close the menu after route changes (including browser back navigation).
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  useEffect(() => {
    // Avoid tabbing into a visually off-canvas navigation panel.
    if (sidebarRef.current) sidebarRef.current.inert = compact && !menuOpen;
    // Do not expose background actions to screen readers while the drawer is modal.
    if (workspaceRef.current) workspaceRef.current.inert = compact && menuOpen;
  }, [compact, menuOpen]);

  useEffect(() => {
    if (!compact || !menuOpen) return;
    const menu = sidebarRef.current;
    const trigger = menuButtonRef.current;
    if (!menu) return;

    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusables = () => Array.from(menu.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )).filter(el => el.getClientRects().length > 0);
    const closeButton = menu.querySelector<HTMLButtonElement>(".bayan-mobile-close");
    (closeButton ?? menu).focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); setMenuOpen(false); }
      if (event.key !== "Tab") return;
      const elements = focusables();
      if (!elements.length) { event.preventDefault(); menu.focus(); return; }
      const first = elements[0], last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = oldOverflow;
      if (trigger?.isConnected) trigger.focus();
    };
  }, [compact, menuOpen]);

  const closeMenu = () => setMenuOpen(false);
  return (
    <div className={`app-layout ${layoutClassName}`} dir="rtl" data-bayan-shell={mode}>
      <a className="bayan-skip-link" href="#bayan-main-content">الانتقال إلى المحتوى الرئيسي</a>
      {compact && menuOpen && (
        <button className="bayan-mobile-scrim" type="button" aria-label="إغلاق القائمة الجانبية" onClick={closeMenu} tabIndex={-1} />
      )}
      <Sidebar
        mode={mode} asideRef={sidebarRef} compact={compact} menuOpen={menuOpen}
        onClose={closeMenu} onNavigate={closeMenu}
        onNewChat={() => { closeMenu(); onNewChat?.(); }}
        onHistory={(title) => { closeMenu(); onHistory?.(title); }} activeChat={activeChat}
      />
      <main ref={workspaceRef} className={`workspace ${workspaceClassName}`} id="bayan-main-content" tabIndex={-1}>
        <TopBar
          admin={mode === "admin"} userLabel={userLabel}
          menuOpen={menuOpen} onMenuToggle={() => setMenuOpen(open => !open)}
          menuButtonRef={menuButtonRef}
        />
        {children}
      </main>
    </div>
  );
}
