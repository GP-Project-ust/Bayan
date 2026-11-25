"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChatMessage, MetaPayload, AgentTraceEntry } from "@/types";
import { streamChat } from "@/lib/chat/sse-client";
import {
  clearSession,
  loadDraft,
  loadSession,
  saveDraft,
  saveSession,
} from "@/lib/chat/chat-session";
import { ChatLayout } from "@/components/layout";
import { ChatHeader } from "./ChatHeader";
import { SessionDetailsDrawer } from "./SessionDetailsDrawer";
import { UserMessage } from "./UserMessage";
import { AssistantMessage } from "./AssistantMessage";
import { ChatInput } from "./ChatInput";
import { ScrollToLatest } from "./ScrollToLatest";
import { ListTree, ShieldCheck, Table2 } from "lucide-react";

type Exchange = {
  question?: ChatMessage;
  answer?: ChatMessage;
};

/** Distance from the bottom (px) that still counts as "pinned to newest". */
const BOTTOM_THRESHOLD = 56;

/** Group the flat message list into question/answer exchanges for rendering. */
function groupExchanges(messages: ChatMessage[]): Exchange[] {
  const exchanges: Exchange[] = [];

  messages.forEach((message) => {
    if (message.role === "user") {
      exchanges.push({ question: message });
      return;
    }

    const current = exchanges[exchanges.length - 1];
    if (current && !current.answer) {
      current.answer = message;
    } else {
      exchanges.push({ answer: message });
    }
  });

  return exchanges;
}

