import { spawn } from "node:child_process";

async function verifyFontAndStyles() {
  console.log("Inspecting computed typography and fonts via CDP...");
  const edge = spawn("C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe", [
    "--headless",
    "--window-size=1440,960",
    "--remote-debugging-port=9222",
    "http://localhost:3000/admin"
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
        console.log("=== COMPUTED TYPOGRAPHY & FONT REPORT ===");
        console.log(JSON.stringify(msg.result.result.value, null, 2));
      }
    };

    ws.send(JSON.stringify({
      id: 2,
      method: "Runtime.evaluate",
      params: {
        expression: `(() => {
          const h1 = document.querySelector('.admin-heading h1');
          const p = document.querySelector('.admin-heading p');
          const kpi = document.querySelector('.stat-card strong');
          const th = document.querySelector('.data-table th');
          const td = document.querySelector('.data-table td');
          const h2 = document.querySelector('.panel-heading h2');
          const btn = document.querySelector('.action-primary');
          const badge = document.querySelector('[data-next-badge]');
          const errors = document.querySelectorAll('[data-error="true"]');

          const getInfo = (el) => {
            if (!el) return null;
            const cs = window.getComputedStyle(el);
            return {
              fontFamily: cs.fontFamily,
              fontSize: cs.fontSize,
              fontWeight: cs.fontWeight,
              lineHeight: cs.lineHeight,
              letterSpacing: cs.letterSpacing
            };
          };

          const fontsLoaded = Array.from(document.fonts).map(f => ({
            family: f.family,
            status: f.status,
            weight: f.weight
          }));

          return {
            h1: getInfo(h1),
            h2: getInfo(h2),
            p: getInfo(p),
            kpi: getInfo(kpi),
            th: getInfo(th),
            td: getInfo(td),
            btn: getInfo(btn),
            nextBadgeFound: Boolean(badge),
            nextBadgeHasError: errors.length > 0,
            documentFonts: fontsLoaded.slice(0, 10)
          };
        })()`,
        returnByValue: true
      }
    }));

    await new Promise(r => setTimeout(r, 3000));
    ws.close();
  } catch (err) {
    console.error("Error during font inspection:", err);
  } finally {
    edge.kill();
  }
}

verifyFontAndStyles();
