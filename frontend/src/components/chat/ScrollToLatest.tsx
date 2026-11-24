"use client";

import React from "react";
import { ArrowDown } from "lucide-react";

interface ScrollToLatestProps {
  visible: boolean;
  /** True while new content is arriving below the fold. */
  unread?: boolean;
  onClick: () => void;
  className?: string;
}

export function ScrollToLatest({ visible, unread = false, onClick, className = "" }: ScrollToLatestProps) {
  if (!visible) return null;

  return (
    <button
      type="button"
      className={`cx-scroll-latest ${className}`}
      onClick={onClick}
      data-unread={unread ? "true" : undefined}
    >
      <ArrowDown size={14} aria-hidden="true" />
      <span>{unread ? "محتوى جديد بالأسفل" : "الانتقال إلى الأحدث"}</span>
    </button>
  );
}
