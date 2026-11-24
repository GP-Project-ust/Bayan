"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CalendarDays,
  ChartNoAxesColumnIncreasing,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Copy,
  ExternalLink,
  Gauge,
  Layers3,
  Lock,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  ScrollText,
  ShieldAlert,
  SlidersHorizontal,
  Trash2,
  Unlock,
  UserRoundPlus,
  UsersRound,
  X,
  Zap,
} from "lucide-react";
import { useOverlay } from "./ui/useOverlay";
import { AdminLayout } from "./layout";
import {
  type AdminRole,
  type SecurityLevel,
  type DemoUser,
  type DemoSmartView,
  type DemoAuditEvent,
  type ToastMessage,
  INITIAL_DEMO_USERS,
  INITIAL_DEMO_VIEWS,
  INITIAL_DEMO_LOGS,
  AVAILABLE_ROLES,
  AVAILABLE_SOURCES,
  AVAILABLE_SECURITIES,
  loadFromStorage,
  saveToStorage,
  resetDemoStorage,
  validateEmailFormat,
  getCurrentArabicTimestamp,
} from "@/lib/demo/admin-dashboard-store";
import AdminRowMenu, { type RowMenuGroup } from "./admin/AdminRowMenu";
import { SmartViewInspector, UserInspector } from "./admin/AdminRecordInspector";
import { RoleIcon } from "./admin/roleIcon";

const STORAGE_KEYS = {
  USERS: "bayan_demo_admin_users_v3",
  VIEWS: "bayan_demo_admin_views_v3",
  LOGS: "bayan_demo_admin_logs_v3",
  ACTIVE_ROLE: "bayan_demo_active_preview_role_v3",
};

const USERS_PER_PAGE = 5;
const EDIT_ROLE: AdminRole = "مسؤول تقنية المعلومات";

type DashboardTab = "users" | "views" | "audit";

/** Icon shown beside each smart view, cycled so the list stays scannable. */
function viewIcon(index: number) {
  if (index % 3 === 0) return <UsersRound size={18} aria-hidden="true" />;
  if (index % 3 === 1) return <CalendarDays size={18} aria-hidden="true" />;
  return <ChartNoAxesColumnIncreasing size={18} aria-hidden="true" />;
}

