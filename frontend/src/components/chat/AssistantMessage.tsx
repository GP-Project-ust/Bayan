"use client";

import React from "react";
import type { ChatMessage } from "@/types";
import { ResultsTable } from "./ResultsTable";
import { AgentExecutionTrace } from "./AgentExecutionTrace";
import { StreamingIndicator } from "./StreamingIndicator";
import { ErrorMessage } from "./ErrorMessage";
import { Bot, Compass, Users, Clock } from "lucide-react";

interface AssistantMessageProps {
  message: ChatMessage;
  onRetry?: () => void;
  className?: string;
}

export function AssistantMessage({
  message,
  onRetry,
  className = "",
}: AssistantMessageProps) {
  const formattedTime = new Date(message.timestamp).toLocaleTimeString("ar-SA", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const hasContent = Boolean(message.content && message.content.trim());
  const hasTable = Boolean(message.table);
  const hasTrace = Boolean(message.agentTrace && message.agentTrace.length > 0);

  return (
    <div className={`bayan-msg-row assistant ${className}`}>
      <div className="bayan-avatar assistant" aria-hidden="true">
        <Bot size={20} className="text-gold-400" />
      </div>

      <div className="bayan-msg-bubble assistant">
        {/* حالة البث المباشر النشط قبل وصول الإجابة */}
        {message.isStreaming && !hasContent && (
          <StreamingIndicator startTime={message.timestamp} />
        )}

        {/* نص الإجابة النهائية */}
        {hasContent && (
          <div className="bayan-msg-content text-bayan-100">
            {message.content}
          </div>
        )}

        {/* جدول النتائج عند توفره */}
        {hasTable && <ResultsTable table={message.table} />}

        {/* أثر تنفيذ الوكلاء */}
        {(hasTrace || message.isStreaming) && (
          <AgentExecutionTrace
            traces={message.agentTrace}
            isStreaming={message.isStreaming}
            defaultExpanded={true}
          />
        )}

        {/* رسالة الخطأ وزر إعادة المحاولة عند حدوث خلل */}
        {message.error && (
          <ErrorMessage error={message.error} onRetry={onRetry} />
        )}

        {/* تذييل الرسالة: بيانات المسار، الوكلاء، والمدة الكلية */}
        {!message.isStreaming && !message.error && (
          <div className="bayan-msg-meta">
            {message.route && (
              <span className="bayan-meta-chip">
                <Compass size={12} className="text-teal-400" aria-hidden="true" />
                <span>المسار: </span>
                <bdi dir="ltr">{message.route}</bdi>
              </span>
            )}
            {message.agents && message.agents.length > 0 && (
              <span className="bayan-meta-chip">
                <Users size={12} className="text-bayan-300" aria-hidden="true" />
                <span>الوكلاء: </span>
                <bdi dir="ltr">{message.agents.join("، ")}</bdi>
              </span>
            )}
            {message.durationMs !== undefined && message.durationMs !== null && (
              <span className="bayan-meta-chip">
                <Clock size={12} className="text-sky-400" aria-hidden="true" />
                <span>الزمن: </span>
                <bdi dir="ltr">{(message.durationMs / 1000).toFixed(2)} ث</bdi>
              </span>
            )}
            <span className="bayan-msg-time" aria-label={`وقت الاستجابة: ${formattedTime}`}>
              {formattedTime}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
