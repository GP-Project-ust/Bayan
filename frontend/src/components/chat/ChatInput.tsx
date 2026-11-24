"use client";

import React, { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Lightbulb, MessageSquare, PlusCircle, Send, Square } from "lucide-react";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onStop?: () => void;
  onNewChat: () => void;
  isStreaming: boolean;
  hasConversation: boolean;
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
  hasConversation,
  className = "",
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [examplesOpen, setExamplesOpen] = useState(false);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        180,
        Math.max(52, textareaRef.current.scrollHeight)
      )}px`;
    }
  }, [value]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (!isStreaming && value.trim().length >= 2) {
        onSend();
      }
    }
  };

  const handleChipClick = (question: string) => {
    if (isStreaming) return;
    onChange(question);
    textareaRef.current?.focus();
  };

  const examples = (
    <div className="cx-examples" role="group" aria-label="أمثلة جاهزة للأسئلة">
      {EXAMPLE_QUESTIONS.map((question) => (
        <button
          key={question}
          type="button"
          className="cx-example"
          onClick={() => handleChipClick(question)}
          disabled={isStreaming}
        >
          <MessageSquare size={14} aria-hidden="true" />
          <span>{question}</span>
        </button>
      ))}
    </div>
  );

  return (
    <div className={`cx-composer ${className}`}>
      {hasConversation ? (
        <>
          <div className="cx-composer-top">
            <button
              type="button"
              className="cx-btn"
              onClick={() => setExamplesOpen((open) => !open)}
              aria-expanded={examplesOpen}
              aria-controls="cx-example-questions"
            >
              <Lightbulb size={14} aria-hidden="true" />
              <span>أمثلة الأسئلة</span>
              {examplesOpen ? (
                <ChevronUp size={14} aria-hidden="true" />
              ) : (
                <ChevronDown size={14} aria-hidden="true" />
              )}
            </button>
          </div>
          {examplesOpen && <div id="cx-example-questions">{examples}</div>}
        </>
      ) : (
        examples
      )}

      <div className="cx-box">
        <label htmlFor="bayan-chat-input" className="sr-only">
          سؤالك باللغة العربية
        </label>
        <textarea
          id="bayan-chat-input"
          ref={textareaRef}
          dir="rtl"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="اكتب سؤالك بالعربية…"
          disabled={isStreaming}
          className="cx-textarea"
          maxLength={2000}
        />

        <div className="cx-actions">
          <span className="cx-hint">
            {isStreaming
              ? "الرد قيد الإنشاء — يمكنك الإيقاف في أي وقت"
              : "Enter للإرسال، وShift+Enter لسطر جديد"}
          </span>
          {value.length >= 1600 && (
            <span className="cx-counter" aria-live="polite">
              {value.length}/2000
            </span>
          )}
          <div className="cx-actions-buttons">
            <button
              type="button"
              className="cx-btn"
              onClick={onNewChat}
              disabled={isStreaming}
              title="بدء محادثة جديدة"
            >
              <PlusCircle size={15} aria-hidden="true" />
              <span>محادثة جديدة</span>
            </button>

            {isStreaming ? (
              <button type="button" className="cx-stop" onClick={onStop}>
                <Square size={14} fill="currentColor" aria-hidden="true" />
                <span>إيقاف</span>
              </button>
            ) : (
              <button
                type="button"
                className="cx-send"
                onClick={onSend}
                disabled={value.trim().length < 2}
              >
                <Send size={16} aria-hidden="true" />
                <span>إرسال</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
