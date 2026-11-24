/**
 * One-line scope for each administrative role, shown next to the role selector
 * in the user dialogs so the consequence of the choice is visible while editing.
 */
import type { AdminRole } from "@/lib/demo/admin-dashboard-store";

export const ROLE_SCOPE: Record<AdminRole, string> = {
  "مدير المؤسسة": "وصول كامل للمستخدمين والأدوار ومصادر البيانات والإعدادات",
  "مسؤول تقنية المعلومات": "تحرير المستخدمين والعروض الذكية وربط مصادر البيانات",
  "مسؤول المنصة": "متابعة العروض الذكية وسجل التدقيق واستخدام المنصة",
  "موظف المؤسسة": "استخدام المحادثة والتقارير ضمن صلاحيات القراءة",
};
