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
import { ROLE_SCOPE } from "./admin/roleMeta";

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
            className="ad-overlay"
            onMouseDown={(event) => {
              if (event.currentTarget === event.target) closeModal();
            }}
          >
            <div
              ref={dialogRef}
              tabIndex={-1}
              className={
                "ad-card " +
                (modal === "delete-user" || modal === "delete-view" ? "is-danger size-sm" : "") +
                (modal === "reset-confirm" ? " is-info size-sm" : "") +
                (modal === "full-log" ? " size-lg" : "")
              }
              role="dialog"
              aria-modal="true"
              aria-labelledby="dialog-title"
            >
              <button
                type="button"
                className="ad-close"
                aria-label="إغلاق النافذة"
                onClick={closeModal}
              >
                <X size={18} />
              </button>

              {modal === "add-user" && (
                <>
                  <header className="ad-head">
                    <span className="ad-badge" aria-hidden="true">
                      <UserRoundPlus size={18} />
                    </span>
                    <div>
                      <h2 id="dialog-title">إضافة مستخدم جديد</h2>
                      <p>يُحفظ الحساب محليًا في المتصفح وينعكس فورًا على الجدول والإحصاءات.</p>
                    </div>
                  </header>

                  <form
                    id="ad-user-create-form"
                    className="ad-body"
                    onSubmit={(event) => {
                      event.preventDefault();
                      handleCreateUser();
                    }}
                    noValidate
                  >
                    <section className="ad-section" aria-labelledby="ad-user-account-title">
                      <h3 className="ad-section-title" id="ad-user-account-title">بيانات الحساب</h3>
                      <div className="ad-grid">
                        <div className="ad-field">
                          <label className="ad-label" htmlFor="ad-user-name">الاسم الكامل</label>
                          <input
                            id="ad-user-name"
                            className="ad-input"
                            data-autofocus
                            placeholder="مثال: د. فهد الغامدي"
                            value={userName}
                            onChange={(event) => setUserName(event.target.value)}
                            aria-invalid={Boolean(userFormErrors.name)}
                            aria-describedby={userFormErrors.name ? "ad-user-name-error" : undefined}
                          />
                          {userFormErrors.name && (
                            <span className="ad-error" id="ad-user-name-error">
                              <AlertTriangle size={12} aria-hidden="true" />
                              {userFormErrors.name}
                            </span>
                          )}
                        </div>

                        <div className="ad-field">
                          <label className="ad-label" htmlFor="ad-user-email">البريد الإلكتروني الجامعي</label>
                          <input
                            id="ad-user-email"
                            className="ad-input"
                            type="email"
                            dir="ltr"
                            placeholder="name@univ.edu.sa"
                            value={userEmail}
                            onChange={(event) => setUserEmail(event.target.value)}
                            aria-invalid={Boolean(userFormErrors.email)}
                            aria-describedby={userFormErrors.email ? "ad-user-email-error" : undefined}
                          />
                          {userFormErrors.email && (
                            <span className="ad-error" id="ad-user-email-error">
                              <AlertTriangle size={12} aria-hidden="true" />
                              {userFormErrors.email}
                            </span>
                          )}
                        </div>

                        <div className="ad-field is-wide">
                          <label className="ad-label" htmlFor="ad-user-department">القسم / الإدارة</label>
                          <input
                            id="ad-user-department"
                            className="ad-input"
                            placeholder="مثال: تقنية المعلومات"
                            value={userDepartment}
                            onChange={(event) => setUserDepartment(event.target.value)}
                          />
                        </div>
                      </div>
                    </section>

                    <section className="ad-section" aria-labelledby="ad-user-role-title">
                      <h3 className="ad-section-title" id="ad-user-role-title">الدور والصلاحيات</h3>
                      <div className="ad-field">
                        <label className="ad-label" htmlFor="ad-user-role">الدور</label>
                        <select
                          id="ad-user-role"
                          className="ad-select"
                          value={userRole}
                          onChange={(event) => setUserRole(event.target.value as AdminRole)}
                        >
                          {AVAILABLE_ROLES.map((role) => (
                            <option key={role} value={role}>{role}</option>
                          ))}
                        </select>
                        <span className="ad-role">
                          <RoleIcon role={userRole} size={14} />
                          {ROLE_SCOPE[userRole]}
                        </span>
                      </div>
                    </section>

                    <section className="ad-section" aria-labelledby="ad-user-status-title">
                      <h3 className="ad-section-title" id="ad-user-status-title">حالة الحساب</h3>
                      <label className="ad-switch" htmlFor="ad-user-active">
                        <input
                          id="ad-user-active"
                          type="checkbox"
                          checked={userActive}
                          onChange={(event) => setUserActive(event.target.checked)}
                        />
                        <span className="ad-switch-track" aria-hidden="true" />
                        <span className="ad-switch-text">
                          <b>{userActive ? "نشط" : "موقوف"}</b>
                          <small>يُفعّل الحساب فور الإنشاء ويمكن لمستخدمه الدخول مباشرة.</small>
                        </span>
                      </label>
                    </section>
                  </form>

                  <div className="ad-foot">
                    <button type="button" className="ad-btn" onClick={closeModal}>إلغاء</button>
                    <button type="submit" form="ad-user-create-form" className="ad-btn is-primary">
                      حفظ المستخدم
                    </button>
                  </div>
                </>
              )}

              {modal === "edit-user" && selectedUser && (
                <>
                  <header className="ad-head">
                    <span className="ad-badge" aria-hidden="true">
                      <Pencil size={17} />
                    </span>
                    <div>
                      <h2 id="dialog-title">تعديل بيانات المستخدم</h2>
                      <p>تحديث بيانات الحساب ودوره؛ تُوثَّق العملية في سجل التدقيق.</p>
                    </div>
                  </header>

                  <form
                    id="ad-user-edit-form"
                    className="ad-body"
                    onSubmit={(event) => {
                      event.preventDefault();
                      handleUpdateUser();
                    }}
                    noValidate
                  >
                    <section className="ad-section" aria-labelledby="ad-user-edit-account-title">
                      <h3 className="ad-section-title" id="ad-user-edit-account-title">بيانات الحساب</h3>
                      <div className="ad-grid">
                        <div className="ad-field">
                          <label className="ad-label" htmlFor="ad-user-edit-name">الاسم الكامل</label>
                          <input
                            id="ad-user-edit-name"
                            className="ad-input"
                            data-autofocus
                            value={userName}
                            onChange={(event) => setUserName(event.target.value)}
                            aria-invalid={Boolean(userFormErrors.name)}
                            aria-describedby={userFormErrors.name ? "ad-user-edit-name-error" : undefined}
                          />
                          {userFormErrors.name && (
                            <span className="ad-error" id="ad-user-edit-name-error">
                              <AlertTriangle size={12} aria-hidden="true" />
                              {userFormErrors.name}
                            </span>
                          )}
                        </div>

                        <div className="ad-field">
                          <label className="ad-label" htmlFor="ad-user-edit-email">البريد الإلكتروني</label>
                          <input
                            id="ad-user-edit-email"
                            className="ad-input"
                            type="email"
                            dir="ltr"
                            value={userEmail}
                            onChange={(event) => setUserEmail(event.target.value)}
                            aria-invalid={Boolean(userFormErrors.email)}
                            aria-describedby={userFormErrors.email ? "ad-user-edit-email-error" : undefined}
                          />
                          {userFormErrors.email && (
                            <span className="ad-error" id="ad-user-edit-email-error">
                              <AlertTriangle size={12} aria-hidden="true" />
                              {userFormErrors.email}
                            </span>
                          )}
                        </div>

                        <div className="ad-field is-wide">
                          <label className="ad-label" htmlFor="ad-user-edit-department">القسم / الإدارة</label>
                          <input
                            id="ad-user-edit-department"
                            className="ad-input"
                            value={userDepartment}
                            onChange={(event) => setUserDepartment(event.target.value)}
                          />
                        </div>
                      </div>
                    </section>

                    <section className="ad-section" aria-labelledby="ad-user-edit-role-title">
                      <h3 className="ad-section-title" id="ad-user-edit-role-title">الدور والصلاحيات</h3>
                      <div className="ad-field">
                        <label className="ad-label" htmlFor="ad-user-edit-role">الدور</label>
                        <select
                          id="ad-user-edit-role"
                          className="ad-select"
                          value={userRole}
                          onChange={(event) => setUserRole(event.target.value as AdminRole)}
                        >
                          {AVAILABLE_ROLES.map((role) => (
                            <option key={role} value={role}>{role}</option>
                          ))}
                        </select>
                        <span className="ad-role">
                          <RoleIcon role={userRole} size={14} />
                          {ROLE_SCOPE[userRole]}
                        </span>
                      </div>
                    </section>

                    <section className="ad-section" aria-labelledby="ad-user-edit-status-title">
                      <h3 className="ad-section-title" id="ad-user-edit-status-title">حالة الحساب</h3>
                      <label className="ad-switch" htmlFor="ad-user-edit-active">
                        <input
                          id="ad-user-edit-active"
                          type="checkbox"
                          checked={userActive}
                          onChange={(event) => setUserActive(event.target.checked)}
                        />
                        <span className="ad-switch-track" aria-hidden="true" />
                        <span className="ad-switch-text">
                          <b>{userActive ? "نشط" : "موقوف"}</b>
                          <small>الحساب الموقوف يبقى في السجلات دون صلاحية دخول.</small>
                        </span>
                      </label>
                    </section>
                  </form>

                  <div className="ad-foot">
                    <button type="button" className="ad-btn" onClick={closeModal}>إلغاء</button>
                    <button type="submit" form="ad-user-edit-form" className="ad-btn is-primary">
                      حفظ التعديلات
                    </button>
                  </div>
                </>
              )}

              {modal === "delete-user" && selectedUser && (
                <>
                  <header className="ad-head">
                    <span className="ad-badge" aria-hidden="true">
                      <Trash2 size={17} />
                    </span>
                    <div>
                      <h2 id="dialog-title">حذف المستخدم</h2>
                      <p>يُزال الحساب من القوائم ويُوثَّق الحذف في سجل التدقيق.</p>
                    </div>
                  </header>

                  <div className="ad-body">
                    <dl className="ad-summary">
                      <div>
                        <dt>الاسم</dt>
                        <dd>{selectedUser.name}</dd>
                      </div>
                      <div>
                        <dt>الدور</dt>
                        <dd>
                          <RoleIcon role={selectedUser.role} size={13} />
                          {selectedUser.role}
                        </dd>
                      </div>
                      <div>
                        <dt>البريد الإلكتروني</dt>
                        <dd className="is-ltr">{selectedUser.email}</dd>
                      </div>
                      <div>
                        <dt>القسم</dt>
                        <dd>{selectedUser.department || "غير محدد"}</dd>
                      </div>
                    </dl>

                    <div className="ad-note" role="note">
                      <AlertTriangle size={15} aria-hidden="true" />
                      <span>لا يمكن التراجع عن الحذف من هذه الشاشة؛ لإعادة الحساب يجب إنشاء مستخدم جديد.</span>
                    </div>
                  </div>

                  <div className="ad-foot">
                    <button type="button" className="ad-btn" onClick={closeModal}>إلغاء</button>
                    <button type="button" className="ad-btn is-danger" onClick={handleDeleteUser}>
                      <Trash2 size={14} aria-hidden="true" />
                      تأكيد الحذف
                    </button>
                  </div>
                </>
              )}

              {modal === "add-view" && (
                <>
                  <header className="ad-head">
                    <span className="ad-badge" aria-hidden="true">
                      <Layers3 size={18} />
                    </span>
                    <div>
                      <h2 id="dialog-title">إنشاء عرض ذكي جديد</h2>
                      <p>عرض منظم لبيانات مصدر محدد، بدرجة حساسية مضبوطة قبل نشره.</p>
                    </div>
                  </header>

                  <form
                    id="ad-view-create-form"
                    className="ad-body"
                    onSubmit={(event) => {
                      event.preventDefault();
                      handleCreateView();
                    }}
                    noValidate
                  >
                    <section className="ad-section" aria-labelledby="ad-view-name-title">
                      <h3 className="ad-section-title" id="ad-view-name-title">بيانات العرض</h3>
                      <div className="ad-field">
                        <label className="ad-label" htmlFor="ad-view-name">اسم العرض الذكي</label>
                        <input
                          id="ad-view-name"
                          className="ad-input"
                          data-autofocus
                          placeholder="مثال: عرض الخريجين والتوظيف"
                          value={viewName}
                          onChange={(event) => setViewName(event.target.value)}
                          aria-invalid={Boolean(viewFormErrors.name)}
                          aria-describedby={viewFormErrors.name ? "ad-view-name-error" : "ad-view-name-hint"}
                        />
                        {viewFormErrors.name ? (
                          <span className="ad-error" id="ad-view-name-error">
                            <AlertTriangle size={12} aria-hidden="true" />
                            {viewFormErrors.name}
                          </span>
                        ) : (
                          <span className="ad-hint" id="ad-view-name-hint">
                            يظهر الاسم في قائمة العروض وفي سجل التدقيق.
                          </span>
                        )}
                      </div>
                    </section>

                    <section className="ad-section" aria-labelledby="ad-view-scope-title">
                      <h3 className="ad-section-title" id="ad-view-scope-title">المصدر والتصنيف</h3>
                      <div className="ad-grid">
                        <div className="ad-field">
                          <label className="ad-label" htmlFor="ad-view-source">مصدر البيانات الأكاديمي</label>
                          <select
                            id="ad-view-source"
                            className="ad-select"
                            value={viewSource}
                            onChange={(event) => setViewSource(event.target.value)}
                          >
                            {AVAILABLE_SOURCES.map((source) => (
                              <option key={source} value={source}>{source}</option>
                            ))}
                          </select>
                        </div>

                        <div className="ad-field">
                          <label className="ad-label" htmlFor="ad-view-security">المستوى الأمني</label>
                          <select
                            id="ad-view-security"
                            className="ad-select"
                            value={viewSecurity}
                            onChange={(event) => setViewSecurity(event.target.value as SecurityLevel)}
                          >
                            {AVAILABLE_SECURITIES.map((security) => (
                              <option key={security} value={security}>{security}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <span className="ad-hint">المستوى الأمني يحدد من يمكنه الوصول إلى نتائج العرض.</span>
                    </section>

                    <section className="ad-section" aria-labelledby="ad-view-status-title">
                      <h3 className="ad-section-title" id="ad-view-status-title">الحالة</h3>
                      <label className="ad-switch" htmlFor="ad-view-active">
                        <input
                          id="ad-view-active"
                          type="checkbox"
                          checked={viewActive}
                          onChange={(event) => setViewActive(event.target.checked)}
                        />
                        <span className="ad-switch-track" aria-hidden="true" />
                        <span className="ad-switch-text">
                          <b>{viewActive ? "متاح للاستخدام" : "مسودة"}</b>
                          <small>العرض المتاح يظهر مباشرة في قائمة العروض النشطة.</small>
                        </span>
                      </label>
                    </section>
                  </form>

                  <div className="ad-foot">
                    <button type="button" className="ad-btn" onClick={closeModal}>إلغاء</button>
                    <button type="submit" form="ad-view-create-form" className="ad-btn is-primary">
                      حفظ العرض الذكي
                    </button>
                  </div>
                </>
              )}

              {modal === "edit-view" && selectedView && (
                <>
                  <header className="ad-head">
                    <span className="ad-badge" aria-hidden="true">
                      <Pencil size={17} />
                    </span>
                    <div>
                      <h2 id="dialog-title">تعديل العرض الذكي</h2>
                      <p>تحديث المصدر والتصنيف الأمني وحالة التفعيل للعرض المحدد.</p>
                    </div>
                  </header>

                  <form
                    id="ad-view-edit-form"
                    className="ad-body"
                    onSubmit={(event) => {
                      event.preventDefault();
                      handleUpdateView();
                    }}
                    noValidate
                  >
                    <section className="ad-section" aria-labelledby="ad-view-edit-name-title">
                      <h3 className="ad-section-title" id="ad-view-edit-name-title">بيانات العرض</h3>
                      <div className="ad-field">
                        <label className="ad-label" htmlFor="ad-view-edit-name">اسم العرض الذكي</label>
                        <input
                          id="ad-view-edit-name"
                          className="ad-input"
                          data-autofocus
                          value={viewName}
                          onChange={(event) => setViewName(event.target.value)}
                          aria-invalid={Boolean(viewFormErrors.name)}
                          aria-describedby={viewFormErrors.name ? "ad-view-edit-name-error" : undefined}
                        />
                        {viewFormErrors.name && (
                          <span className="ad-error" id="ad-view-edit-name-error">
                            <AlertTriangle size={12} aria-hidden="true" />
                            {viewFormErrors.name}
                          </span>
                        )}
                      </div>
                    </section>

                    <section className="ad-section" aria-labelledby="ad-view-edit-scope-title">
                      <h3 className="ad-section-title" id="ad-view-edit-scope-title">المصدر والتصنيف</h3>
                      <div className="ad-grid">
                        <div className="ad-field">
                          <label className="ad-label" htmlFor="ad-view-edit-source">مصدر البيانات</label>
                          <select
                            id="ad-view-edit-source"
                            className="ad-select"
                            value={viewSource}
                            onChange={(event) => setViewSource(event.target.value)}
                          >
                            {AVAILABLE_SOURCES.map((source) => (
                              <option key={source} value={source}>{source}</option>
                            ))}
                          </select>
                        </div>

                        <div className="ad-field">
                          <label className="ad-label" htmlFor="ad-view-edit-security">المستوى الأمني</label>
                          <select
                            id="ad-view-edit-security"
                            className="ad-select"
                            value={viewSecurity}
                            onChange={(event) => setViewSecurity(event.target.value as SecurityLevel)}
                          >
                            {AVAILABLE_SECURITIES.map((security) => (
                              <option key={security} value={security}>{security}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </section>

                    <section className="ad-section" aria-labelledby="ad-view-edit-status-title">
                      <h3 className="ad-section-title" id="ad-view-edit-status-title">الحالة</h3>
                      <label className="ad-switch" htmlFor="ad-view-edit-active">
                        <input
                          id="ad-view-edit-active"
                          type="checkbox"
                          checked={viewActive}
                          onChange={(event) => setViewActive(event.target.checked)}
                        />
                        <span className="ad-switch-track" aria-hidden="true" />
                        <span className="ad-switch-text">
                          <b>{viewActive ? "متاح للاستخدام" : "مسودة"}</b>
                          <small>إيقاف التفعيل يخفي العرض عن القائمة النشطة دون حذفه.</small>
                        </span>
                      </label>
                    </section>
                  </form>

                  <div className="ad-foot">
                    <button type="button" className="ad-btn" onClick={closeModal}>إلغاء</button>
                    <button type="submit" form="ad-view-edit-form" className="ad-btn is-primary">
                      حفظ التعديلات
                    </button>
                  </div>
                </>
              )}

              {modal === "delete-view" && selectedView && (
                <>
                  <header className="ad-head">
                    <span className="ad-badge" aria-hidden="true">
                      <Trash2 size={17} />
                    </span>
                    <div>
                      <h2 id="dialog-title">حذف العرض الذكي</h2>
                      <p>يُلغى ارتباط العرض بالتقارير ومصادر البيانات ويُوثَّق الحذف.</p>
                    </div>
                  </header>

                  <div className="ad-body">
                    <dl className="ad-summary">
                      <div>
                        <dt>اسم العرض</dt>
                        <dd>{selectedView.name}</dd>
                      </div>
                      <div>
                        <dt>المستوى الأمني</dt>
                        <dd>{selectedView.security}</dd>
                      </div>
                      <div>
                        <dt>مصدر البيانات</dt>
                        <dd>{selectedView.source}</dd>
                      </div>
                      <div>
                        <dt>الحالة</dt>
                        <dd>{selectedView.active ? "متاح للاستخدام" : "مسودة"}</dd>
                      </div>
                    </dl>

                    <div className="ad-note" role="note">
                      <AlertTriangle size={15} aria-hidden="true" />
                      <span>التقارير التي تعتمد على هذا العرض ستحتاج عرضًا بديلًا بعد الحذف.</span>
                    </div>
                  </div>

                  <div className="ad-foot">
                    <button type="button" className="ad-btn" onClick={closeModal}>إلغاء</button>
                    <button type="button" className="ad-btn is-danger" onClick={handleDeleteView}>
                      <Trash2 size={14} aria-hidden="true" />
                      تأكيد الحذف
                    </button>
                  </div>
                </>
              )}

              {modal === "full-log" && (
                <>
                  <header className="ad-head">
                    <span className="ad-badge" aria-hidden="true">
                      <ScrollText size={18} />
                    </span>
                    <div>
                      <h2 id="dialog-title">سجل التدقيق الكامل</h2>
                      <p>سجلات محلية توثق العمليات والمحاكاة المنفذة في هذه الجلسة.</p>
                    </div>
                  </header>

                  <div className="ad-body">
                    <div className="ad-toolbar">
                      <div className="ad-search">
                        <Search size={15} aria-hidden="true" />
                        <input
                          type="search"
                          placeholder="بحث في السجلات..."
                          value={auditSearch}
                          onChange={(event) => setAuditSearch(event.target.value)}
                          aria-label="بحث في سجلات التدقيق"
                        />
                      </div>

                      <select
                        className="ad-select is-compact"
                        value={auditStatusFilter}
                        onChange={(event) => setAuditStatusFilter(event.target.value)}
                        aria-label="تصفية حسب حالة السجل"
                      >
                        <option value="ALL">كافة الحالات</option>
                        <option value="نجاح">ناجحة</option>
                        <option value="تنبيه">تنبيهات</option>
                        <option value="فشل">فاشلة</option>
                      </select>

                      <button
                        type="button"
                        className="ad-btn"
                        onClick={() => setAuditSortOrder((current) => (current === "desc" ? "asc" : "desc"))}
                        aria-label="تبديل ترتيب السجلات"
                        title="تبديل ترتيب السجلات"
                      >
                        {auditSortOrder === "desc" ? "الأحدث أولاً" : "الأقدم أولاً"}
                      </button>
                    </div>

                    {filteredLogs.length === 0 ? (
                      <p className="ad-empty">لا توجد سجلات مطابقة للبحث.</p>
                    ) : (
                      <ol className="ad-log-list">
                        {filteredLogs.map((log, index) => (
                          <li className="ad-log" key={log.id + "-" + index}>
                            <div className="ad-log-head">
                              <span className="ad-log-actor">{log.user}</span>
                              <span
                                className={
                                  "ao-pill " +
                                  (log.status === "نجاح" ? "is-ok" : log.status === "تنبيه" ? "is-warn" : "is-danger")
                                }
                              >
                                {log.status}
                              </span>
                              <span className="ad-log-time">
                                <Clock3 size={13} aria-hidden="true" />
                                {log.time}
                              </span>
                            </div>
                            <div className="ad-log-body">{log.action}</div>
                            {log.target && <div className="ad-log-target">الهدف: {log.target}</div>}
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>

                  <div className="ad-foot">
                    <span className="ad-foot-note">{filteredLogs.length} سجل معروض</span>
                    <button type="button" className="ad-btn is-primary" onClick={closeModal}>إغلاق</button>
                  </div>
                </>
              )}

              {modal === "reset-confirm" && (
                <>
                  <header className="ad-head">
                    <span className="ad-badge" aria-hidden="true">
                      <RotateCcw size={18} />
                    </span>
                    <div>
                      <h2 id="dialog-title">استعادة البيانات الافتراضية</h2>
                      <p>تُعاد المستخدمون والعروض الذكية وسجلات التدقيق إلى حالتها الأصلية.</p>
                    </div>
                  </header>

                  <div className="ad-body">
                    <dl className="ad-summary">
                      <div>
                        <dt>المستخدمون</dt>
                        <dd>{users.length}</dd>
                      </div>
                      <div>
                        <dt>العروض الذكية</dt>
                        <dd>{views.length}</dd>
                      </div>
                      <div>
                        <dt>سجلات التدقيق</dt>
                        <dd>{logs.length}</dd>
                      </div>
                      <div>
                        <dt>مكان الحفظ</dt>
                        <dd className="is-ltr">localStorage</dd>
                      </div>
                    </dl>

                    <div className="ad-note is-info" role="note">
                      <AlertTriangle size={15} aria-hidden="true" />
                      <span>يُمسح كل تعديل محفوظ في هذا المتصفح، ولا تتأثر بيانات الخادم أو قواعد البيانات.</span>
                    </div>
                  </div>

                  <div className="ad-foot">
                    <button type="button" className="ad-btn" onClick={closeModal}>إلغاء</button>
                    <button type="button" className="ad-btn is-primary" onClick={handleResetDemoData}>
                      تأكيد الاستعادة
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
