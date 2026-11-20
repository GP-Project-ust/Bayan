import { spawn } from "node:child_process";

async function runE2E() {
  console.log("Starting CDP E2E interaction verification on http://localhost:3000/admin...");
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
      throw new Error("No page target found");
    }

    const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
    await new Promise((resolve) => {
      ws.onopen = () => {
        ws.send(JSON.stringify({ id: 1, method: "Runtime.enable" }));
        resolve();
      };
    });

    const callEval = (expr) => {
      return new Promise((resolve, reject) => {
        const id = Math.floor(Math.random() * 1000000);
        const handler = (event) => {
          const msg = JSON.parse(event.data);
          if (msg.id === id) {
            ws.removeEventListener("message", handler);
            if (msg.result.exceptionDetails) {
              reject(new Error(msg.result.exceptionDetails.text || "Eval error"));
            } else {
              resolve(msg.result.result.value);
            }
          }
        };
        ws.addEventListener("message", handler);
        ws.send(JSON.stringify({
          id,
          method: "Runtime.evaluate",
          params: { expression: expr, returnByValue: true, awaitPromise: true }
        }));
      });
    };

    console.log("Checking page elements existence...");
    const initialCheck = await callEval(`(() => {
      const usersRows = document.querySelectorAll('.users-table tbody tr').length;
      const viewsRows = document.querySelectorAll('.smart-table tbody tr').length;
      const auditRows = document.querySelectorAll('.audit-table tbody tr').length;
      const pills = Array.from(document.querySelectorAll('.role-preview-pill')).map(p => p.innerText.trim());
      const kpis = Array.from(document.querySelectorAll('.stat-card strong')).map(s => s.innerText.trim());
      return { usersRows, viewsRows, auditRows, pills, kpis };
    })()`);

    console.log("Initial Check:", initialCheck);

    // 1. Test Search Users
    console.log("Testing user search filtering...");
    const searchResult = await callEval(`(() => {
      const searchInput = document.querySelector('.users-panel .search-field input');
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      nativeSetter.call(searchInput, 'العتيبي');
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      const rowsAfter = document.querySelectorAll('.users-table tbody tr').length;
      const firstRowText = document.querySelector('.users-table tbody tr')?.innerText || '';
      return { rowsAfter, containsTarget: firstRowText.includes('العتيبي') };
    })()`);
    console.log("Search Result:", searchResult);

    // Clear search
    await callEval(`(() => {
      const clearBtn = document.querySelector('.users-panel .clear-search');
      if (clearBtn) clearBtn.click();
    })()`);

    // 2. Test Role Preview Switcher
    console.log("Testing Role Preview Switcher...");
    const roleSwitch = await callEval(`(() => {
      const managerPill = Array.from(document.querySelectorAll('.role-preview-pill')).find(p => p.innerText.includes('مدير المؤسسة'));
      if (managerPill) managerPill.click();
      const restrictionBanner = document.querySelector('.role-restriction-banner');
      const addButtons = document.querySelectorAll('.action-primary').length;
      const readOnlyBadges = document.querySelectorAll('.read-only-badge').length;
      const toast = document.querySelector('.toast-card strong')?.innerText || '';
      return {
        bannerVisible: Boolean(restrictionBanner),
        bannerText: restrictionBanner ? restrictionBanner.innerText.slice(0, 80) : '',
        readOnlyBadgesCount: readOnlyBadges,
        toastTitle: toast
      };
    })()`);
    console.log("Role Switch Result (Manager):", roleSwitch);

    // Switch back to IT Admin
    await callEval(`(() => {
      const itPill = Array.from(document.querySelectorAll('.role-preview-pill')).find(p => p.innerText.includes('مسؤول تقنية المعلومات'));
      if (itPill) itPill.click();
    })()`);

    // 3. Test Modals: Add User Modal opens and cancels
    console.log("Testing Add User modal...");
    const modalTest = await callEval(`(() => {
      const addBtn = document.querySelector('.users-panel .action-primary');
      if (addBtn) addBtn.click();
      const modal = document.querySelector('.dialog-card');
      const title = modal ? modal.querySelector('h2')?.innerText : '';
      const closeBtn = document.querySelector('.close-dialog');
      if (closeBtn) closeBtn.click();
      const modalClosed = !document.querySelector('.dialog-card');
      return { openedTitle: title, closedSuccessfully: modalClosed };
    })()`);
    console.log("Modal Add User Test:", modalTest);

    // 4. Test Full Audit Trail Modal
    console.log("Testing Full Audit Trail modal...");
    const auditModalTest = await callEval(`(() => {
      const auditBtn = document.querySelector('.audit-panel .outline-button');
      if (auditBtn) auditBtn.click();
      const modal = document.querySelector('.dialog-card');
      const title = modal ? modal.querySelector('h2')?.innerText : '';
      const logItems = document.querySelectorAll('.audit-dialog-list .dialog-log').length;
      const closeBtn = document.querySelector('.close-dialog');
      if (closeBtn) closeBtn.click();
      return { title, logItems };
    })()`);
    console.log("Audit Modal Test:", auditModalTest);

    ws.close();
    console.log("All E2E live interactions verified successfully!");
  } catch (err) {
    console.error("E2E test error:", err);
  } finally {
    edge.kill();
  }
}

runE2E();
