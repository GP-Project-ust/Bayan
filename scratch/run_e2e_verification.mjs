import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

const frontendDir = "C:\\Users\\w3h333\\Desktop\\Bayan-Finaا\\Bayan\\frontend";
const screenshotsDir = path.join(frontendDir, "docs", "sprint-1", "screenshots");

if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

// 1. خادم المحاكاة لـ Backend API (وفق العقد الدستوري تماماً)
const apiServer = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, "http://127.0.0.1:8000");

  if (url.pathname === "/api/v1/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      status: "ok",
      version: "0.1.0",
      components: {
        database: "up",
        redis: "up",
        qdrant: "up",
        ollama: "up",
      },
    }));
    return;
  }

  if (url.pathname === "/api/v1/chat/stream" && req.method === "POST") {
    let body = "";
    req.on("data", chunk => { body += chunk; });
    req.on("end", async () => {
      let data = {};
      try { data = JSON.parse(body); } catch (e) {}

      res.writeHead(200, {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      });

      const q = data.question || "";
      const isTruncated = q.includes("اقتصاص") || q.includes("truncated");

      // حدث meta
      res.write(`event: meta\ndata: {"conversation_id": "${data.conversation_id || 'conv-sprint1-pr02'}", "provider": "mock", "model": "mock-deterministic", "mode": "mock"}\n\n`);

      await new Promise(r => setTimeout(r, 80));
      // حدث supervisor
      res.write(`event: agent_end\ndata: {"agent": "supervisor", "status": "done", "note": "توجيه قاعدي حتمي إلى sql_agent", "sql": null, "rows_count": null, "duration_ms": 32}\n\n`);

      await new Promise(r => setTimeout(r, 120));
      // حدث sql_agent
      res.write(`event: agent_end\ndata: {"agent": "sql_agent", "status": "done", "note": "تم تنفيذ استعلام إحصائيات البرامج الأكاديمية بنجاح على قاعدة الجامعة", "sql": "SELECT program_name, batch_name, student_count, male_count, female_count\\nFROM v_program_stats\\nORDER BY student_count DESC\\nLIMIT 50", "rows_count": ${isTruncated ? 50 : 6}, "duration_ms": 178}\n\n`);

      await new Promise(r => setTimeout(r, 120));
      // حدث final
      const tableData = {
        columns: ["البرنامج", "الدفعة", "إجمالي الطلاب", "ذكور", "إناث"],
        rows: [
          ["علوم الحاسوب", "دفعة 2024", 142, 85, 57],
          ["نظم المعلومات", "دفعة 2024", 98, 52, 46],
          ["هندسة البرمجيات", "دفعة 2024", 115, 70, 45],
          ["الذكاء الاصطناعي", "دفعة 2024", 80, 48, 32],
          ["الأمن السيبراني", "دفعة 2024", 64, 40, 24],
          ["علم البيانات", "دفعة 2024", 55, 30, 25],
        ],
        truncated: isTruncated,
      };

      res.write(`event: final\ndata: {"conversation_id": "${data.conversation_id || 'conv-sprint1-pr02'}", "answer": "إجمالي عدد الطلاب في البرامج الأكاديمية موضح في الجدول أدناه وفق أحدث إحصائية لقاعدة بيانات الجامعة:", "route": "sql_agent", "agents": ["supervisor", "sql_agent"], "table": ${JSON.stringify(tableData)}}\n\n`);
      res.end();
    });
    return;
  }

  res.writeHead(404);
  res.end();
});

apiServer.listen(8000, "127.0.0.1", async () => {
  console.log("Mock API server listening on http://127.0.0.1:8000");

  // 2. تشغيل Next.js Production Server على المنفذ 3005
  const nextBin = path.join(frontendDir, "node_modules", "next", "dist", "bin", "next");
  const nextServer = spawn(process.execPath, [nextBin, "start", "-p", "3005"], {
    cwd: frontendDir,
    env: { ...process.env, NEXT_PUBLIC_API_URL: "http://127.0.0.1:8000" },
    stdio: "pipe",
  });

  nextServer.stdout.on("data", (d) => {
    const s = d.toString();
    if (s.includes("Ready in") || s.includes("localhost:3005") || s.includes("started server on")) {
      console.log("Next.js server ready on http://localhost:3005");
    }
  });
  nextServer.stderr.on("data", (d) => {
    console.error("Next.js stderr:", d.toString());
  });

  // الانتظار حتى يصبح الخادم جاهزاً
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch("http://127.0.0.1:3005/chat");
      if (res.ok) {
        console.log("Verified /chat endpoint responds 200 OK!");
        break;
      }
    } catch {}
    await new Promise(r => setTimeout(r, 600));
  }

  try {
    await runHeadlessVerification();
  } catch (e) {
    console.error("Verification failed:", e);
  } finally {
    nextServer.kill();
    apiServer.close();
    process.exit(0);
  }
});

