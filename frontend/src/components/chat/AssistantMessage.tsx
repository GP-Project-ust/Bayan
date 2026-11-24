"use client";

import React, { useState } from "react";
import type { ChatMessage } from "@/types";
import { ResultsTable } from "./ResultsTable";
import { AgentExecutionTrace } from "./AgentExecutionTrace";
import { StreamingIndicator } from "./StreamingIndicator";
import { ErrorMessage } from "./ErrorMessage";
import { SQLCodeBlock } from "./SQLCodeBlock";
import { copyText } from "@/lib/chat/clipboard";
import { formatDuration, formatMessageTime } from "@/lib/chat/format";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Compass,
  Copy,
  RefreshCw,
  Terminal,
  Users,
} from "lucide-react";

interface AssistantMessageProps {
  message: ChatMessage;
  onRetry?: () => void;
  onRegenerate?: () => void;
  isLatest?: boolean;
  canRetry?: boolean;
  canRegenerate?: boolean;
  className?: string;
}

type AnswerState = "running" | "done" | "failed" | "stopped";

const STATE_LABELS: Record<AnswerState, string> = {
  running: "جارٍ المعالجة",
  done: "مكتمل",
  failed: "فشل",
  stopped: "متوقف",
};

export function AssistantMessage({
  message,
  onRetry,
  onRegenerate,
  isLatest = false,
  canRetry = false,
  canRegenerate = false,
  className = "",
}: AssistantMessageProps) {
  const [sqlOpen, setSqlOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const hasContent = Boolean(message.content && message.content.trim());
  const hasTable = Boolean(message.table);
  const traces = message.agentTrace || [];
  const hasTrace = traces.length > 0;

  const sqlEntry = [...traces].reverse().find((trace) => typeof trace.sql === "string" && trace.sql.trim());
  const sql = sqlEntry?.sql?.trim() || "";
  const traceCount = traces.length;

  const state: AnswerState = message.error
    ? "failed"
    : message.isStreaming
      ? "running"
      : message.stopped
        ? "stopped"
        : "done";

  const duration = formatDuration(message.durationMs);
  const showActions = state === "done" && (hasContent || hasTable);

  const handleCopyAnswer = async () => {
    const ok = await copyText(message.content || "");
    setCopied(ok);
    if (ok) setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section
      className={`cx-answer ${isLatest ? "is-latest" : ""} ${className}`}
      aria-label="إجابة بيان"
      aria-busy={message.isStreaming || undefined}
    >
      <header className="cx-answer-head">
        <span className="cx-author">إجابة بيان</span>
        <span className={`cx-state is-${state}`}>{STATE_LABELS[state]}</span>
      </header>

      {message.isStreaming && !hasContent && (
        <StreamingIndicator startTime={message.timestamp} />
      )}

      {state === "stopped" && !hasContent && (
        <div className="cx-stopped">تم إيقاف الطلب قبل اكتمال الإجابة.</div>
      )}

      {hasContent && <p className="cx-answer-text">{message.content}</p>}

      {hasTable && <ResultsTable table={message.table} />}

      {message.error && (
        <ErrorMessage error={message.error} onRetry={canRetry ? onRetry : undefined} />
      )}

      {showActions && (
        <div className="cx-answer-actions">
          {hasContent && (
            <button
              type="button"
              className="cx-act"
              onClick={handleCopyAnswer}
              data-done={copied ? "true" : undefined}
              aria-label={copied ? "تم نسخ الإجابة" : "نسخ نص الإجابة"}
            >
              {copied ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}
              <span>{copied ? "تم النسخ" : "نسخ الإجابة"}</span>
            </button>
          )}

          {canRegenerate && onRegenerate && (
            <button type="button" className="cx-act" onClick={onRegenerate}>
              <RefreshCw size={13} aria-hidden="true" />
              <span>إعادة التوليد</span>
            </button>
          )}
        </div>
      )}

      {(sql || hasTrace) && (
        <div className="cx-disclosures">
          {sql && (
            <div>
              <button
                type="button"
                className="cx-toggle"
                onClick={() => setSqlOpen((value) => !value)}
                aria-expanded={sqlOpen}
                aria-controls={`cx-sql-${message.id}`}
              >
                <Terminal size={15} aria-hidden="true" />
                <span>استعلام SQL</span>
                {sqlOpen ? (
                  <ChevronUp size={16} className="cx-chevron" aria-hidden="true" />
                ) : (
                  <ChevronDown size={16} className="cx-chevron" aria-hidden="true" />
                )}
              </button>
              {sqlOpen && (
                <div id={`cx-sql-${message.id}`} style={{ marginTop: 8 }}>
                  <SQLCodeBlock sql={sql} />
                </div>
              )}
            </div>
          )}

          {hasTrace && (
            <AgentExecutionTrace
              traces={traces}
              isStreaming={message.isStreaming}
              defaultExpanded={Boolean(message.isStreaming)}
            />
          )}
        </div>
      )}

      {!message.isStreaming && !message.error && (
        <footer className="cx-foot">
          {message.route && (
            <span>
              <Compass size={12} aria-hidden="true" />
              المسار: <bdi dir="ltr">{message.route}</bdi>
            </span>
          )}
          {message.agents && message.agents.length > 0 && (
            <span>
              <Users size={12} aria-hidden="true" />
              الوكلاء: <bdi dir="ltr">{message.agents.join(", ")}</bdi>
            </span>
          )}
          {traceCount > 0 && <span>أثر التنفيذ: {traceCount}</span>}
          {duration && (
            <span>
              <Clock size={12} aria-hidden="true" />
              {duration}
            </span>
          )}
          <time dateTime={new Date(message.timestamp).toISOString()}>
            {formatMessageTime(message.timestamp)}
          </time>
        </footer>
      )}
    </section>
  );
}
