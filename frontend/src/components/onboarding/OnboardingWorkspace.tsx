"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Database,
  FileText,
  History,
  Layers,
  Lock,
  Network,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Tags,
} from "lucide-react";

import { AppShell } from "@/components/layout";
import { onboardingApi, OnboardingApiError } from "@/lib/onboarding-api";
import { PLATFORM_ROUTES } from "@/lib/routes";
import type {
  ActivationReadinessResponse,
  OfficialCatalogEntry,
  OrganizationDetail,
  OrganizationSummary,
  SemanticSearchHit,
  SystemReadinessResponse,
} from "@/types/onboarding";

const STAGES = [
  { num: 0, key: "intake", label: "الاستلام", icon: FileText },
  { num: 1, key: "connection", label: "الاتصال", icon: Database },
  { num: 2, key: "discovery", label: "الاكتشاف الحتمي", icon: Sparkles },
  { num: 3, key: "domains", label: "النطاقات", icon: Layers },
  { num: 4, key: "concepts", label: "المفاهيم", icon: Tags },
  { num: 5, key: "relationships", label: "العلاقات", icon: Network },
  { num: 6, key: "activation", label: "التفعيل والكتالوج", icon: ShieldCheck },
  { num: 7, key: "monitoring", label: "المتابعة", icon: Activity },
  { num: 8, key: "schema", label: "المزامنة", icon: AlertTriangle },
] as const;

const DEFAULT_OPERATOR = "مشغل التهيئة";

function statusBadge(status: string) {
  const map: Record<string, string> = {
    approved: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    active: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    healthy: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    connected: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    synced: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    pending: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    escalated: "bg-orange-500/15 text-orange-300 border-orange-500/30",
    drift_detected: "bg-orange-500/15 text-orange-300 border-orange-500/30",
    rejected: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  };
  return map[status] ?? "bg-slate-700/40 text-slate-300 border-slate-600";
}

