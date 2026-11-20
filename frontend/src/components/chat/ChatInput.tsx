"use client";

import React, { useRef, useEffect } from "react";
import { Send, Square, PlusCircle, MessageSquare } from "lucide-react";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onStop?: () => void;
  onNewChat: () => void;
  isStreaming: boolean;
  conversationId?: string | null;
  className?: string;
}

const EXAMPLE_QUESTIONS = [
  "كم عدد الطلاب في كل برنامج؟",
  "من الطلاب الذين عليهم رسوم متأخرة؟",
  "ما هي شروط الترقية؟",
  "قارن أعداد الطلاب بين البرامج",
];

export function ChatInput({
  value,
  onChange,
  onSend,
  onStop,
  onNewChat,
  isStreaming,
  conversationId,
  className = "",
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ضبط الارتفاع التلقائي لخانة الإدخال
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        180,
        Math.max(64, textareaRef.current.scrollHeight)
      )}px`;
    }
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isStreaming && value.trim().length >= 2) {
        onSend();
      }
    }
  };

  const handleChipClick = (q: string) => {
    if (isStreaming) return;
    onChange(q);
    textareaRef.current?.focus();
  };

  return (
    <div className={`bayan-composer-container ${className}`}>
      {/* أمثلة الأسئلة السريعة */}
      <div className="bayan-examples-row" role="group" aria-label="أمثلة جاهزة للأسئلة">
        {EXAMPLE_QUESTIONS.map((q, idx) => (
          <button
            key={`chip-${idx}`}
            type="button"
            className="bayan-chip"
            onClick={() => handleChipClick(q)}
            disabled={isStreaming}
          >
            <MessageSquare size={13} className="text-teal-400" aria-hidden="true" />
            <span>{q}</span>
          </button>
        ))}
      </div>

      {/* حقل الإدخال والأزرار الرئيسية */}
      <div className="bayan-composer-box">
        <label htmlFor="bayan-chat-input" className="sr-only">
          سؤالك باللغة العربية
        </label>
        <textarea
          id="bayan-chat-input"
          ref={textareaRef}
          rows={2}
          dir="rtl"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="اكتب استعلامك بالعربية... (Enter للإرسال، Shift+Enter لسطر جديد)"
          disabled={isStreaming}
          className="bayan-textarea"
          maxLength={2000}
        />

        <div className="bayan-composer-actions">
          {isStreaming ? (
            <button
              type="button"
              onClick={onStop}
              className="bayan-btn bayan-btn-stop"
              aria-label="إيقاف البث الحالي"
            >
              <Square size={16} fill="currentColor" aria-hidden="true" />
              <span>إيقاف</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onSend}
              disabled={isStreaming || value.trim().length < 2}
              className="bayan-btn bayan-btn-primary"
              aria-label="إرسال السؤال"
            >
              <Send size={16} aria-hidden="true" />
              <span>إرسال</span>
            </button>
          )}

          <button
            type="button"
            onClick={onNewChat}
            disabled={isStreaming}
            className="bayan-btn bayan-btn-ghost"
            title="بدء جلسة حوارية جديدة وتوليد معرف محلي"
            aria-label="بدء محادثة جديدة"
          >
            <PlusCircle size={16} aria-hidden="true" />
            <span>محادثة جديدة</span>
          </button>
        </div>
      </div>

      {/* شريط حالة المحادثة السفلي */}
      <div className="bayan-composer-status">
        <div className="bayan-conv-id-wrap">
          <span className="text-bayan-400">معرّف المحادثة:</span>
          <span className="bayan-conv-id" dir="ltr" title={conversationId || "غير محدد بعد"}>
            {conversationId || "— ستولّده الخلفية مع أول استعلام"}
          </span>
        </div>
        <div className="text-2xs text-bayan-400">
          Enter للإرسال • Shift+Enter لسطر جديد
        </div>
      </div>
    </div>
  );
}
