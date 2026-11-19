"use client";

import type { ReactNode } from "react";
import { AppShell } from "./AppShell";
import { PlatformSidebar } from "@/components/PlatformSidebar";

/** Visual platform layout with dedicated sovereign platform navigation. */
export function PlatformLayout({children}:{children:ReactNode}) {
  return <AppShell mode="admin"
    layoutClassName="feature-layout admin-layout platform-layout"
    workspaceClassName="feature-workspace"
    userLabel="مسؤول المنصة"
    renderSidebar={(props) => <PlatformSidebar {...props} />}>
    {children}
  </AppShell>;
}
