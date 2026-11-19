"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  GraduationCap,
  BookOpenCheck,
  Settings,
  Building2,
  Cpu,
  Bot,
  Activity,
  Rocket,
  Home,
  X,
  ShieldCheck,
} from "lucide-react";
import { useMemo, type ReactNode, type Ref } from "react";
import { useDemoAccess } from "@/components/access/DemoAccess";
import { canPreviewRoute, type Capability, type RoleId } from "@/lib/access/policy";
import {
  getStoredActiveRole,
  resolveEffectivePermission,
} from "@/lib/access/enterprise-rbac";

export type PlatformSidebarProps = {
  compact?: boolean;
  menuOpen?: boolean;
  onClose?: () => void;
  onNavigate?: () => void;
  asideRef?: Ref<HTMLElement>;
};

interface PlatformNavItem {
  href: string;
  label: string;
  capability: Capability;
  icon: ReactNode;
}

const PLATFORM_NAV_ITEMS: PlatformNavItem[] = [
  {
    href: "/platform/settings",
    label: "إعدادات المنصة",
    capability: "platform.manage",
    icon: <Settings size={20} />,
  },
  {
    href: "/platform/organizations",
    label: "المؤسسات المشتركة",
    capability: "platform.manage",
    icon: <Building2 size={20} />,
  },
  {
    href: "/platform/models",
    label: "مزودو النماذج",
    capability: "platform.manage",
    icon: <Cpu size={20} />,
  },
  {
    href: "/platform/agents",
    label: "مراقبة الوكلاء",
    capability: "platform.manage",
    icon: <Bot size={20} />,
  },
  {
    href: "/platform/health",
    label: "صحة الخدمات",
    capability: "platform.manage",
    icon: <Activity size={20} />,
  },
  {
    href: "/platform/onboarding",
    label: "التهيئة الذكية",
    capability: "onboarding.run",
    icon: <Rocket size={20} />,
  },
];

function NavigationLink({
  href,
  icon,
  children,
  selected = false,
  onNavigate,
}: {
  href: string;
  icon: ReactNode;
  children: ReactNode;
  selected?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      className={`side-nav-item ${selected ? "active" : ""}`}
      href={href}
      onClick={onNavigate}
      aria-current={selected ? "page" : undefined}
    >
      {icon}
      <span>{children}</span>
    </Link>
  );
}

export function PlatformSidebar({
  compact = false,
  menuOpen = false,
  onClose,
  onNavigate,
  asideRef,
}: PlatformSidebarProps) {
  const path = usePathname();

  // Retrieve active role from DemoAccess context or fall back safely to local store
  let activeRole: RoleId = "platform_admin";
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const access = useDemoAccess();
    activeRole = access.role;
  } catch {
    activeRole = typeof window !== "undefined" ? getStoredActiveRole() : "platform_admin";
  }

  // Filter platform navigation using the existing frontend permission engine
  const visibleNavItems = useMemo(() => {
    return PLATFORM_NAV_ITEMS.filter((item) => {
      // 1. Must be allowed by route policy catalog
      if (!canPreviewRoute(activeRole, item.href)) return false;
      // 2. Must be allowed by deterministic RBAC engine resolution
      const res = resolveEffectivePermission(activeRole, item.capability);
      return res.effect === "ALLOW";
    });
  }, [activeRole]);

  return (
    <aside
      ref={asideRef}
      id="bayan-platform-sidebar"
      tabIndex={-1}
      className="app-sidebar platform-sidebar"
      data-open={menuOpen ? "true" : "false"}
      role={compact && menuOpen ? "dialog" : undefined}
      aria-modal={compact && menuOpen ? true : undefined}
      aria-label="قائمة إدارة المنصة المركزية"
    >
      <button
        type="button"
        className="bayan-mobile-close"
        onClick={onClose}
        aria-label="إغلاق القائمة"
      >
        <X size={23} />
      </button>

      <Link href="/" className="brand-wrap" onClick={onNavigate}>
        <div className="brand-line">
          <div className="brand-symbol">
            <GraduationCap size={57} strokeWidth={1.75} />
            <BookOpenCheck size={41} strokeWidth={1.7} />
          </div>
          <div className="brand-word">بيان</div>
        </div>
        <div className="brand-description">منصة الإدارة والتشغيل المركزية</div>
      </Link>

      <div className="sidebar-rule" />

      <div
        className="platform-sidebar-badge"
        style={{
          margin: "0 0.5rem 0.85rem",
          padding: "0.45rem 0.75rem",
          borderRadius: "8px",
          background: "rgba(251, 191, 36, 0.12)",
          border: "1px solid rgba(251, 191, 36, 0.3)",
          color: "#fbbf24",
          fontSize: "0.82rem",
          fontWeight: "700",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
        }}
      >
        <ShieldCheck size={16} />
        <span>إدارة المنصة المركزية</span>
      </div>

      <nav className="side-navigation platform-navigation">
        <NavigationLink
          onNavigate={onNavigate}
          href="/"
          icon={<Home size={20} />}
          selected={path === "/"}
        >
          العودة للمؤسسة
        </NavigationLink>

        {visibleNavItems.map((item) => (
          <NavigationLink
            key={item.href}
            onNavigate={onNavigate}
            href={item.href}
            icon={item.icon}
            selected={path.startsWith(item.href)}
          >
            {item.label}
          </NavigationLink>
        ))}
      </nav>

      <div className="sidebar-rule admin-bottom-rule" />
      <div className="sidebar-campus" aria-hidden="true" />
      <div className="proposed-mark">حوكمة المنصة المركزية</div>
    </aside>
  );
}

export default PlatformSidebar;
