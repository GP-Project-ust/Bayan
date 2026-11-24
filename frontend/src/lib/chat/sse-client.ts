/**
 * عميل بث الأحداث الموحّد (SSE Client) لنظام بيان.
 * يتصل بـ POST /api/v1/chat/stream ويحلل الأحداث المتدفقة يدوياً وفق العقد الدستوري.
 */

import type {
  ChatRequest,
  SSEEventCallbacks,
  MetaPayload,
  AgentEndPayload,
  FinalPayload,
  ErrorPayload,
} from "@/types";

/**
 * استخراج عنوان الـ API الأساسي من متغيرات البيئة مع قيمة افتراضية آمنة
 */
export function getApiBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (typeof envUrl === "string" && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, "");
  }
  return "http://localhost:8000";
}

/**
 * تحليل إطار SSE مفرد واستخراج اسم الحدث وبياناته.
 * يدعم المعيار الرسمي للـ SSE:
 * - تجميع أسطر data المتعددة بفواصل سطرية
 * - تجاهل التعليقات التي تبدأ بنقطتين (:)
 * - استخراج اسم الحدث من أسطر event:
 */
export function parseSseFrame(frame: string): { event: string; data: unknown; raw: string } | null {
  const clean = frame.trim();
  if (!clean) return null;

  let eventName = "message";
  const dataLines: string[] = [];

  for (const line of clean.split("\n")) {
    const trimmed = line.replace(/\r$/, "");
    if (!trimmed || trimmed.startsWith(":")) continue; // تعليق SSE

    if (trimmed.startsWith("event:")) {
      eventName = trimmed.slice(6).trim();
    } else if (trimmed.startsWith("data:")) {
      dataLines.push(trimmed.slice(5).replace(/^ /, ""));
    }
  }

  const rawData = dataLines.join("\n");
  let parsedData: unknown = rawData;

  if (rawData) {
    try {
      parsedData = JSON.parse(rawData);
    } catch {
      // التعامل الآمن مع JSON غير الصحيح كقيمة نصية خام
      parsedData = rawData;
    }
  }

  return { event: eventName, data: parsedData, raw: rawData };
}

/**
 * محلل دفق SSE يدوي متكامل يعتمد على ReadableStream و TextDecoder.
 * يدعم:
 * - تجزئة البيانات عبر عدة chunks
 * - فواصل CRLF و LF
 * - معالجة JSON غير الصحيح دون إسقاط التطبيق
 * - تجاهل الأحداث المحجوزة مستقبلاً بأمان
 */
export async function consumeSseStream(
  body: ReadableStream<Uint8Array>,
  callbacks: SSEEventCallbacks
): Promise<{ finished: boolean }> {
  const reader = body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  let receivedFinalOrError = false;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      buffer = buffer.replace(/\r\n/g, "\n"); // توحيد نهايات الأسطر

      let cutIndex = buffer.indexOf("\n\n");
      while (cutIndex !== -1) {
        const frameText = buffer.slice(0, cutIndex);
        buffer = buffer.slice(cutIndex + 2);

        const frame = parseSseFrame(frameText);
        if (frame) {
          dispatchSseEvent(frame.event, frame.data, callbacks);
          if (frame.event === "final" || frame.event === "error") {
            receivedFinalOrError = true;
          }
        }

        cutIndex = buffer.indexOf("\n\n");
      }
    }

    // معالجة أي إطار أخير متبقٍ في المخزن المؤقت
    buffer += decoder.decode();
    if (buffer.trim()) {
      const frame = parseSseFrame(buffer);
      if (frame) {
        dispatchSseEvent(frame.event, frame.data, callbacks);
        if (frame.event === "final" || frame.event === "error") {
          receivedFinalOrError = true;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return { finished: receivedFinalOrError };
}

/**
 * توجيه حدث SSE للـ Callback المناسب مع تجاهل الأحداث المستقبلية المحجوزة
 */
function dispatchSseEvent(event: string, data: unknown, callbacks: SSEEventCallbacks): void {
  switch (event) {
    case "meta":
      if (data && typeof data === "object") {
        callbacks.onMeta?.(data as MetaPayload);
      }
      break;

    case "agent_end":
      if (data && typeof data === "object") {
        callbacks.onAgentEnd?.(data as AgentEndPayload);
      }
      break;

    case "final":
      if (data && typeof data === "object") {
        callbacks.onFinal?.(data as FinalPayload);
      }
      break;

    case "error":
      if (data && typeof data === "object") {
        callbacks.onError?.(data as ErrorPayload);
      } else {
        callbacks.onError?.({
          code: "unknown_error",
          message: typeof data === "string" ? data : "حدث خطأ غير معروف أثناء البث.",
        });
      }
      break;

    case "agent_start":
    case "agent_token":
    case "clarification":
    case "tool_call":
    default:
      // أحداث مستقبلية محجوزة — تُتجاهل بأمان لحماية استمرارية البث
      break;
  }
}

/**
 * خيارات إرسال طلب المحادثة المتدفقة
 */
export interface StreamChatOptions {
  signal?: AbortSignal;
  baseUrl?: string;
}

/**
 * الوظيفة المركزية لبدء طلب محادثة متدفق مع الخادم
 */
export async function streamChat(
  request: ChatRequest,
  callbacks: SSEEventCallbacks,
  options?: StreamChatOptions
): Promise<void> {
  const trimmed = request.question?.trim() || "";
  if (trimmed.length < 2) {
    callbacks.onError?.({
      code: "invalid_input",
      message: "السؤال قصير جداً — الحد الأدنى حرفان وفق عقد الخادم.",
    });
    return;
  }

  const baseUrl = options?.baseUrl || getApiBaseUrl();
  const endpoint = `${baseUrl}/api/v1/chat/stream`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify({
        question: trimmed,
        conversation_id: request.conversation_id || null,
      }),
      signal: options?.signal,
    });

    if (!response.ok) {
      let detail = "";
      try {
        const errJson = await response.json();
        detail = errJson?.detail ? String(errJson.detail) : JSON.stringify(errJson);
      } catch {
        detail = await response.text().catch(() => "");
      }

      callbacks.onError?.({
        code: `http_${response.status}`,
        message:
          response.status >= 500
            ? "تعذر إكمال الطلب بسبب خطأ في الخادم (HTTP " + response.status + ")."
            : "رفض الخادم الطلب (HTTP " + response.status + ")" + (detail ? ` — ${detail}` : "."),
      });
      return;
    }

    if (!response.body) {
      throw new Error("لا يوجد جسم استجابة قابل للقراءة (ReadableStream غير متاح).");
    }

    const { finished } = await consumeSseStream(response.body, callbacks);

    if (!finished) {
      callbacks.onDisconnect?.("انقطع الاتصال بالخادم قبل اكتمال الاستجابة (لم يصل حدث final).");
      callbacks.onError?.({
        code: "stream_interrupted",
        message: "انقطع البث قبل استلام الإجابة النهائية. تحقق من الخادم وحاول مجدداً.",
      });
    }
  } catch (error: unknown) {
    if (options?.signal?.aborted) {
      // إلغاء يدوي من المستخدم — لا يعتبر خطأ تشغيلياً فادحاً
      callbacks.onDisconnect?.("تم إلغاء الطلب من قِبل المستخدم.");
      return;
    }

    const errorMsg = error instanceof Error ? error.message : String(error);
    callbacks.onError?.({
      code: "network_error",
      message: `تعذر الاتصال بالخادم (${baseUrl}). تأكد من تشغيل الخلفية وحاول مجدداً.`,
    });
    callbacks.onDisconnect?.(errorMsg);
  }
}
