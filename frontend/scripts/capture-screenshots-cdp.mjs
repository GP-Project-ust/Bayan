import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const redesignDir = path.join(root, "docs", "redesign");

if (!fs.existsSync(redesignDir)) {
  fs.mkdirSync(redesignDir, { recursive: true });
}

async function capture(width, height, filename) {
  console.log(`Capturing ${filename} (${width}x${height})...`);
  const edge = spawn("C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe", [
    "--headless",
    `--window-size=${width},${height}`,
    "--remote-debugging-port=9222",
    "http://localhost:3000/admin"
  ]);

  await new Promise(r => setTimeout(r, 4500));

  try {
    const res = await fetch("http://127.0.0.1:9222/json");
    const targets = await res.json();
    const pageTarget = targets.find(t => t.type === "page" && t.webSocketDebuggerUrl);
    if (!pageTarget) throw new Error("No page target found");

    const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);

    await new Promise((resolve) => {
      ws.onopen = () => {
        ws.send(JSON.stringify({ id: 1, method: "Page.enable" }));
        ws.send(JSON.stringify({ id: 2, method: "Runtime.enable" }));
        ws.send(JSON.stringify({
          id: 3,
          method: "Emulation.setDeviceMetricsOverride",
          params: {
            width,
            height,
            deviceScaleFactor: 1,
            mobile: width < 600
          }
        }));
        resolve();
      };
    });

    // Wait a brief moment for layout/fonts to settle
    await new Promise(r => setTimeout(r, 1500));

    const base64Data = await new Promise((resolve, reject) => {
      const handler = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id === 4) {
          ws.removeEventListener("message", handler);
          if (msg.result && msg.result.data) {
            resolve(msg.result.data);
          } else {
            reject(new Error("No screenshot data received"));
          }
        }
      };
      ws.addEventListener("message", handler);
      ws.send(JSON.stringify({
        id: 4,
        method: "Page.captureScreenshot",
        params: { format: "png" }
      }));
    });

    const destPath = path.join(redesignDir, filename);
    fs.writeFileSync(destPath, Buffer.from(base64Data, "base64"));
    console.log(`Saved ${filename}: ${fs.statSync(destPath).size} bytes`);
    ws.close();
  } finally {
    edge.kill();
  }
}

async function run() {
  await capture(1440, 960, "screenshot-1440-desktop.png");
  await capture(768, 1024, "screenshot-768-tablet.png");
  await capture(390, 844, "screenshot-390-mobile.png");
  console.log("All 3 screenshots successfully captured via CDP!");
}

run().catch(err => {
  console.error("Capture failed:", err);
  process.exit(1);
});
