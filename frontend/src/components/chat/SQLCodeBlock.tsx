"use client";

import React, { useState } from "react";
import { Copy, Check, Terminal } from "lucide-react";

interface SQLCodeBlockProps {
  sql: string;
  className?: string;
}

export function SQLCodeBlock({ sql, className = "" }: SQLCodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  const cleanSql = sql?.trim() || "";
  if (!cleanSql) return null;

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        await navigator.clipboard.writeText(cleanSql);
        setCopied(true);
        setCopyFailed(false);
        setTimeout(() => setCopied(false), 2000);
        return;
      }
      throw new Error("Clipboard API unavailable");
    } catch {
      // بديل يدوي في البيئات غير الآمنة
      try {
        const ta = document.createElement("textarea");
        ta.value = cleanSql;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(ta);
        if (ok) {
          setCopied(true);
          setCopyFailed(false);
          setTimeout(() => setCopied(false), 2000);
          return;
        }
      } catch {
        // فشل البديل
      }
      setCopyFailed(true);
      setTimeout(() => setCopyFailed(false), 2000);
    }
  };

  return (
    <div className={`bayan-sql-section ${className}`}>
      {/* رأس كتلة SQL */}
      <div className="bayan-sql-head">
        <div className="bayan-sql-title">
          <Terminal size={14} className="text-teal-400" aria-hidden="true" />
          <span>استعلام SQL</span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className={`bayan-copy-btn ${copied ? "copied" : ""} ${copyFailed ? "failed" : ""}`}
          aria-label={copied ? "تم نسخ استعلام SQL" : "نسخ استعلام SQL"}
          title="نسخ الاستعلام إلى الحافظة"
        >
          {copied ? (
            <>
              <Check size={13} aria-hidden="true" />
              <span>تم النسخ</span>
            </>
          ) : copyFailed ? (
            <span>تعذر النسخ</span>
          ) : (
            <>
              <Copy size={13} aria-hidden="true" />
              <span>نسخ SQL</span>
            </>
          )}
        </button>
      </div>

      {/* وعاء كود SQL في LTR */}
      <div className="bayan-sql-wrap" dir="ltr">
        <pre className="bayan-sql-block">
          <code>{cleanSql}</code>
        </pre>
      </div>
    </div>
  );
}
