"use client";

import type { ReactNode } from "react";
import { AppShell } from "./AppShell";

type ChatLayoutProps = {
  children: ReactNode;
  variant?: "main" | "feature";
  onNewChat?: () => void;
  onHistory?: (title: string) => void;
  activeChat?: string;
};

export function ChatLayout({children,variant="main",onNewChat,onHistory,activeChat}:ChatLayoutProps) {
  return <AppShell mode="chat"
    layoutClassName={variant === "main" ? "chat-layout" : "feature-layout"}
    workspaceClassName={variant === "main" ? "chat-workspace" : "feature-workspace"}
    onNewChat={onNewChat} onHistory={onHistory} activeChat={activeChat}>
    {children}
  </AppShell>;
}
