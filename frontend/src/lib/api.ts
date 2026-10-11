/** عميل واجهة بيان البرمجية — كل نداءات الشبكة في مكان واحد. */

import type { ChatResponse, HealthResponse } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function getHealth(): Promise<HealthResponse> {
  const res = await fetch(`${API_URL}/api/v1/health`, { cache: "no-store" });
  if (!res.ok) throw new Error(`فشل فحص الصحة: ${res.status}`);
  return res.json();
}

export async function sendChat(question: string): Promise<ChatResponse> {
  const res = await fetch(`${API_URL}/api/v1/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });
  if (!res.ok) throw new Error(`فشل إرسال السؤال: ${res.status}`);
  return res.json();
}
