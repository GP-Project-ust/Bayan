import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

const frontendDir = "C:\\Users\\w3h333\\Desktop\\Bayan-Finaا\\Bayan\\frontend";
const outDir = path.join(frontendDir, "docs", "sprint-1", "redesign_verification");
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function run() {
  const edgeBin = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
  const port = 9337;
  const userDataDir = path.join(frontendDir, ".edge-verify-profile");

  const edge = spawn(edgeBin, [
    "--headless",
    "--disable-gpu",
    "--no-sandbox",
    `--user-data-dir=${userDataDir}`,
    `--remote-debugging-port=${port}`,
    "http://localhost:3000/chat",
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

  if (!targets) {
    edge.kill();
    throw new Error("Could not connect to Edge DevTools");
  }

  const pageTarget = targets.find(t => t.type === "page" && t.webSocketDebuggerUrl);
  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
  await new Promise((res, rej) => {
    ws.onopen = res;
    ws.onerror = rej;
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
    return new Promise(res => {
      pending.set(id, res);
      ws.send(JSON.stringify({ id, method, params }));
    });
  };

  await send("Page.enable");
  await send("Runtime.enable");

  async function evalJs(expr) {
    const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
    return r.result?.result?.value;
  }

  async function capture(filename, width = 1440, height = 900, isMobile = false) {
    await send("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: isMobile,
    });
    await new Promise(r => setTimeout(r, 1200));
    const r = await send("Page.captureScreenshot", { format: "png" });
    if (r.result?.data) {
      const filePath = path.join(outDir, filename);
      fs.writeFileSync(filePath, Buffer.from(r.result.data, "base64"));
      console.log(`Saved screenshot: ${filePath}`);
    }
  }

  console.log("Navigating to http://localhost:3000/chat...");
  await send("Page.navigate", { url: "http://localhost:3000/chat" });

  // الانتظار حتى تحميل الصفحة
  for (let i = 0; i < 20; i++) {
    const ready = await evalJs(`Boolean(document.querySelector('.bayan-chat-page'))`);
    if (ready) {
      console.log("Redesigned chat page loaded!");
      break;
    }
    await new Promise(r => setTimeout(r, 500));
  }

  // 1. التقاط الحالة الأولية قبل السؤال (Empty State with Sidebar)
  await capture("00_chat_initial_empty_1440px.png", 1440, 900, false);

  // 2. النقر على شريحة السؤال وإرسال الاستعلام
  console.log("Testing question submission...");
  await evalJs(`(() => {
    const chip = document.querySelector('.bayan-chip');
    if (chip) chip.click();
  })()`);

  await new Promise(r => setTimeout(r, 800));

  const sendClick = await evalJs(`(() => {
    const sendBtn = document.querySelector('.bayan-btn-primary');
    if (sendBtn && !sendBtn.disabled) {
      sendBtn.click();
      return "send button clicked";
    }
    const textarea = document.querySelector('textarea#bayan-chat-input');
    if (textarea) {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
      setter.call(textarea, "كم عدد الطلاب في كل برنامج؟");
      if (textarea._valueTracker) textarea._valueTracker.setValue("");
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
      textarea.dispatchEvent(new Event("change", { bubbles: true }));
      return "value set manually";
    }
    return "send button disabled or missing";
  })()`);
  console.log("Send result 1:", sendClick);

  await new Promise(r => setTimeout(r, 600));

  await evalJs(`(() => {
    const sendBtn = document.querySelector('.bayan-btn-primary');
    if (sendBtn && !sendBtn.disabled) {
      sendBtn.click();
    }
  })()`);

  // انتظار انتهاء البث وظهور النتيجة
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 400));
    const status = await evalJs(`(() => {
      const isStreaming = Boolean(document.querySelector('.bayan-streaming-indicator'));
      const hasTable = Boolean(document.querySelector('.bayan-results-table'));
      const hasTrace = Boolean(document.querySelector('.bayan-agent-trace'));
      const hasBubble = Boolean(document.querySelector('.bayan-msg-bubble.assistant'));
      return { isStreaming, hasTable, hasTrace, hasBubble };
    })()`);
    if (status && !status.isStreaming && status.hasBubble) {
      console.log("Chat response rendered successfully:", status);
      break;
    }
  }

  await new Promise(r => setTimeout(r, 1500));

  // 3. التقاط الشاشات عبر مختلف المقاسات
  console.log("Capturing responsive screenshots...");
  // سطح مكتب 1440
  await capture("01_chat_redesigned_1440px.png", 1440, 900, false);
  // لابتوب 1280
  await capture("02_chat_redesigned_1280px.png", 1280, 800, false);
  // تابلت 768
  await capture("03_chat_redesigned_768px.png", 768, 1024, false);
  // هاتف 390
  await capture("04_chat_redesigned_390px.png", 390, 844, true);
  // هاتف صغير 360
  await capture("05_chat_redesigned_360px.png", 360, 740, true);

  // 4. التقاط لوحة الإدارة للمقارنة المباشرة
  console.log("Capturing admin reference for comparison...");
  await send("Page.navigate", { url: "http://localhost:3000/admin" });
  await new Promise(r => setTimeout(r, 2000));
  await capture("06_admin_reference_1440px.png", 1440, 900, false);

  // فحص أخطاء Console
  const errors = consoleMessages.filter(m => m.type === "error");
  console.log(`Browser console errors count: ${errors.length}`);
  if (errors.length > 0) {
    console.error("Errors:", JSON.stringify(errors, null, 2));
  } else {
    console.log("Zero errors in browser console!");
  }

  edge.kill();
  console.log("All redesign verification screenshots captured successfully!");
  process.exit(0);
}

run().catch(e => {
  console.error("Error during verification:", e);
  process.exit(1);
});
