import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

const frontendDir = "C:\\Users\\w3h333\\Desktop\\Bayan-Finaا\\Bayan\\frontend";
const outDir = path.join(frontendDir, "docs", "sprint-1", "comparison");
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function run() {
  const edgeBin = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
  const port = 9336;
  const userDataDir = path.join(frontendDir, ".edge-comp-profile");

  const edge = spawn(edgeBin, [
    "--headless",
    "--disable-gpu",
    "--no-sandbox",
    `--user-data-dir=${userDataDir}`,
    `--remote-debugging-port=${port}`,
    "http://127.0.0.1:3000/admin",
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
  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);
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

  async function capture(filename, width = 1440, height = 900) {
    await send("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await new Promise(r => setTimeout(r, 1200));
    const r = await send("Page.captureScreenshot", { format: "png" });
    if (r.result?.data) {
      const filePath = path.join(outDir, filename);
      fs.writeFileSync(filePath, Buffer.from(r.result.data, "base64"));
      console.log(`Saved screenshot: ${filePath}`);
    }
  }

  console.log("Navigating to /admin...");
  await send("Page.navigate", { url: "http://127.0.0.1:3000/admin" });
  await new Promise(r => setTimeout(r, 2500));
  await capture("admin_current_1440.png");

  console.log("Navigating to /chat...");
  await send("Page.navigate", { url: "http://127.0.0.1:3000/chat" });
  await new Promise(r => setTimeout(r, 2500));
  await capture("chat_before_1440.png");

  edge.kill();
  console.log("Comparison captures complete!");
  process.exit(0);
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
