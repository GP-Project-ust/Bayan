/**
 * Persistence for the chat workspace. The transcript, the resolved model
 * metadata and the draft question survive reloads and new tabs so the
 * conversation is not lost when the browser is closed.
 */
import type { ChatMessage, MetaPayload } from "@/types";

const SESSION_KEY = "bayan_chat_session_v2";
const DRAFT_KEY = "bayan_chat_draft_v2";

export interface ChatSession {
  conversationId: string | null;
  meta: MetaPayload | null;
  messages: ChatMessage[];
  updatedAt: number;
}

function storage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** A stream interrupted by a reload must not keep looking like it is running. */
export function normalizeMessages(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is ChatMessage => {
      if (!item || typeof item !== "object") return false;
      const candidate = item as Partial<ChatMessage>;
      return (
        typeof candidate.id === "string" &&
        (candidate.role === "user" || candidate.role === "assistant") &&
        typeof candidate.content === "string" &&
        typeof candidate.timestamp === "number"
      );
    })
    .map((message) =>
      message.isStreaming ? { ...message, isStreaming: false, stopped: true } : message
    );
}

export function loadSession(): ChatSession | null {
  const store = storage();
  if (!store) return null;

  try {
    const raw = store.getItem(SESSION_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<ChatSession>;
    const messages = normalizeMessages(parsed.messages);
    const conversationId = typeof parsed.conversationId === "string" ? parsed.conversationId : null;
    const meta =
      parsed.meta && typeof parsed.meta === "object" ? (parsed.meta as MetaPayload) : null;

    if (messages.length === 0 && !conversationId) return null;

    return {
      conversationId,
      meta,
      messages,
      updatedAt: Number(parsed.updatedAt) || 0,
    };
  } catch {
    return null;
  }
}

export function saveSession(session: Omit<ChatSession, "updatedAt">): void {
  const store = storage();
  if (!store) return;

  try {
    store.setItem(
      SESSION_KEY,
      JSON.stringify({ ...session, updatedAt: Date.now() })
    );
  } catch {
    // Storage quota or private mode — the workspace keeps working in memory.
  }
}

export function clearSession(): void {
  const store = storage();
  if (!store) return;
  try {
    store.removeItem(SESSION_KEY);
    store.removeItem(DRAFT_KEY);
  } catch {
    // Ignore.
  }
}

export function loadDraft(): string {
  const store = storage();
  if (!store) return "";
  try {
    return store.getItem(DRAFT_KEY) ?? "";
  } catch {
    return "";
  }
}

export function saveDraft(text: string): void {
  const store = storage();
  if (!store) return;
  try {
    if (text.trim()) store.setItem(DRAFT_KEY, text);
    else store.removeItem(DRAFT_KEY);
  } catch {
    // Ignore.
  }
}
