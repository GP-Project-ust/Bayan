/**
 * BAYAN ENTERPRISE AI PLATFORM — SCREEN 01
 * Frontend Local Demo Data Store & State Management Layer
 *
 * Provides complete in-browser CRUD, localStorage persistence, input validation,
 * duplicate prevention, demo audit event generation, and state restoration.
 * Strictly frontend-only; never touches backend APIs or stores credentials.
 */

export type AdminRole = "مدير المؤسسة" | "موظف المؤسسة" | "مسؤول تقنية المعلومات" | "مسؤول المنصة";
export type SecurityLevel = "محدود" | "محدد" | "داخلي" | "سري";

export interface DemoUser {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  active: boolean;
  department: string;
  createdAt: string;
}

export interface DemoSmartView {
  id: string;
  name: string;
  source: string;
  security: SecurityLevel;
  active: boolean;
  createdAt: string;
}

export interface DemoAuditEvent {
  id: string;
  time: string;
  user: string;
  action: string;
  target?: string;
  status: "نجاح" | "تنبيه" | "فشل";
  isDemo: true;
}

export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  activeSmartViews: number;
  totalSmartViews: number;
  recentAuditsCount: number;
  systemHealthText: string;
  systemHealthOk: boolean;
  averageLatency: string;
}

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  type: "success" | "error" | "info" | "warning";
}

// Initial seeded demonstration fixtures
export const INITIAL_DEMO_USERS: DemoUser[] = [
  {
    id: "usr-001",
    name: "أ. د. ناصر العتيبي",
    email: "n.alotaibi@univ.edu.sa",
    role: "مدير المؤسسة",
    active: true,
    department: "إدارة الجامعة",
    createdAt: "2026-10-15",
  },
  {
    id: "usr-002",
    name: "أ. سارة القحطاني",
    email: "s.qahtani@univ.edu.sa",
    role: "موظف المؤسسة",
    active: true,
    department: "شؤون الطلاب",
    createdAt: "2026-10-18",
  },
  {
    id: "usr-003",
    name: "م. خالد الشهري",
    email: "k.alshahri@univ.edu.sa",
    role: "مسؤول تقنية المعلومات",
    active: true,
    department: "تقنية المعلومات",
    createdAt: "2026-10-20",
  },
  {
    id: "usr-004",
    name: "أ. ليان الحربي",
    email: "l.alharbi@univ.edu.sa",
    role: "مسؤول المنصة",
    active: false,
    department: "مركز البيانات",
    createdAt: "2026-10-22",
  },
  {
    id: "usr-005",
    name: "د. عبد الله الدوسري",
    email: "a.aldosari@univ.edu.sa",
    role: "موظف المؤسسة",
    active: true,
    department: "القبول والتسجيل",
    createdAt: "2026-10-25",
  },
  {
    id: "usr-006",
    name: "م. ريم الغامدي",
    email: "r.alghamdi@univ.edu.sa",
    role: "مسؤول تقنية المعلومات",
    active: true,
    department: "أمن المعلومات",
    createdAt: "2026-10-28",
  },
  {
    id: "usr-007",
    name: "أ. ماجد العنزي",
    email: "m.alanazi@univ.edu.sa",
    role: "موظف المؤسسة",
    active: true,
    department: "الشؤون المالية",
    createdAt: "2026-11-01",
  },
  {
    id: "usr-008",
    name: "د. هند السبيعي",
    email: "h.alsubaie@univ.edu.sa",
    role: "موظف المؤسسة",
    active: true,
    department: "البحث العلمي",
    createdAt: "2026-11-03",
  },
  {
    id: "usr-009",
    name: "م. فيصل الزهراني",
    email: "f.alzahrani@univ.edu.sa",
    role: "مسؤول المنصة",
    active: true,
    department: "مركز البيانات",
    createdAt: "2026-11-06",
  },
  {
    id: "usr-010",
    name: "أ. نورة الشمري",
    email: "n.alshammari@univ.edu.sa",
    role: "موظف المؤسسة",
    active: true,
    department: "الموارد البشرية",
    createdAt: "2026-11-09",
  },
  {
    id: "usr-011",
    name: "أ. عبد العزيز القرني",
    email: "a.alqarni@univ.edu.sa",
    role: "مسؤول تقنية المعلومات",
    active: true,
    department: "تقنية المعلومات",
    createdAt: "2026-11-12",
  },
  {
    id: "usr-012",
    name: "أ. جواهر المطيري",
    email: "j.almutairi@univ.edu.sa",
    role: "موظف المؤسسة",
    active: true,
    department: "شؤون الطلاب",
    createdAt: "2026-11-15",
  },
];

