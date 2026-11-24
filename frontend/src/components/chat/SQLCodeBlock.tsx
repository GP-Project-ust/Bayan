"use client";

import React, { useState } from "react";
import { copyText } from "@/lib/chat/clipboard";
import { Check, Copy, Terminal } from "lucide-react";

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
    const ok = await copyText(cleanSql);
    if (ok) {
      setCopied(true);
      setCopyFailed(false);
      setTimeout(() => setCopied(false), 2000);
      return;
    }
    setCopyFailed(true);
    setTimeout(() => setCopyFailed(false), 2000);
  };

  return (
    <div className={`cx-sql ${className}`}>
      <div className="cx-sql-head">
        <Terminal size={14} aria-hidden="true" />
        <span dir="ltr">SQL</span>
        <button
          type="button"
          className="cx-copy"
          onClick={handleCopy}
          aria-label={copied ? "تم نسخ استعلام SQL" : "نسخ استعلام SQL"}
        >
          {copied ? (
            <>
              <Check size={12} aria-hidden="true" />
              <span>تم النسخ</span>
            </>
          ) : copyFailed ? (
            <span>تعذر النسخ</span>
          ) : (
            <>
              <Copy size={12} aria-hidden="true" />
              <span>نسخ SQL</span>
            </>
          )}
        </button>
      </div>
      <pre dir="ltr">
        <code>{cleanSql}</code>
      </pre>
    </div>
  );
}
