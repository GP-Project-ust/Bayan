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
    <div className={`cx-error ${className}`} role="alert" aria-live="assertive">
      <AlertCircle size={18} aria-hidden="true" />
      <div className="cx-error-body">
        <p className="cx-error-title">
          تعذر إكمال الطلب
          {error.code && (
            <span className="cx-error-code" dir="ltr">
              {error.code}
            </span>
          )}
        </p>
        <p className="cx-error-message">
          {error.message || "تعذر إكمال الطلب. يرجى المحاولة مرة أخرى."}
        </p>
        {onRetry && (
          <div className="cx-error-actions">
            <button type="button" className="cx-btn" onClick={onRetry}>
              <RefreshCw size={14} aria-hidden="true" />
              <span>إعادة المحاولة</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