export function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [meta, setMeta] = useState<MetaPayload | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [sessionOpen, setSessionOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [atBottom, setAtBottom] = useState(true);
  const [hasNewBelow, setHasNewBelow] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const pinnedRef = useRef(true);
  const startTimeRef = useRef<number>(0);

  // Restore the previous session (transcript, model details, draft) on load.
  useEffect(() => {
    const saved = loadSession();
    if (saved) {
      setMessages(saved.messages);
      setConversationId(saved.conversationId);
      setMeta(saved.meta);
    }
    setInputValue(loadDraft());
    setHydrated(true);
  }, []);

  // Mirror the workspace into storage so a reload or a new tab keeps it.
  useEffect(() => {
    if (!hydrated) return;
    if (messages.length === 0 && !conversationId && !meta) {
      clearSession();
      return;
    }
    saveSession({ conversationId, meta, messages });
  }, [hydrated, messages, conversationId, meta]);

  useEffect(() => {
    if (!hydrated) return;
    saveDraft(inputValue);
  }, [hydrated, inputValue]);

  const scrollToLatest = useCallback((behavior: ScrollBehavior = "smooth") => {
    const element = transcriptRef.current;
    if (!element) return;
    element.scrollTo({ top: element.scrollHeight, behavior });
    pinnedRef.current = true;
    setAtBottom(true);
    setHasNewBelow(false);
  }, []);

  const handleTranscriptScroll = useCallback(() => {
    const element = transcriptRef.current;
    if (!element) return;

    const distance = element.scrollHeight - element.scrollTop - element.clientHeight;
    const pinned = distance <= BOTTOM_THRESHOLD;
    pinnedRef.current = pinned;
    setAtBottom(pinned);
    if (pinned) setHasNewBelow(false);
  }, []);

  // Follow new content only while the reader is at the bottom of the transcript.
  useEffect(() => {
    const element = transcriptRef.current;
    if (!element) return;

    if (pinnedRef.current) {
      element.scrollTop = element.scrollHeight;
    } else if (messages.length > 0) {
      setHasNewBelow(true);
    }
  }, [messages, isStreaming]);

  const handleSend = async (overrideQuestion?: string, baseMessages?: ChatMessage[]) => {
    const questionText = (overrideQuestion || inputValue).trim();
    if (isStreaming || questionText.length < 2) return;

    setInputValue("");
    setIsStreaming(true);
    pinnedRef.current = true;
    setHasNewBelow(false);
    startTimeRef.current = Date.now();

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: questionText,
      timestamp: Date.now(),
    };

    const assistantMessageId = `assistant-${Date.now() + 1}`;
    const initialAssistantMessage: ChatMessage = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      timestamp: Date.now(),
      isStreaming: true,
      agentTrace: [],
    };

    setMessages([...(baseMessages ?? messages), userMessage, initialAssistantMessage]);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    let currentConversationId = conversationId;

    await streamChat(
      {
        question: questionText,
        conversation_id: currentConversationId,
      },
      {
        onMeta: (metaData) => {
          setMeta(metaData);
          if (metaData.conversation_id) {
            currentConversationId = metaData.conversation_id;
            setConversationId(metaData.conversation_id);
          }
        },

        onAgentEnd: (trace) => {
          setMessages((prev) => {
            const copy = [...prev];
            const targetIndex = copy.findIndex((message) => message.id === assistantMessageId);
            if (targetIndex !== -1) {
              const currentTrace = copy[targetIndex].agentTrace || [];
              const updatedTrace: AgentTraceEntry[] = [...currentTrace, trace];
              copy[targetIndex] = { ...copy[targetIndex], agentTrace: updatedTrace };
            }
            return copy;
          });
        },

        onFinal: (finalData) => {
          const totalDuration = Date.now() - startTimeRef.current;
          if (finalData.conversation_id) {
            currentConversationId = finalData.conversation_id;
            setConversationId(finalData.conversation_id);
          }

          setMessages((prev) => {
            const copy = [...prev];
            const targetIndex = copy.findIndex((message) => message.id === assistantMessageId);
            if (targetIndex !== -1) {
              copy[targetIndex] = {
                ...copy[targetIndex],
                content: finalData.answer || "(تم إكمال الاستعلام)",
                table: finalData.table || null,
                route: finalData.route,
                agents: finalData.agents,
                durationMs: totalDuration,
                isStreaming: false,
              };
            }
            return copy;
          });

          setIsStreaming(false);
          abortControllerRef.current = null;
        },

        onError: (error) => {
          setMessages((prev) => {
            const copy = [...prev];
            const targetIndex = copy.findIndex((message) => message.id === assistantMessageId);
            if (targetIndex !== -1) {
              copy[targetIndex] = { ...copy[targetIndex], error, isStreaming: false };
            }
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

  const handleStop = () => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsStreaming(false);

    setMessages((prev) =>
      prev.map((message) =>
        message.isStreaming ? { ...message, isStreaming: false, stopped: true } : message
      )
    );
  };

  const handleNewChat = () => {
    if (isStreaming) return;
    setMessages([]);
    setConversationId(null);
    setMeta(null);
    setSessionOpen(false);
    setInputValue("");
    setHasNewBelow(false);
    pinnedRef.current = true;
    clearSession();
  };

  const lastUserIndex = useMemo(() => {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      if (messages[index].role === "user") return index;
    }
    return -1;
  }, [messages]);

  /** Drops the trailing answer and asks the same question again. */
  const handleRegenerate = () => {
    if (isStreaming || lastUserIndex === -1) return;
    const question = messages[lastUserIndex];
    const trimmed = messages.slice(0, lastUserIndex);
    setMessages(trimmed);
    handleSend(question.content, trimmed);
  };

  const handleRetry = () => {
    if (isStreaming) return;
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || lastMessage.role !== "assistant" || !lastMessage.error) return;
    handleRegenerate();
  };

  const exchanges = useMemo(() => groupExchanges(messages), [messages]);
  const lastAssistantId = useMemo(
    () => [...messages].reverse().find((message) => message.role === "assistant")?.id,
    [messages]
  );

  return (
    <ChatLayout
      variant="main"
      onNewChat={handleNewChat}
      activeChat={messages.length > 0 ? messages[0].content : undefined}
    >
      <div className="bayan-chat-page cx-page">
        <ChatHeader
          provider={meta?.provider}
          model={meta?.model}
          mode={meta?.mode}
          isStreaming={isStreaming}
          onNewChat={handleNewChat}
          onOpenSession={() => setSessionOpen(true)}
        />

        <div className="cx-stage">
          <div
            ref={transcriptRef}
            className="cx-transcript"
            role="log"
            aria-live="polite"
            aria-relevant="additions"
            aria-label="سجل المحادثة"
            tabIndex={0}
            onScroll={handleTranscriptScroll}
          >
            {messages.length === 0 ? (
              <div className="cx-empty">
                <h2>اسأل عن بيانات الجامعة</h2>
                <p>
                  اكتب سؤالك بالعربية، وسيبنى بيان الاستعلام المناسب على العروض الذكية المعتمدة،
                  ثم يعرض الإجابة مع النتائج ومسار التنفيذ.
                </p>
                <ul className="cx-caps">
                  <li>
                    <ShieldCheck size={16} aria-hidden="true" />
                    استعلامات قراءة فقط على مصادر البيانات المعتمدة
                  </li>
                  <li>
                    <Table2 size={16} aria-hidden="true" />
                    جدول نتائج مع استعلام SQL المستخدم
                  </li>
                  <li>
                    <ListTree size={16} aria-hidden="true" />
                    أثر تنفيذ لكل وكيل مع الزمن وعدد الصفوف
                  </li>
                </ul>
              </div>
            ) : (
              exchanges.map((exchange, index) => {
                const answer = exchange.answer;
                const answerIsLatest = answer?.id === lastAssistantId;

                return (
                  <div className="cx-exchange" key={exchange.question?.id ?? answer?.id ?? index}>
                    {exchange.question && <UserMessage message={exchange.question} />}
                    {answer && (
                      <AssistantMessage
                        message={answer}
                        isLatest={answerIsLatest}
                        canRetry={answerIsLatest}
                        onRetry={handleRetry}
                        canRegenerate={answerIsLatest && !isStreaming}
                        onRegenerate={handleRegenerate}
                      />
                    )}
                  </div>
                );
              })
            )}
          </div>

          <ScrollToLatest
            visible={messages.length > 0 && !atBottom}
            unread={hasNewBelow && isStreaming}
            onClick={() => scrollToLatest()}
          />
        </div>

        <ChatInput
          value={inputValue}
          onChange={setInputValue}
          onSend={() => handleSend()}
          onStop={handleStop}
          onNewChat={handleNewChat}
          isStreaming={isStreaming}
          hasConversation={messages.length > 0}
        />
      </div>

      <SessionDetailsDrawer
        open={sessionOpen}
        onClose={() => setSessionOpen(false)}
        provider={meta?.provider}
        model={meta?.model}
        mode={meta?.mode}
        conversationId={conversationId}
      />
    </ChatLayout>
  );
}