export function OnboardingWorkspace() {
  const [operatorName, setOperatorName] = useState(DEFAULT_OPERATOR);
  const [systemReadiness, setSystemReadiness] = useState<SystemReadinessResponse | null>(null);
  const [orgs, setOrgs] = useState<OrganizationSummary[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<OrganizationDetail | null>(null);
  const [activeStage, setActiveStage] = useState<string>("intake");
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  // حقول المرحلة 0
  const [orgName, setOrgName] = useState("");
  const [orgSector, setOrgSector] = useState("التعليم العالي");
  const [orgGoals, setOrgGoals] = useState("");

  // حقول المرحلة 1
  const [srcName, setSrcName] = useState("قاعدة البيانات الرئيسية");
  const [srcEngine, setSrcEngine] = useState("postgresql");
  const [srcHost, setSrcHost] = useState("localhost");
  const [srcPort, setSrcPort] = useState("5433");
  const [srcDb, setSrcDb] = useState("university");
  const [srcSchema, setSrcSchema] = useState("public");
  const [srcUser, setSrcUser] = useState("bayan_reader");
  const [ephemeralPasswords, setEphemeralPasswords] = useState<Record<string, string>>({});

  // حقول المرحلة 2 والذكاء الاصطناعي الاختياري
  const [approveExternalAI, setApproveExternalAI] = useState(false);

  // حقول المرحلة 3 (دمج ونقل)
  const [moveTableRef, setMoveTableRef] = useState("");
  const [moveTargetDomainId, setMoveTargetDomainId] = useState("");
  const [mergeSelectedIds, setMergeSelectedIds] = useState<string[]>([]);
  const [mergeNameAr, setMergeNameAr] = useState("");

  // حقول المرحلة 5 (إضافة علاقة يدوية/مركبة)
  const [relSourceCol, setRelSourceCol] = useState("");
  const [relTargetCol, setRelTargetCol] = useState("");
  const [relLabel, setRelLabel] = useState("");
  const [relCardinality, setRelCardinality] = useState("many_to_one");

  // حقول المرحلة 6 (الجاهزية، الكتالوج المعتمد، والبحث الدلالي)
  const [readiness, setReadiness] = useState<ActivationReadinessResponse | null>(null);
  const [handoverNote, setHandoverNote] = useState("جاهز للتسليم عبر Catalog v2 وفهرس pgvector.");
  const [catalogEntries, setCatalogEntries] = useState<OfficialCatalogEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState("الطلاب والرسوم");
  const [searchHits, setSearchHits] = useState<SemanticSearchHit[]>([]);

  // حقول إعادة تعيين المراحل
  const [resetTarget, setResetTarget] = useState("domains");
  const [resetReason, setResetReason] = useState("مراجعة التصنيف الدلالي");

  const refreshList = useCallback(async () => {
    try {
      const [sys, items] = await Promise.all([
        onboardingApi.getSystemReadiness(),
        onboardingApi.listOrganizations(false),
      ]);
      setSystemReadiness(sys);
      setOrgs(items);
    } catch (err) {
      setErrorMsg(err instanceof OnboardingApiError ? err.message : "تعذر الاتصال بخادم التهيئة.");
    }
  }, []);

  const loadOrganization = useCallback(async (orgId: string) => {
    setBusy(true);
    setErrorMsg(null);
    try {
      const detail = await onboardingApi.getOrganization(orgId);
      setSelectedOrg(detail);
      setActiveStage(detail.current_phase || "intake");
      const readyData = await onboardingApi.getActivationReadiness(orgId);
      setReadiness(readyData);
      if (detail.status === "active") {
        const cat = await onboardingApi.getOfficialCatalog(orgId);
        setCatalogEntries(cat);
      } else {
        setCatalogEntries([]);
      }
    } catch (err) {
      setErrorMsg(err instanceof OnboardingApiError ? err.message : "تعذر تحميل بيانات المؤسسة.");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void refreshList();
  }, [refreshList]);

  const runAction = async (label: string, fn: () => Promise<OrganizationDetail | void>) => {
    setBusy(true);
    setErrorMsg(null);
    setInfoMsg(null);
    try {
      const res = await fn();
      if (res && typeof res === "object" && "id" in res) {
        setSelectedOrg(res);
        setActiveStage(res.current_phase || activeStage);
        const readyData = await onboardingApi.getActivationReadiness(res.id);
        setReadiness(readyData);
        if (res.status === "active") {
          setCatalogEntries(await onboardingApi.getOfficialCatalog(res.id));
        }
      } else if (selectedOrg) {
        await loadOrganization(selectedOrg.id);
      }
      await refreshList();
      setInfoMsg(label);
    } catch (err) {
      setErrorMsg(err instanceof OnboardingApiError ? err.message : "فشل تنفيذ العملية.");
    } finally {
      setBusy(false);
    }
  };

  const allColumns = useMemo(() => {
    if (!selectedOrg) return [];
    return selectedOrg.physical_catalog.flatMap((tbl) =>
      tbl.columns.map((col) => ({
        ref: col.object_ref,
        label: `${tbl.name}.${col.name} (${col.label_ar})`,
      }))
    );
  }, [selectedOrg]);

  return (
    <AppShell mode="admin" layoutClassName="feature-layout" workspaceClassName="feature-workspace">
      <div className="space-y-6 p-6 text-slate-100" dir="rtl">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">مركز التهيئة الذكية والمعرفة الدلالية</h1>
            <p className="mt-1 text-sm text-slate-400">
              إدارة المراحل 0–8: الاستلام، الاستبطان الحتمي، النطاقات، المفاهيم، العلاقات، الفهرسة الدلالية في
              pgvector و Catalog v2
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href={PLATFORM_ROUTES.onboardingHistory}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800"
            >
              <History className="h-3.5 w-3.5" />
              <span>سجل التهيئة والأرشيف</span>
            </Link>
            <button
              type="button"
              onClick={() => void refreshList()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3 py-1.5 text-xs text-cyan-200 hover:bg-cyan-500/20"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>تحديث</span>
            </button>
          </div>
        </header>
        {/* شريط حالة البوابة والنظام */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3.5">
            <div className="text-xs text-slate-400">مزود LLM الموحد</div>
            <div className="mt-1 text-sm font-semibold text-cyan-300">
              {systemReadiness?.ai_gateway.provider ?? "—"} ({systemReadiness?.ai_gateway.model ?? "—"})
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3.5">
            <div className="text-xs text-slate-400">مزود التضمين (pgvector)</div>
            <div className="mt-1 text-sm font-semibold text-emerald-300">
              {systemReadiness?.embedding_provider ?? "—"} / {systemReadiness?.embedding_model ?? "—"}
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3.5">
            <div className="text-xs text-slate-400">عقد الكتالوج النشط</div>
            <div className="mt-1 text-sm font-semibold text-amber-300">
              {systemReadiness?.catalog_provider_active ?? "legacy"}
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3.5">
            <label className="block text-xs text-slate-400">المشغل البشري المعتمد</label>
            <input
              value={operatorName}
              onChange={(e) => setOperatorName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1 text-sm text-white"
            />
          </div>
        </div>

        {errorMsg && (
          <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {errorMsg}
          </div>
        )}
        {infoMsg && (
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {infoMsg}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* قائمة المؤسسات وإنشاء ملف استلام جديد */}
          <div className="space-y-4 lg:col-span-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-white">
                <Plus className="h-4 w-4 text-cyan-400" />
                <span>المرحلة 0 — إنشاء ملف استلام جديد</span>
              </h2>
              <div className="space-y-2.5 text-sm">
                <input
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="اسم المؤسسة أو الجهة"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                />
                <input
                  value={orgSector}
                  onChange={(e) => setOrgSector(e.target.value)}
                  placeholder="القطاع (تعليمي / مالي / لوجستي)"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                />
                <input
                  value={orgGoals}
                  onChange={(e) => setOrgGoals(e.target.value)}
                  placeholder="أهداف الربط والتحليل المؤسسي"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                />
                <button
                  type="button"
                  disabled={busy || orgName.trim().length < 2}
                  onClick={() =>
                    void runAction("تم إنشاء ملف الاستلام في المرحلة 0.", async () => {
                      const created = await onboardingApi.createOrganization({
                        name: orgName,
                        sector: orgSector,
                        goals: orgGoals,
                        operator_name: operatorName,
                      });
                      setOrgName("");
                      return created;
                    })
                  }
                  className="w-full rounded-lg bg-cyan-600 px-3 py-2 text-xs font-bold text-white hover:bg-cyan-500 disabled:opacity-40"
                >
                  إنشاء وبدء التهيئة
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
              <h3 className="mb-3 text-sm font-bold text-white">المؤسسات قيد التهيئة والنشطة ({orgs.length})</h3>
              <div className="space-y-2">
                {orgs.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => void loadOrganization(item.id)}
                    className={`w-full rounded-xl border p-3 text-right transition ${
                      selectedOrg?.id === item.id
                        ? "border-cyan-500 bg-cyan-500/10"
                        : "border-slate-800 bg-slate-950/60 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white">{item.name}</span>
                      <span className={`rounded-full border px-2 py-0.5 text-[11px] ${statusBadge(item.status)}`}>
                        {item.status === "active" ? "مفعّلة" : "قيد الإعداد"}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-xs text-slate-400">
                      <span>{item.sector || "عام"}</span>
                      <span className="num">{item.progress}%</span>
                    </div>
                  </button>
                ))}
                {orgs.length === 0 && (
                  <p className="text-xs text-slate-400">لا توجد مؤسسات مسجلة بعد. أنشئ أول ملف من النموذج أعلاه.</p>
                )}
              </div>
            </div>
          </div>

          {/* مسار المراحل 0–8 التفصيلي */}
          <div className="space-y-4 lg:col-span-8">
            {!selectedOrg ? (
              <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 text-sm text-slate-400">
                اختر مؤسسة من القائمة أو أنشئ ملفاً جديداً لإدارة المراحل 0–8.
              </div>
            ) : (
              <>
                {/* شريط المراحل 0–8 */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3">
                  <div className="grid grid-cols-3 gap-2 md:grid-cols-9">
                    {STAGES.map((st) => {
                      const Icon = st.icon;
                      const active = activeStage === st.key;
                      return (
                        <button
                          key={st.key}
                          type="button"
                          onClick={() => setActiveStage(st.key)}
                          className={`flex flex-col items-center gap-1 rounded-xl border p-2 text-center text-[11px] transition ${
                            active
                              ? "border-cyan-400 bg-cyan-500/15 text-cyan-200"
                              : "border-slate-800 bg-slate-950/50 text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          <span className="font-semibold">
                            {st.num}. {st.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* المرحلة 0 */}
                {activeStage === "intake" && (
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-bold text-white">المرحلة 0: استلام الملف واعتماد الاكتمال</h3>
                      <span className={`rounded-full border px-3 py-1 text-xs ${statusBadge(selectedOrg.intake.approved ? "approved" : "pending")}`}>
                        {selectedOrg.intake.approved ? "معتمد" : "بانتظار الاعتماد"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      الأهداف: {selectedOrg.intake.goals || "استبطان المخطط وتوليد الكتالوج الدلالي المعتمد."}
                    </p>
                    <button
                      type="button"
                      disabled={busy || selectedOrg.intake.approved}
                      onClick={() =>
                        void runAction("تم اعتماد المرحلة 0 (الاستلام).", () =>
                          onboardingApi.approveIntake(selectedOrg.id, operatorName)
                        )
                      }
                      className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-40"
                    >
                      اعتماد اكتمال الاستلام والانتقال للاتصال
                    </button>
                  </div>
                )}

                {/* المرحلة 1 */}
                {activeStage === "connection" && (
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-4">
                    <h3 className="text-base font-bold text-white">المرحلة 1: مصادر البيانات الآمنة (قراءة فقط)</h3>
                    <div className="grid grid-cols-1 gap-2.5 md:grid-cols-3 text-xs">
                      <input
                        value={srcName}
                        onChange={(e) => setSrcName(e.target.value)}
                        placeholder="اسم المصدر"
                        className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                      />
                      <select
                        value={srcEngine}
                        onChange={(e) => setSrcEngine(e.target.value)}
                        className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                      >
                        <option value="postgresql">PostgreSQL (عبر PR-1)</option>
                        <option value="sqlite">SQLite (قراءة فقط)</option>
                        <option value="mysql">MySQL</option>
                        <option value="mariadb">MariaDB</option>
                        <option value="sqlserver">SQL Server</option>
                      </select>
                      <input
                        value={srcDb}
                        onChange={(e) => setSrcDb(e.target.value)}
                        placeholder="اسم القاعدة / مسار SQLite"
                        className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                      />
                      {srcEngine !== "sqlite" && (
                        <>
                          <input
                            value={srcHost}
                            onChange={(e) => setSrcHost(e.target.value)}
                            placeholder="المضيف (localhost)"
                            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                          />
                          <input
                            value={srcPort}
                            onChange={(e) => setSrcPort(e.target.value)}
                            placeholder="المنفذ (5433)"
                            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                          />
                          <input
                            value={srcUser}
                            onChange={(e) => setSrcUser(e.target.value)}
                            placeholder="مستخدم القراءة فقط"
                            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                          />
                        </>
                      )}
                      <input
                        value={srcSchema}
                        onChange={(e) => setSrcSchema(e.target.value)}
                        placeholder="المخطط (public)"
                        className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void runAction("تمت إضافة مصدر القراءة فقط.", () =>
                          onboardingApi.addSource(selectedOrg.id, {
                            name: srcName,
                            engine: srcEngine,
                            host: srcHost,
                            port: Number(srcPort) || 5432,
                            database: srcDb,
                            schema: srcSchema,
                            username: srcUser,
                            read_only: true,
                          })
                        )
                      }
                      className="rounded-lg bg-cyan-600 px-4 py-2 text-xs font-bold text-white hover:bg-cyan-500"
                    >
                      إضافة المصدر بصلاحية قراءة فقط
                    </button>

                    <div className="space-y-2 pt-2">
                      {selectedOrg.data_sources.map((src) => (
                        <div
                          key={src.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-xs"
                        >
                          <div>
                            <div className="font-semibold text-white">
                              {src.name} — <span className="text-cyan-300">{src.engine}</span> ({src.database})
                            </div>
                            <div className="text-slate-400">
                              <Lock className="inline h-3 w-3 ml-1" />
                              قراءة فقط — كلمة المرور عابرة ولا تُحفظ في القاعدة
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {src.engine !== "sqlite" && (
                              <input
                                type="password"
                                placeholder="كلمة مرور القراءة"
                                value={ephemeralPasswords[src.id] ?? ""}
                                onChange={(e) =>
                                  setEphemeralPasswords((prev) => ({ ...prev, [src.id]: e.target.value }))
                                }
                                className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-white"
                              />
                            )}
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() =>
                                void runAction("نجح اختبار الاتصال بالوضع الآمن.", async () => {
                                  const res = await onboardingApi.testSource(selectedOrg.id, src.id, {
                                    operator_name: operatorName,
                                    password: ephemeralPasswords[src.id] ?? "",
                                  });
                                  return res.organization;
                                })
                              }
                              className="rounded-lg bg-emerald-600 px-3 py-1.5 font-semibold text-white"
                            >
                              اختبار الاتصال ({src.status})
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* المرحلة 2 */}
                {activeStage === "discovery" && (
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-base font-bold text-white">المرحلة 2: الاكتشاف الحتمي للمخطط (Zero-LLM)</h3>
                        <p className="text-xs text-slate-400">
                          استخراج الكائنات، الأعمدة، المفاتيح، البصمة البنيوية SHA-256، والتوصيف العربي الحتمي من PR-1.
                        </p>
                      </div>
                      <label className="flex items-center gap-2 text-xs text-slate-300">
                        <input
                          type="checkbox"
                          checked={approveExternalAI}
                          onChange={(e) => setApproveExternalAI(e.target.checked)}
                        />
                        <span>موافقة صريحة لإثراء النطاقات عبر AI الرسمي</span>
                      </label>
                    </div>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void runAction("اكتمل الاكتشاف الفيزيائي الحتمي.", () =>
                          onboardingApi.startDiscovery(selectedOrg.id, {
                            operator_name: operatorName,
                            passwords: ephemeralPasswords,
                            generate_ai_proposals: approveExternalAI,
                            approve_external_ai: approveExternalAI,
                          })
                        )
                      }
                      className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-xs font-bold text-white hover:bg-cyan-500"
                    >
                      <Play className="h-3.5 w-3.5" />
                      <span>بدء الاستبطان الحتمي ({selectedOrg.physical_catalog.length} كائن مكتشف)</span>
                    </button>

                    <div className="max-h-72 space-y-2 overflow-y-auto pt-2">
                      {selectedOrg.physical_catalog.map((tbl) => (
                        <div key={tbl.object_ref} className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-cyan-300">
                              {tbl.schema_qualified_name} — {tbl.label_ar}
                            </span>
                            <span className="rounded bg-slate-800 px-2 py-0.5 text-[11px] text-slate-300">
                              {tbl.object_type === "view" ? "مشهد SQL" : "جدول فيزيائي"} ({tbl.columns.length} عمود)
                            </span>
                          </div>
                          <p className="mt-1 text-slate-400">{tbl.description_ar}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* المرحلة 3 */}
                {activeStage === "domains" && (
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-bold text-white">المرحلة 3: مراجعة واعتماد النطاقات الدلالية</h3>
                      <button
                        type="button"
                        disabled={busy || selectedOrg.domains.length === 0}
                        onClick={() =>
                          void runAction("تم اعتماد جميع النطاقات الدلالية.", () =>
                            onboardingApi.bulkApproveStage(selectedOrg.id, "domains", operatorName)
                          )
                        }
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white"
                      >
                        اعتماد كل النطاقات
                      </button>
                    </div>
                    <div className="space-y-2.5">
                      {selectedOrg.domains.map((dom) => (
                        <div key={dom.id} className="rounded-xl border border-slate-800 bg-slate-950/70 p-3.5 text-xs">
                          <div className="flex items-center justify-between">
                            <div className="font-bold text-white">
                              {dom.name_ar} <span className="text-slate-400">({dom.table_count} كائن)</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`rounded-full border px-2 py-0.5 ${statusBadge(dom.status)}`}>
                                {dom.status}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  void runAction(`اعتماد النطاق ${dom.name_ar}`, () =>
                                    onboardingApi.reviewDomain(selectedOrg.id, dom.id, {
                                      decision: "approve",
                                      operator_name: operatorName,
                                    })
                                  )
                                }
                                className="rounded bg-emerald-600 px-2.5 py-1 text-white"
                              >
                                اعتماد
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  void runAction(`تصعيد النطاق ${dom.name_ar}`, () =>
                                    onboardingApi.reviewDomain(selectedOrg.id, dom.id, {
                                      decision: "escalate",
                                      operator_name: operatorName,
                                      note: "يتطلب مراجعة مالك النطاق",
                                    })
                                  )
                                }
                                className="rounded bg-amber-600 px-2.5 py-1 text-white"
                              >
                                تصعيد
                              </button>
                            </div>
                          </div>
                          <p className="mt-1 text-slate-400">{dom.description}</p>
                        </div>
                      ))}
                    </div>

                    {/* نقل ودمج سريع */}
                    {selectedOrg.domains.length >= 2 && (
                      <div className="grid grid-cols-1 gap-3 border-t border-slate-800 pt-3 md:grid-cols-2 text-xs">
                        <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                          <div className="font-semibold text-slate-200">نقل كائن إلى نطاق آخر</div>
                          <select
                            value={moveTableRef}
                            onChange={(e) => setMoveTableRef(e.target.value)}
                            className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-white"
                          >
                            <option value="">اختر كائناً...</option>
                            {selectedOrg.physical_catalog.map((t) => (
                              <option key={t.object_ref} value={t.object_ref}>
                                {t.schema_qualified_name}
                              </option>
                            ))}
                          </select>
                          <select
                            value={moveTargetDomainId}
                            onChange={(e) => setMoveTargetDomainId(e.target.value)}
                            className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-white"
                          >
                            <option value="">اختر النطاق الهدف...</option>
                            {selectedOrg.domains.map((d) => (
                              <option key={d.id} value={d.id}>
                                {d.name_ar}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            disabled={!moveTableRef || !moveTargetDomainId}
                            onClick={() =>
                              void runAction("تم نقل الكائن إلى النطاق المحدد.", () =>
                                onboardingApi.moveTableToDomain(selectedOrg.id, {
                                  table_ref: moveTableRef,
                                  target_domain_id: moveTargetDomainId,
                                  operator_name: operatorName,
                                })
                              )
                            }
                            className="rounded bg-cyan-600 px-3 py-1.5 font-semibold text-white disabled:opacity-40"
                          >
                            نقل الكائن
                          </button>
                        </div>
                        <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                          <div className="font-semibold text-slate-200">دمج نطاقين متشابهين</div>
                          <div className="flex flex-wrap gap-2">
                            {selectedOrg.domains.map((d) => (
                              <label key={d.id} className="flex items-center gap-1 text-slate-300">
                                <input
                                  type="checkbox"
                                  checked={mergeSelectedIds.includes(d.id)}
                                  onChange={(e) =>
                                    setMergeSelectedIds((prev) =>
                                      e.target.checked ? [...prev, d.id] : prev.filter((x) => x !== d.id)
                                    )
                                  }
                                />
                                <span>{d.name_ar}</span>
                              </label>
                            ))}
                          </div>
                          <input
                            value={mergeNameAr}
                            onChange={(e) => setMergeNameAr(e.target.value)}
                            placeholder="اسم النطاق المدمج"
                            className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-white"
                          />
                          <button
                            type="button"
                            disabled={mergeSelectedIds.length < 2 || mergeNameAr.trim().length < 2}
                            onClick={() =>
                              void runAction("تم دمج النطاقات بنجاح.", () =>
                                onboardingApi.mergeDomains(selectedOrg.id, {
                                  domain_ids: mergeSelectedIds,
                                  name_ar: mergeNameAr,
                                  description: "نطاق موحد بعد الدمج البشري.",
                                  operator_name: operatorName,
                                })
                              )
                            }
                            className="rounded bg-cyan-600 px-3 py-1.5 font-semibold text-white disabled:opacity-40"
                          >
                            تنفيذ الدمج
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* المرحلة 4 */}
                {activeStage === "concepts" && (
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-base font-bold text-white">المرحلة 4: المفاهيم العربية والتصنيف الأمني</h3>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            void runAction("تم تحديث المفاهيم مع حماية المعتمد منها.", () =>
                              onboardingApi.generateConcepts(selectedOrg.id, {
                                operator_name: operatorName,
                                regenerate: true,
                              })
                            )
                          }
                          className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-200"
                        >
                          إعادة توليد غير المعتمد
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            void runAction("تم اعتماد جميع المفاهيم.", () =>
                              onboardingApi.bulkApproveStage(selectedOrg.id, "concepts", operatorName)
                            )
                          }
                          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white"
                        >
                          اعتماد الكل
                        </button>
                      </div>
                    </div>
                    <div className="max-h-80 space-y-2 overflow-y-auto">
                      {selectedOrg.concepts.slice(0, 60).map((con) => (
                        <div key={con.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-xs">
                          <div>
                            <div className="font-semibold text-white">
                              {con.name_ar} — <span className="text-cyan-300">{con.technical_name}</span>
                            </div>
                            <div className="text-slate-400">
                              النوع: {con.source_type} | التصنيف: {con.classification ?? "public"}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className={`rounded-full border px-2 py-0.5 ${statusBadge(con.status)}`}>
                              {con.status}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                void runAction(`اعتماد المفهوم ${con.name_ar}`, () =>
                                  onboardingApi.reviewConcept(selectedOrg.id, con.id, {
                                    decision: "approve",
                                    operator_name: operatorName,
                                  })
                                )
                              }
                              className="rounded bg-emerald-600 px-2 py-1 text-white"
                            >
                              اعتماد
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                void runAction(`استبعاد المفهوم ${con.name_ar}`, () =>
                                  onboardingApi.reviewConcept(selectedOrg.id, con.id, {
                                    decision: "reject",
                                    operator_name: operatorName,
                                    note: "حجب عن الكتالوج المعتمد",
                                  })
                                )
                              }
                              className="rounded bg-rose-600 px-2 py-1 text-white"
                            >
                              حجب
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* المرحلة 5 */}
                {activeStage === "relationships" && (
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-base font-bold text-white">المرحلة 5: العلاقات الفيزيائية والدلالية</h3>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            void runAction("تم توليد مرشحي العلاقات.", async () => {
                              await onboardingApi.analyzeRelationships(selectedOrg.id, {
                                operator_name: operatorName,
                                use_ai: approveExternalAI,
                                approve_external_ai: approveExternalAI,
                              });
                            })
                          }
                          className="rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-bold text-white"
                        >
                          تحليل مرشحي العلاقات
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            void runAction("تم اعتماد العلاقات المعلقة.", () =>
                              onboardingApi.bulkApproveStage(selectedOrg.id, "relationships", operatorName)
                            )
                          }
                          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white"
                        >
                          اعتماد المعلّق
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2 rounded-xl border border-slate-800 bg-slate-950/50 p-3 md:grid-cols-4 text-xs">
                      <select
                        value={relSourceCol}
                        onChange={(e) => setRelSourceCol(e.target.value)}
                        className="rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-white"
                      >
                        <option value="">عمود المصدر...</option>
                        {allColumns.map((c) => (
                          <option key={c.ref} value={c.ref}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                      <select
                        value={relTargetCol}
                        onChange={(e) => setRelTargetCol(e.target.value)}
                        className="rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-white"
                      >
                        <option value="">عمود الهدف...</option>
                        {allColumns.map((c) => (
                          <option key={c.ref} value={c.ref}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                      <input
                        value={relLabel}
                        onChange={(e) => setRelLabel(e.target.value)}
                        placeholder="وصف العلاقة اليدوية"
                        className="rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-white"
                      />
                      <button
                        type="button"
                        disabled={!relSourceCol || !relTargetCol || relLabel.trim().length < 2}
                        onClick={() =>
                          void runAction("تمت إضافة العلاقة اليدوية.", async () => {
                            await onboardingApi.createManualRelationship(selectedOrg.id, {
                              source_column_refs: [relSourceCol],
                              target_column_refs: [relTargetCol],
                              cardinality: relCardinality,
                              label: relLabel,
                              rationale: "إضافة يدوية من شاشة المراجعة.",
                              operator_name: operatorName,
                            });
                            setRelLabel("");
                          })
                        }
                        className="rounded bg-cyan-600 px-3 py-1.5 font-semibold text-white disabled:opacity-40"
                      >
                        إضافة علاقة يدوية
                      </button>
                    </div>

                    <div className="space-y-2">
                      {selectedOrg.relationships.map((rel) => (
                        <div key={rel.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-xs">
                          <div>
                            <div className="font-bold text-white">{rel.label}</div>
                            <div className="text-slate-400">
                              {rel.source_table}.{rel.source_column} → {rel.target_table}.{rel.target_column} |{" "}
                              <span className="text-cyan-300">
                                {rel.origin === "declared" ? "مفتاح أجنبي معلن" : rel.origin === "manual" ? "يدوي" : "مقترح بالذكاء"}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className={`rounded-full border px-2 py-0.5 ${statusBadge(rel.status)}`}>{rel.status}</span>
                            <button
                              type="button"
                              onClick={() =>
                                void runAction("اعتماد العلاقة.", async () => {
                                  await onboardingApi.reviewRelationship(selectedOrg.id, rel.id, {
                                    decision: "approve",
                                    operator_name: operatorName,
                                  });
                                })
                              }
                              className="rounded bg-emerald-600 px-2 py-1 text-white"
                            >
                              اعتماد
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                void runAction("رفض العلاقة.", async () => {
                                  await onboardingApi.reviewRelationship(selectedOrg.id, rel.id, {
                                    decision: "reject",
                                    operator_name: operatorName,
                                  });
                                })
                              }
                              className="rounded bg-rose-600 px-2 py-1 text-white"
                            >
                              رفض
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* المرحلة 6 */}
                {activeStage === "activation" && (
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-bold text-white">المرحلة 6: بوابة التفعيل والربط بـ pgvector و Catalog v2</h3>
                      <span className={`rounded-full border px-3 py-1 text-xs ${statusBadge(selectedOrg.status)}`}>
                        {selectedOrg.status === "active" ? "مفعّلة ومفهرسة" : readiness?.ready ? "جاهزة للتفعيل" : "محجوبة بالمعوقات"}
                      </span>
                    </div>

                    {readiness && readiness.blockers.length > 0 && (
                      <div className="space-y-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200">
                        {readiness.blockers.map((b) => (
                          <div key={b.code}>• المرحلة {b.stage}: {b.message}</div>
                        ))}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 text-xs">
                      <input
                        value={handoverNote}
                        onChange={(e) => setHandoverNote(e.target.value)}
                        className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                      />
                      <button
                        type="button"
                        disabled={busy || selectedOrg.status === "active" || !readiness?.ready}
                        onClick={() =>
                          void runAction("تم تفعيل المؤسسة وفهرسة المعرفة المعتمدة في pgvector.", () =>
                            onboardingApi.activateOrganization(selectedOrg.id, {
                              operator_name: operatorName,
                              handover_note: handoverNote,
                            })
                          )
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 font-bold text-white disabled:opacity-40"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        <span>اعتماد التسليم وتفعيل Catalog v2</span>
                      </button>
                    </div>

                    {selectedOrg.status === "active" && (
                      <div className="space-y-4 border-t border-slate-800 pt-4">
                        <div>
                          <h4 className="mb-2 text-xs font-bold text-cyan-300">
                            مشاهد Catalog v2 المعتمدة الجاهزة لوكيل SQL ({catalogEntries.length})
                          </h4>
                          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                            {catalogEntries.map((entry) => (
                              <div key={entry.view} className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-xs">
                                <div className="font-bold text-white">{entry.view}</div>
                                <div className="mt-1 text-slate-400">{entry.description}</div>
                                <div className="mt-1.5 text-[11px] text-emerald-300">
                                  الأعمدة ({entry.columns.length}) | المصدر: {entry.source}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                          <div className="flex gap-2">
                            <input
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              placeholder="ابحث دلالياً بالعربية (مثال: الطلاب والرسوم)"
                              className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white"
                            />
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  const hits = await onboardingApi.semanticSearch(selectedOrg.id, searchQuery);
                                  setSearchHits(hits);
                                } catch (err) {
                                  setErrorMsg(err instanceof Error ? err.message : "فشل البحث الدلالي");
                                }
                              }}
                              className="inline-flex items-center gap-1 rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white"
                            >
                              <Search className="h-3.5 w-3.5" />
                              <span>بحث دلالي</span>
                            </button>
                          </div>
                          {searchHits.map((hit) => (
                            <div key={hit.entry_id} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 text-xs">
                              <span>
                                <strong className="text-cyan-300">{hit.label_ar}</strong> ({hit.schema_qualified_name})
                              </span>
                              <span className="num text-slate-400">تشابه: {hit.score.toFixed(3)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* المرحلتان 7 و 8 */}
                {(activeStage === "monitoring" || activeStage === "schema") && (
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-base font-bold text-white">المرحلتان 7 و 8: مراقبة المخطط والمزامنة التزايدية</h3>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={busy || selectedOrg.status !== "active"}
                          onClick={() =>
                            void runAction("تم فحص صحة المخطط مقابل خط الأساس.", () =>
                              onboardingApi.monitorSchema(selectedOrg.id, {
                                operator_name: operatorName,
                                passwords: ephemeralPasswords,
                              })
                            )
                          }
                          className="rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-40"
                        >
                          فحص المخطط الآن
                        </button>
                        <button
                          type="button"
                          disabled={busy || selectedOrg.status !== "active"}
                          onClick={() =>
                            void runAction("تمت مزامنة التغييرات المعتمدة مع pgvector.", () =>
                              onboardingApi.syncSemanticCatalog(selectedOrg.id, operatorName)
                            )
                          }
                          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-40"
                        >
                          مزامنة الفهرس والكتالوج
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {selectedOrg.schema_changes.map((chg) => (
                        <div key={chg.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-xs">
                          <div>
                            <div className="font-bold text-white">{chg.title}</div>
                            <div className="text-slate-400">{chg.details}</div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className={`rounded-full border px-2 py-0.5 ${statusBadge(chg.status)}`}>{chg.status}</span>
                            {chg.status === "pending" && (
                              <>
                                <button
                                  type="button"
                                  onClick={() =>
                                    void runAction("اعتماد تغيير المخطط.", () =>
                                      onboardingApi.decideSchemaChange(selectedOrg.id, chg.id, {
                                        decision: "approve",
                                        operator_name: operatorName,
                                      })
                                    )
                                  }
                                  className="rounded bg-emerald-600 px-2.5 py-1 text-white"
                                >
                                  اعتماد للمزامنة
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    void runAction("رفض التغيير.", () =>
                                      onboardingApi.decideSchemaChange(selectedOrg.id, chg.id, {
                                        decision: "reject",
                                        operator_name: operatorName,
                                      })
                                    )
                                  }
                                  className="rounded bg-rose-600 px-2.5 py-1 text-white"
                                >
                                  تجاهل
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                      {selectedOrg.schema_changes.length === 0 && (
                        <p className="text-xs text-slate-400">لا توجد تغييرات معلّقة في المخطط. الحالة مستقرة.</p>
                      )}
                    </div>
                  </div>
                )}

                {/* التحكم في إعادة تعيين المراحل وسجل التدقيق */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-xs space-y-2.5">
                    <div className="flex items-center gap-1.5 font-bold text-amber-300">
                      <RotateCcw className="h-4 w-4" />
                      <span>إعادة تعيين مرحلة وتبعياتها بأمان</span>
                    </div>
                    <div className="flex gap-2">
                      <select
                        value={resetTarget}
                        onChange={(e) => setResetTarget(e.target.value)}
                        className="rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-white"
                      >
                        {STAGES.map((s) => (
                          <option key={s.key} value={s.key}>
                            {s.num}. {s.label}
                          </option>
                        ))}
                      </select>
                      <input
                        value={resetReason}
                        onChange={(e) => setResetReason(e.target.value)}
                        placeholder="سبب إعادة التعيين"
                        className="flex-1 rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-white"
                      />
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          void runAction(`تمت إعادة تعيين المرحلة (${resetTarget}) والمراحل التابعة لها.`, () =>
                            onboardingApi.resetStage(selectedOrg.id, resetTarget, {
                              operator_name: operatorName,
                              reason: resetReason,
                              confirm: true,
                            })
                          )
                        }
                        className="rounded bg-amber-600 px-3 py-1.5 font-bold text-white"
                      >
                        تصفير
                      </button>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-xs">
                    <div className="mb-2 font-bold text-white">آخر إجراءات التدقيق البشري</div>
                    <div className="max-h-28 space-y-1.5 overflow-y-auto text-slate-300">
                      {selectedOrg.audit_logs.slice(0, 6).map((log) => (
                        <div key={log.id} className="flex justify-between border-b border-slate-800/70 pb-1">
                          <span>
                            <strong className="text-cyan-300">{log.actor}</strong>: {log.details}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
