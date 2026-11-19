"use client";

import { useState, useMemo, type FormEvent } from "react";
import {
  Check,
  X,
  Star,
  Ban,
  Search,
  Filter,
  RotateCcw,
  Shield,
  Info,
  UserCheck,
  AlertCircle
} from "lucide-react";
import {
  capabilities,
  capabilityLabels,
  roleIds,
  roleMeta,
  type Capability,
  type RoleId
} from "@/lib/access/policy";
import {
  getCustomRoles,
  getUserOverrides,
  setUserPermissionOverride,
  removeUserPermissionOverride,
  resolveEffectivePermission,
  ORGANIZATION_PERMISSION_GROUPS,
  PLATFORM_PERMISSION_GROUPS,
  type PermissionResolution,
  type UserPermissionOverride
} from "@/lib/access/enterprise-rbac";
import { useDemoAccess } from "./DemoAccess";
import { Button, Dialog, Badge, Toast } from "@/components/ui";
import { DEMO_USERS } from "@/lib/user-management/users";
import "./permission-matrix.css";

interface PermissionMatrixProps {
  userId?: string;
  scope?: "all" | "organization" | "platform";
  interactive?: boolean;
  title?: string;
}

export function PermissionMatrix({
  userId: initialUserId,
  scope: initialScope = "all",
  interactive = true,
  title
}: PermissionMatrixProps) {
  const { role: actorRole } = useDemoAccess();
  const [selectedUserId, setSelectedUserId] = useState<string>(initialUserId || "USR-004");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"user" | "roles">(initialUserId ? "user" : "roles");

  // Dialog State for Overrides
  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [activeCapability, setActiveCapability] = useState<Capability>("reports.export");
  const [effectChoice, setEffectChoice] = useState<"ALLOW" | "DENY">("ALLOW");
  const [overrideReason, setOverrideReason] = useState("");
  const [overrideError, setOverrideError] = useState<string | null>(null);

  // Notification state
  const [toast, setToast] = useState<{
    title: string;
    message: string;
    tone: "success" | "warning" | "danger" | "info";
  } | null>(null);

  const currentUser = useMemo(() => {
    return DEMO_USERS.find((u) => u.id === selectedUserId) || DEMO_USERS[0];
  }, [selectedUserId]);

  const customRoles = getCustomRoles();
  const userOverrides = getUserOverrides();

  // Combine groups according to scope
  const groups = useMemo(() => {
    let combined = [...ORGANIZATION_PERMISSION_GROUPS, ...PLATFORM_PERMISSION_GROUPS];
    if (initialScope === "organization") {
      combined = ORGANIZATION_PERMISSION_GROUPS;
    } else if (initialScope === "platform") {
      combined = PLATFORM_PERMISSION_GROUPS;
    }
    return combined;
  }, [initialScope]);

  // Filter capabilities based on search & category
  const filteredGroups = useMemo(() => {
    return groups
      .filter((g) => categoryFilter === "all" || g.id === categoryFilter)
      .map((g) => ({
        ...g,
        capabilities: g.capabilities.filter((cap) => {
          const label = capabilityLabels[cap] || "";
          const term = search.trim().toLowerCase();
          return !term || label.toLowerCase().includes(term) || cap.toLowerCase().includes(term);
        })
      }))
      .filter((g) => g.capabilities.length > 0);
  }, [groups, categoryFilter, search]);

  const handleOpenOverrideModal = (cap: Capability, defaultEffect: "ALLOW" | "DENY" = "ALLOW") => {
    if (!interactive) return;
    setActiveCapability(cap);
    setEffectChoice(defaultEffect);
    // Find existing override if any
    const existing = userOverrides.find(
      (o) => o.userId === currentUser.id && o.capability === cap
    );
    setOverrideReason(existing?.reason || "");
    setOverrideError(null);
    setOverrideModalOpen(true);
  };

  const handleSaveOverride = (e: FormEvent) => {
    e.preventDefault();
    if (!overrideReason.trim() || overrideReason.trim().length < 5) {
      setOverrideError("يرجى كتابة سبب إداري مبرر (5 أحرف على الأقل).");
      return;
    }

    const res = setUserPermissionOverride(
      {
        userId: currentUser.id,
        tenantId: "demo-institution",
        capability: activeCapability,
        effect: effectChoice,
        reason: overrideReason.trim(),
        grantedBy: "USR-003",
        grantedByName: "م. أحمد الشامي (مسؤول تقنية المعلومات)"
      },
      { id: "USR-003", name: "م. أحمد الشامي", role: actorRole }
    );

    if (res.ok) {
      setToast({
        title: "تم حفظ الاستثناء الفردي",
        message: `تم تطبيق ${effectChoice === "ALLOW" ? "المنح الصريح" : "الحجب الصريح"} للصلاحية «${capabilityLabels[activeCapability]}».`,
        tone: "success"
      });
      setOverrideModalOpen(false);
    } else {
      setOverrideError(res.error || "تعذر حفظ الاستثناء.");
    }
  };

  const handleRemoveOverride = (overrideId: string, cap: Capability) => {
    const res = removeUserPermissionOverride(overrideId, {
      id: "USR-003",
      name: "م. أحمد الشامي",
      role: actorRole
    });
    if (res.ok) {
      setToast({
        title: "تم إلغاء الاستثناء الفردي",
        message: `عادت الصلاحية «${capabilityLabels[cap]}» إلى التوريث الطبيعي للأدوار المسندة.`,
        tone: "info"
      });
    }
  };

  return (
    <div className="bpm-wrap" dir="rtl">
      {title && <h3 style={{ margin: "0 0 1rem 0", fontSize: "1.1rem", fontWeight: 800 }}>{title}</h3>}
      {/* Header Controls */}
      <div className="bpm-header">
        <div className="bpm-controls">
          <div className="bpm-search">
            <Search size={16} />
            <input
              type="text"
              placeholder="البحث باسم الصلاحية..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="البحث في الصلاحيات"
            />
          </div>

          <select
            className="bpm-select"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            aria-label="تصفية حسب المجموعة"
          >
            <option value="all">جميع مجموعات الصلاحيات</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.titleAr}
              </option>
            ))}
          </select>

          <div className="bpm-mode-toggle" style={{ display: "inline-flex", gap: "0.25rem" }}>
            <Button
              size="sm"
              variant={viewMode === "user" ? "primary" : "outline"}
              onClick={() => setViewMode("user")}
            >
              عرض حسب المستخدم
            </Button>
            <Button
              size="sm"
              variant={viewMode === "roles" ? "primary" : "outline"}
              onClick={() => setViewMode("roles")}
            >
              عرض مقارنة الأدوار
            </Button>
          </div>
        </div>

        {viewMode === "user" && (
          <div className="bpm-user-picker" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.85rem", color: "var(--bayan-text-muted)" }}>
              المستخدم المختار:
            </span>
            <select
              className="bpm-select"
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              aria-label="اختيار المستخدم للمصفوفة"
            >
              {DEMO_USERS.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({roleMeta[u.role].label} - {u.department})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Visual Legend */}
      <div className="bpm-legend">
        <span style={{ fontWeight: "bold", color: "#fff" }}>دليل الحالات:</span>
        <div className="bpm-legend-item">
          <span className="bpm-chip inherited-allow">✓</span>
          <span>موروث - مسموح (Inherited ALLOW)</span>
        </div>
        <div className="bpm-legend-item">
          <span className="bpm-chip inherited-deny">✕</span>
          <span>موروث - محجوب (Inherited DENY)</span>
        </div>
        <div className="bpm-legend-item">
          <span className="bpm-chip override-allow">★</span>
          <span>استثناء مستخدم - مسموح (User Override ALLOW)</span>
        </div>
        <div className="bpm-legend-item">
          <span className="bpm-chip override-deny">⊘</span>
          <span>استثناء مستخدم - محجوب (User Override DENY)</span>
        </div>
      </div>

      {/* Matrix Table */}
      <div className="bpm-table-wrapper">
        <table className="bpm-table">
          <thead>
            <tr>
              <th style={{ width: "35%" }}>الصلاحية والوظيفة</th>
              {viewMode === "user" ? (
                <>
                  <th style={{ width: "20%" }}>الدور الأساسي</th>
                  <th style={{ width: "25%" }}>الحالة الفعالة والمصدر</th>
                  <th style={{ width: "20%" }}>الإجراء التجريبي</th>
                </>
              ) : (
                <>
                  {roleIds.map((r) => (
                    <th key={r} style={{ textAlign: "center" }}>
                      {roleMeta[r].label}
                    </th>
                  ))}
                  {customRoles.map((cr) => (
                    <th key={cr.id} style={{ textAlign: "center", color: "var(--bayan-gold)" }}>
                      {cr.nameAr}
                    </th>
                  ))}
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {filteredGroups.flatMap((group) => [
              <tr key={`group-${group.id}`}>
                <td
                  colSpan={viewMode === "user" ? 4 : roleIds.length + customRoles.length + 1}
                  className="bpm-group-header"
                >
                  <Shield size={14} style={{ display: "inline", marginLeft: "0.5rem" }} />
                  {group.titleAr}
                  <small style={{ marginRight: "0.75rem", opacity: 0.8 }}>({group.descriptionAr})</small>
                </td>
              </tr>,
              ...group.capabilities.map((cap) => {
                if (viewMode === "user") {
                  const resolution: PermissionResolution = resolveEffectivePermission(
                    currentUser.role,
                    cap,
                    currentUser.id
                  );
                  return (
                    <tr key={cap}>
                      <td>
                        <strong>{capabilityLabels[cap]}</strong>
                        <div style={{ fontSize: "0.75rem", color: "var(--bayan-text-muted)" }} dir="ltr">
                          {cap}
                        </div>
                      </td>
                      <td>
                        <Badge tone="info">{roleMeta[currentUser.role].label}</Badge>
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          {resolution.visualState === "override_allow" && (
                            <span className="bpm-chip override-allow" title="استثناء منح صريح">
                              ★
                            </span>
                          )}
                          {resolution.visualState === "override_deny" && (
                            <span className="bpm-chip override-deny" title="استثناء حجب صريح">
                              ⊘
                            </span>
                          )}
                          {resolution.visualState === "inherited_allow" && (
                            <span className="bpm-chip inherited-allow" title="موروث مسموح">
                              ✓
                            </span>
                          )}
                          {resolution.visualState === "inherited_deny" && (
                            <span className="bpm-chip inherited-deny" title="موروث محجوب">
                              ✕
                            </span>
                          )}
                          <div>
                            <div style={{ fontSize: "0.85rem", fontWeight: 500 }}>
                              {resolution.effect === "ALLOW" ? "مسموح" : "محجوب"}
                            </div>
                            <small style={{ fontSize: "0.75rem", color: "var(--bayan-text-muted)" }}>
                              {resolution.explanation}
                            </small>
                          </div>
                        </div>
                      </td>
                      <td>
                        {resolution.source === "user_override" && resolution.override ? (
                          <Button
                            size="sm"
                            variant="outline"
                            leadingIcon={<RotateCcw size={14} />}
                            onClick={() => handleRemoveOverride(resolution.override!.id, cap)}
                          >
                            استعادة التوريث
                          </Button>
                        ) : (
                          <div style={{ display: "inline-flex", gap: "0.25rem" }}>
                            {resolution.effect === "ALLOW" ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenOverrideModal(cap, "DENY")}
                              >
                                حجب صريح
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenOverrideModal(cap, "ALLOW")}
                              >
                                منح استثنائي
                              </Button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                }

                // Roles comparative row
                return (
                  <tr key={cap}>
                    <td>
                      <strong>{capabilityLabels[cap]}</strong>
                      <div style={{ fontSize: "0.75rem", color: "var(--bayan-text-muted)" }} dir="ltr">
                        {cap}
                      </div>
                    </td>
                    {roleIds.map((r) => {
                      const res = resolveEffectivePermission(r, cap);
                      return (
                        <td key={r} style={{ textAlign: "center" }}>
                          <span
                            className={`bpm-chip ${
                              res.effect === "ALLOW" ? "inherited-allow" : "inherited-deny"
                            }`}
                            title={`${roleMeta[r].label}: ${res.effect === "ALLOW" ? "مسموح" : "محجوب"}`}
                          >
                            {res.effect === "ALLOW" ? "✓" : "✕"}
                          </span>
                        </td>
                      );
                    })}
                    {customRoles.map((cr) => {
                      const isAllowed = cr.capabilities.includes(cap);
                      return (
                        <td key={cr.id} style={{ textAlign: "center" }}>
                          <span
                            className={`bpm-chip ${isAllowed ? "inherited-allow" : "inherited-deny"}`}
                            title={`${cr.nameAr}: ${isAllowed ? "مسموح" : "محجوب"}`}
                          >
                            {isAllowed ? "✓" : "✕"}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            ])}
          </tbody>
        </table>
      </div>

      {/* Override Dialog Modal */}
      <Dialog
        open={overrideModalOpen}
        onClose={() => setOverrideModalOpen(false)}
        title="تعيين استثناء صلاحية فردي (User Permission Override)"
        description={`تعديل الصلاحية الفعالة للمستخدم: ${currentUser.name} (${roleMeta[currentUser.role].label})`}
        footer={
          <>
            <Button variant="outline" onClick={() => setOverrideModalOpen(false)}>
              إلغاء
            </Button>
            <Button variant="primary" type="submit" form="bpm-override-form">
              تطبيق الاستثناء وحفظ السجل
            </Button>
          </>
        }
      >
        <form id="bpm-override-form" onSubmit={handleSaveOverride} className="bpm-dialog-content">
          <div className="bpm-dialog-field">
            <label>الصلاحية المستهدفة:</label>
            <div style={{ fontWeight: 600, color: "var(--bayan-gold)" }}>
              {capabilityLabels[activeCapability]} ({activeCapability})
            </div>
          </div>

          <div className="bpm-dialog-field">
            <label htmlFor="bpm-effect-select">نوع الاستثناء:</label>
            <select
              id="bpm-effect-select"
              value={effectChoice}
              onChange={(e) => setEffectChoice(e.target.value as "ALLOW" | "DENY")}
            >
              <option value="ALLOW">منح استثنائي صريح (Explicit User ALLOW) - تجاوز حجب الدور</option>
              <option value="DENY">حجب استثنائي صريح (Explicit User DENY) - إبطال صلاحية الدور</option>
            </select>
          </div>

          <div className="bpm-dialog-field">
            <label htmlFor="bpm-reason-input">المبرر الإداري الإلزامي (Audit Justification):</label>
            <textarea
              id="bpm-reason-input"
              rows={3}
              placeholder="اكتب سبب منح أو حجب الصلاحية وفق القرارات المؤسسية..."
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              required
            />
            <small style={{ color: "var(--bayan-text-muted)" }}>
              يُسجل هذا المبرر في سجل تدقيق الصلاحيات ولا يمكن حذفه.
            </small>
          </div>

          {overrideError && (
            <div style={{ color: "#f87171", fontSize: "0.85rem", display: "flex", gap: "0.35rem" }}>
              <AlertCircle size={16} /> {overrideError}
            </div>
          )}
        </form>
      </Dialog>

      {/* Feedback Toast */}
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  );
}
