"use client";

import React, { useState, useEffect, useRef } from "react";
import type { ChatMessage, MetaPayload, AgentTraceEntry } from "@/types";
import { streamChat } from "@/lib/chat/sse-client";
import { ChatHeader } from "./ChatHeader";
import { UserMessage } from "./UserMessage";
import { AssistantMessage } from "./AssistantMessage";
import { ChatInput } from "./ChatInput";
import { Sparkles, MessageSquare, Bot } from "lucide-react";

const STORAGE_KEY_CONV_ID = "bayan_chat_conv_id";
const STORAGE_KEY_MSGS = "bayan_chat_messages";

export function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [meta, setMeta] = useState<MetaPayload | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef<number>(0);

  // استعادة الجلسة السابقة من sessionStorage عند التحميل
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const savedId = sessionStorage.getItem(STORAGE_KEY_CONV_ID);
        if (savedId) setConversationId(savedId);

        const savedMsgs = sessionStorage.getItem(STORAGE_KEY_MSGS);
        if (savedMsgs) {
          const parsed = JSON.parse(savedMsgs);
          if (Array.isArray(parsed)) setMessages(parsed);
        }
      } catch {
        // تجاهل أي خطأ في قراءة التخزين المحلي
      }
    }
  }, []);

  // التمرير التلقائي لأسفل عند وصول رسائل جديدة أو تحديثات البث
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  // حفظ المحادثة في sessionStorage
  const persistSession = (convId: string | null, msgs: ChatMessage[]) => {
    if (typeof window === "undefined") return;
    try {
      if (convId) sessionStorage.setItem(STORAGE_KEY_CONV_ID, convId);
      sessionStorage.setItem(STORAGE_KEY_MSGS, JSON.stringify(msgs));
    } catch {
      // التعامل مع حدود تخزين المتصفح
    }
  };

  // إرسال السؤال عبر عميل SSE الموحد
  const handleSend = async (overrideQuestion?: string) => {
    const questionText = (overrideQuestion || inputValue).trim();
    if (isStreaming || questionText.length < 2) return;

    setInputValue("");
    setIsStreaming(true);
    startTimeRef.current = Date.now();

    const userMsgId = `user-${Date.now()}`;
    const assistantMsgId = `assistant-${Date.now() + 1}`;

    const userMessage: ChatMessage = {
      id: userMsgId,
      role: "user",
      content: questionText,
      timestamp: Date.now(),
    };

    const initialAssistantMessage: ChatMessage = {
      id: assistantMsgId,
      role: "assistant",
      content: "",
      timestamp: Date.now(),
      isStreaming: true,
      agentTrace: [],
    };

    const nextMessages = [...messages, userMessage, initialAssistantMessage];
    setMessages(nextMessages);

    // إعداد وحدة التحكم في الإلغاء
    const controller = new AbortController();
    abortControllerRef.current = controller;

    let currentConvId = conversationId;

    await streamChat(
      {
        question: questionText,
        conversation_id: currentConvId,
      },
      {
        onMeta: (metaData) => {
          setMeta(metaData);
          if (metaData.conversation_id) {
            currentConvId = metaData.conversation_id;
            setConversationId(metaData.conversation_id);
          }
        },

        onAgentEnd: (trace) => {
          setMessages((prev) => {
            const copy = [...prev];
            const targetIdx = copy.findIndex((m) => m.id === assistantMsgId);
            if (targetIdx !== -1) {
              const currentTrace = copy[targetIdx].agentTrace || [];
              const updatedTrace: AgentTraceEntry[] = [...currentTrace, trace];
              copy[targetIdx] = {
                ...copy[targetIdx],
                agentTrace: updatedTrace,
              };
            }
            return copy;
          });
        },

        onFinal: (finalData) => {
          const totalDuration = Date.now() - startTimeRef.current;
          if (finalData.conversation_id) {
            currentConvId = finalData.conversation_id;
            setConversationId(finalData.conversation_id);
          }

          setMessages((prev) => {
            const copy = [...prev];
            const targetIdx = copy.findIndex((m) => m.id === assistantMsgId);
            if (targetIdx !== -1) {
              copy[targetIdx] = {
                ...copy[targetIdx],
                content: finalData.answer || "(تم إكمال الاستعلام)",
                table: finalData.table || null,
                route: finalData.route,
                agents: finalData.agents,
                durationMs: totalDuration,
                isStreaming: false,
              };
            }
            persistSession(currentConvId, copy);
            return copy;
          });

          setIsStreaming(false);
          abortControllerRef.current = null;
        },

        onError: (err) => {
          setMessages((prev) => {
            const copy = [...prev];
            const targetIdx = copy.findIndex((m) => m.id === assistantMsgId);
            if (targetIdx !== -1) {
              copy[targetIdx] = {
                ...copy[targetIdx],
                error: err,
                isStreaming: false,
              };
            }
            persistSession(currentConvId, copy);
            return copy;
          });

          setIsStreaming(false);
          abortControllerRef.current = null;
        },

        onDisconnect: () => {
          setIsStreaming(false);
          abortControllerRef.current = null;
        },
      },
      { signal: controller.signal }
    );
  };

  // إيقاف البث النشط
  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
  };

  // بدء محادثة جديدة ومسح الجلسة
  const handleNewChat = () => {
    if (isStreaming) return;
    setMessages([]);
    setConversationId(null);
    setMeta(null);
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(STORAGE_KEY_CONV_ID);
      sessionStorage.removeItem(STORAGE_KEY_MSGS);
    }
  };

  // إعادة محاولة السؤال الأخير
  const handleRetry = () => {
    if (isStreaming) return;
    // العثور على آخر سؤال للمستخدم
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    if (lastUserMsg) {
      // إزالة رسالة المساعد الفاشلة السابقة
      const filtered = messages.slice(0, -1);
      setMessages(filtered);
      handleSend(lastUserMsg.content);
    }
  };

  return (
    <div className="bayan-chat-layout" dir="rtl">
      {/* الترويسة الرئيسية */}
      <ChatHeader
        provider={meta?.provider}
        model={meta?.model}
        mode={meta?.mode}
      />

      {/* منطقة الرسائل والمحادثة */}
      <main className="bayan-chat-main" role="main" aria-label="مساحة المحادثة">
        <div className="bayan-messages-container">
          {messages.length === 0 ? (
            /* بطاقة الترحيب عند بدء جلسة جديدة */
            <div className="bayan-welcome-hero">
              <div className="bayan-welcome-icon-box">
                <Bot size={36} className="text-teal-400" aria-hidden="true" />
              </div>
              <h2 className="text-xl font-bold text-bayan-50">
                مرحباً بك في واجهة بيان الذكية
              </h2>
              <p className="bayan-welcome-desc">
                اسأل باللغة العربية عن إحصاءات الطلاب، البرامج الأكاديمية، والرسوم.
                يقوم وكيل SQL بتحليل سؤالك وبناء استعلامات آمنة مع عرض جدول النتائج وأثر التنفيذ.
              </p>
              <div className="bayan-welcome-features">
                <div className="bayan-feature-item">
                  <Sparkles size={16} className="text-gold-400" />
                  <span>توليد آمن لاستعلامات SQL</span>
                </div>
                <div className="bayan-feature-item">
                  <MessageSquare size={16} className="text-teal-400" />
                  <span>بث فوري عبر تقنية SSE</span>
                </div>
                <div className="bayan-feature-item">
                  <Bot size={16} className="text-sky-400" />
                  <span>شفافية كاملة لأثر الوكلاء</span>
                </div>
              </div>
            </div>
          ) : (
            /* قائمة الرسائل المتبادلة */
            <div className="bayan-messages-list">
              {messages.map((msg) =>
                msg.role === "user" ? (
                  <UserMessage key={msg.id} message={msg} />
                ) : (
                  <AssistantMessage
                    key={msg.id}
                    message={msg}
                    onRetry={handleRetry}
                  />
                )
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* خانة كتابة السؤال والأزرار */}
        <ChatInput
          value={inputValue}
          onChange={setInputValue}
          onSend={() => handleSend()}
          onStop={handleStop}
          onNewChat={handleNewChat}
          isStreaming={isStreaming}
          conversationId={conversationId}
        />
      </main>
    </div>
  );
}
