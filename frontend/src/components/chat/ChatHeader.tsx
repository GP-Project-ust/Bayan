"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { getHealth } from "@/lib/api";
import { ORGANIZATION_ROUTES } from "@/lib/routes";
import type { ComponentStatus } from "@/types";
import { RefreshCw, LayoutDashboard, History, Sparkles } from "lucide-react";

interface ChatHeaderProps {
  provider?: string;
  model?: string;
  mode?: string;
  className?: string;
}

export function ChatHeader({
  provider = "—",
  model = "—",
  mode = "—",
  className = "",
}: ChatHeaderProps) {
  const [components, setComponents] = useState<ComponentStatus>({});
  const [checking, setChecking] = useState(false);

  const refreshHealth = async () => {
    setChecking(true);
    try {
      const data = await getHealth();
      setComponents(data.components || {});
    } catch {
      setComponents({
        database: "down",
        redis: "down",
        qdrant: "down",
        ollama: "down",
      });
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    refreshHealth();
  }, []);

  const COMPONENT_LABELS: Record<string, string> = {
    database: "القاعدة",
    redis: "Redis",
    qdrant: "Qdrant",
    ollama: "Ollama",
  };

  return (
    <header className={`bayan-chat-header ${className}`} role="banner">
      {/* الشعار والهوية المؤسسية */}
      <div className="bayan-brand-cluster">
        <Link href="/" className="bayan-logo-badge" title="الرئيسية">
          <span>ب</span>
        </Link>
        <div className="bayan-brand-title">
          <div className="flex items-center gap-1.5">
            <h1 className="text-base font-bold text-bayan-50">بيان</h1>
            <Sparkles size={14} className="text-gold-400" aria-hidden="true" />
          </div>
          <span className="text-xs text-bayan-300">واجهة المحادثة الذكية المباشرة</span>
        </div>
      </div>

      {/* شارات المزوّد والنموذج والوضع */}
      <div className="bayan-header-badges" aria-label="بيانات المزوّد والنموذج">
        <span className="bayan-h-badge" title="مزود الذكاء الاصطناعي الحالي">
          المزوّد: <bdi dir="ltr">{provider}</bdi>
        </span>
        <span className="bayan-h-badge" title="النموذج اللغوي الحالي">
          النموذج: <bdi dir="ltr">{model}</bdi>
        </span>
        <span
          className={`bayan-h-badge mode ${
            mode === "mock" ? "mode-mock" : mode === "real" ? "mode-real" : ""
          }`}
          title="بيئة التشغيل"
        >
          {mode === "mock" ? "وضع تجريبي (mock)" : mode === "real" ? "وضع حقيقي" : mode}
        </span>
      </div>

      {/* مؤشرات صحة المكونات وروابط التنقل */}
      <div className="bayan-header-actions">
        <div
          className="bayan-health-cluster"
          role="group"
          aria-label="حالة مكونات البنية التحتية"
        >
          {["database", "redis", "qdrant", "ollama"].map((comp) => {
            const state = components[comp];
            const isUp = state === "up";
            return (
              <span
                key={comp}
                className={`bayan-health-dot-item ${
                  isUp ? "up" : state === "down" ? "down" : "checking"
                }`}
                title={`${COMPONENT_LABELS[comp] || comp}: ${
                  isUp ? "متصل وجاهز" : "غير متصل"
                }`}
              >
                <i className="bayan-dot" aria-hidden="true" />
                <span className="text-xs">{COMPONENT_LABELS[comp] || comp}</span>
              </span>
            );
          })}
          <button
            type="button"
            onClick={refreshHealth}
            disabled={checking}
            className="bayan-health-refresh"
            title="تحديث حالة المكونات"
            aria-label="تحديث حالة المكونات"
          >
            <RefreshCw size={13} className={checking ? "animate-spin" : ""} />
          </button>
        </div>

        {/* روابط سريعة */}
        <div className="bayan-quick-links">
          <Link
            href={ORGANIZATION_ROUTES.conversations}
            className="bayan-nav-link"
            title="سجل المحادثات"
          >
            <History size={15} />
            <span className="hidden sm:inline">السجل</span>
          </Link>
          <Link
            href={ORGANIZATION_ROUTES.dashboard}
            className="bayan-nav-link"
            title="لوحة الإدارة"
          >
            <LayoutDashboard size={15} />
            <span className="hidden sm:inline">لوحة الإدارة</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
