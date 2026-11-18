"use client";

import type { ReactNode } from "react";
import { AppShell } from "./AppShell";

export function AdminLayout({children, variant="main"}: {children: ReactNode; variant?: "main" | "feature"}) {
  return <AppShell mode="admin"
    layoutClassName={variant === "main" ? "admin-layout" : "feature-layout admin-layout"}
    workspaceClassName={variant === "main" ? "admin-workspace" : "feature-workspace"}>
    {children}
  </AppShell>;
}
