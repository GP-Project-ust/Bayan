"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useOverlay } from "./ui/useOverlay";
import { AdminLayout } from "./layout";
import {
  Sparkles,
  UsersRound,
  Layers3,
  ScrollText,
  Activity,
  CheckCircle2,
  Plus,
  UserRound,
  Pencil,
  MoreHorizontal,
  Crown,
  Laptop,
  ShieldCheck,
  Timer,
  Zap,
  UserRoundPlus,
  Settings,
  ExternalLink,
  CalendarDays,
  RefreshCw,
  ChartNoAxesColumnIncreasing,
  X,
  Clock3,
  Search,
  Trash2,
  Copy,
  RotateCcw,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  SlidersHorizontal,
  ShieldAlert,
} from "lucide-react";
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

const STORAGE_KEYS = {
  USERS: "bayan_demo_admin_users_v2",
  VIEWS: "bayan_demo_admin_views_v2",
  LOGS: "bayan_demo_admin_logs_v2",
  ACTIVE_ROLE: "bayan_demo_active_preview_role_v2",
};

export default function AdminDashboard() {
  const [mounted, setMounted] = useState(false);

  // 1. Data Store States (Initialized from initial fixtures for SSR safety)
  const [users, setUsers] = useState<DemoUser[]>(INITIAL_DEMO_USERS);
  const [views, setViews] = useState<DemoSmartView[]>(INITIAL_DEMO_VIEWS);
  const [logs, setLogs] = useState<DemoAuditEvent[]>(INITIAL_DEMO_LOGS);
  const [activePreviewRole, setActivePreviewRole] = useState<AdminRole>("مسؤول تقنية المعلومات");

  // Load from localStorage immediately on mount
  useEffect(() => {
    setUsers(loadFromStorage<DemoUser[]>(STORAGE_KEYS.USERS, INITIAL_DEMO_USERS));
    setViews(loadFromStorage<DemoSmartView[]>(STORAGE_KEYS.VIEWS, INITIAL_DEMO_VIEWS));
    setLogs(loadFromStorage<DemoAuditEvent[]>(STORAGE_KEYS.LOGS, INITIAL_DEMO_LOGS));
    setActivePreviewRole(
      loadFromStorage<AdminRole>(STORAGE_KEYS.ACTIVE_ROLE, "مسؤول تقنية المعلومات")
    );
    setMounted(true);
  }, []);

  // Sync to localStorage on mutations only after initial client mounting
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

  // 2. Toast Notification Stack
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

  // Helper to add audit event
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

  // 3. Modals & Dialog State
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

  // Active items for editing/deletion
  const [selectedUser, setSelectedUser] = useState<DemoUser | null>(null);
  const [selectedView, setSelectedView] = useState<DemoSmartView | null>(null);

  // User form fields & validation errors
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userDepartment, setUserDepartment] = useState("");
  const [userRole, setUserRole] = useState<AdminRole>("موظف المؤسسة");
  const [userActive, setUserActive] = useState(true);
  const [userFormErrors, setUserFormErrors] = useState<{ name?: string; email?: string }>({});

  // View form fields & validation errors
  const [viewName, setViewName] = useState("");
  const [viewSource, setViewSource] = useState(AVAILABLE_SOURCES[0]);
  const [viewSecurity, setViewSecurity] = useState<SecurityLevel>("محدود");
  const [viewActive, setViewActive] = useState(true);
  const [viewFormErrors, setViewFormErrors] = useState<{ name?: string }>({});

  // 4. Search, Filter, Sort & Pagination States
  // Users table
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState<string>("ALL");
  const [userStatusFilter, setUserStatusFilter] = useState<string>("ALL");
  const [userPage, setUserPage] = useState(1);
  const USERS_PER_PAGE = 5;

  // Smart views table
  const [viewSearch, setViewSearch] = useState("");
  const [viewSecurityFilter, setViewSecurityFilter] = useState<string>("ALL");
  const [viewStatusFilter, setViewStatusFilter] = useState<string>("ALL");

  // Audit search, filter & sort
  const [auditSearch, setAuditSearch] = useState("");
  const [auditStatusFilter, setAuditStatusFilter] = useState<string>("ALL");
  const [auditSortOrder, setAuditSortOrder] = useState<"desc" | "asc">("desc");

  // 5. User Management Actions
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
        (u) =>
          u.email.toLowerCase() === userEmail.trim().toLowerCase() &&
          (!isEditing || u.id !== selectedUser?.id)
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
      prev.map((u) =>
        u.id === selectedUser.id
          ? {
              ...u,
              name: userName.trim(),
              email: userEmail.trim().toLowerCase(),
              role: userRole,
              department: userDepartment.trim() || "عام",
              active: userActive,
            }
          : u
      )
    );
    appendAuditEvent(`تحديث بيانات المستخدم (${userName.trim()})`, selectedUser.email);
    showToast("تم تحديث المستخدم بنجاح", `تم حفظ التغييرات محليًا.`);
    closeModal();
  };

  const handleDeleteUser = () => {
    if (!selectedUser) return;
    setUsers((prev) => prev.filter((u) => u.id !== selectedUser.id));
    appendAuditEvent(`حذف المستخدم (${selectedUser.name}) من النظام`, selectedUser.email, "تنبيه");
    showToast("تم حذف المستخدم", `تمت إزالة ${selectedUser.name} بنجاح.`);
    closeModal();
  };

  const cycleUserRole = (id: string) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === id) {
          const nextIndex = (AVAILABLE_ROLES.indexOf(u.role) + 1) % AVAILABLE_ROLES.length;
          const newRole = AVAILABLE_ROLES[nextIndex];
          appendAuditEvent(`تغيير دور المستخدم (${u.name}) إلى (${newRole})`, u.email);
          showToast("تم تغيير الدور", `تم تعديل دور ${u.name} إلى ${newRole}.`);
          return { ...u, role: newRole };
        }
        return u;
      })
    );
  };

  const toggleUserActive = (id: string) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === id) {
          const nextActive = !u.active;
          const statusText = nextActive ? "تنشيط" : "تعطيل";
          appendAuditEvent(`${statusText} حساب المستخدم (${u.name})`, u.email);
          showToast(`تم ${statusText} الحساب`, `حالة ${u.name}: ${nextActive ? "نشط" : "غير نشط"}.`);
          return { ...u, active: nextActive };
        }
        return u;
      })
    );
  };

  // 6. Smart View Actions
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
        (v) =>
          v.name.trim().toLowerCase() === viewName.trim().toLowerCase() &&
          (!isEditing || v.id !== selectedView?.id)
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
      prev.map((v) =>
        v.id === selectedView.id
          ? {
              ...v,
              name: viewName.trim(),
              source: viewSource,
              security: viewSecurity,
              active: viewActive,
            }
          : v
      )
    );
    appendAuditEvent(`تحديث العرض الذكي (${viewName.trim()})`);
    showToast("تم تحديث العرض الذكي", "تم حفظ إعدادات العرض بنجاح.");
    closeModal();
  };

  const handleDeleteView = () => {
    if (!selectedView) return;
    setViews((prev) => prev.filter((v) => v.id !== selectedView.id));
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
    setViews((prev) =>
      prev.map((v) => {
        if (v.id === id) {
          const nextActive = !v.active;
          appendAuditEvent(`${nextActive ? "تنشيط" : "إيقاف"} العرض الذكي (${v.name})`);
          showToast("تم تغيير حالة العرض", `العرض ${v.name}: ${nextActive ? "نشط" : "متوقف"}.`);
          return { ...v, active: nextActive };
        }
        return v;
      })
    );
  };

  // 7. Reset Demonstration Data
  const handleResetDemoData = () => {
    resetDemoStorage();
    setUsers(INITIAL_DEMO_USERS);
    setViews(INITIAL_DEMO_VIEWS);
    setLogs(INITIAL_DEMO_LOGS);
    setActivePreviewRole("مسؤول تقنية المعلومات");
    showToast("تمت استعادة البيانات الافتراضية", "تمت إعادة ضبط المستودع التجريبي إلى حالته الأولى.");
    closeModal();
  };

  // 8. Filtered and Paginated Users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchSearch =
        !userSearch.trim() ||
        u.name.toLowerCase().includes(userSearch.trim().toLowerCase()) ||
        u.email.toLowerCase().includes(userSearch.trim().toLowerCase());
      const matchRole = userRoleFilter === "ALL" || u.role === userRoleFilter;
      const matchStatus =
        userStatusFilter === "ALL" ||
        (userStatusFilter === "ACTIVE" && u.active) ||
        (userStatusFilter === "INACTIVE" && !u.active);
      return matchSearch && matchRole && matchStatus;
    });
  }, [users, userSearch, userRoleFilter, userStatusFilter]);

  const totalUserPages = Math.ceil(filteredUsers.length / USERS_PER_PAGE) || 1;
  const paginatedUsers = useMemo(() => {
    const start = (userPage - 1) * USERS_PER_PAGE;
    return filteredUsers.slice(start, start + USERS_PER_PAGE);
  }, [filteredUsers, userPage]);

  // Reset page when filters change
  useEffect(() => {
    setUserPage(1);
  }, [userSearch, userRoleFilter, userStatusFilter]);

  // 9. Filtered Smart Views
  const filteredViews = useMemo(() => {
    return views.filter((v) => {
      const matchSearch =
        !viewSearch.trim() ||
        v.name.toLowerCase().includes(viewSearch.trim().toLowerCase()) ||
        v.source.toLowerCase().includes(viewSearch.trim().toLowerCase());
      const matchSec = viewSecurityFilter === "ALL" || v.security === viewSecurityFilter;
      const matchStatus =
        viewStatusFilter === "ALL" ||
        (viewStatusFilter === "ACTIVE" && v.active) ||
        (viewStatusFilter === "INACTIVE" && !v.active);
      return matchSearch && matchSec && matchStatus;
    });
  }, [views, viewSearch, viewSecurityFilter, viewStatusFilter]);

  // 10. Filtered Audit Logs
  const filteredLogs = useMemo(() => {
    let result = logs;
    if (auditSearch.trim()) {
      const query = auditSearch.trim().toLowerCase();
      result = result.filter(
        (l) =>
          l.user.toLowerCase().includes(query) ||
          l.action.toLowerCase().includes(query) ||
          (l.target && l.target.toLowerCase().includes(query))
      );
    }
    if (auditStatusFilter !== "ALL") {
      result = result.filter((l) => l.status === auditStatusFilter);
    }
    if (auditSortOrder === "asc") {
      return [...result].reverse();
    }
    return result;
  }, [logs, auditSearch, auditStatusFilter, auditSortOrder]);

  // Check whether current demo role has edit permission
  const canEdit = activePreviewRole === "مسؤول تقنية المعلومات";

  return (
    <AdminLayout>
      <div className="admin-main admin-readex admin-alexandria">
        {/* Floating Toast Notification Stack */}
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

        {/* Executive Hero Banner */}
        <header className="admin-hero">
          <img
            className="admin-campus-top"
            src="/assets/campus-admin-top.png"
            alt="صرح الجامعة"
          />
          <div className="admin-heading">
            <h1>
              <Sparkles size={30} /> لوحة <em>الإدارة المركزية</em>
            </h1>
            <p>
              إدارة مستخدمي المؤسسة وتعيين الأدوار وصلاحيات الوصول، وبناء العروض الذكية، ومراجعة سجل
              التدقيق، ومراقبة حالة البنية التحتية.
            </p>
          </div>
          <div className="admin-hero-actions">
            <button
              type="button"
              className="reset-demo-button"
              title="إعادة ضبط كافة البيانات التجريبية إلى حالتها الأصلية"
              onClick={() => setModal("reset-confirm")}
            >
              <RotateCcw size={16} /> استعادة الافتراضي
            </button>
          </div>
        </header>

        {/* Role Demonstration Simulator Bar */}
        <nav className="role-preview-bar" aria-label="محاكاة أدوار النظام">
          <div className="role-preview-label">
            <SlidersHorizontal size={17} />
            <span>محاكاة صلاحيات العرض (تجريبية):</span>
          </div>
          <div className="role-preview-pills" role="radiogroup" aria-label="أدوار النظام">
            {AVAILABLE_ROLES.map((role) => (
              <button
                type="button"
                key={role}
                role="radio"
                aria-checked={activePreviewRole === role}
                className={`role-preview-pill ${activePreviewRole === role ? "active" : ""}`}
                onClick={() => {
                  setActivePreviewRole(role);
                  showToast(
                    "تم تغيير وضع المعاينة",
                    `تستعرض الآن الواجهة بصلاحيات "${role}".`,
                    "info"
                  );
                }}
              >
                {role === "مدير المؤسسة" ? (
                  <Crown size={15} />
                ) : role === "مسؤول تقنية المعلومات" ? (
                  <Laptop size={15} />
                ) : role === "مسؤول المنصة" ? (
                  <ShieldCheck size={15} />
                ) : (
                  <UserRound size={15} />
                )}
                {role}
              </button>
            ))}
          </div>
        </nav>

        {!canEdit && (
          <div className="role-restriction-banner" role="status">
            <ShieldAlert size={20} />
            <span>
              <strong>وضع المعاينة المقيدة ({activePreviewRole}):</strong> هذا الدور يمتلك صلاحيات
              استعراض فقط وفقًا لمصفوفة RBAC. تم تعطيل عمليات الإضافة والتعديل والحذف تجريبيًا.
              للتبديل إلى الصلاحيات الكاملة اختر <strong>"مسؤول تقنية المعلومات"</strong> أعلاه.
            </span>
          </div>
        )}

        {/* 4-Column KPI Metrics Grid */}
        <div className="stats-grid">
          <div className="stat-card">
            <UsersRound size={32} />
            <div>
              إجمالي المستخدمين
              <strong>
                {120 + users.length}
                <small>{users.filter((u) => u.active).length} نشط</small>
              </strong>
            </div>
          </div>
          <div className="stat-card">
            <Layers3 size={32} />
            <div>
              العروض الذكية النشطة
              <strong>
                {views.filter((v) => v.active).length}
                <small>من أصل {views.length}</small>
              </strong>
            </div>
          </div>
          <div className="stat-card">
            <ScrollText size={32} />
            <div>
              أحداث التدقيق المسجلة
              <strong>
                {logs.length}
                <small>سجل محلي</small>
              </strong>
            </div>
          </div>
          <div className="stat-card system-status-stat">
            <Activity size={32} />
            <div>
              حالة النظام (محاكاة)
              <strong className="status-kpi-text">
                <CheckCircle2 size={17} /> يعمل بشكل طبيعي
              </strong>
            </div>
          </div>
        </div>

        {/* Asymmetric Columns: Main Content + Sticky Aside Widgets */}
        <div className="admin-columns">
          <main className="admin-primary">
            {/* 1. USERS & ROLES PANEL */}
            <section id="users" className="admin-panel users-panel" aria-labelledby="users-heading">
              <div className="panel-heading">
                <div>
                  <h2 id="users-heading">
                    <UsersRound size={26} /> إدارة المستخدمين والأدوار
                  </h2>
                  <p>
                    إدارة حسابات المستخدمين، التحقق من هوياتهم، وتحديد الأدوار وصلاحيات الوصول (RBAC).
                  </p>
                </div>
                {canEdit && (
                  <button
                    type="button"
                    className="action-primary"
                    onClick={openAddUserModal}
                    title="إضافة مستخدم جديد إلى قاعدة البيانات المحلية"
                  >
                    <Plus size={20} /> إضافة مستخدم
                  </button>
                )}
              </div>

              {/* Toolbar: Search & Filters */}
              <div className="table-toolbar">
                <div className="search-field">
                  <Search size={16} />
                  <input
                    type="search"
                    placeholder="بحث بالاسم أو البريد..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    aria-label="البحث عن مستخدم"
                  />
                  {userSearch && (
                    <button
                      type="button"
                      className="clear-search"
                      aria-label="مسح نص البحث"
                      onClick={() => setUserSearch("")}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                <div className="filter-group">
                  <select
                    value={userRoleFilter}
                    onChange={(e) => setUserRoleFilter(e.target.value)}
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
                    value={userStatusFilter}
                    onChange={(e) => setUserStatusFilter(e.target.value)}
                    aria-label="تصفية حسب الحالة"
                  >
                    <option value="ALL">كافة الحالات</option>
                    <option value="ACTIVE">النشطون فقط</option>
                    <option value="INACTIVE">غير النشطين</option>
                  </select>
                </div>
              </div>

              {/* Data Table */}
              <div
                className="table-scroller"
                role="region"
                aria-label="جدول المستخدمين والأدوار"
                tabIndex={0}
              >
                <table className="data-table users-table">
                  <caption className="bayan-sr-only">جدول المستخدمين والأدوار</caption>
                  <thead>
                    <tr>
                      <th scope="col">الاسم</th>
                      <th scope="col">البريد الإلكتروني</th>
                      <th scope="col">القسم</th>
                      <th scope="col">الدور</th>
                      <th scope="col">الحالة</th>
                      <th scope="col">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="empty-table-cell">
                          <div className="empty-state">
                            <UsersRound size={36} />
                            <p>لا يوجد مستخدمون مطابقون لمعايير البحث الحالية.</p>
                            {(userSearch || userRoleFilter !== "ALL" || userStatusFilter !== "ALL") && (
                              <button
                                type="button"
                                className="outline-button"
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
                      paginatedUsers.map((u) => (
                        <tr key={u.id}>
                          <td>
                            <span className="person-name">
                              <span className="tiny-person" aria-hidden="true">
                                <UserRound size={16} />
                              </span>
                              <b title={u.name}>{u.name}</b>
                            </span>
                          </td>
                          <td dir="ltr" className="email-td" title={u.email}>
                            {u.email}
                          </td>
                          <td>
                            <span className="dept-tag" title={u.department || "عام"}>{u.department || "عام"}</span>
                          </td>
                          <td>
                            <span
                              className={`role-pill role-${AVAILABLE_ROLES.indexOf(u.role)}`}
                            >
                              {u.role === "مدير المؤسسة" ? (
                                <Crown size={15} />
                              ) : u.role === "موظف المؤسسة" ? (
                                <UserRound size={15} />
                              ) : u.role === "مسؤول تقنية المعلومات" ? (
                                <Laptop size={15} />
                              ) : (
                                <ShieldCheck size={15} />
                              )}
                              {u.role}
                            </span>
                          </td>
                          <td>
                            <span className={`state-pill ${u.active ? "success" : "warning"}`}>
                              {u.active ? <CheckCircle2 size={15} /> : <Clock3 size={15} />}
                              {u.active ? "نشط" : "غير نشط"}
                            </span>
                          </td>
                          <td>
                            <div className="table-actions">
                              {canEdit ? (
                                <>
                                  <button
                                    type="button"
                                    className="compact-action-btn"
                                    title="تعديل بيانات المستخدم"
                                    aria-label="تعديل بيانات المستخدم"
                                    onClick={() => openEditUserModal(u)}
                                  >
                                    <Pencil size={13} />
                                    <span className="btn-label">تعديل</span>
                                  </button>
                                  <button
                                    type="button"
                                    className="compact-action-btn"
                                    title="تبديل الدور تلقائيًا"
                                    aria-label="تبديل الدور تلقائيًا"
                                    onClick={() => cycleUserRole(u.id)}
                                  >
                                    <RefreshCw size={13} />
                                    <span className="btn-label">الدور</span>
                                  </button>
                                  <button
                                    type="button"
                                    className="icon-action"
                                    title={u.active ? "تعطيل الحساب" : "تنشيط الحساب"}
                                    aria-label={u.active ? "تعطيل الحساب" : "تنشيط الحساب"}
                                    onClick={() => toggleUserActive(u.id)}
                                  >
                                    {u.active ? <Clock3 size={14} /> : <CheckCircle2 size={14} />}
                                  </button>
                                  <button
                                    type="button"
                                    className="icon-action delete-action"
                                    title="حذف المستخدم"
                                    aria-label="حذف المستخدم"
                                    onClick={() => openDeleteUserModal(u)}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </>
                              ) : (
                                <span className="read-only-badge">للعرض فقط</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Bar */}
              {totalUserPages > 1 && (
                <div className="pagination-bar">
                  <span>
                    صفحة {userPage} من {totalUserPages} ({filteredUsers.length} مستخدم)
                  </span>
                  <div className="pagination-controls">
                    <button
                      type="button"
                      disabled={userPage <= 1}
                      onClick={() => setUserPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronRight size={16} /> السابق
                    </button>
                    {Array.from({ length: totalUserPages }, (_, i) => i + 1).map((num) => (
                      <button
                        type="button"
                        key={num}
                        className={userPage === num ? "active-page" : ""}
                        onClick={() => setUserPage(num)}
                      >
                        {num}
                      </button>
                    ))}
                    <button
                      type="button"
                      disabled={userPage >= totalUserPages}
                      onClick={() => setUserPage((p) => Math.min(totalUserPages, p + 1))}
                    >
                      التالي <ChevronLeft size={16} />
                    </button>
                  </div>
                </div>
              )}
            </section>

            {/* 2. AUDIT TRAIL PANEL */}
            <section id="audit" className="admin-panel audit-panel" aria-labelledby="audit-heading">
              <div className="panel-heading">
                <div>
                  <h2 id="audit-heading">
                    <ScrollText size={25} /> سجل التدقيق والأنشطة
                  </h2>
                  <p>
                    تسجيل تلقائي وتوثيق لكافة العمليات المهمة وتعديل الصلاحيات والحسابات والعروض
                    الذكية.
                  </p>
                </div>
                <button
                  type="button"
                  className="outline-button"
                  onClick={() => setModal("full-log")}
                >
                  <ExternalLink size={16} /> السجل الكامل ({logs.length})
                </button>
              </div>

              <div
                className="table-scroller"
                role="region"
                aria-label="جدول سجل التدقيق"
                tabIndex={0}
              >
                <table className="data-table audit-table">
                  <caption className="bayan-sr-only">جدول سجل التدقيق</caption>
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
                    {logs.slice(0, 5).map((log, idx) => (
                      <tr key={`${log.id}-${idx}`}>
                        <td>
                          <span className="time-cell">
                            <CalendarDays size={15} />
                            {log.time}
                          </span>
                        </td>
                        <td>
                          <b>{log.user}</b>
                        </td>
                        <td>{log.action}</td>
                        <td>
                          <span className="target-tag">{log.target || "عام"}</span>
                        </td>
                        <td>
                          <span className={`state-pill ${log.status === "نجاح" ? "success" : "warning"}`}>
                            <CheckCircle2 size={14} />
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* 3. SMART VIEWS PANEL */}
            <section
              id="smart-views"
              className="admin-panel smart-panel"
              aria-labelledby="smart-heading"
            >
              <div className="panel-heading">
                <div>
                  <h2 id="smart-heading">
                    <Layers3 size={26} /> إدارة العروض الذكية
                  </h2>
                  <p>
                    بناء وتحديث العروض الذكية المعززة بنماذج الذكاء الاصطناعي لحوكمة وتسهيل الوصول
                    للبيانات.
                  </p>
                </div>
                {canEdit && (
                  <button
                    type="button"
                    className="action-primary"
                    onClick={openAddViewModal}
                    title="إنشاء عرض ذكي جديد"
                  >
                    <Plus size={20} /> إنشاء عرض ذكي
                  </button>
                )}
              </div>

              {/* Smart Views Toolbar */}
              <div className="table-toolbar">
                <div className="search-field">
                  <Search size={16} />
                  <input
                    type="search"
                    placeholder="بحث باسم العرض أو المصدر..."
                    value={viewSearch}
                    onChange={(e) => setViewSearch(e.target.value)}
                    aria-label="البحث عن عرض ذكي"
                  />
                  {viewSearch && (
                    <button
                      type="button"
                      className="clear-search"
                      aria-label="مسح نص البحث"
                      onClick={() => setViewSearch("")}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                <div className="filter-group">
                  <select
                    value={viewSecurityFilter}
                    onChange={(e) => setViewSecurityFilter(e.target.value)}
                    aria-label="تصفية حسب التصنيف الأمني"
                  >
                    <option value="ALL">كافة التصنيفات</option>
                    {AVAILABLE_SECURITIES.map((sec) => (
                      <option key={sec} value={sec}>
                        {sec}
                      </option>
                    ))}
                  </select>
                  <select
                    value={viewStatusFilter}
                    onChange={(e) => setViewStatusFilter(e.target.value)}
                    aria-label="تصفية حسب الحالة"
                  >
                    <option value="ALL">كافة الحالات</option>
                    <option value="ACTIVE">النشطة فقط</option>
                    <option value="INACTIVE">المتوقفة</option>
                  </select>
                </div>
              </div>

              <div
                className="table-scroller"
                role="region"
                aria-label="جدول العروض الذكية"
                tabIndex={0}
              >
                <table className="data-table smart-table">
                  <caption className="bayan-sr-only">جدول العروض الذكية</caption>
                  <thead>
                    <tr>
                      <th scope="col">اسم العرض</th>
                      <th scope="col">المصدر الأكاديمي</th>
                      <th scope="col">المستوى الأمني</th>
                      <th scope="col">الحالة</th>
                      <th scope="col">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredViews.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="empty-table-cell">
                          <div className="empty-state">
                            <Layers3 size={36} />
                            <p>لا توجد عروض ذكية مطابقة لمعايير البحث الحالية.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredViews.map((view, i) => (
                        <tr key={view.id}>
                          <td>
                            <b className="smart-name">
                              {i % 3 === 0 ? (
                                <UsersRound size={17} />
                              ) : i % 3 === 1 ? (
                                <CalendarDays size={17} />
                              ) : (
                                <ChartNoAxesColumnIncreasing size={17} />
                              )}
                              {view.name}
                            </b>
                          </td>
                          <td>{view.source}</td>
                          <td>
                            <span
                              className={`security-pill security-${AVAILABLE_SECURITIES.indexOf(view.security)}`}
                            >
                              <ShieldCheck size={14} />
                              {view.security}
                            </span>
                          </td>
                          <td>
                            <span className={`state-pill ${view.active ? "success" : "warning"}`}>
                              <CheckCircle2 size={14} />
                              {view.active ? "نشط" : "متوقف"}
                            </span>
                          </td>
                          <td>
                            <div className="table-actions">
                              {canEdit ? (
                                <>
                                  <button
                                    type="button"
                                    className="compact-action-btn"
                                    title="تعديل العرض الذكي"
                                    aria-label="تعديل العرض الذكي"
                                    onClick={() => openEditViewModal(view)}
                                  >
                                    <Pencil size={13} />
                                    <span className="btn-label">تعديل</span>
                                  </button>
                                  <button
                                    type="button"
                                    className="compact-action-btn"
                                    title={view.active ? "إيقاف العرض" : "تنشيط العرض"}
                                    aria-label={view.active ? "إيقاف العرض" : "تنشيط العرض"}
                                    onClick={() => toggleViewActive(view.id)}
                                  >
                                    <RefreshCw size={13} />
                                    <span className="btn-label">الحالة</span>
                                  </button>
                                  <button
                                    type="button"
                                    className="icon-action"
                                    title="نسخ العرض الذكي"
                                    aria-label="نسخ العرض الذكي"
                                    onClick={() => duplicateView(view)}
                                  >
                                    <Copy size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    className="icon-action delete-action"
                                    title="حذف العرض الذكي"
                                    aria-label="حذف العرض الذكي"
                                    onClick={() => openDeleteViewModal(view)}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </>
                              ) : (
                                <span className="read-only-badge">للعرض فقط</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </main>

          {/* Sticky Aside Widgets Column */}
          <aside className="admin-widgets" id="settings">
            {/* Health Telemetry Widget with Explicit Demo Badge */}
            <div className="status-widget">
              <h2>
                <Activity size={24} /> حالة النظام
              </h2>
              <div className="health-list">
                {[
                  { name: "الخدمات الأساسية", desc: "FastAPI / Uvicorn (محاكاة)" },
                  { name: "قاعدة البيانات", desc: "PostgreSQL 16 (محاكاة)" },
                  { name: "محرك الاستعلامات", desc: "LangGraph Agent (محاكاة)" },
                  { name: "خدمة العروض الذكية", desc: "Qdrant Vector DB (محاكاة)" },
                ].map((item) => (
                  <div key={item.name}>
                    <div>
                      <span>{item.name}</span>
                      <small className="service-desc">{item.desc}</small>
                    </div>
                    <CheckCircle2 size={19} />
                  </div>
                ))}
              </div>
              <div className="response-time">
                <Timer size={24} />
                <span>
                  زمن الاستجابة التقديري (محاكاة)
                  <strong>320 مللي ثانية</strong>
                </span>
              </div>
            </div>

            {/* Quick Actions Shortcuts */}
            <div className="quick-widget">
              <h2>
                <Zap size={24} /> إجراءات سريعة
              </h2>
              <button
                type="button"
                onClick={openAddUserModal}
                disabled={!canEdit}
                title={!canEdit ? "غير مصرح بهذا الإجراء لدور المعاينة الحالي" : undefined}
              >
                <span>
                  <UserRoundPlus size={19} /> إضافة مستخدم جديد
                </span>
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={openAddViewModal}
                disabled={!canEdit}
                title={!canEdit ? "غير مصرح بهذا الإجراء لدور المعاينة الحالي" : undefined}
              >
                <span>
                  <Layers3 size={19} /> إنشاء عرض ذكي
                </span>
                <ChevronLeft size={16} />
              </button>
              <button type="button" onClick={() => setModal("full-log")}>
                <span>
                  <ScrollText size={19} /> مراجعة سجل التدقيق
                </span>
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={() => setModal("reset-confirm")}
              >
                <span>
                  <RotateCcw size={19} /> إعادة ضبط البيانات التجريبية
                </span>
                <ChevronLeft size={16} />
              </button>
              <img
                className="admin-campus-bottom"
                src="/assets/campus-admin-bottom.png"
                alt="زخرفة الجامعة"
              />
            </div>
          </aside>
        </div>
      </div>

      {/* =========================================================================
          MODALS & ACCESSIBLE DIALOGS
          ========================================================================= */}
      {Boolean(modal) && (
        <div
          className="dialog-overlay"
          onMouseDown={(e) => {
            if (e.currentTarget === e.target) closeModal();
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

            {/* MODAL 1: ADD USER */}
            {modal === "add-user" && (
              <>
                <h2 id="dialog-title">إضافة مستخدم جديد</h2>
                <p>بيانات تجريبية تُحفظ محليًا في متصفحك وتنعكس فورًا على الجداول والإحصاءات.</p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleCreateUser();
                  }}
                  noValidate
                >
                  <label>
                    الاسم الكامل:
                    <input
                      placeholder="مثال: د. فهد الغامدي"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      autoFocus
                    />
                    {userFormErrors.name && (
                      <span className="field-error">{userFormErrors.name}</span>
                    )}
                  </label>
                  <label>
                    البريد الإلكتروني الجامعي:
                    <input
                      type="email"
                      dir="ltr"
                      placeholder="name@univ.edu.sa"
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
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
                      onChange={(e) => setUserDepartment(e.target.value)}
                    />
                  </label>
                  <label>
                    الدور والصلاحيات:
                    <select
                      value={userRole}
                      onChange={(e) => setUserRole(e.target.value as AdminRole)}
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
                        onChange={(e) => setUserActive(e.target.checked)}
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

            {/* MODAL 2: EDIT USER */}
            {modal === "edit-user" && selectedUser && (
              <>
                <h2 id="dialog-title">تعديل بيانات المستخدم</h2>
                <p>تعديل الحساب المحدد وتحديث الدور وصلاحيات الوصول محليًا.</p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleUpdateUser();
                  }}
                  noValidate
                >
                  <label>
                    الاسم الكامل:
                    <input
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      autoFocus
                    />
                    {userFormErrors.name && (
                      <span className="field-error">{userFormErrors.name}</span>
                    )}
                  </label>
                  <label>
                    البريد الإلكتروني:
                    <input
                      type="email"
                      dir="ltr"
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
                    />
                    {userFormErrors.email && (
                      <span className="field-error">{userFormErrors.email}</span>
                    )}
                  </label>
                  <label>
                    القسم / الإدارة:
                    <input
                      value={userDepartment}
                      onChange={(e) => setUserDepartment(e.target.value)}
                    />
                  </label>
                  <label>
                    الدور:
                    <select
                      value={userRole}
                      onChange={(e) => setUserRole(e.target.value as AdminRole)}
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
                        onChange={(e) => setUserActive(e.target.checked)}
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

            {/* MODAL 3: DELETE USER CONFIRMATION */}
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
                  <button
                    type="button"
                    className="action-danger"
                    onClick={handleDeleteUser}
                  >
                    تأكيد الحذف
                  </button>
                </div>
              </div>
            )}

            {/* MODAL 4: ADD SMART VIEW */}
            {modal === "add-view" && (
              <>
                <h2 id="dialog-title">إنشاء عرض ذكي جديد</h2>
                <p>إنشاء نموذج توضيحي لعرض بيانات منظم وآمن مع تصنيف أمني محدد.</p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleCreateView();
                  }}
                  noValidate
                >
                  <label>
                    اسم العرض الذكي:
                    <input
                      placeholder="مثال: عرض الخريجين والتوظيف"
                      value={viewName}
                      onChange={(e) => setViewName(e.target.value)}
                      autoFocus
                    />
                    {viewFormErrors.name && (
                      <span className="field-error">{viewFormErrors.name}</span>
                    )}
                  </label>
                  <label>
                    مصدر البيانات الأكاديمي:
                    <select
                      value={viewSource}
                      onChange={(e) => setViewSource(e.target.value)}
                    >
                      {AVAILABLE_SOURCES.map((src) => (
                        <option key={src} value={src}>
                          {src}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    المستوى الأمني وحساسية البيانات:
                    <select
                      value={viewSecurity}
                      onChange={(e) => setViewSecurity(e.target.value as SecurityLevel)}
                    >
                      {AVAILABLE_SECURITIES.map((sec) => (
                        <option key={sec} value={sec}>
                          {sec}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="checkbox-field">
                    <label>
                      <input
                        type="checkbox"
                        checked={viewActive}
                        onChange={(e) => setViewActive(e.target.checked)}
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

            {/* MODAL 5: EDIT SMART VIEW */}
            {modal === "edit-view" && selectedView && (
              <>
                <h2 id="dialog-title">تعديل العرض الذكي</h2>
                <p>تعديل إعدادات المصدر والتصنيف الأمني وحالة التفعيل للعرض المحدد.</p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleUpdateView();
                  }}
                  noValidate
                >
                  <label>
                    اسم العرض الذكي:
                    <input
                      value={viewName}
                      onChange={(e) => setViewName(e.target.value)}
                      autoFocus
                    />
                    {viewFormErrors.name && (
                      <span className="field-error">{viewFormErrors.name}</span>
                    )}
                  </label>
                  <label>
                    مصدر البيانات:
                    <select
                      value={viewSource}
                      onChange={(e) => setViewSource(e.target.value)}
                    >
                      {AVAILABLE_SOURCES.map((src) => (
                        <option key={src} value={src}>
                          {src}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    المستوى الأمني:
                    <select
                      value={viewSecurity}
                      onChange={(e) => setViewSecurity(e.target.value as SecurityLevel)}
                    >
                      {AVAILABLE_SECURITIES.map((sec) => (
                        <option key={sec} value={sec}>
                          {sec}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="checkbox-field">
                    <label>
                      <input
                        type="checkbox"
                        checked={viewActive}
                        onChange={(e) => setViewActive(e.target.checked)}
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

            {/* MODAL 6: DELETE SMART VIEW CONFIRMATION */}
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
                  <button
                    type="button"
                    className="action-danger"
                    onClick={handleDeleteView}
                  >
                    تأكيد الحذف
                  </button>
                </div>
              </div>
            )}

            {/* MODAL 7: FULL AUDIT TRAIL */}
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
                      onChange={(e) => setAuditSearch(e.target.value)}
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
                      onChange={(e) => setAuditStatusFilter(e.target.value)}
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
                        setAuditSortOrder((prev) => (prev === "desc" ? "asc" : "desc"))
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
                    filteredLogs.map((log, idx) => (
                      <div className="dialog-log" key={`${log.id}-${idx}`}>
                        <div className="log-header">
                          <span className="log-time">
                            <Clock3 size={13} /> {log.time}
                          </span>
                          <span
                            className={`state-pill ${log.status === "نجاح" ? "success" : "warning"}`}
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

            {/* MODAL 8: RESET DEMO DATA CONFIRMATION */}
            {modal === "reset-confirm" && (
              <div className="confirm-dialog-content">
                <div className="confirm-icon info">
                  <RotateCcw size={32} />
                </div>
                <h2 id="dialog-title">استعادة البيانات الافتراضية</h2>
                <p>
                  هل ترغب في إعادة تعيين كافة بيانات المستخدمين والعروض الذكية وسجلات التدقيق إلى حالتها
                  الأصلية؟ سيتم مسح التغييرات المحفوظة محليًا في المتصفح.
                </p>
                <div className="dialog-actions">
                  <button type="button" className="outline-button" onClick={closeModal}>
                    إلغاء
                  </button>
                  <button
                    type="button"
                    className="action-primary"
                    onClick={handleResetDemoData}
                  >
                    تأكيد الاستعادة
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
