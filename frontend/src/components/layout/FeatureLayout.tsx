"use client";

import type { ReactNode } from "react";
import { ChatLayout } from "./ChatLayout";
import { AdminLayout } from "./AdminLayout";
import { PlatformLayout } from "./PlatformLayout";

/** Select the presentation shell from the existing screen catalog group. */
export function FeatureLayout({group,children,onNewChat}: {group:string;children:ReactNode;onNewChat?:()=>void}) {
  if (group === "المنصة") return <PlatformLayout>{children}</PlatformLayout>;
  if (group === "الإدارة" || group === "الرقابة") return <AdminLayout variant="feature">{children}</AdminLayout>;
  return <ChatLayout variant="feature" onNewChat={onNewChat}>{children}</ChatLayout>;
}
