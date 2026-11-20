"use client";

import React from "react";
import type { ErrorPayload } from "@/types";
import { AlertCircle, RefreshCw } from "lucide-react";

interface ErrorMessageProps {
  error: ErrorPayload;
  onRetry?: () => void;
  className?: string;
}

export function ErrorMessage({ error, onRetry, className = "" }: ErrorMessageProps) {
  return (
    <div
      className={`bayan-error-bubble ${className}`}
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-start gap-3">
        <AlertCircle size={20} className="text-red-400 shrink-0 mt-0.5" aria-hidden="true" />
        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h4 className="text-sm font-semibold text-red-300">
              خطأ في معالجة الطلب
            </h4>
            {error.code && (
              <span className="bayan-error-code" dir="ltr">
                code: {error.code}
              </span>
            )}
          </div>
          <p className="text-sm text-red-200/90 leading-relaxed">
            {error.message || "تعذر إكمال الطلب. يرجى المحاولة مرة أخرى."}
          </p>
        </div>
      </div>

      {onRetry && (
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={onRetry}
            className="bayan-retry-btn"
            aria-label="إعادة محاولة إرسال السؤال الأخير"
          >
            <RefreshCw size={14} aria-hidden="true" />
            <span>إعادة المحاولة</span>
          </button>
        </div>
      )}
    </div>
  );
}
