"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Check, LockKeyhole, UserRoundCog } from "lucide-react";
import { canPreviewRoute, hasPermission, roleIds, roleMeta, type Capability, type RoleId } from "@/lib/access/policy";
import {
  getStoredActiveRole,
  setStoredActiveRole,
  resolveEffectivePermission,
  RBAC_STATE_CHANGE_EVENT,
  type PermissionResolution,
  type VisualPermissionState
} from "@/lib/access/enterprise-rbac";
import { StatePanel } from "@/components/states";

export interface DemoAccessContextValue {
  role: RoleId;
  setRole: (role: RoleId) => void;
  can: (capability: Capability) => boolean;
  canVisit: (path: string) => boolean;
  getResolution: (capability: Capability, targetUserId?: string) => PermissionResolution;
  activeTenant: string;
}

const DemoAccessContext = createContext<DemoAccessContextValue | null>(null);

export function DemoAccessProvider({
  children,
  initialRole = "employee"
}: {
  children: ReactNode;
  initialRole?: RoleId;
}) {
  const [role, setRoleState] = useState<RoleId>(() => {
    if (typeof window !== "undefined") {
      return getStoredActiveRole();
    }
    return initialRole;
  });

  const [version, setVersion] = useState(0);

  useEffect(() => {
    const handleStateChange = () => {
      const stored = getStoredActiveRole();
      setRoleState(stored);
      setVersion((v) => v + 1);
    };

    window.addEventListener(RBAC_STATE_CHANGE_EVENT, handleStateChange);
    window.addEventListener("storage", handleStateChange);
    return () => {
      window.removeEventListener(RBAC_STATE_CHANGE_EVENT, handleStateChange);
      window.removeEventListener("storage", handleStateChange);
    };
  }, []);

  const setRole = (newRole: RoleId) => {
    setRoleState(newRole);
    setStoredActiveRole(newRole);
  };

  const value = useMemo<DemoAccessContextValue>(() => {
    return {
      role,
      setRole,
      can: (capability: Capability) => {
        const resolution = resolveEffectivePermission(role, capability);
        return resolution.effect === "ALLOW";
      },
      canVisit: (path: string) => canPreviewRoute(role, path),
      getResolution: (capability: Capability, targetUserId?: string) => {
        return resolveEffectivePermission(role, capability, targetUserId);
      },
      activeTenant: role === "platform_admin" ? "نطاق تشغيل المنصة العام" : "جامعة بيان النموذجية"
    };
  }, [role, version]);

  return <DemoAccessContext.Provider value={value}>{children}</DemoAccessContext.Provider>;
}

export function useDemoAccess() {
  const context = useContext(DemoAccessContext);
  if (!context) throw new Error("useDemoAccess must be used inside DemoAccessProvider");
  return context;
}

export function DemoRolePicker({ id = "bayan-role-picker" }: { id?: string }) {
  const { role, setRole } = useDemoAccess();
  return (
    <label className="b5-role-picker" htmlFor={id}>
      <span>
        <UserRoundCog size={17} aria-hidden="true" /> الدور التجريبي
      </span>
      <select
        id={id}
        value={role}
        onChange={(e) => setRole(e.target.value as RoleId)}
        aria-label="اختيار الدور التجريبي"
      >
        {roleIds.map((id) => (
          <option value={id} key={id}>
            {roleMeta[id].label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Can({
  permission,
  children,
  fallback = null
}: {
  permission: Capability;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { can } = useDemoAccess();
  return <>{can(permission) ? children : fallback}</>;
}

export function PreviewRouteGuard({ route, children }: { route: string; children: ReactNode }) {
  const { canVisit } = useDemoAccess();
  return canVisit(route) ? (
    <>{children}</>
  ) : (
    <StatePanel
      state="forbidden"
      description="تمنع محاكاة صلاحيات هذا الدور عرض الشاشة المطلوبة. لا يمثل ذلك تحققًا أمنيًا في الخادم."
    />
  );
}

export function PermissionSummary({
  permission,
  enabled
}: {
  permission: Capability;
  enabled: boolean;
}) {
  return (
    <span className={`b5-permission-chip ${enabled ? "yes" : "no"}`}>
      {enabled ? <Check size={14} /> : <LockKeyhole size={14} />} {permission.replaceAll(".", " · ")}
    </span>
  );
}
