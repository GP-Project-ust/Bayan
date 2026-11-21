"use client";

import React, { useEffect, useState } from "react";
import { getHealth } from "@/lib/api";
import type { ComponentStatus } from "@/types";
import { Sparkles, RefreshCw } from "lucide-react";

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
    <div className={`bayan-chat-hero ${className}`} role="region" aria-label="ترويسة المساعد الذكي">
      {/* 1. العنوان والوصف التنفيذي المطابق لهوية لوحة الإدارة */}
      <div className="bayan-chat-hero-main">
        <div className="bayan-chat-hero-title">
          <Sparkles size={24} className="text-bayan-teal-500" aria-hidden="true" />
          <h1>المساعد الذكي — بيان</h1>
        </div>
        <p className="bayan-chat-hero-desc">
          اسأل عن بيانات مؤسستك باللغة العربية واستعرض النتائج وتحليل الوكلاء.
        </p>
      </div>

      {/* 2. شارات المزوّد والنموذج ومؤشرات جاهزية البنية التحتية */}
      <div className="bayan-chat-hero-meta">
        <div className="bayan-hero-badges-row" aria-label="بيانات النموذج والمزود">
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
            title="بيئة التشغيل الحالية"
          >
            {mode === "mock" ? "وضع تجريبي (mock)" : mode === "real" ? "وضع حقيقي" : mode}
          </span>
        </div>

        <div className="bayan-hero-health-row">
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
                  className="bayan-health-item"
                  title={`${COMPONENT_LABELS[comp]}: ${isUp ? "يعمل وجاهز" : "غير متصل"}`}
                >
                  <span className={`bayan-health-dot ${isUp ? "up" : "down"}`} aria-hidden="true" />
                  <span className="bayan-health-label">{COMPONENT_LABELS[comp]}</span>
                </span>
              );
            })}
            <button
              type="button"
              onClick={refreshHealth}
              disabled={checking}
              className="bayan-health-refresh"
              title="تحديث فحص صحة المكونات"
              aria-label="تحديث فحص صحة المكونات"
            >
              <RefreshCw size={12} className={checking ? "animate-spin" : ""} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