export const INITIAL_DEMO_VIEWS: DemoSmartView[] = [
  {
    id: "vw-001",
    name: "عرض الطلاب",
    source: "نظام شؤون الطلاب",
    security: "محدود",
    active: true,
    createdAt: "2026-10-10",
  },
  {
    id: "vw-002",
    name: "عرض التسجيل الأكاديمي",
    source: "نظام التسجيل الأكاديمي",
    security: "محدد",
    active: true,
    createdAt: "2026-10-12",
  },
  {
    id: "vw-003",
    name: "عرض الأداء الأكاديمي",
    source: "مستودع البيانات الأكاديمية",
    security: "داخلي",
    active: true,
    createdAt: "2026-10-15",
  },
  {
    id: "vw-004",
    name: "عرض الميزانية والمالية",
    source: "نظام الشؤون المالية",
    security: "سري",
    active: true,
    createdAt: "2026-10-20",
  },
  {
    id: "vw-005",
    name: "عرض الموارد البشرية والرواتب",
    source: "نظام الموارد البشرية",
    security: "سري",
    active: false,
    createdAt: "2026-10-22",
  },
];

export const INITIAL_DEMO_LOGS: DemoAuditEvent[] = [
  {
    id: "log-000",
    time: "اليوم، 11:02 ص",
    user: "م. خالد الشهري",
    action: "حذف المستخدم (أ. بدر الحميدي) من النظام",
    target: "b.alhumaidi@univ.edu.sa",
    status: "تنبيه",
    isDemo: true,
  },
  {
    id: "log-001",
    time: "اليوم، 10:18 ص",
    user: "أ. سارة القحطاني",
    action: "تسجيل دخول إلى النظام",
    target: "النظام المؤسسي",
    status: "نجاح",
    isDemo: true,
  },
  {
    id: "log-002",
    time: "اليوم، 09:56 ص",
    user: "أ. د. ناصر العتيبي",
    action: "تحديث دور مستخدم (من موظف المؤسسة إلى مسؤول المنصة)",
    target: "أ. ليان الحربي",
    status: "نجاح",
    isDemo: true,
  },
  {
    id: "log-003",
    time: "اليوم، 09:37 ص",
    user: "م. خالد الشهري",
    action: "إنشاء عرض ذكي (عرض الأداء الأكاديمي)",
    target: "مستودع البيانات",
    status: "نجاح",
    isDemo: true,
  },
  {
    id: "log-004",
    time: "أمس، 04:21 م",
    user: "أ. ليان الحربي",
    action: "تصدير نتائج استعلام (CSV)",
    target: "تقرير الطلاب",
    status: "نجاح",
    isDemo: true,
  },
  {
    id: "log-005",
    time: "أمس، 02:47 م",
    user: "أ. سارة القحطاني",
    action: "مراجعة استعلام (عرض بيانات التسجيل للفصل الحالي)",
    target: "نظام التسجيل",
    status: "نجاح",
    isDemo: true,
  },
];

export const AVAILABLE_ROLES: AdminRole[] = [
  "مدير المؤسسة",
  "موظف المؤسسة",
  "مسؤول تقنية المعلومات",
  "مسؤول المنصة",
];

export const AVAILABLE_SOURCES = [
  "نظام شؤون الطلاب",
  "نظام التسجيل الأكاديمي",
  "مستودع البيانات الأكاديمية",
  "نظام الشؤون المالية",
  "نظام الموارد البشرية",
  "المستودع السحابي",
];

export const AVAILABLE_SECURITIES: SecurityLevel[] = ["محدود", "محدد", "داخلي", "سري"];

const STORAGE_KEYS = {
  USERS: "bayan_demo_admin_users_v3",
  VIEWS: "bayan_demo_admin_views_v3",
  LOGS: "bayan_demo_admin_logs_v3",
  ACTIVE_ROLE: "bayan_demo_active_preview_role_v3",
};

/**
 * Helper to safely read from localStorage without SSR hydration failure
 */
export function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch (err) {
    console.warn(`[AdminDashboardStore] Error reading ${key} from localStorage:`, err);
    return fallback;
  }
}

/**
 * Helper to safely write to localStorage
 */
export function saveToStorage<T>(key: string, data: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.warn(`[AdminDashboardStore] Error writing ${key} to localStorage:`, err);
  }
}

/**
 * Clear all demo localStorage entries
 */
export function resetDemoStorage(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEYS.USERS);
    localStorage.removeItem(STORAGE_KEYS.VIEWS);
    localStorage.removeItem(STORAGE_KEYS.LOGS);
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_ROLE);
  } catch (err) {
    console.warn("[AdminDashboardStore] Error resetting demo storage:", err);
  }
}

/**
 * Email format validation helper (RFC 5322 compliant regex)
 */
export function validateEmailFormat(email: string): boolean {
  const re = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+$/;
  return re.test(email.trim());
}

/**
 * Generate formatted Arabic timestamp for audit logging
 */
export function getCurrentArabicTimestamp(): string {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes().toString().padStart(2, "0");
  const period = hours >= 12 ? "م" : "ص";
  const displayHours = hours % 12 || 12;
  return `اليوم، ${displayHours}:${minutes} ${period}`;
}
