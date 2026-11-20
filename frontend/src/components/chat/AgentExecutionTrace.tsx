"use client";

import React, { useState } from "react";
import type { AgentTraceEntry } from "@/types";
import { SQLCodeBlock } from "./SQLCodeBlock";
import {
  Activity,
  ChevronDown,
  ChevronUp,
  Clock,
  Database,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Cpu,
} from "lucide-react";

interface AgentExecutionTraceProps {
  traces?: AgentTraceEntry[];
  isStreaming?: boolean;
  defaultExpanded?: boolean;
  className?: string;
}

const AGENT_META: Record<
  string,
  { label: string; color: string; badgeBg: string; border: string }
> = {
  supervisor: {
    label: "المشرف (Supervisor)",
    color: "#f59e0b",
    badgeBg: "rgba(245, 158, 11, 0.15)",
    border: "rgba(245, 158, 11, 0.4)",
  },
  sql_agent: {
    label: "وكيل SQL (SQL Agent)",
    color: "#2dd4bf",
    badgeBg: "rgba(45, 212, 191, 0.15)",
    border: "rgba(45, 212, 191, 0.4)",
  },
  rag_agent: {
    label: "وكيل الاسترجاع (RAG Agent)",
    color: "#a78bfa",
    badgeBg: "rgba(167, 139, 250, 0.15)",
    border: "rgba(167, 139, 250, 0.4)",
  },
  analyst_agent: {
    label: "المحلل (Analyst Agent)",
    color: "#fb7185",
    badgeBg: "rgba(251, 113, 133, 0.15)",
    border: "rgba(251, 113, 133, 0.4)",
  },
  reporter_agent: {
    label: "المُعِدّ (Reporter Agent)",
    color: "#38bdf8",
    badgeBg: "rgba(56, 189, 248, 0.15)",
    border: "rgba(56, 189, 248, 0.4)",
  },
};

const STATUS_CONFIG: Record<
  string,
  { label: string; className: string; icon: React.ReactNode }
> = {
  done: {
    label: "اكتمل",
    className: "bayan-status-done",
    icon: <CheckCircle2 size={13} aria-hidden="true" />,
  },
  failed: {
    label: "فشل",
    className: "bayan-status-failed",
    icon: <XCircle size={13} aria-hidden="true" />,
  },
  skipped: {
    label: "تخطّى",
    className: "bayan-status-skipped",
    icon: <MinusCircle size={13} aria-hidden="true" />,
  },
};

export function AgentExecutionTrace({
  traces = [],
  isStreaming = false,
  defaultExpanded = true,
  className = "",
}: AgentExecutionTraceProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  if (!traces || traces.length === 0) {
    if (!isStreaming) return null;
    return (
      <div className={`bayan-trace-container empty ${className}`}>
        <div className="bayan-trace-loading">
          <Activity size={16} className="animate-pulse text-teal-400" />
          <span>جارٍ تتبع خطوات الوكلاء...</span>
        </div>
      </div>
    );
  }

  const agentCount = traces.length;

  return (
    <div className={`bayan-trace-container ${className}`}>
      {/* ترويسة أثر الوكلاء القابلة للطي */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="bayan-trace-toggle"
        aria-expanded={expanded}
        aria-controls="bayan-agent-traces-list"
      >
        <div className="flex items-center gap-2">
          <Cpu size={16} className="text-teal-400" aria-hidden="true" />
          <span className="font-semibold text-bayan-100">أثر تنفيذ الوكلاء</span>
          <span className="bayan-trace-badge">
            {agentCount} {agentCount === 1 ? "وكيل" : "وكلاء"}
          </span>
          {isStreaming && (
            <span className="bayan-trace-live-pulse" title="بث حي مستمر">
              جارٍ التنفيذ...
            </span>
          )}
        </div>
        <div className="text-bayan-400">
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </button>

      {/* قائمة بطاقات الوكلاء */}
      {expanded && (
        <div id="bayan-agent-traces-list" className="bayan-trace-cards">
          {traces.map((trace, idx) => {
            const conf = AGENT_META[trace.agent] || {
              label: trace.agent || "وكيل غير معروف",
              color: "#94a3b8",
              badgeBg: "rgba(148, 163, 184, 0.15)",
              border: "rgba(148, 163, 184, 0.4)",
            };

            const statusKey = trace.status || "done";
            const statusConf = STATUS_CONFIG[statusKey] || {
              label: statusKey,
              className: "bayan-status-done",
              icon: <CheckCircle2 size={13} aria-hidden="true" />,
            };

            const hasDuration =
              trace.duration_ms !== null &&
              trace.duration_ms !== undefined &&
              !Number.isNaN(Number(trace.duration_ms));

            const hasRows =
              trace.rows_count !== null &&
              trace.rows_count !== undefined &&
              !Number.isNaN(Number(trace.rows_count));

            return (
              <article
                key={`trace-${idx}-${trace.agent}`}
                className="bayan-agent-card"
                style={
                  {
                    "--agent-color": conf.color,
                    "--agent-soft": conf.badgeBg,
                    borderInlineStartColor: conf.color,
                  } as React.CSSProperties
                }
              >
                {/* رأس البطاقة: اسم الوكيل والحالة */}
                <div className="bayan-card-head">
                  <span
                    className="bayan-agent-badge"
                    style={{
                      color: conf.color,
                      backgroundColor: conf.badgeBg,
                      borderColor: conf.border,
                    }}
                  >
                    {conf.label}
                  </span>
                  <span className={`bayan-status-pill ${statusConf.className}`}>
                    {statusConf.icon}
                    <span>{statusConf.label}</span>
                  </span>
                </div>

                {/* ملاحظة الوكيل */}
                {trace.note && <p className="bayan-card-note">{trace.note}</p>}

                {/* كتلة استعلام SQL إن وُجد */}
                {typeof trace.sql === "string" && trace.sql.trim() && (
                  <SQLCodeBlock sql={trace.sql} />
                )}

                {/* بيانات التنفيذ الوصفية (مدة التنفيذ + عدد الصفوف) */}
                {(hasDuration || hasRows) && (
                  <div className="bayan-card-meta">
                    {hasDuration && (
                      <span className="bayan-meta-pill duration">
                        <Clock size={12} aria-hidden="true" />
                        <span>مدة التنفيذ: {Number(trace.duration_ms)} ms</span>
                      </span>
                    )}
                    {hasRows && (
                      <span className="bayan-meta-pill rows">
                        <Database size={12} aria-hidden="true" />
                        <span>عدد الصفوف: {Number(trace.rows_count)}</span>
                      </span>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
