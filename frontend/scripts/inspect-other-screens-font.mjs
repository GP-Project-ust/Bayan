import { spawn } from "node:child_process";

async function verifyOtherScreens() {
  console.log("Checking /login to confirm IBM Plex Sans Arabic is active...");
  const edge = spawn("C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe", [
    "--headless",
    "--window-size=1440,960",
    "--remote-debugging-port=9222",
    "http://localhost:3000/login"
  ]);

  await new Promise(r => setTimeout(r, 4000));

  try {
    const res = await fetch("http://127.0.0.1:9222/json");
    const targets = await res.json();
    const pageTarget = targets.find(t => t.type === "page" && t.webSocketDebuggerUrl);
    if (!pageTarget) {
      console.log("No page target found");
      edge.kill();
      return;
    }

    const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
    await new Promise((resolve) => {
      ws.onopen = () => {
        ws.send(JSON.stringify({ id: 1, method: "Runtime.enable" }));
        resolve();
      };
    });

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id === 2) {
        console.log("=== /login COMPUTED FONT ===");
        console.log(JSON.stringify(msg.result.result.value, null, 2));
      }
    };

    ws.send(JSON.stringify({
      id: 2,
      method: "Runtime.evaluate",
      params: {
        expression: `(() => {
          const body = document.body;
          const cs = window.getComputedStyle(body);
          return {
            bodyFontFamily: cs.fontFamily
          };
        })()`,
        returnByValue: true
      }
    }));

    await new Promise(r => setTimeout(r, 3000));
    ws.close();
  } catch (err) {
    console.error("Error checking /login:", err);
  } finally {
    edge.kill();
  }
}

verifyOtherScreens();
