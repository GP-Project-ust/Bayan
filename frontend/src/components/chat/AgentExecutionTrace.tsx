"use client";

import React, { useId, useState } from "react";
import type { AgentTraceEntry } from "@/types";
import { ChevronDown, ChevronUp, Clock, Database, ListTree } from "lucide-react";

interface AgentExecutionTraceProps {
  traces?: AgentTraceEntry[];
  isStreaming?: boolean;
  defaultExpanded?: boolean;
  className?: string;
}

const AGENT_LABELS: Record<string, string> = {
  supervisor: "المشرف",
  sql_agent: "وكيل SQL",
  rag_agent: "وكيل الاسترجاع",
  analyst_agent: "المحلل",
  reporter_agent: "المُعِدّ",
};

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  done: { label: "اكتمل", className: "is-done" },
  failed: { label: "فشل", className: "is-failed" },
  skipped: { label: "تخطّى", className: "is-skipped" },
};

export function AgentExecutionTrace({
  traces = [],
  isStreaming = false,
  defaultExpanded = false,
  className = "",
}: AgentExecutionTraceProps) {
  const [expanded, setExpanded] = useState(defaultExpanded || isStreaming);
  const panelId = useId();

  if (traces.length === 0) return null;

  const countLabel =
    traces.length === 1 ? "وكيل واحد" : traces.length === 2 ? "وكيلان" : `${traces.length} وكلاء`;

  return (
    <div className={className}>
      <button
        type="button"
        className="cx-toggle"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        aria-controls={panelId}
      >
        <ListTree size={15} aria-hidden="true" />
        <span>أثر التنفيذ</span>
        <span className="cx-toggle-count">
          {countLabel}
          {isStreaming ? " — جارٍ التنفيذ" : ""}
        </span>
        {expanded ? (
          <ChevronUp size={16} className="cx-chevron" aria-hidden="true" />
        ) : (
          <ChevronDown size={16} className="cx-chevron" aria-hidden="true" />
        )}
      </button>

      {expanded && (
        <div className="cx-trace" id={panelId} role="list">
          {traces.map((trace, index) => {
            const status = STATUS_LABELS[trace.status || "done"] || STATUS_LABELS.done;
            const hasDuration =
              trace.duration_ms !== null &&
              trace.duration_ms !== undefined &&
              !Number.isNaN(Number(trace.duration_ms));
            const hasRows =
              trace.rows_count !== null &&
              trace.rows_count !== undefined &&
              !Number.isNaN(Number(trace.rows_count));

            return (
              <div className="cx-trace-row" key={`${trace.agent}-${index}`} role="listitem">
                <span className="cx-trace-agent">
                  {AGENT_LABELS[trace.agent] || trace.agent || "وكيل"}
                </span>
                <span className={`cx-trace-status ${status.className}`}>{status.label}</span>
                {trace.note && <p className="cx-trace-note">{trace.note}</p>}
                {(hasDuration || hasRows) && (
                  <div className="cx-trace-meta">
                    {hasDuration && (
                      <span>
                        <Clock size={12} aria-hidden="true" />
                        {Number(trace.duration_ms)} ms
                      </span>
                    )}
                    {hasRows && (
                      <span>
                        <Database size={12} aria-hidden="true" />
                        {Number(trace.rows_count)} صف
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
