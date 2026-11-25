"use client";

import React from "react";
import { Cpu, PlusCircle, SlidersHorizontal } from "lucide-react";

interface ChatHeaderProps {
  provider?: string;
  model?: string;
  mode?: string;
  isStreaming?: boolean;
  onOpenSession: () => void;
  onNewChat?: () => void;
  className?: string;
}

const MODE_LABELS: Record<string, string> = {
  mock: "وضع تجريبي",
  real: "وضع حقيقي",
};

export function ChatHeader({
  provider,
  model,
  mode = "",
  isStreaming = false,
  onOpenSession,
  onNewChat,
  className = "",
}: ChatHeaderProps) {
  const modeLabel = MODE_LABELS[mode];
  const modelLabel = model && model !== "—" ? model : "";

  return (
    <div className={`cx-bar ${className}`} role="region" aria-label="ترويسة المحادثة">
      <h1>المحادثة</h1>

      {modeLabel && (
        <span className="cx-mode" data-mode={mode === "real" ? "real" : "mock"}>
          {modeLabel}
        </span>
      )}

      {modelLabel && (
        <span className="cx-chip" title={provider ? `المزوّد: ${provider}` : undefined}>
          <Cpu size={13} aria-hidden="true" />
          <bdi dir="ltr">{modelLabel}</bdi>
        </span>
      )}

      {isStreaming && <span className="cx-state is-running">جارٍ الرد</span>}

      <div className="cx-bar-actions">
        {onNewChat && (
          <button
            type="button"
            className="cx-btn"
            onClick={onNewChat}
            disabled={isStreaming}
            title="بدء محادثة جديدة"
          >
            <PlusCircle size={15} aria-hidden="true" />
            <span>محادثة جديدة</span>
          </button>
        )}

        <button type="button" className="cx-btn" onClick={onOpenSession}>
          <SlidersHorizontal size={15} aria-hidden="true" />
          <span>تفاصيل الجلسة</span>
        </button>
      </div>
    </div>
  );
}
