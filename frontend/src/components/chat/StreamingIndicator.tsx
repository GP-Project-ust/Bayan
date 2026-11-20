"use client";

import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

interface StreamingIndicatorProps {
  startTime?: number;
  message?: string;
  className?: string;
}

export function StreamingIndicator({
  startTime,
  message = "جارٍ المعالجة والتواصل مع الوكلاء...",
  className = "",
}: StreamingIndicatorProps) {
  const [elapsed, setElapsed] = useState("0.00 ث");

  useEffect(() => {
    const start = startTime || Date.now();
    const interval = setInterval(() => {
      const ms = Math.max(0, Date.now() - start);
      setElapsed((ms / 1000).toFixed(2) + " ث");
    }, 100);

    return () => clearInterval(interval);
  }, [startTime]);

  return (
    <div
      className={`bayan-streaming-indicator ${className}`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2">
        <Loader2 size={16} className="animate-spin text-teal-400" aria-hidden="true" />
        <span className="text-sm font-medium text-bayan-200">{message}</span>
      </div>
      <span className="bayan-timer-pill" dir="ltr" aria-label={`الزمن المنقضي: ${elapsed}`}>
        {elapsed}
      </span>
    </div>
  );
}
