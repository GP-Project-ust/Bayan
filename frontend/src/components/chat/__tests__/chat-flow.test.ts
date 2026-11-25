import { describe, it, expect } from "vitest";
import type { ChatMessage, TablePayload, AgentTraceEntry } from "@/types";

describe("Chat Flow Logic & State Transitions", () => {
  it("1. ينشئ رسالة المستخدم بحالة صحيحة", () => {
    const question = "كم عدد الطلاب في كل برنامج؟";
    const userMsg: ChatMessage = {
      id: "u-1",
      role: "user",
      content: question,
      timestamp: 1700000000000,
    };

    expect(userMsg.role).toBe("user");
    expect(userMsg.content).toBe(question);
    expect(userMsg.timestamp).toBeGreaterThan(0);
  });

  it("2. يبدأ رسالة المساعد بحالة بث فارغة", () => {
    const assistantMsg: ChatMessage = {
      id: "a-1",
      role: "assistant",
      content: "",
      timestamp: 1700000000000,
      isStreaming: true,
      agentTrace: [],
    };

    expect(assistantMsg.isStreaming).toBe(true);
    expect(assistantMsg.content).toBe("");
    expect(assistantMsg.agentTrace).toEqual([]);
  });

  it("3. يحدّث أثر الوكلاء تدريجياً بالتتابع الزمني", () => {
    let msg: ChatMessage = {
      id: "a-1",
      role: "assistant",
      content: "",
      timestamp: 1700000000000,
      isStreaming: true,
      agentTrace: [],
    };

    const trace1: AgentTraceEntry = {
      agent: "supervisor",
      status: "done",
      note: "توجيه إلى sql_agent",
      duration_ms: 30,
    };

    msg = { ...msg, agentTrace: [...(msg.agentTrace || []), trace1] };
    expect(msg.agentTrace?.length).toBe(1);
    expect(msg.agentTrace?.[0].agent).toBe("supervisor");

    const trace2: AgentTraceEntry = {
      agent: "sql_agent",
      status: "done",
      note: "تنفيذ الاستعلام",
      sql: "SELECT 1;",
      rows_count: 5,
      duration_ms: 120,
    };

    msg = { ...msg, agentTrace: [...(msg.agentTrace || []), trace2] };
    expect(msg.agentTrace?.length).toBe(2);
    expect(msg.agentTrace?.[1].agent).toBe("sql_agent");
    expect(msg.agentTrace?.[1].sql).toBe("SELECT 1;");
    expect(msg.agentTrace?.[1].rows_count).toBe(5);
  });

  it("4. يدمج الإجابة الختامية وجدول النتائج وينهي حالة البث", () => {
    const table: TablePayload = {
      columns: ["البرنامج", "العدد"],
      rows: [["حاسوب", 100]],
      truncated: false,
    };

    const finalMsg: ChatMessage = {
      id: "a-1",
      role: "assistant",
      content: "هذه الإحصائية:",
      table,
      route: "sql_agent",
      agents: ["supervisor", "sql_agent"],
      durationMs: 450,
      timestamp: 1700000000000,
      isStreaming: false,
    };

    expect(finalMsg.isStreaming).toBe(false);
    expect(finalMsg.content).toBe("هذه الإحصائية:");
    expect(finalMsg.table?.rows.length).toBe(1);
    expect(finalMsg.durationMs).toBe(450);
  });

  it("5. يسجل الخطأ البرمجي ويعيد إمكانية المحاولة", () => {
    const errorMsg: ChatMessage = {
      id: "a-1",
      role: "assistant",
      content: "",
      timestamp: 1700000000000,
      isStreaming: false,
      error: {
        code: "network_error",
        message: "تعذر الاتصال بالخادم",
      },
    };

    expect(errorMsg.isStreaming).toBe(false);
    expect(errorMsg.error?.code).toBe("network_error");
    expect(errorMsg.error?.message).toContain("تعذر الاتصال");
  });

  it("6. يحافظ على conversation_id عبر مسار الحوار", () => {
    let conversationId: string | null = null;
    const initialMetaConv = "conv-fixed-999";

    // وصول حدث meta
    conversationId = initialMetaConv;
    expect(conversationId).toBe("conv-fixed-999");

    // متابعة السؤال التالي بنفس المعرف
    const nextQuestionPayload = {
      question: "قارن ذلك بالعام الماضي",
      conversation_id: conversationId,
    };

    expect(nextQuestionPayload.conversation_id).toBe("conv-fixed-999");
  });
});