export default function AdminDashboard() {
  const [mounted, setMounted] = useState(false);

  // 1. Data store states, initialized from fixtures so server and client match.
  const [users, setUsers] = useState<DemoUser[]>(INITIAL_DEMO_USERS);
  const [views, setViews] = useState<DemoSmartView[]>(INITIAL_DEMO_VIEWS);
  const [logs, setLogs] = useState<DemoAuditEvent[]>(INITIAL_DEMO_LOGS);
  const [activePreviewRole, setActivePreviewRole] = useState<AdminRole>(EDIT_ROLE);

  useEffect(() => {
    setUsers(loadFromStorage<DemoUser[]>(STORAGE_KEYS.USERS, INITIAL_DEMO_USERS));
    setViews(loadFromStorage<DemoSmartView[]>(STORAGE_KEYS.VIEWS, INITIAL_DEMO_VIEWS));
    setLogs(loadFromStorage<DemoAuditEvent[]>(STORAGE_KEYS.LOGS, INITIAL_DEMO_LOGS));
    setActivePreviewRole(loadFromStorage<AdminRole>(STORAGE_KEYS.ACTIVE_ROLE, EDIT_ROLE));
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) saveToStorage(STORAGE_KEYS.USERS, users);
  }, [users, mounted]);

  useEffect(() => {
    if (mounted) saveToStorage(STORAGE_KEYS.VIEWS, views);
  }, [views, mounted]);

  useEffect(() => {
    if (mounted) saveToStorage(STORAGE_KEYS.LOGS, logs);
  }, [logs, mounted]);

  useEffect(() => {
    if (mounted) saveToStorage(STORAGE_KEYS.ACTIVE_ROLE, activePreviewRole);
  }, [activePreviewRole, mounted]);

  // 2. Toast notification stack.
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const showToast = useCallback(
    (title: string, description?: string, type: ToastMessage["type"] = "success") => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      setToasts((prev) => [...prev, { id, title, description, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3500);
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Helper to append to the local audit trail.
  const appendAuditEvent = useCallback(
    (action: string, target?: string, status: "نجاح" | "تنبيه" | "فشل" = "نجاح") => {
      const newEvent: DemoAuditEvent = {
        id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        time: getCurrentArabicTimestamp(),
        user: "م. خالد الشهري (مسؤول تقنية المعلومات)",
        action,
        target,
        status,
        isDemo: true,
      };
      setLogs((prev) => [newEvent, ...prev]);
    },
    []
  );

  // 3. Tabs, selected record and row menu presentation state.
  const [activeTab, setActiveTab] = useState<DashboardTab>("users");
  const [inspectedUserId, setInspectedUserId] = useState<string | null>(null);
  const [inspectedViewId, setInspectedViewId] = useState<string | null>(null);
  const [openRowMenu, setOpenRowMenu] = useState<string | null>(null);
  const closeRowMenu = useCallback(() => setOpenRowMenu(null), []);

  const inspectedUser = useMemo(
    () => users.find((user) => user.id === inspectedUserId) ?? null,
    [users, inspectedUserId]
  );
  const inspectedView = useMemo(
    () => views.find((view) => view.id === inspectedViewId) ?? null,
    [views, inspectedViewId]
  );

  // 4. Dialogs.
  const [modal, setModal] = useState<
    | ""
    | "add-user"
    | "edit-user"
    | "delete-user"
    | "add-view"
    | "edit-view"
    | "delete-view"
    | "full-log"
    | "reset-confirm"
  >("");
  const closeModal = useCallback(() => setModal(""), []);
  const dialogRef = useOverlay(Boolean(modal), closeModal);

  const [selectedUser, setSelectedUser] = useState<DemoUser | null>(null);
  const [selectedView, setSelectedView] = useState<DemoSmartView | null>(null);

  // User form fields and validation.
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userDepartment, setUserDepartment] = useState("");
  const [userRole, setUserRole] = useState<AdminRole>("موظف المؤسسة");
  const [userActive, setUserActive] = useState(true);
  const [userFormErrors, setUserFormErrors] = useState<{ name?: string; email?: string }>({});

  // Smart view form fields and validation.
  const [viewName, setViewName] = useState("");
  const [viewSource, setViewSource] = useState(AVAILABLE_SOURCES[0]);
  const [viewSecurity, setViewSecurity] = useState<SecurityLevel>("محدود");
  const [viewActive, setViewActive] = useState(true);
  const [viewFormErrors, setViewFormErrors] = useState<{ name?: string }>({});

  // 5. Search, filter, sort and pagination.
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState<string>("ALL");
  const [userStatusFilter, setUserStatusFilter] = useState<string>("ALL");
  const [userPage, setUserPage] = useState(1);

  const [viewSearch, setViewSearch] = useState("");
  const [viewSecurityFilter, setViewSecurityFilter] = useState<string>("ALL");
  const [viewStatusFilter, setViewStatusFilter] = useState<string>("ALL");

  const [auditSearch, setAuditSearch] = useState("");
  const [auditStatusFilter, setAuditStatusFilter] = useState<string>("ALL");
  const [auditSortOrder, setAuditSortOrder] = useState<"desc" | "asc">("desc");

  // 6. User actions.
  const openAddUserModal = () => {
    setUserName("");
    setUserEmail("");
    setUserDepartment("تقنية المعلومات");
    setUserRole("موظف المؤسسة");
    setUserActive(true);
    setUserFormErrors({});
    setModal("add-user");
  };

  const openEditUserModal = (user: DemoUser) => {
    setSelectedUser(user);
    setUserName(user.name);
    setUserEmail(user.email);
    setUserDepartment(user.department || "تقنية المعلومات");
    setUserRole(user.role);
    setUserActive(user.active);
    setUserFormErrors({});
    setModal("edit-user");
  };

  const openDeleteUserModal = (user: DemoUser) => {
    setSelectedUser(user);
    setModal("delete-user");
  };

  const validateUserForm = (isEditing = false): boolean => {
    const errors: { name?: string; email?: string } = {};
    if (!userName.trim() || userName.trim().length < 2) {
      errors.name = "يرجى إدخال اسم صحيح لا يقل عن حرفين.";
    }
    if (!userEmail.trim()) {
      errors.email = "يرجى إدخال البريد الإلكتروني.";
    } else if (!validateEmailFormat(userEmail)) {
      errors.email = "صيغة البريد الإلكتروني غير صحيحة (name@domain.com).";
    } else {
      const emailExists = users.some(
        (user) =>
          user.email.toLowerCase() === userEmail.trim().toLowerCase() &&
          (!isEditing || user.id !== selectedUser?.id)
      );
      if (emailExists) {
        errors.email = "البريد الإلكتروني مسجل مسبقًا لمستخدم آخر.";
      }
    }
    setUserFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateUser = () => {
    if (!validateUserForm(false)) return;
    const newUser: DemoUser = {
      id: `usr-${Date.now()}`,
      name: userName.trim(),
      email: userEmail.trim().toLowerCase(),
      role: userRole,
      department: userDepartment.trim() || "عام",
      active: userActive,
      createdAt: new Date().toISOString().split("T")[0],
    };
    setUsers((prev) => [newUser, ...prev]);
    appendAuditEvent(`إضافة مستخدم جديد (${newUser.name}) بدور (${newUser.role})`, newUser.email);
    showToast("تمت إضافة المستخدم بنجاح", `تم إنشاء حساب ${newUser.name} محليًا.`);
    closeModal();
  };

  const handleUpdateUser = () => {
    if (!selectedUser || !validateUserForm(true)) return;
    setUsers((prev) =>
      prev.map((user) =>
        user.id === selectedUser.id
          ? {
              ...user,
              name: userName.trim(),
              email: userEmail.trim().toLowerCase(),
              role: userRole,
              department: userDepartment.trim() || "عام",
              active: userActive,
            }
          : user
      )
    );
    appendAuditEvent(`تحديث بيانات المستخدم (${userName.trim()})`, selectedUser.email);
    showToast("تم تحديث المستخدم بنجاح", "تم حفظ التغييرات محليًا.");
    closeModal();
  };

  const handleDeleteUser = () => {
    if (!selectedUser) return;
    setUsers((prev) => prev.filter((user) => user.id !== selectedUser.id));
    if (inspectedUserId === selectedUser.id) setInspectedUserId(null);
    appendAuditEvent(`حذف المستخدم (${selectedUser.name}) من النظام`, selectedUser.email, "تنبيه");
    showToast("تم حذف المستخدم", `تمت إزالة ${selectedUser.name} بنجاح.`);
    closeModal();
  };

  const changeUserRole = (id: string, newRole: AdminRole) => {
    const target = users.find((user) => user.id === id);
    if (!target || target.role === newRole) return;
    setUsers((prev) => prev.map((user) => (user.id === id ? { ...user, role: newRole } : user)));
    appendAuditEvent(`تغيير دور المستخدم (${target.name}) إلى (${newRole})`, target.email);
    showToast("تم تغيير الدور", `دور ${target.name}: ${newRole}.`);
  };

  const toggleUserActive = (id: string) => {
    const target = users.find((user) => user.id === id);
    if (!target) return;
    const nextActive = !target.active;
    setUsers((prev) =>
      prev.map((user) => (user.id === id ? { ...user, active: nextActive } : user))
    );
    appendAuditEvent(
      `${nextActive ? "تنشيط" : "تعطيل"} حساب المستخدم (${target.name})`,
      target.email
    );
    showToast(
      `تم ${nextActive ? "تنشيط" : "تعطيل"} الحساب`,
      `حالة ${target.name}: ${nextActive ? "نشط" : "غير نشط"}.`
    );
  };

  // 7. Smart view actions.
  const openAddViewModal = () => {
    setViewName("");
    setViewSource(AVAILABLE_SOURCES[0]);
    setViewSecurity("محدود");
    setViewActive(true);
    setViewFormErrors({});
    setModal("add-view");
  };

  const openEditViewModal = (view: DemoSmartView) => {
    setSelectedView(view);
    setViewName(view.name);
    setViewSource(view.source);
    setViewSecurity(view.security);
    setViewActive(view.active);
    setViewFormErrors({});
    setModal("edit-view");
  };

  const openDeleteViewModal = (view: DemoSmartView) => {
    setSelectedView(view);
    setModal("delete-view");
  };

  const validateViewForm = (isEditing = false): boolean => {
    const errors: { name?: string } = {};
    if (!viewName.trim() || viewName.trim().length < 2) {
      errors.name = "يرجى إدخال اسم صحيح للعرض الذكي.";
    } else {
      const exists = views.some(
        (view) =>
          view.name.trim().toLowerCase() === viewName.trim().toLowerCase() &&
          (!isEditing || view.id !== selectedView?.id)
      );
      if (exists) {
        errors.name = "يوجد عرض ذكي آخر بنفس هذا الاسم.";
      }
    }
    setViewFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateView = () => {
    if (!validateViewForm(false)) return;
    const newView: DemoSmartView = {
      id: `vw-${Date.now()}`,
      name: viewName.trim(),
      source: viewSource,
      security: viewSecurity,
      active: viewActive,
      createdAt: new Date().toISOString().split("T")[0],
    };
    setViews((prev) => [newView, ...prev]);
    appendAuditEvent(`إنشاء عرض ذكي جديد (${newView.name}) بمصدر (${newView.source})`);
    showToast("تم إنشاء العرض الذكي", `العرض "${newView.name}" جاهز للاستخدام.`);
    closeModal();
  };

  const handleUpdateView = () => {
    if (!selectedView || !validateViewForm(true)) return;
    setViews((prev) =>
      prev.map((view) =>
        view.id === selectedView.id
          ? {
              ...view,
              name: viewName.trim(),
              source: viewSource,
              security: viewSecurity,
              active: viewActive,
            }
          : view
      )
    );
    appendAuditEvent(`تحديث العرض الذكي (${viewName.trim()})`);
    showToast("تم تحديث العرض الذكي", "تم حفظ إعدادات العرض بنجاح.");
    closeModal();
  };

  const handleDeleteView = () => {
    if (!selectedView) return;
    setViews((prev) => prev.filter((view) => view.id !== selectedView.id));
    if (inspectedViewId === selectedView.id) setInspectedViewId(null);
    appendAuditEvent(`حذف العرض الذكي (${selectedView.name})`, undefined, "تنبيه");
    showToast("تم حذف العرض الذكي", `تم حذف "${selectedView.name}".`);
    closeModal();
  };

  const duplicateView = (view: DemoSmartView) => {
    const clone: DemoSmartView = {
      id: `vw-${Date.now()}`,
      name: `${view.name} (نسخة)`,
      source: view.source,
      security: view.security,
      active: view.active,
      createdAt: new Date().toISOString().split("T")[0],
    };
    setViews((prev) => [clone, ...prev]);
    appendAuditEvent(`تكرار العرض الذكي (${view.name}) إلى (${clone.name})`);
    showToast("تم نسخ العرض الذكي", `تم إنشاء نسخة جديدة "${clone.name}".`);
  };

  const toggleViewActive = (id: string) => {
    const target = views.find((view) => view.id === id);
    if (!target) return;
    const nextActive = !target.active;
    setViews((prev) =>
      prev.map((view) => (view.id === id ? { ...view, active: nextActive } : view))
    );
    appendAuditEvent(`${nextActive ? "تنشيط" : "إيقاف"} العرض الذكي (${target.name})`);
    showToast(
      "تم تغيير حالة العرض",
      `العرض ${target.name}: ${nextActive ? "نشط" : "متوقف"}.`
    );
  };

  // 8. Reset the local demonstration data.
  const handleResetDemoData = () => {
    resetDemoStorage();
    setUsers(INITIAL_DEMO_USERS);
    setViews(INITIAL_DEMO_VIEWS);
    setLogs(INITIAL_DEMO_LOGS);
    setActivePreviewRole(EDIT_ROLE);
    setInspectedUserId(null);
    setInspectedViewId(null);
    setOpenRowMenu(null);
    showToast("تمت استعادة البيانات الافتراضية", "تمت إعادة ضبط المستودع التجريبي إلى حالته الأولى.");
    closeModal();
  };

  // 9. Derived lists.
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchSearch =
        !userSearch.trim() ||
        user.name.toLowerCase().includes(userSearch.trim().toLowerCase()) ||
        user.email.toLowerCase().includes(userSearch.trim().toLowerCase());
      const matchRole = userRoleFilter === "ALL" || user.role === userRoleFilter;
      const matchStatus =
        userStatusFilter === "ALL" ||
        (userStatusFilter === "ACTIVE" && user.active) ||
        (userStatusFilter === "INACTIVE" && !user.active);
      return matchSearch && matchRole && matchStatus;
    });
  }, [users, userSearch, userRoleFilter, userStatusFilter]);

  const totalUserPages = Math.ceil(filteredUsers.length / USERS_PER_PAGE) || 1;
  const paginatedUsers = useMemo(() => {
    const start = (userPage - 1) * USERS_PER_PAGE;
    return filteredUsers.slice(start, start + USERS_PER_PAGE);
  }, [filteredUsers, userPage]);

  useEffect(() => {
    setUserPage(1);
  }, [userSearch, userRoleFilter, userStatusFilter]);

  // Keep the current page valid after deleting the last row of a page.
  useEffect(() => {
    if (userPage > totalUserPages) setUserPage(totalUserPages);
  }, [userPage, totalUserPages]);

  const filteredViews = useMemo(() => {
    return views.filter((view) => {
      const matchSearch =
        !viewSearch.trim() ||
        view.name.toLowerCase().includes(viewSearch.trim().toLowerCase()) ||
        view.source.toLowerCase().includes(viewSearch.trim().toLowerCase());
      const matchSecurity = viewSecurityFilter === "ALL" || view.security === viewSecurityFilter;
      const matchStatus =
        viewStatusFilter === "ALL" ||
        (viewStatusFilter === "ACTIVE" && view.active) ||
        (viewStatusFilter === "INACTIVE" && !view.active);
      return matchSearch && matchSecurity && matchStatus;
    });
  }, [views, viewSearch, viewSecurityFilter, viewStatusFilter]);

  const filteredLogs = useMemo(() => {
    let result = logs;
    if (auditSearch.trim()) {
      const query = auditSearch.trim().toLowerCase();
      result = result.filter(
        (log) =>
          log.user.toLowerCase().includes(query) ||
          log.action.toLowerCase().includes(query) ||
          (log.target && log.target.toLowerCase().includes(query))
      );
    }
    if (auditStatusFilter !== "ALL") {
      result = result.filter((log) => log.status === auditStatusFilter);
    }
    if (auditSortOrder === "asc") {
      return [...result].reverse();
    }
    return result;
  }, [logs, auditSearch, auditStatusFilter, auditSortOrder]);

  const activeViews = views.filter((view) => view.active).length;
  const activeUsers = users.filter((user) => user.active).length;
  const canEdit = activePreviewRole === EDIT_ROLE;

  // 10. Row menu definitions.
  const userMenuGroups = (user: DemoUser): RowMenuGroup[] => [
    {
      heading: "تغيير الدور",
      items: AVAILABLE_ROLES.map((role) => ({
        key: role,
        label: role,
        checked: user.role === role,
        icon: <RoleIcon role={role} size={14} />,
        onSelect: () => changeUserRole(user.id, role),
      })),
    },
    {
      items: [
        {
          key: "toggle-active",
          label: user.active ? "تعطيل الحساب" : "تنشيط الحساب",
          icon: user.active ? (
            <Clock3 size={14} aria-hidden="true" />
          ) : (
            <CheckCircle2 size={14} aria-hidden="true" />
          ),
          onSelect: () => toggleUserActive(user.id),
        },
        {
          key: "delete",
          label: "حذف المستخدم",
          icon: <Trash2 size={14} aria-hidden="true" />,
          danger: true,
          onSelect: () => openDeleteUserModal(user),
        },
      ],
    },
  ];

  const viewMenuGroups = (view: DemoSmartView): RowMenuGroup[] => [
    {
      items: [
        {
          key: "edit",
          label: "تعديل العرض الذكي",
          icon: <Pencil size={14} aria-hidden="true" />,
          onSelect: () => openEditViewModal(view),
        },
        {
          key: "duplicate",
          label: "نسخ العرض الذكي",
          icon: <Copy size={14} aria-hidden="true" />,
          onSelect: () => duplicateView(view),
        },
      ],
    },
    {
      items: [
        {
          key: "toggle-active",
          label: view.active ? "إيقاف العرض" : "تنشيط العرض",
          icon: view.active ? (
            <Clock3 size={14} aria-hidden="true" />
          ) : (
            <CheckCircle2 size={14} aria-hidden="true" />
          ),
          onSelect: () => toggleViewActive(view.id),
        },
        {
          key: "delete",
          label: "حذف العرض الذكي",
          icon: <Trash2 size={14} aria-hidden="true" />,
          danger: true,
          onSelect: () => openDeleteViewModal(view),
        },
      ],
    },
  ];

  return (
    <AdminLayout>
      <div className="admin-main admin-readex admin-alexandria admin-overview">
        {/* Floating toast stack */}
        {toasts.length > 0 && (
          <aside className="toast-container" aria-live="polite" aria-label="الإشعارات الفورية">
            {toasts.map((toast) => (
              <div key={toast.id} className={`toast-card toast-${toast.type}`} role="alert">
                <div className="toast-icon">
                  {toast.type === "success" ? (
                    <CheckCircle2 size={18} />
                  ) : toast.type === "error" ? (
                    <AlertTriangle size={18} />
                  ) : (
                    <Activity size={18} />
                  )}
                </div>
                <div className="toast-body">
                  <strong>{toast.title}</strong>
                  {toast.description && <p>{toast.description}</p>}
                </div>
                <button
                  type="button"
                  className="toast-close"
                  aria-label="إغلاق الإشعار"
                  onClick={() => removeToast(toast.id)}
                >
                  <X size={15} />
                </button>
              </div>
            ))}
          </aside>
        )}

        {/* Page heading */}
        <header className="ao-head">
          <h1>لوحة الإدارة</h1>
          <button
            type="button"
            className="ao-ghost"
            title="إعادة ضبط كافة البيانات التجريبية إلى حالتها الأصلية"
            onClick={() => setModal("reset-confirm")}
          >
            <RotateCcw size={16} aria-hidden="true" />
            استعادة الافتراضي
          </button>
        </header>

        {/* Metric band */}
        <section className="ao-metrics" aria-label="مؤشرات لوحة الإدارة">
          <div className="ao-metric">
            <span className="ao-metric-label">
              <UsersRound size={14} aria-hidden="true" />
              إجمالي المستخدمين
            </span>
            <strong className="ao-metric-value ao-num">{users.length}</strong>
            <span className="ao-metric-sub">
              <b>{activeUsers}</b> نشط
            </span>
          </div>
          <div className="ao-metric">
            <span className="ao-metric-label">
              <Layers3 size={14} aria-hidden="true" />
              العروض الذكية النشطة
            </span>
            <strong className="ao-metric-value ao-num">{activeViews}</strong>
            <span className="ao-metric-sub">من أصل {views.length}</span>
          </div>
          <div className="ao-metric">
            <span className="ao-metric-label">
              <ScrollText size={14} aria-hidden="true" />
              أحداث التدقيق المسجلة
            </span>
            <strong className="ao-metric-value ao-num">{logs.length}</strong>
            <span className="ao-metric-sub">سجل محلي</span>
          </div>
          <div className="ao-metric">
            <span className="ao-metric-label">
              <Activity size={14} aria-hidden="true" />
              حالة النظام <span className="ao-demo">محاكاة</span>
            </span>
            <span className="ao-metric-state">يعمل بشكل طبيعي</span>
          </div>
        </section>

        {/* Role preview simulator */}
        <nav className="ao-role" aria-label="محاكاة أدوار النظام">
          <div className="ao-role-label">
            <SlidersHorizontal size={17} aria-hidden="true" />
            <span>محاكاة صلاحيات العرض (تجريبية)</span>
          </div>
          <div className="ao-roles" role="radiogroup" aria-label="أدوار النظام">
            {AVAILABLE_ROLES.map((role) => (
              <button
                key={role}
                type="button"
                role="radio"
                aria-checked={activePreviewRole === role}
                className="ao-role-pill"
                onClick={() => {
                  setActivePreviewRole(role);
                  setOpenRowMenu(null);
                  showToast(
                    "تم تغيير وضع المعاينة",
                    `تستعرض الآن الواجهة بصلاحيات "${role}".`,
                    "info"
                  );
                }}
              >
                <RoleIcon role={role} size={15} />
                {role}
              </button>
            ))}
          </div>
          <span className="ao-cap">
            <Unlock size={14} aria-hidden="true" />
            {canEdit ? "التحرير متاح" : "استعراض فقط"}
          </span>
        </nav>

        {!canEdit && (
          <div className="ao-notice" role="status">
            <ShieldAlert size={18} aria-hidden="true" />
            <span>
              <strong>وضع المعاينة المقيدة ({activePreviewRole}):</strong> هذا الدور يمتلك صلاحيات
              استعراض فقط وفقًا لمصفوفة RBAC، لذلك تم تعطيل عمليات الإضافة والتعديل والحذف. للتبديل
              إلى الصلاحيات الكاملة اختر <strong>{EDIT_ROLE}</strong> أعلاه.
            </span>
          </div>
        )}

        {/* Task tabs */}
        <div className="ao-tabs" role="tablist" aria-label="أقسام لوحة الإدارة">
          <button
            type="button"
            role="tab"
            id="ao-tab-users"
            aria-selected={activeTab === "users"}
            aria-controls="ao-panel-users"
            className="ao-tab"
            onClick={() => {
              setActiveTab("users");
              setOpenRowMenu(null);
            }}
          >
            <UsersRound size={18} aria-hidden="true" />
            المستخدمون
            <span className="ao-tab-count">{users.length}</span>
          </button>
          <button
            type="button"
            role="tab"
            id="ao-tab-views"
            aria-selected={activeTab === "views"}
            aria-controls="ao-panel-views"
            className="ao-tab"
            onClick={() => {
              setActiveTab("views");
              setOpenRowMenu(null);
            }}
          >
            <Layers3 size={18} aria-hidden="true" />
            العروض الذكية
            <span className="ao-tab-count">{views.length}</span>
          </button>
          <button
            type="button"
            role="tab"
            id="ao-tab-audit"
            aria-selected={activeTab === "audit"}
            aria-controls="ao-panel-audit"
            className="ao-tab"
            onClick={() => {
              setActiveTab("audit");
              setOpenRowMenu(null);
            }}
          >
            <ScrollText size={18} aria-hidden="true" />
            سجل التدقيق
            <span className="ao-tab-count">{logs.length}</span>
          </button>
        </div>

        {/* Users tab */}
        {activeTab === "users" && (
          <div
            className="ao-stage"
            role="tabpanel"
            id="ao-panel-users"
            aria-labelledby="ao-tab-users"
            tabIndex={0}
          >
            <section className="ao-panel" aria-label="إدارة المستخدمين والأدوار">
              <div className="ao-panel-head">
                <h2>المستخدمون والأدوار</h2>
                <div className="ao-panel-actions">
                  <button
                    type="button"
                    className="ao-primary"
                    onClick={openAddUserModal}
                    disabled={!canEdit}
                  >
                    <Plus size={17} aria-hidden="true" />
                    إضافة مستخدم
                  </button>
                </div>
              </div>

              <div className="ao-toolbar">
                <div className="ao-search">
                  <Search size={16} aria-hidden="true" />
                  <input
                    type="search"
                    placeholder="بحث بالاسم أو البريد الإلكتروني"
                    value={userSearch}
                    onChange={(event) => setUserSearch(event.target.value)}
                    aria-label="البحث عن مستخدم"
                  />
                </div>
                <select
                  className="ao-select"
                  value={userRoleFilter}
                  onChange={(event) => setUserRoleFilter(event.target.value)}
                  aria-label="تصفية حسب الدور"
                >
                  <option value="ALL">كافة الأدوار</option>
                  {AVAILABLE_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
                <select
                  className="ao-select"
                  value={userStatusFilter}
                  onChange={(event) => setUserStatusFilter(event.target.value)}
                  aria-label="تصفية حسب الحالة"
                >
                  <option value="ALL">كافة الحالات</option>
                  <option value="ACTIVE">النشطون فقط</option>
                  <option value="INACTIVE">غير النشطين</option>
                </select>
              </div>

              <div
                className="ao-table-wrap"
                role="region"
                aria-label="جدول المستخدمين والأدوار"
                tabIndex={0}
              >
                <table className="ao-table">
                  <caption className="bayan-sr-only">جدول المستخدمين والأدوار</caption>
                  <colgroup>
                    <col style={{ width: "23%" }} />
                    <col style={{ width: "23%" }} />
                    <col style={{ width: "15%" }} />
                    <col style={{ width: "19%" }} />
                    <col style={{ width: "9%" }} />
                    <col style={{ width: "11%" }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th scope="col">الاسم</th>
                      <th scope="col">البريد الإلكتروني</th>
                      <th scope="col">القسم</th>
                      <th scope="col">الدور</th>
                      <th scope="col">الحالة</th>
                      <th scope="col" className="ao-th-end">
                        الإجراءات
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6}>
                          <div className="ao-empty">
                            <UsersRound size={34} aria-hidden="true" />
                            <p>لا يوجد مستخدمون مطابقون لمعايير البحث الحالية.</p>
                            {(userSearch ||
                              userRoleFilter !== "ALL" ||
                              userStatusFilter !== "ALL") && (
                              <button
                                type="button"
                                className="ao-secondary"
                                onClick={() => {
                                  setUserSearch("");
                                  setUserRoleFilter("ALL");
                                  setUserStatusFilter("ALL");
                                }}
                              >
                                إعادة تعيين التصفية
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      paginatedUsers.map((user) => (
                        <tr
                          key={user.id}
                          className={inspectedUserId === user.id ? "is-selected" : undefined}
                        >
                          <td>
                            <span className="ao-name">
                              <UsersRound size={18} aria-hidden="true" />
                              <button
                                type="button"
                                className="ao-name-btn"
                                aria-pressed={inspectedUserId === user.id}
                                title={`عرض تفاصيل ${user.name}`}
                                onClick={() =>
                                  setInspectedUserId((current) =>
                                    current === user.id ? null : user.id
                                  )
                                }
                              >
                                {user.name}
                              </button>
                            </span>
                          </td>
                          <td>
                            <span className="ao-email" title={user.email}>
                              {user.email}
                            </span>
                          </td>
                          <td>
                            <span className="ao-muted-cell" title={user.department || "عام"}>
                              {user.department || "عام"}
                            </span>
                          </td>
                          <td>
                            <span className="ao-role-cell">
                              <RoleIcon role={user.role} />
                              <span>{user.role}</span>
                            </span>
                          </td>
                          <td>
                            <span className={`ao-pill ${user.active ? "is-ok" : "is-warn"}`}>
                              {user.active ? "نشط" : "غير نشط"}
                            </span>
                          </td>
                          <td className="ao-td-end">
                            {canEdit ? (
                              <div className="ao-row-actions">
                                <button
                                  type="button"
                                  className="ao-link-btn"
                                  onClick={() => openEditUserModal(user)}
                                  aria-label={`تعديل بيانات ${user.name}`}
                                >
                                  <Pencil size={13} aria-hidden="true" />
                                  تعديل
                                </button>
                                <AdminRowMenu
                                  label={`إجراءات المستخدم ${user.name}`}
                                  groups={userMenuGroups(user)}
                                  open={openRowMenu === user.id}
                                  onToggle={() =>
                                    setOpenRowMenu((current) =>
                                      current === user.id ? null : user.id
                                    )
                                  }
                                  onClose={closeRowMenu}
                                />
                              </div>
                            ) : (
                              <span className="ao-readonly">للعرض فقط</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="ao-pager">
                <span>
                  صفحة <span className="ao-num">{userPage}</span> من{" "}
                  <span className="ao-num">{totalUserPages}</span> —{" "}
                  <span className="ao-num">{filteredUsers.length}</span> مستخدم
                </span>
                <div className="ao-pager-controls">
                  <button
                    type="button"
                    disabled={userPage <= 1}
                    onClick={() => setUserPage((page) => Math.max(1, page - 1))}
                  >
                    <ChevronRight size={15} aria-hidden="true" />
                    السابق
                  </button>
                  {Array.from({ length: totalUserPages }, (_, index) => index + 1).map((page) => (
                    <button
                      type="button"
                      key={page}
                      aria-current={userPage === page ? "page" : undefined}
                      aria-label={`الصفحة ${page}`}
                      onClick={() => setUserPage(page)}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    type="button"
                    disabled={userPage >= totalUserPages}
                    onClick={() => setUserPage((page) => Math.min(totalUserPages, page + 1))}
                  >
                    التالي
                    <ChevronLeft size={15} aria-hidden="true" />
                  </button>
                </div>
              </div>
            </section>

            {inspectedUser && (
              <UserInspector
                user={inspectedUser}
                canEdit={canEdit}
                onClose={() => setInspectedUserId(null)}
                onEdit={() => openEditUserModal(inspectedUser)}
                onToggleActive={() => toggleUserActive(inspectedUser.id)}
                onDelete={() => openDeleteUserModal(inspectedUser)}
              />
            )}
          </div>
        )}

        {/* Smart views tab */}
        {activeTab === "views" && (
          <div
            className="ao-stage"
            role="tabpanel"
            id="ao-panel-views"
            aria-labelledby="ao-tab-views"
            tabIndex={0}
          >
            <section className="ao-panel" aria-label="إدارة العروض الذكية">
              <div className="ao-panel-head">
                <h2>العروض الذكية</h2>
                <div className="ao-panel-actions">
                  <button
                    type="button"
                    className="ao-primary"
                    onClick={openAddViewModal}
                    disabled={!canEdit}
                  >
                    <Plus size={17} aria-hidden="true" />
                    إنشاء عرض ذكي
                  </button>
                </div>
              </div>

              <div className="ao-toolbar">
                <div className="ao-search">
                  <Search size={16} aria-hidden="true" />
                  <input
                    type="search"
                    placeholder="بحث باسم العرض أو المصدر"
                    value={viewSearch}
                    onChange={(event) => setViewSearch(event.target.value)}
                    aria-label="البحث عن عرض ذكي"
                  />
                </div>
                <select
                  className="ao-select"
                  value={viewSecurityFilter}
                  onChange={(event) => setViewSecurityFilter(event.target.value)}
                  aria-label="تصفية حسب التصنيف الأمني"
                >
                  <option value="ALL">كافة التصنيفات</option>
                  {AVAILABLE_SECURITIES.map((security) => (
                    <option key={security} value={security}>
                      {security}
                    </option>
                  ))}
                </select>
                <select
                  className="ao-select"
                  value={viewStatusFilter}
                  onChange={(event) => setViewStatusFilter(event.target.value)}
                  aria-label="تصفية حسب الحالة"
                >
                  <option value="ALL">كافة الحالات</option>
                  <option value="ACTIVE">النشطة فقط</option>
                  <option value="INACTIVE">المتوقفة</option>
                </select>
              </div>

              <div
                className="ao-table-wrap"
                role="region"
                aria-label="جدول العروض الذكية"
                tabIndex={0}
              >
                <table className="ao-table">
                  <caption className="bayan-sr-only">جدول العروض الذكية</caption>
                  <colgroup>
                    <col style={{ width: "29%" }} />
                    <col style={{ width: "26%" }} />
                    <col style={{ width: "16%" }} />
                    <col style={{ width: "11%" }} />
                    <col style={{ width: "18%" }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th scope="col">اسم العرض</th>
                      <th scope="col">المصدر الأكاديمي</th>
                      <th scope="col">المستوى الأمني</th>
                      <th scope="col">الحالة</th>
                      <th scope="col" className="ao-th-end">
                        الإجراءات
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredViews.length === 0 ? (
                      <tr>
                        <td colSpan={5}>
                          <div className="ao-empty">
                            <Layers3 size={34} aria-hidden="true" />
                            <p>لا توجد عروض ذكية مطابقة لمعايير البحث الحالية.</p>
                            {(viewSearch ||
                              viewSecurityFilter !== "ALL" ||
                              viewStatusFilter !== "ALL") && (
                              <button
                                type="button"
                                className="ao-secondary"
                                onClick={() => {
                                  setViewSearch("");
                                  setViewSecurityFilter("ALL");
                                  setViewStatusFilter("ALL");
                                }}
                              >
                                إعادة تعيين التصفية
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredViews.map((view, index) => (
                        <tr
                          key={view.id}
                          className={inspectedViewId === view.id ? "is-selected" : undefined}
                        >
                          <td>
                            <span className="ao-name">
                              {viewIcon(index)}
                              <button
                                type="button"
                                className="ao-name-btn"
                                aria-pressed={inspectedViewId === view.id}
                                title={`عرض تفاصيل ${view.name}`}
                                onClick={() =>
                                  setInspectedViewId((current) =>
                                    current === view.id ? null : view.id
                                  )
                                }
                              >
                                {view.name}
                              </button>
                            </span>
                          </td>
                          <td>
                            <span className="ao-muted-cell" title={view.source}>
                              {view.source}
                            </span>
                          </td>
                          <td>
                            <span className="ao-security" data-level={view.security}>
                              <Lock size={12} aria-hidden="true" />
                              {view.security}
                            </span>
                          </td>
                          <td>
                            <span className={`ao-pill ${view.active ? "is-ok" : "is-warn"}`}>
                              {view.active ? "نشط" : "متوقف"}
                            </span>
                          </td>
                          <td className="ao-td-end">
                            {canEdit ? (
                              <div className="ao-row-actions">
                                <button
                                  type="button"
                                  className="ao-link-btn"
                                  onClick={() => openEditViewModal(view)}
                                  aria-label={`تعديل ${view.name}`}
                                >
                                  <Pencil size={13} aria-hidden="true" />
                                  تعديل
                                </button>
                                <AdminRowMenu
                                  label={`إجراءات العرض الذكي ${view.name}`}
                                  groups={viewMenuGroups(view)}
                                  open={openRowMenu === view.id}
                                  onToggle={() =>
                                    setOpenRowMenu((current) =>
                                      current === view.id ? null : view.id
                                    )
                                  }
                                  onClose={closeRowMenu}
                                />
                              </div>
                            ) : (
                              <span className="ao-readonly">للعرض فقط</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {inspectedView && (
              <SmartViewInspector
                view={inspectedView}
                canEdit={canEdit}
                onClose={() => setInspectedViewId(null)}
                onEdit={() => openEditViewModal(inspectedView)}
                onToggleActive={() => toggleViewActive(inspectedView.id)}
                onDuplicate={() => duplicateView(inspectedView)}
                onDelete={() => openDeleteViewModal(inspectedView)}
              />
            )}
          </div>
        )}

        {/* Audit tab */}
        {activeTab === "audit" && (
          <section
            className="ao-panel"
            role="tabpanel"
            id="ao-panel-audit"
            aria-labelledby="ao-tab-audit"
            tabIndex={0}
          >
            <div className="ao-panel-head">
              <h2>سجل التدقيق</h2>
              <div className="ao-panel-actions">
                <button
                  type="button"
                  className="ao-secondary"
                  onClick={() => setModal("full-log")}
                >
                  <ExternalLink size={16} aria-hidden="true" />
                  السجل الكامل ({logs.length})
                </button>
              </div>
            </div>

            <div className="ao-toolbar">
              <div className="ao-search">
                <Search size={16} aria-hidden="true" />
                <input
                  type="search"
                  placeholder="بحث في السجلات"
                  value={auditSearch}
                  onChange={(event) => setAuditSearch(event.target.value)}
                  aria-label="بحث في سجلات التدقيق"
                />
              </div>
              <select
                className="ao-select"
                value={auditStatusFilter}
                onChange={(event) => setAuditStatusFilter(event.target.value)}
                aria-label="تصفية حسب حالة السجل"
              >
                <option value="ALL">كافة الحالات</option>
                <option value="نجاح">ناجحة (نجاح)</option>
                <option value="تنبيه">تنبيهات</option>
                <option value="فشل">فاشلة</option>
              </select>
              <button
                type="button"
                className="ao-secondary"
                onClick={() =>
                  setAuditSortOrder((current) => (current === "desc" ? "asc" : "desc"))
                }
                aria-label="تبديل ترتيب السجلات"
              >
                {auditSortOrder === "desc" ? "الأحدث أولاً" : "الأقدم أولاً"}
              </button>
            </div>

            <div
              className="ao-table-wrap"
              role="region"
              aria-label="جدول سجل التدقيق"
              tabIndex={0}
            >
              <table className="ao-table">
                <caption className="bayan-sr-only">جدول سجل التدقيق</caption>
                <colgroup>
                  <col style={{ width: "17%" }} />
                  <col style={{ width: "21%" }} />
                  <col style={{ width: "30%" }} />
                  <col style={{ width: "20%" }} />
                  <col style={{ width: "12%" }} />
                </colgroup>
                <thead>
                  <tr>
                    <th scope="col">الوقت</th>
                    <th scope="col">المستخدم المنفذ</th>
                    <th scope="col">الإجراء</th>
                    <th scope="col">الهدف</th>
                    <th scope="col">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5}>
                        <div className="ao-empty">
                          <ScrollText size={34} aria-hidden="true" />
                          <p>لا توجد سجلات مطابقة للبحث أو التصفية.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log, index) => (
                      <tr key={`${log.id}-${index}`}>
                        <td>
                          <span className="ao-time">
                            <Clock3 size={14} aria-hidden="true" />
                            {log.time}
                          </span>
                        </td>
                        <td>
                          <b style={{ fontWeight: 600, color: "var(--bayan-text-primary, #0f172a)" }}>
                            {log.user}
                          </b>
                        </td>
                        <td>
                          <span className="ao-action-text">{log.action}</span>
                        </td>
                        <td>
                          <span
                            className={`ao-target ${
                              log.target?.includes("@") ? "is-ltr" : ""
                            }`}
                            title={log.target || "عام"}
                          >
                            {log.target || "عام"}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`ao-pill ${
                              log.status === "نجاح"
                                ? "is-ok"
                                : log.status === "فشل"
                                  ? "is-danger"
                                  : "is-warn"
                            }`}
                          >
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="ao-pager">
              <span>
                عرض <span className="ao-num">{filteredLogs.length}</span> من{" "}
                <span className="ao-num">{logs.length}</span> سجل
              </span>
            </div>
          </section>
        )}

        {/* Health and quick actions */}
        <div className="ao-shelf">
          <section className="ao-widget" aria-label="حالة النظام">
            <h3>
              <Activity size={18} aria-hidden="true" />
              حالة النظام
              <span className="ao-demo">محاكاة</span>
            </h3>
            {[
              { name: "الخدمات الأساسية", desc: "FastAPI / Uvicorn" },
              { name: "قاعدة البيانات", desc: "PostgreSQL 16" },
              { name: "محرك الاستعلامات", desc: "LangGraph Agent" },
              { name: "خدمة العروض الذكية", desc: "Qdrant Vector DB" },
            ].map((service) => (
              <div className="ao-health-row" key={service.name}>
                <div>
                  <b>{service.name}</b>
                  <small>{service.desc}</small>
                </div>
                <span className="ao-health-state">يعمل</span>
              </div>
            ))}
            <div className="ao-latency">
              <Gauge size={18} aria-hidden="true" style={{ color: "var(--bayan-teal-700)" }} />
              <small>زمن الاستجابة التقديري</small>
              <b>
                <span className="ao-num">320</span> مللي ثانية
              </b>
            </div>
          </section>

          <section className="ao-widget" aria-label="إجراءات سريعة">
            <h3>
              <Zap size={18} aria-hidden="true" />
              إجراءات سريعة
            </h3>
            <div className="ao-quick">
              <button type="button" onClick={openAddUserModal} disabled={!canEdit}>
                <UserRoundPlus size={17} aria-hidden="true" />
                <span>إضافة مستخدم جديد</span>
                <ChevronLeft size={15} aria-hidden="true" />
              </button>
              <button type="button" onClick={openAddViewModal} disabled={!canEdit}>
                <Layers3 size={17} aria-hidden="true" />
                <span>إنشاء عرض ذكي</span>
                <ChevronLeft size={15} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("audit");
                  setOpenRowMenu(null);
                }}
              >
                <ScrollText size={17} aria-hidden="true" />
                <span>مراجعة سجل التدقيق</span>
                <ChevronLeft size={15} aria-hidden="true" />
              </button>
              <button type="button" onClick={() => setModal("reset-confirm")}>
                <RotateCcw size={17} aria-hidden="true" />
                <span>إعادة ضبط البيانات التجريبية</span>
                <ChevronLeft size={15} aria-hidden="true" />
              </button>
            </div>
          </section>
        </div>

        {/* Dialogs */}
        {Boolean(modal) && (
          <div
            className="dialog-overlay"
            onMouseDown={(event) => {
              if (event.currentTarget === event.target) closeModal();
            }}
          >
            <div
              ref={dialogRef}
              tabIndex={-1}
              className="dialog-card"
              role="dialog"
              aria-modal="true"
              aria-labelledby="dialog-title"
            >
              <button
                type="button"
                className="close-dialog"
                aria-label="إغلاق النافذة"
                onClick={closeModal}
              >
                <X size={18} />
              </button>

              {modal === "add-user" && (
                <>
                  <h2 id="dialog-title">إضافة مستخدم جديد</h2>
                  <p>بيانات تجريبية تُحفظ محليًا في متصفحك وتنعكس فورًا على الجداول والإحصاءات.</p>
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      handleCreateUser();
                    }}
                    noValidate
                  >
                    <label>
                      الاسم الكامل:
                      <input
                        placeholder="مثال: د. فهد الغامدي"
                        value={userName}
                        onChange={(event) => setUserName(event.target.value)}
                        autoFocus
                      />
                      {userFormErrors.name && <span className="field-error">{userFormErrors.name}</span>}
                    </label>
                    <label>
                      البريد الإلكتروني الجامعي:
                      <input
                        type="email"
                        dir="ltr"
                        placeholder="name@univ.edu.sa"
                        value={userEmail}
                        onChange={(event) => setUserEmail(event.target.value)}
                      />
                      {userFormErrors.email && (
                        <span className="field-error">{userFormErrors.email}</span>
                      )}
                    </label>
                    <label>
                      القسم / الإدارة:
                      <input
                        placeholder="مثال: تقنية المعلومات"
                        value={userDepartment}
                        onChange={(event) => setUserDepartment(event.target.value)}
                      />
                    </label>
                    <label>
                      الدور والصلاحيات:
                      <select
                        value={userRole}
                        onChange={(event) => setUserRole(event.target.value as AdminRole)}
                      >
                        {AVAILABLE_ROLES.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="checkbox-field">
                      <label>
                        <input
                          type="checkbox"
                          checked={userActive}
                          onChange={(event) => setUserActive(event.target.checked)}
                        />
                        تفعيل الحساب فور الإنشاء (حالة نشطة)
                      </label>
                    </div>
                    <div className="dialog-actions">
                      <button type="button" className="outline-button" onClick={closeModal}>
                        إلغاء
                      </button>
                      <button type="submit" className="action-primary dialog-submit">
                        حفظ المستخدم
                      </button>
                    </div>
                  </form>
                </>
              )}

              {modal === "edit-user" && selectedUser && (
                <>
                  <h2 id="dialog-title">تعديل بيانات المستخدم</h2>
                  <p>تعديل الحساب المحدد وتحديث الدور وصلاحيات الوصول محليًا.</p>
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      handleUpdateUser();
                    }}
                    noValidate
                  >
                    <label>
                      الاسم الكامل:
                      <input
                        value={userName}
                        onChange={(event) => setUserName(event.target.value)}
                        autoFocus
                      />
                      {userFormErrors.name && <span className="field-error">{userFormErrors.name}</span>}
                    </label>
                    <label>
                      البريد الإلكتروني:
                      <input
                        type="email"
                        dir="ltr"
                        value={userEmail}
                        onChange={(event) => setUserEmail(event.target.value)}
                      />
                      {userFormErrors.email && (
                        <span className="field-error">{userFormErrors.email}</span>
                      )}
                    </label>
                    <label>
                      القسم / الإدارة:
                      <input
                        value={userDepartment}
                        onChange={(event) => setUserDepartment(event.target.value)}
                      />
                    </label>
                    <label>
                      الدور:
                      <select
                        value={userRole}
                        onChange={(event) => setUserRole(event.target.value as AdminRole)}
                      >
                        {AVAILABLE_ROLES.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="checkbox-field">
                      <label>
                        <input
                          type="checkbox"
                          checked={userActive}
                          onChange={(event) => setUserActive(event.target.checked)}
                        />
                        الحساب نشط
                      </label>
                    </div>
                    <div className="dialog-actions">
                      <button type="button" className="outline-button" onClick={closeModal}>
                        إلغاء
                      </button>
                      <button type="submit" className="action-primary dialog-submit">
                        حفظ التعديلات
                      </button>
                    </div>
                  </form>
                </>
              )}

              {modal === "delete-user" && selectedUser && (
                <div className="confirm-dialog-content">
                  <div className="confirm-icon warning">
                    <AlertTriangle size={32} />
                  </div>
                  <h2 id="dialog-title">تأكيد حذف المستخدم</h2>
                  <p>
                    هل أنت متأكد من رغبتك في حذف المستخدم <strong>{selectedUser.name}</strong> (
                    {selectedUser.email})؟ سيتم تحديث الجداول فورًا وتوثيق العملية في سجل التدقيق.
                  </p>
                  <div className="dialog-actions">
                    <button type="button" className="outline-button" onClick={closeModal}>
                      إلغاء
                    </button>
                    <button type="button" className="action-danger" onClick={handleDeleteUser}>
                      تأكيد الحذف
                    </button>
                  </div>
                </div>
              )}

              {modal === "add-view" && (
                <>
                  <h2 id="dialog-title">إنشاء عرض ذكي جديد</h2>
                  <p>إنشاء نموذج توضيحي لعرض بيانات منظم وآمن مع تصنيف أمني محدد.</p>
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      handleCreateView();
                    }}
                    noValidate
                  >
                    <label>
                      اسم العرض الذكي:
                      <input
                        placeholder="مثال: عرض الخريجين والتوظيف"
                        value={viewName}
                        onChange={(event) => setViewName(event.target.value)}
                        autoFocus
                      />
                      {viewFormErrors.name && <span className="field-error">{viewFormErrors.name}</span>}
                    </label>
                    <label>
                      مصدر البيانات الأكاديمي:
                      <select value={viewSource} onChange={(event) => setViewSource(event.target.value)}>
                        {AVAILABLE_SOURCES.map((source) => (
                          <option key={source} value={source}>
                            {source}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      المستوى الأمني وحساسية البيانات:
                      <select
                        value={viewSecurity}
                        onChange={(event) => setViewSecurity(event.target.value as SecurityLevel)}
                      >
                        {AVAILABLE_SECURITIES.map((security) => (
                          <option key={security} value={security}>
                            {security}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="checkbox-field">
                      <label>
                        <input
                          type="checkbox"
                          checked={viewActive}
                          onChange={(event) => setViewActive(event.target.checked)}
                        />
                        تفعيل العرض فور الإنشاء
                      </label>
                    </div>
                    <div className="dialog-actions">
                      <button type="button" className="outline-button" onClick={closeModal}>
                        إلغاء
                      </button>
                      <button type="submit" className="action-primary dialog-submit">
                        حفظ العرض الذكي
                      </button>
                    </div>
                  </form>
                </>
              )}

              {modal === "edit-view" && selectedView && (
                <>
                  <h2 id="dialog-title">تعديل العرض الذكي</h2>
                  <p>تعديل إعدادات المصدر والتصنيف الأمني وحالة التفعيل للعرض المحدد.</p>
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      handleUpdateView();
                    }}
                    noValidate
                  >
                    <label>
                      اسم العرض الذكي:
                      <input
                        value={viewName}
                        onChange={(event) => setViewName(event.target.value)}
                        autoFocus
                      />
                      {viewFormErrors.name && <span className="field-error">{viewFormErrors.name}</span>}
                    </label>
                    <label>
                      مصدر البيانات:
                      <select value={viewSource} onChange={(event) => setViewSource(event.target.value)}>
                        {AVAILABLE_SOURCES.map((source) => (
                          <option key={source} value={source}>
                            {source}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      المستوى الأمني:
                      <select
                        value={viewSecurity}
                        onChange={(event) => setViewSecurity(event.target.value as SecurityLevel)}
                      >
                        {AVAILABLE_SECURITIES.map((security) => (
                          <option key={security} value={security}>
                            {security}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="checkbox-field">
                      <label>
                        <input
                          type="checkbox"
                          checked={viewActive}
                          onChange={(event) => setViewActive(event.target.checked)}
                        />
                        العرض نشط ومتاح
                      </label>
                    </div>
                    <div className="dialog-actions">
                      <button type="button" className="outline-button" onClick={closeModal}>
                        إلغاء
                      </button>
                      <button type="submit" className="action-primary dialog-submit">
                        حفظ التعديلات
                      </button>
                    </div>
                  </form>
                </>
              )}

              {modal === "delete-view" && selectedView && (
                <div className="confirm-dialog-content">
                  <div className="confirm-icon warning">
                    <AlertTriangle size={32} />
                  </div>
                  <h2 id="dialog-title">تأكيد حذف العرض الذكي</h2>
                  <p>
                    هل أنت متأكد من رغبتك في حذف العرض الذكي <strong>{selectedView.name}</strong>؟ سيتم
                    إلغاء ارتباطه بالتقارير ومصادر البيانات المرتبطة.
                  </p>
                  <div className="dialog-actions">
                    <button type="button" className="outline-button" onClick={closeModal}>
                      إلغاء
                    </button>
                    <button type="button" className="action-danger" onClick={handleDeleteView}>
                      تأكيد الحذف
                    </button>
                  </div>
                </div>
              )}

              {modal === "full-log" && (
                <>
                  <h2 id="dialog-title">سجل التدقيق الكامل</h2>
                  <p>سجلات محلية توثق كافة العمليات والمحاكاة المنفذة في هذه الجلسة.</p>
                  <div className="table-toolbar log-toolbar">
                    <div className="search-field log-search-field">
                      <Search size={15} />
                      <input
                        type="search"
                        placeholder="بحث في السجلات..."
                        value={auditSearch}
                        onChange={(event) => setAuditSearch(event.target.value)}
                        aria-label="بحث في سجلات التدقيق"
                      />
                      {auditSearch && (
                        <button
                          type="button"
                          className="clear-search"
                          onClick={() => setAuditSearch("")}
                          aria-label="مسح نص البحث"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                    <div className="filter-group">
                      <select
                        value={auditStatusFilter}
                        onChange={(event) => setAuditStatusFilter(event.target.value)}
                        aria-label="تصفية حسب حالة السجل"
                      >
                        <option value="ALL">كافة الحالات</option>
                        <option value="نجاح">ناجحة (نجاح)</option>
                        <option value="تنبيه">تنبيهات</option>
                        <option value="فشل">فاشلة</option>
                      </select>
                      <button
                        type="button"
                        className="outline-button audit-sort-btn"
                        onClick={() =>
                          setAuditSortOrder((current) => (current === "desc" ? "asc" : "desc"))
                        }
                        title="تبديل ترتيب السجلات"
                        aria-label="تبديل ترتيب السجلات"
                      >
                        {auditSortOrder === "desc" ? "الأحدث أولاً" : "الأقدم أولاً"}
                      </button>
                    </div>
                  </div>
                  <div className="audit-dialog-list" role="feed">
                    {filteredLogs.length === 0 ? (
                      <p className="no-logs">لا توجد سجلات مطابقة للبحث.</p>
                    ) : (
                      filteredLogs.map((log, index) => (
                        <div className="dialog-log" key={`${log.id}-${index}`}>
                          <div className="log-header">
                            <span className="log-time">
                              <Clock3 size={13} /> {log.time}
                            </span>
                            <span
                              className={`state-pill ${
                                log.status === "نجاح" ? "success" : "warning"
                              }`}
                            >
                              {log.status}
                            </span>
                          </div>
                          <div className="log-body">
                            <strong>{log.user}</strong>: {log.action}
                          </div>
                          {log.target && <div className="log-target">الهدف: {log.target}</div>}
                        </div>
                      ))
                    )}
                  </div>
                  <div className="dialog-actions">
                    <button type="button" className="action-primary" onClick={closeModal}>
                      إغلاق
                    </button>
                  </div>
                </>
              )}

              {modal === "reset-confirm" && (
                <div className="confirm-dialog-content">
                  <div className="confirm-icon info">
                    <RotateCcw size={32} />
                  </div>
                  <h2 id="dialog-title">استعادة البيانات الافتراضية</h2>
                  <p>
                    هل ترغب في إعادة تعيين كافة بيانات المستخدمين والعروض الذكية وسجلات التدقيق إلى
                    حالتها الأصلية؟ سيتم مسح التغييرات المحفوظة محليًا في المتصفح.
                  </p>
                  <div className="dialog-actions">
                    <button type="button" className="outline-button" onClick={closeModal}>
                      إلغاء
                    </button>
                    <button type="button" className="action-primary" onClick={handleResetDemoData}>
                      تأكيد الاستعادة
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
