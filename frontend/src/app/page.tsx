"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getHealth } from "@/lib/api";
import { ORGANIZATION_ROUTES, AUXILIARY_ROUTES } from "@/lib/routes";
import type { ComponentStatus } from "@/types";

const AGENTS = [
  { name: "Supervisor", role: "يحلل السؤال ويوجّه المسار", sprint: "Sprint 3" },
  { name: "وكيل SQL", role: "سؤال عربي ← استعلام آمن فوق Smart Views", sprint: "Sprint 1" },
  { name: "وكيل RAG", role: "استرجاع اللوائح والسياسات من Qdrant", sprint: "Sprint 2" },
  { name: "المحلل", role: "تحليل الاتجاهات واختيار الرسوم", sprint: "Sprint 3" },
  { name: "المُعِدّ", role: "تجميع الإجابة العربية النهائية", sprint: "Sprint 3" },
];

export default function HomePage() {
  const [status, setStatus] = useState<"loading" | "ok" | "degraded" | "error">("loading");
  const [components, setComponents] = useState<ComponentStatus>({});

  useEffect(() => {
    getHealth()
      .then((health) => {
        setStatus(health.status);
        setComponents(health.components);
      })
      .catch(() => setStatus("error"));
  }, []);

  const statusText: Record<typeof status, string> = {
    loading: "جارٍ الاتصال بالخادم...",
    ok: "كل المكونات تعمل",
    degraded: "الخادم يعمل — بعض المكونات متوقفة",
    error: "تعذر الاتصال بالخادم — هل backend يعمل؟",
  };

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-6 py-16">
      {/* الترويسة */}
      <header className="text-center">
        <h1 className="text-5xl font-bold text-gold-400">بيان</h1>
        <p className="mt-3 text-xl text-bayan-200">
          المساعد المؤسسي الذكي — اسأل عن بيانات جامعتك بالعربية
        </p>
      </header>

      {/* حالة النظام */}
      <section className="mt-12 rounded-2xl border border-bayan-800 bg-bayan-900/50 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">حالة النظام</h2>
          <span
            className={`rounded-full px-4 py-1 text-sm ${
              status === "ok"
                ? "bg-emerald-900/60 text-emerald-300"
                : status === "degraded"
                  ? "bg-amber-900/60 text-amber-300"
                  : "bg-red-900/60 text-red-300"
            }`}
          >
            {statusText[status]}
          </span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          {Object.entries(components).length === 0
            ? ["database", "redis", "qdrant", "ollama"].map((name) => (
                <div key={name} className="rounded-xl bg-bayan-950/60 p-3 text-center">
                  <div className="text-sm text-bayan-300">{name}</div>
                  <div className="mt-1 h-2 w-2 animate-pulse rounded-full bg-bayan-600" />
                </div>
              ))
            : Object.entries(components).map(([name, state]) => (
                <div key={name} className="rounded-xl bg-bayan-950/60 p-3 text-center">
                  <div className="text-sm text-bayan-300">{name}</div>
                  <div
                    className={`mt-1 inline-block h-2 w-2 rounded-full ${
                      state === "up" ? "bg-emerald-400" : "bg-red-400"
                    }`}
                  />
                </div>
              ))}
        </div>
      </section>

      {/* واجهة المحادثة وخريطة الشاشات */}
      <section className="mt-8 rounded-2xl border border-dashed border-bayan-700 bg-bayan-900/30 p-8 text-center">
        <p className="text-bayan-200">
          واجهة المحادثة الرسمية تُبنى في <span className="font-bold text-gold-400">Sprint 1</span>
        </p>
        <p className="mt-2 text-sm text-bayan-400">
          الهيكل الأساسي للواجهة (RTL + اتصال API) جاهز ومكتمل
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            href={AUXILIARY_ROUTES.screens}
            className="rounded-xl bg-gold-500/20 px-4 py-2 text-sm font-semibold text-gold-400 border border-gold-500/40 hover:bg-gold-500/30 transition-colors"
          >
            استعراض خريطة الشاشات (42 شاشة)
          </Link>
          <Link
            href={ORGANIZATION_ROUTES.prototypeChat}
            className="rounded-xl bg-bayan-800/60 px-4 py-2 text-sm text-bayan-200 border border-bayan-700 hover:bg-bayan-700/60 transition-colors"
          >
            معاينة النموذج الأولي للمحادثة
          </Link>
          <Link
            href={ORGANIZATION_ROUTES.conversations}
            className="rounded-xl bg-bayan-800/60 px-4 py-2 text-sm text-bayan-200 border border-bayan-700 hover:bg-bayan-700/60 transition-colors"
          >
            سجل المحادثات
          </Link>
          <Link
            href={ORGANIZATION_ROUTES.dashboard}
            className="rounded-xl bg-bayan-800/60 px-4 py-2 text-sm text-bayan-200 border border-bayan-700 hover:bg-bayan-700/60 transition-colors"
          >
            لوحة الإدارة
          </Link>
        </div>
      </section>

      {/* الوكلاء الخمسة */}
      <section className="mt-12">
        <h2 className="text-lg font-semibold text-bayan-100">سلسلة الوكلاء (وفق الوثيقة)</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {AGENTS.map((agent) => (
            <div
              key={agent.name}
              className="flex items-center justify-between rounded-xl border border-bayan-800 bg-bayan-900/40 p-4"
            >
              <div>
                <div className="font-semibold text-bayan-100">{agent.name}</div>
                <div className="mt-1 text-sm text-bayan-400">{agent.role}</div>
              </div>
              <span className="rounded-full bg-bayan-800 px-3 py-1 text-xs text-bayan-300">
                {agent.sprint}
              </span>
            </div>
          ))}
        </div>
      </section>

      <footer className="mt-16 text-center text-sm text-bayan-500">
        مشروع تخرج — فريق بيان | جامعة العلوم والتكنولوجيا
      </footer>
    </main>
  );
}
