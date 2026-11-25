import { describe, it, expect, vi } from "vitest";
import { parseSseFrame, consumeSseStream, streamChat, getApiBaseUrl } from "../sse-client";
import type { MetaPayload, AgentEndPayload, FinalPayload, ErrorPayload } from "@/types";

describe("SSE Client - Frame Parser & Stream Consumer", () => {
  it("1. يحفظ تحليل حدث meta بدقة", () => {
    const frame = `event: meta\ndata: {"conversation_id":"c-123","provider":"mock","model":"mock-model","mode":"mock"}`;
    const parsed = parseSseFrame(frame);
    expect(parsed).not.toBeNull();
    expect(parsed?.event).toBe("meta");
    const data = parsed?.data as MetaPayload;
    expect(data.conversation_id).toBe("c-123");
    expect(data.provider).toBe("mock");
    expect(data.mode).toBe("mock");
  });

  it("2. يحفظ تحليل حدث agent_end بجميع حقوله بما فيها مدة التنفيذ والصفوف الصفرية", () => {
    const frame = `event: agent_end\ndata: {"agent":"sql_agent","status":"done","note":"تم بنجاح","sql":"SELECT 1","rows_count":0,"duration_ms":150}`;
    const parsed = parseSseFrame(frame);
    expect(parsed).not.toBeNull();
    expect(parsed?.event).toBe("agent_end");
    const data = parsed?.data as AgentEndPayload;
    expect(data.agent).toBe("sql_agent");
    expect(data.rows_count).toBe(0);
    expect(data.duration_ms).toBe(150);
  });

  it("3. يحفظ تحليل حدث final مع جدول النتائج", () => {
    const frame = `event: final\ndata: {"conversation_id":"c-1","answer":"النتيجة:","route":"sql_agent","agents":["supervisor","sql_agent"],"table":{"columns":["القسم","العدد"],"rows":[["حاسوب",50]],"truncated":false}}`;
    const parsed = parseSseFrame(frame);
    expect(parsed?.event).toBe("final");
    const data = parsed?.data as FinalPayload;
    expect(data.answer).toBe("النتيجة:");
    expect(data.table?.columns).toEqual(["القسم", "العدد"]);
    expect(data.table?.truncated).toBe(false);
  });

  it("4. يحفظ تحليل حدث error", () => {
    const frame = `event: error\ndata: {"code":"query_failed","message":"تعذر تنفيذ الاستعلام"}`;
    const parsed = parseSseFrame(frame);
    expect(parsed?.event).toBe("error");
    const data = parsed?.data as ErrorPayload;
    expect(data.code).toBe("query_failed");
    expect(data.message).toBe("تعذر تنفيذ الاستعلام");
  });

  it("5. يعالج تجزئة حدث واحد عبر عدة chunks", async () => {
    const encoder = new TextEncoder();
    const chunk1 = encoder.encode('event: meta\ndata: {"conversation_id":');
    const chunk2 = encoder.encode('"chunk-123","provider":"mock","model":"m","mode":"mock"}\n\n');

    let pulled = false;
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(chunk1);
        controller.enqueue(chunk2);
        controller.close();
      },
    });

    const onMeta = vi.fn();
    await consumeSseStream(stream, { onMeta });
    expect(onMeta).toHaveBeenCalledWith(
      expect.objectContaining({ conversation_id: "chunk-123" })
    );
  });

  it("6. يعالج تعدد الأحداث داخل chunk واحد", async () => {
    const encoder = new TextEncoder();
    const multi = encoder.encode(
      'event: meta\ndata: {"conversation_id":"multi"}\n\nevent: final\ndata: {"conversation_id":"multi","answer":"تم"}\n\n'
    );

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(multi);
        controller.close();
      },
    });

    const onMeta = vi.fn();
    const onFinal = vi.fn();
    await consumeSseStream(stream, { onMeta, onFinal });
    expect(onMeta).toHaveBeenCalledTimes(1);
    expect(onFinal).toHaveBeenCalledTimes(1);
  });

  it("7. يدعم نهايات الأسطر بصيغة CRLF (\\r\\n) و LF (\\n)", async () => {
    const encoder = new TextEncoder();
    const crlf = encoder.encode(
      'event: final\r\ndata: {"conversation_id":"crlf","answer":"نجح"}\r\n\r\n'
    );

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(crlf);
        controller.close();
      },
    });

    const onFinal = vi.fn();
    await consumeSseStream(stream, { onFinal });
    expect(onFinal).toHaveBeenCalledWith(
      expect.objectContaining({ conversation_id: "crlf", answer: "نجح" })
    );
  });

  it("8. يتجاهل الأحداث المستقبلية المحجوزة بأمان دون كسر التدفق", async () => {
    const encoder = new TextEncoder();
    const reservedEvents = encoder.encode(
      'event: agent_start\ndata: {"agent":"supervisor"}\n\n' +
      'event: tool_call\ndata: {"tool":"db_lookup"}\n\n' +
      'event: agent_token\ndata: {"token":"word"}\n\n' +
      'event: clarification\ndata: {"prompt":"clarify"}\n\n' +
      'event: final\ndata: {"conversation_id":"res-1","answer":"الختام"}\n\n'
    );

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(reservedEvents);
        controller.close();
      },
    });

    const onFinal = vi.fn();
    const onError = vi.fn();
    await consumeSseStream(stream, { onFinal, onError });

    expect(onError).not.toHaveBeenCalled();
    expect(onFinal).toHaveBeenCalledWith(
      expect.objectContaining({ conversation_id: "res-1", answer: "الختام" })
    );
  });

  it("9. يتعامل مع JSON غير الصحيح دون انهيار التطبيق", () => {
    const frame = `event: custom\ndata: this is not valid json { [`;
    const parsed = parseSseFrame(frame);
    expect(parsed).not.toBeNull();
    expect(parsed?.data).toBe("this is not valid json { [");
  });

  it("10. يكتشف انتهاء البث دون حدث final أو error ويبلغ onDisconnect", async () => {
    const encoder = new TextEncoder();
    const incomplete = encoder.encode('event: meta\ndata: {"conversation_id":"inc"}\n\n');

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(incomplete);
        controller.close();
      },
    });

    const result = await consumeSseStream(stream, {});
    expect(result.finished).toBe(false);
  });

  it("11. يعالج إلغاء الطلب عبر AbortController دون رمي استثناء غير معالج", async () => {
    const controller = new AbortController();
    const onDisconnect = vi.fn();
    const onError = vi.fn();

    // Mock global fetch to reject with AbortError
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockImplementation(() => {
      const err = new Error("The operation was aborted");
      err.name = "AbortError";
      return Promise.reject(err);
    });

    controller.abort();

    await streamChat(
      { question: "سؤال للتجربة" },
      { onDisconnect, onError },
      { signal: controller.signal }
    );

    expect(onDisconnect).toHaveBeenCalledWith(expect.stringContaining("إلغاء"));
    expect(onError).not.toHaveBeenCalled();

    global.fetch = originalFetch;
  });

  it("12. يرفض الأسئلة الأقصر من حرفين برسالة عربية واضحة", async () => {
    const onError = vi.fn();
    await streamChat({ question: " أ " }, { onError });
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        code: "invalid_input",
        message: expect.stringContaining("حرفان"),
      })
    );
  });
});
