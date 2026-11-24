import type { LucideIcon } from "lucide-react";
import { Crown, Laptop, ShieldCheck, UserRound } from "lucide-react";
import type { AdminRole } from "@/lib/demo/admin-dashboard-store";

const ROLE_ICONS: Record<AdminRole, LucideIcon> = {
  "مدير المؤسسة": Crown,
  "مسؤول تقنية المعلومات": Laptop,
  "مسؤول المنصة": ShieldCheck,
  "موظف المؤسسة": UserRound,
};

/**
 * Single source of truth for the icon that represents each administrative role,
 * shared by the role simulator, the tables, the row menus and the record inspector.
 */
export function RoleIcon({ role, size = 15 }: { role: AdminRole; size?: number }) {
  const Icon = ROLE_ICONS[role] ?? UserRound;
  return <Icon size={size} strokeWidth={1.9} aria-hidden="true" />;
}