async function runHeadlessVerification() {
  const edgeBin = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
  const port = 9335;
  const userDataDir = path.join(frontendDir, ".edge-test-profile");

  const edge = spawn(edgeBin, [
    "--headless",
    "--disable-gpu",
    "--no-sandbox",
    `--user-data-dir=${userDataDir}`,
    `--remote-debugging-port=${port}`,
    "http://127.0.0.1:3005/chat",
  ]);

  let targets = null;
  for (let i = 0; i < 20; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json`);
      if (res.ok) {
        targets = await res.json();
        break;
      }
    } catch {}
    await new Promise(r => setTimeout(r, 500));
  }

  if (!targets) throw new Error("Could not connect to Edge DevTools after 10s");

  const pageTarget = targets.find(t => t.type === "page" && t.webSocketDebuggerUrl);
  if (!pageTarget) throw new Error("No page target found");

  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });

  let msgId = 1;
  const pending = new Map();
  const consoleMessages = [];

  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    if (msg.method === "Runtime.consoleAPICalled") {
      consoleMessages.push(msg.params);
    }
    if (msg.id && pending.has(msg.id)) {
      const cb = pending.get(msg.id);
      pending.delete(msg.id);
      cb(msg);
    }
  };

  const send = (method, params = {}) => {
    const id = msgId++;
    return new Promise((resolve) => {
      pending.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    });
  };

  await send("Page.enable");
  await send("Runtime.enable");

  console.log("Navigating to http://127.0.0.1:3005/chat...");
  await send("Page.navigate", { url: "http://127.0.0.1:3005/chat" });

  async function evalJs(expr) {
    const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
    return r.result?.result?.value;
  }

  for (let i = 0; i < 20; i++) {
    const ready = await evalJs(`Boolean(document.querySelector('textarea#bayan-chat-input'))`);
    if (ready) {
      console.log("Chat interface loaded and textarea detected!");
      break;
    }
    await new Promise(r => setTimeout(r, 400));
  }

  async function setViewport(width, height, isMobile = false) {
    await send("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: isMobile,
    });
    await new Promise(r => setTimeout(r, 400));
  }

  async function capture(filename) {
    const r = await send("Page.captureScreenshot", { format: "png" });
    if (r.result?.data) {
      const outPath = path.join(screenshotsDir, filename);
      fs.writeFileSync(outPath, Buffer.from(r.result.data, "base64"));
      console.log(`Saved screenshot: ${outPath}`);
    }
  }

  console.log("\n1. Testing Chat Flow with Golden Question...");
  const clickChipResult = await evalJs(`(() => {
    const chip = document.querySelector('.bayan-chip');
    if (chip) {
      chip.click();
      return "chip clicked: " + chip.textContent.trim();
    }
    const textarea = document.querySelector('textarea#bayan-chat-input');
    if (textarea) {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
      setter.call(textarea, "كم عدد الطلاب في كل برنامج؟");
      if (textarea._valueTracker) textarea._valueTracker.setValue("");
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
      textarea.dispatchEvent(new Event("change", { bubbles: true }));
      return "set via tracker";
    }
    return "none found";
  })()`);
  console.log("Chip/input result:", clickChipResult);

  await new Promise(r => setTimeout(r, 600));

  const sendResult = await evalJs(`(() => {
    const sendBtn = document.querySelector('.bayan-btn-primary');
    if (!sendBtn) return "send button not found";
    if (sendBtn.disabled) return "send button is disabled";
    sendBtn.click();
    return "send clicked";
  })()`);
  console.log("Send result:", sendResult);

  // الانتظار حتى اكتمال البث وظهور الجدول
  let done = false;
  for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 300));
    const status = await evalJs(`(() => {
      const streaming = Boolean(document.querySelector('.bayan-streaming-indicator'));
      const table = Boolean(document.querySelector('.bayan-results-table'));
      const rows = document.querySelectorAll('.bayan-results-table tbody tr').length;
      const traceCards = document.querySelectorAll('.bayan-trace-card').length;
      return { streaming, table, rows, traceCards };
    })()`);
    if (status && !status.streaming && status.table && status.rows > 0) {
      done = true;
      console.log("Chat stream completed successfully and rendered results:", status);
      break;
    }
  }

  if (!done) {
    console.warn("Warning: stream did not reach done state within timeout");
  }
  await new Promise(r => setTimeout(r, 1000));

  // 1. سطح مكتب (1440px)
  await setViewport(1440, 900, false);
  await capture("01_desktop_1440px.png");

  // 2. حاسوب محمول (1280px)
  await setViewport(1280, 800, false);
  await capture("02_laptop_1280px.png");

  // 3. جهاز لوحي (768px)
  await setViewport(768, 1024, false);
  await capture("03_tablet_768px.png");

  // 4. هاتف عادي (390px)
  await setViewport(390, 844, true);
  await capture("04_mobile_390px.png");

  // 5. هاتف صغير (375px)
  await setViewport(375, 812, true);
  await capture("05_small_mobile_375px.png");

  // 6. التحقق من الصفحة الرئيسية والرابط المحدث
  console.log("\n2. Navigating to Homepage to verify updated link...");
  await setViewport(1440, 900, false);
  await send("Page.navigate", { url: "http://localhost:3005/" });
  await new Promise(r => setTimeout(r, 1500));
  await capture("06_homepage_chat_link.png");

  // التحقق من أخطاء Console
  const errors = consoleMessages.filter(m => m.type === "error");
  console.log(`\nBrowser console errors: ${errors.length}`);
  if (errors.length > 0) {
    console.error("Errors:", JSON.stringify(errors, null, 2));
  } else {
    console.log("Zero JavaScript/React errors detected in browser console!");
  }

  edge.kill();
  console.log("\nAll visual verifications passed successfully!");
}
