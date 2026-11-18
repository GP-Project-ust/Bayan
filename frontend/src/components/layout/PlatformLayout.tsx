"use client";

import type { ReactNode } from "react";
import { AppShell } from "./AppShell";

/** Visual platform layout. Server-side RBAC / real tenant isolation are not implemented. */
export function PlatformLayout({children}:{children:ReactNode}) {
  return <AppShell mode="admin"
    layoutClassName="feature-layout admin-layout platform-layout"
    workspaceClassName="feature-workspace"
    userLabel="مسؤول المنصة">
    {children}
  </AppShell>;
}
