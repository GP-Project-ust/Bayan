"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { getHealth } from "@/lib/api";
import { copyText } from "@/lib/chat/clipboard";
import type { ComponentStatus } from "@/types";
import { Check, Copy, RefreshCw, X } from "lucide-react";

interface SessionDetailsDrawerProps {
  open: boolean;
  onClose: () => void;
  provider?: string;
  model?: string;
  mode?: string;
  conversationId?: string | null;
}

const COMPONENTS: { key: string; label: string }[] = [
  { key: "database", label: "قاعدة البيانات" },
  { key: "redis", label: "Redis" },
  { key: "qdrant", label: "Qdrant" },
  { key: "ollama", label: "Ollama" },
];

const STATE_LABELS: Record<string, string> = {
  up: "يعمل",
  down: "غير متصل",
};

export function SessionDetailsDrawer({
  open,
  onClose,
  provider = "—",
  model = "—",
  mode = "",
  conversationId,
}: SessionDetailsDrawerProps) {
  const [components, setComponents] = useState<ComponentStatus | null>(null);
  const [checking, setChecking] = useState(false);
  const [copied, setCopied] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  const refreshHealth = useCallback(async () => {
    setChecking(true);
    // The health endpoint can hang while the backend is down; fail fast instead of
    // leaving the drawer stuck on "جارٍ الفحص".
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    try {
      const data = await getHealth(controller.signal);
      setComponents(data.components || {});
    } catch {
      setComponents({ database: "down", redis: "down", qdrant: "down", ollama: "down" });
    } finally {
      clearTimeout(timeout);
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    refreshHealth();
    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose, refreshHealth]);

  const copyConversationId = async () => {
    if (!conversationId) return;
    const ok = await copyText(conversationId);
    setCopied(ok);
    if (ok) setTimeout(() => setCopied(false), 2000);
  };

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        className="cx-scrim"
        aria-label="إغلاق تفاصيل الجلسة"
        onClick={onClose}
        tabIndex={-1}
      />
      <aside
        className="cx-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cx-session-title"
      >
        <div className="cx-drawer-head">
          <h2 id="cx-session-title">تفاصيل الجلسة</h2>
          <button
            ref={closeRef}
            type="button"
            className="cx-drawer-close"
            onClick={onClose}
            aria-label="إغلاق تفاصيل الجلسة"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <section aria-label="بيانات النموذج">
          <h3 className="cx-group-title">النموذج</h3>
          <div className="cx-fields">
            <div className="cx-field">
              <span>المزوّد</span>
              <b className="is-ltr">{provider || "—"}</b>
            </div>
            <div className="cx-field">
              <span>النموذج</span>
              <b className="is-ltr">{model || "—"}</b>
            </div>
            <div className="cx-field">
              <span>وضع التشغيل</span>
              <b>{mode === "mock" ? "تجريبي" : mode === "real" ? "حقيقي" : "—"}</b>
            </div>
            <div className="cx-field">
              <span>معرّف المحادثة</span>
              <b className="is-ltr" title={conversationId || undefined}>
                {conversationId || "—"}
              </b>
            </div>
          </div>
        </section>

        <section aria-label="حالة مكونات البنية التحتية">
          <h3 className="cx-group-title">حالة المكونات</h3>
          {COMPONENTS.map((component) => {
            const state = components?.[component.key];
            return (
              <div className="cx-health-row" key={component.key}>
                <span className="cx-health-name">{component.label}</span>
                <span
                  className="cx-health-state"
                  data-state={state === "up" ? "up" : state === "down" ? "down" : "unknown"}
                >
                  {state ? STATE_LABELS[state] : "—"}
                </span>
              </div>
            );
          })}
          <button
            type="button"
            className="cx-btn"
            onClick={refreshHealth}
            disabled={checking}
            style={{ marginTop: 10 }}
          >
            <RefreshCw size={15} className={checking ? "spin" : undefined} aria-hidden="true" />
            <span>{checking ? "جارٍ الفحص" : "إعادة الفحص"}</span>
          </button>
        </section>

        <div className="cx-drawer-foot">
          <button
            type="button"
            className="cx-btn"
            onClick={copyConversationId}
            disabled={!conversationId}
          >
            {copied ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
            <span>{copied ? "تم نسخ المعرّف" : "نسخ معرّف المحادثة"}</span>
          </button>
        </div>
      </aside>
    </>
  );
}
