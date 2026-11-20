import { spawn } from "node:child_process";

async function run() {
  console.log("Launching Edge headless with remote debugging on 9222...");
  const edge = spawn("C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe", [
    "--headless",
    "--remote-debugging-port=9222",
    "http://localhost:3000/admin"
  ]);

  await new Promise(r => setTimeout(r, 4000));

  try {
    const res = await fetch("http://127.0.0.1:9222/json");
    const targets = await res.json();
    console.log("Targets:", targets);

    const pageTarget = targets.find(t => t.type === "page" && t.webSocketDebuggerUrl);
    if (!pageTarget) {
      console.log("No page target found");
      edge.kill();
      return;
    }

    const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);

    await new Promise((resolve) => {
      ws.onopen = () => {
        console.log("Connected to CDP WebSocket");
        ws.send(JSON.stringify({ id: 1, method: "Runtime.enable" }));
        ws.send(JSON.stringify({ id: 2, method: "Log.enable" }));
        resolve();
      };
    });

    const messages = [];

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id === 4) {
        console.log("[EVAL RESULT]", JSON.stringify(msg.result, null, 2));
      } else if (msg.method === "Runtime.consoleAPICalled") {
        console.log("[CONSOLE]", msg.params.type, msg.params.args.map(a => a.value || a.description).join(" "));
        messages.push({ type: msg.params.type, text: msg.params.args.map(a => a.value || a.description).join(" ") });
      } else if (msg.method === "Runtime.exceptionThrown") {
        console.log("[EXCEPTION]", msg.params.exceptionDetails);
        messages.push({ type: "exception", text: msg.params.exceptionDetails.text });
      }
    };

    // Reload page to catch all startup logs
    ws.send(JSON.stringify({ id: 3, method: "Page.reload" }));
    await new Promise(r => setTimeout(r, 3000));

    ws.send(JSON.stringify({
      id: 4,
      method: "Runtime.evaluate",
      params: {
        expression: `(() => {
          const portals = document.querySelectorAll('nextjs-portal');
          let res = [];
          for (const p of portals) {
            if (p.shadowRoot) {
              res.push({
                text: p.shadowRoot.textContent,
                html: p.shadowRoot.innerHTML
              });
            }
          }
          return res;
        })()`,
        returnByValue: true
      }
    }));

    await new Promise(r => setTimeout(r, 2000));
    ws.close();
  } catch (err) {
    console.error("Error during CDP inspection:", err);
  } finally {
    edge.kill();
  }
}

run();
