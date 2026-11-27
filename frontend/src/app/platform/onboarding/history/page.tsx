"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, History, RefreshCw } from "lucide-react";

import { AppShell } from "@/components/layout";
import { onboardingApi } from "@/lib/onboarding-api";
import { PLATFORM_ROUTES } from "@/lib/routes";
import type { OrganizationSummary } from "@/types/onboarding";

export default function OnboardingHistoryPage() {
  const [items, setItems] = useState<OrganizationSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = async () => {
    setError(null);
    try {
      setItems(await onboardingApi.listOrganizations(true));
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر تحميل سجل التهيئة.");
    }
  };

  useEffect(() => {
    void loadHistory();
  }, []);

  return (
    <AppShell mode="admin" layoutClassName="feature-layout" workspaceClassName="feature-workspace">
      <div className="space-y-4 p-6 text-slate-100" dir="rtl">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">سجل تشغيلات وأرشيف التهيئة الذكية</h1>
            <p className="mt-1 text-sm text-slate-400">
              عرض تاريخ المؤسسات المهيّأة والمفعّلة والمؤرشفة
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Link
              href={PLATFORM_ROUTES.onboarding}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white"
            >
              <ArrowRight className="h-3.5 w-3.5" />
              <span>العودة لمسار التهيئة</span>
            </Link>
            <button
              type="button"
              onClick={() => void loadHistory()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3 py-1.5 text-xs text-cyan-200"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>تحديث</span>
            </button>
          </div>
        </header>
        {error && (
          <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-200">
            {error}
          </div>
        )}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-white">
            <History className="h-4 w-4 text-cyan-400" />
            <span>جميع ملفات التهيئة ({items.length})</span>
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="border-b border-slate-800 text-slate-400">
                <tr>
                  <th className="py-2">المؤسسة</th>
                  <th className="py-2">القطاع</th>
                  <th className="py-2">الحالة</th>
                  <th className="py-2">المرحلة</th>
                  <th className="py-2">الإنجاز</th>
                  <th className="py-2">الأرشفة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="py-2.5 font-semibold text-white">{item.name}</td>
                    <td className="py-2.5 text-slate-300">{item.sector || "—"}</td>
                    <td className="py-2.5 text-cyan-300">{item.status}</td>
                    <td className="py-2.5 text-slate-300">{item.current_phase}</td>
                    <td className="py-2.5 num">{item.progress}%</td>
                    <td className="py-2.5 text-slate-400">{item.archived_at ? "مؤرشف" : "نشط"}</td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-400">
                      لا توجد سجلات محفوظة حالياً.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
