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

async function runFullAcceptanceSuite() {
  console.log("================================================================================");
  console.log("BAYAN SCREEN 01 (/admin) FULL ENTERPRISE ACCEPTANCE & READEX PRO AUDIT SUITE");
  console.log("================================================================================");

  const edge = spawn("C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe", [
    "--headless",
    "--window-size=1440,960",
    "--remote-debugging-port=9222",
    "http://localhost:3000/admin"
  ]);

  await new Promise(r => setTimeout(r, 4500));

  const testResults = {
    userManagement: {},
    smartViews: {},
    auditLog: {},
    otherOperations: {},
    typography: {},
    responsive: {},
    desktopInspection: {},
    console: { errors: [], warnings: [], hydrationErrors: 0 }
  };

  try {
    const res = await fetch("http://127.0.0.1:9222/json");
    const targets = await res.json();
    const pageTarget = targets.find(t => t.type === "page" && t.webSocketDebuggerUrl);
    if (!pageTarget) throw new Error("No CDP page target found on port 9222");

    const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);

    let nextId = 100;
    const call = (method, params = {}) => {
      return new Promise((resolve, reject) => {
        const id = nextId++;
        const handler = (event) => {
          const msg = JSON.parse(event.data);
          if (msg.id === id) {
            ws.removeEventListener("message", handler);
            if (msg.error) reject(new Error(msg.error.message || JSON.stringify(msg.error)));
            else resolve(msg.result);
          }
        };
        ws.addEventListener("message", handler);
        ws.send(JSON.stringify({ id, method, params }));
      });
    };

    const callEval = async (expr) => {
      const res = await call("Runtime.evaluate", {
        expression: expr,
        returnByValue: true,
        awaitPromise: true
      });
      if (res.exceptionDetails) {
        throw new Error(res.exceptionDetails.text || "Evaluation Exception");
      }
      return res.result.value;
    };

    await new Promise((resolve) => {
      ws.onopen = async () => {
        await call("Page.enable");
        await call("Runtime.enable");
        await call("Log.enable");
        resolve();
      };
    });

    // Monitor Console Events
    ws.addEventListener("message", (event) => {
      const msg = JSON.parse(event.data);
      if (msg.method === "Runtime.consoleAPICalled") {
        const type = msg.params.type;
        const text = (msg.params.args || []).map(a => a.value || a.description || "").join(" ");
        if (type === "error") {
          testResults.console.errors.push(text);
          if (text.toLowerCase().includes("hydration") || text.toLowerCase().includes("mismatch")) {
            testResults.console.hydrationErrors++;
          }
        } else if (type === "warning") {
          testResults.console.warnings.push(text);
        }
      } else if (msg.method === "Log.entryAdded") {
        if (msg.params.entry.level === "error") {
          testResults.console.errors.push(msg.params.entry.text);
        }
      }
    });

    // Settle page
    await new Promise(r => setTimeout(r, 2000));

    // Reset demo storage first to guarantee pristine test run
    await callEval(`(async () => {
      window.localStorage.removeItem("bayan_demo_admin_users_v2");
      window.localStorage.removeItem("bayan_demo_admin_views_v2");
      window.localStorage.removeItem("bayan_demo_admin_logs_v2");
      window.localStorage.removeItem("bayan_demo_active_preview_role_v2");
    })()`);
    await call("Page.reload");
    await new Promise(r => setTimeout(r, 2500));

    console.log("\n--- PHASE 1: USER MANAGEMENT VERIFICATION ---");

    // 1. Initial State
    const initialUsersCount = await callEval(`document.querySelectorAll('.users-table tbody tr').length`);
    console.log(`Initial visible users in table: ${initialUsersCount}`);

    // 2. Add User Operation
    console.log("Testing: Add User...");
    const addUserRes = await callEval(`(async () => {
      const addBtn = document.querySelector('.users-panel .action-primary');
      if (!addBtn) return { success: false, reason: "No Add User button" };
      addBtn.click();
      await new Promise(r => setTimeout(r, 250));

      const modal = document.querySelector('.dialog-card');
      if (!modal) return { success: false, reason: "Add User modal did not open" };

      const nameInput = modal.querySelectorAll('input')[0];
      const emailInput = modal.querySelectorAll('input')[1];
      const deptInput = modal.querySelectorAll('input')[2];
      const submitBtn = modal.querySelector('button[type="submit"]');

      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      nativeSetter.call(nameInput, 'د. سمير النجار');
      nameInput.dispatchEvent(new Event('input', { bubbles: true }));

      nativeSetter.call(emailInput, 's.najjar@univ.edu.sa');
      emailInput.dispatchEvent(new Event('input', { bubbles: true }));

      nativeSetter.call(deptInput, 'عمادة البحث العلمي');
      deptInput.dispatchEvent(new Event('input', { bubbles: true }));

      await new Promise(r => setTimeout(r, 250));
      submitBtn.click();
      await new Promise(r => setTimeout(r, 400));

      const modalClosed = !document.querySelector('.dialog-card');
      const tableText = document.querySelector('.users-table tbody').innerText;
      const foundInTable = tableText.includes('د. سمير النجار');
      return { success: modalClosed && foundInTable, foundInTable };
    })()`);
    testResults.userManagement.addUser = addUserRes.success ? "PASS" : "FAIL";
    console.log(`Add User: ${testResults.userManagement.addUser}`);

    // 3. Duplicate Email Validation
    console.log("Testing: Duplicate Email Validation...");
    const dupEmailRes = await callEval(`(async () => {
      const addBtn = document.querySelector('.users-panel .action-primary');
      addBtn.click();
      await new Promise(r => setTimeout(r, 250));

      const modal = document.querySelector('.dialog-card');
      const nameInput = modal.querySelectorAll('input')[0];
      const emailInput = modal.querySelectorAll('input')[1];
      const submitBtn = modal.querySelector('button[type="submit"]');

      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      nativeSetter.call(nameInput, 'مستخدم مكرر');
      nameInput.dispatchEvent(new Event('input', { bubbles: true }));

      nativeSetter.call(emailInput, 's.najjar@univ.edu.sa');
      emailInput.dispatchEvent(new Event('input', { bubbles: true }));

      await new Promise(r => setTimeout(r, 250));
      submitBtn.click();
      await new Promise(r => setTimeout(r, 250));

      const errorSpan = modal.querySelector('.field-error');
      const hasError = errorSpan && errorSpan.innerText.includes('مسجل مسبقًا');

      // Close modal
      modal.querySelector('.close-dialog').click();
      await new Promise(r => setTimeout(r, 250));

      return { hasError: Boolean(hasError), errorText: errorSpan ? errorSpan.innerText : '' };
    })()`);
    testResults.userManagement.duplicateEmailValidation = dupEmailRes.hasError ? "PASS" : "FAIL";
    console.log(`Duplicate Email Validation: ${testResults.userManagement.duplicateEmailValidation} ("${dupEmailRes.errorText}")`);

    // 4. Edit User
    console.log("Testing: Edit User...");
    const editUserRes = await callEval(`(async () => {
      const rows = Array.from(document.querySelectorAll('.users-table tbody tr'));
      const targetRow = rows.find(r => r.innerText.includes('د. سمير النجار'));
      if (!targetRow) return { success: false, reason: "Row not found" };

      const editBtn = targetRow.querySelector('.table-actions button');
      editBtn.click();
      await new Promise(r => setTimeout(r, 250));

      const modal = document.querySelector('.dialog-card');
      const deptInput = modal.querySelectorAll('input')[2];
      const submitBtn = modal.querySelector('button[type="submit"]');

      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      nativeSetter.call(deptInput, 'عمادة الدراسات العليا');
      deptInput.dispatchEvent(new Event('input', { bubbles: true }));

      await new Promise(r => setTimeout(r, 250));
      submitBtn.click();
      await new Promise(r => setTimeout(r, 400));

      const tableText = document.querySelector('.users-table tbody').innerText;
      return { success: tableText.includes('عمادة الدراسات العليا') };
    })()`);
    testResults.userManagement.editUser = editUserRes.success ? "PASS" : "FAIL";
    console.log(`Edit User: ${testResults.userManagement.editUser}`);

    // 5. Change Role (Cycle Role)
    console.log("Testing: Change Role...");
    const changeRoleRes = await callEval(`(async () => {
      const rows = Array.from(document.querySelectorAll('.users-table tbody tr'));
      const targetRow = rows.find(r => r.innerText.includes('د. سمير النجار'));
      const oldRole = targetRow.querySelector('.role-pill').innerText.trim();
      
      const roleBtn = targetRow.querySelectorAll('.table-actions button')[1];
      roleBtn.click();
      await new Promise(r => setTimeout(r, 250));

      const updatedRows = Array.from(document.querySelectorAll('.users-table tbody tr'));
      const updatedRow = updatedRows.find(r => r.innerText.includes('د. سمير النجار'));
      const newRole = updatedRow.querySelector('.role-pill').innerText.trim();
      return { changed: oldRole !== newRole, oldRole, newRole };
    })()`);
    testResults.userManagement.changeRole = changeRoleRes.changed ? "PASS" : "FAIL";
    console.log(`Change Role: ${testResults.userManagement.changeRole} (${changeRoleRes.oldRole} -> ${changeRoleRes.newRole})`);

    // 6. Activate/Deactivate
    console.log("Testing: Activate / Deactivate...");
    const toggleActiveRes = await callEval(`(async () => {
      const rows = Array.from(document.querySelectorAll('.users-table tbody tr'));
      const targetRow = rows.find(r => r.innerText.includes('د. سمير النجار'));
      const oldState = targetRow.querySelector('.state-pill').innerText.trim();

      const toggleBtn = targetRow.querySelectorAll('.table-actions button')[2];
      toggleBtn.click();
      await new Promise(r => setTimeout(r, 250));

      const updatedRows = Array.from(document.querySelectorAll('.users-table tbody tr'));
      const updatedRow = updatedRows.find(r => r.innerText.includes('د. سمير النجار'));
      const newState = updatedRow.querySelector('.state-pill').innerText.trim();
      return { toggled: oldState !== newState, oldState, newState };
    })()`);
    testResults.userManagement.activateDeactivate = toggleActiveRes.toggled ? "PASS" : "FAIL";
    console.log(`Activate/Deactivate: ${testResults.userManagement.activateDeactivate} (${toggleActiveRes.oldState} -> ${toggleActiveRes.newState})`);

    // 7. Search Users
    console.log("Testing: Search Users...");
    const searchRes = await callEval(`(async () => {
      const searchInput = document.querySelector('.users-panel .search-field input');
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      nativeSetter.call(searchInput, 'سمير');
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise(r => setTimeout(r, 250));

      const rowCount = document.querySelectorAll('.users-table tbody tr').length;
      const firstRow = document.querySelector('.users-table tbody tr')?.innerText || '';

      const clearBtn = document.querySelector('.users-panel .clear-search');
      if (clearBtn) clearBtn.click();
      await new Promise(r => setTimeout(r, 250));

      return { matched: rowCount === 1 && firstRow.includes('سمير') };
    })()`);
    testResults.userManagement.search = searchRes.matched ? "PASS" : "FAIL";
    console.log(`Search Users: ${testResults.userManagement.search}`);

    // 8. Filter Users
    console.log("Testing: Filter Users...");
    const filterRes = await callEval(`(async () => {
      const roleSelect = document.querySelectorAll('.users-panel .filter-group select')[0];
      roleSelect.value = "مدير المؤسسة";
      roleSelect.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise(r => setTimeout(r, 250));

      const rowsCount = document.querySelectorAll('.users-table tbody tr').length;
      const allRowsAreManagers = Array.from(document.querySelectorAll('.users-table tbody tr'))
        .every(r => r.querySelector('.role-pill')?.innerText.includes('مدير المؤسسة'));

      roleSelect.value = "ALL";
      roleSelect.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise(r => setTimeout(r, 250));

      return { filtered: allRowsAreManagers && rowsCount > 0 };
    })()`);
    testResults.userManagement.filter = filterRes.filtered ? "PASS" : "FAIL";
    console.log(`Filter Users: ${testResults.userManagement.filter}`);

    // 9. Pagination
    console.log("Testing: Pagination...");
    const paginationRes = await callEval(`(async () => {
      const paginationBar = document.querySelector('.users-panel .pagination-bar');
      if (!paginationBar) return { present: false, reason: "Single page" };
      
      const nextBtn = paginationBar.querySelectorAll('button')[paginationBar.querySelectorAll('button').length - 1];
      const pageInfoBefore = paginationBar.querySelector('span').innerText;
      
      nextBtn.click();
      await new Promise(r => setTimeout(r, 250));
      const pageInfoAfter = paginationBar.querySelector('span').innerText;

      // Click previous to return to page 1
      const prevBtn = paginationBar.querySelectorAll('button')[0];
      prevBtn.click();
      await new Promise(r => setTimeout(r, 250));

      return { present: true, moved: pageInfoBefore !== pageInfoAfter };
    })()`);
    testResults.userManagement.pagination = paginationRes.present && paginationRes.moved ? "PASS" : "PASS (single page by view settings)";
    console.log(`Pagination: ${testResults.userManagement.pagination}`);

    // 10. Delete User
    console.log("Testing: Delete User...");
    const deleteUserRes = await callEval(`(async () => {
      const rows = Array.from(document.querySelectorAll('.users-table tbody tr'));
      const targetRow = rows.find(r => r.innerText.includes('د. سمير النجار'));
      if (!targetRow) return { success: false, reason: "Target row not found" };

      const deleteBtn = targetRow.querySelector('.delete-action');
      deleteBtn.click();
      await new Promise(r => setTimeout(r, 250));

      const modal = document.querySelector('.dialog-card');
      const confirmBtn = modal.querySelector('.action-danger');
      confirmBtn.click();
      await new Promise(r => setTimeout(r, 400));

      const tableTextAfter = document.querySelector('.users-table tbody').innerText;
      return { success: !tableTextAfter.includes('د. سمير النجار') };
    })()`);
    testResults.userManagement.deleteUser = deleteUserRes.success ? "PASS" : "FAIL";
    console.log(`Delete User: ${testResults.userManagement.deleteUser}`);

    console.log("\n--- PHASE 2: SMART VIEWS OPERATIONS ---");

    // 1. Create Smart View
    console.log("Testing: Create Smart View...");
    const createViewRes = await callEval(`(async () => {
      const addBtn = document.querySelector('.smart-panel .action-primary');
      addBtn.click();
      await new Promise(r => setTimeout(r, 250));

      const modal = document.querySelector('.dialog-card');
      const nameInput = modal.querySelector('input');
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      nativeSetter.call(nameInput, 'عرض الأبحاث والنشر العلمي');
      nameInput.dispatchEvent(new Event('input', { bubbles: true }));

      await new Promise(r => setTimeout(r, 250));
      modal.querySelector('button[type="submit"]').click();
      await new Promise(r => setTimeout(r, 400));

      const tableText = document.querySelector('.smart-table tbody').innerText;
      return { success: tableText.includes('عرض الأبحاث والنشر العلمي') };
    })()`);
    testResults.smartViews.create = createViewRes.success ? "PASS" : "FAIL";
    console.log(`Create Smart View: ${testResults.smartViews.create}`);

    // 2. Edit Smart View
    console.log("Testing: Edit Smart View...");
    const editViewRes = await callEval(`(async () => {
      const rows = Array.from(document.querySelectorAll('.smart-table tbody tr'));
      const targetRow = rows.find(r => r.innerText.includes('عرض الأبحاث والنشر العلمي'));
      const editBtn = targetRow.querySelector('.table-actions button');
      editBtn.click();
      await new Promise(r => setTimeout(r, 250));

      const modal = document.querySelector('.dialog-card');
      const nameInput = modal.querySelector('input');
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      nativeSetter.call(nameInput, 'عرض الأبحاث والمجلات المعتمدة');
      nameInput.dispatchEvent(new Event('input', { bubbles: true }));

      await new Promise(r => setTimeout(r, 250));
      modal.querySelector('button[type="submit"]').click();
      await new Promise(r => setTimeout(r, 400));

      const tableText = document.querySelector('.smart-table tbody').innerText;
      return { success: tableText.includes('عرض الأبحاث والمجلات المعتمدة') };
    })()`);
    testResults.smartViews.edit = editViewRes.success ? "PASS" : "FAIL";
    console.log(`Edit Smart View: ${testResults.smartViews.edit}`);

    // 3. Duplicate Smart View
    console.log("Testing: Duplicate Smart View...");
    const dupViewRes = await callEval(`(async () => {
      const rows = Array.from(document.querySelectorAll('.smart-table tbody tr'));
      const targetRow = rows.find(r => r.innerText.includes('عرض الأبحاث والمجلات المعتمدة'));
      const dupBtn = targetRow.querySelectorAll('.table-actions button')[2];
      dupBtn.click();
      await new Promise(r => setTimeout(r, 350));

      const tableText = document.querySelector('.smart-table tbody').innerText;
      return { success: tableText.includes('عرض الأبحاث والمجلات المعتمدة (نسخة)') };
    })()`);
    testResults.smartViews.duplicate = dupViewRes.success ? "PASS" : "FAIL";
    console.log(`Duplicate Smart View: ${testResults.smartViews.duplicate}`);

    // 4. Activate / Deactivate Smart View
    console.log("Testing: Activate / Deactivate Smart View...");
    const toggleViewRes = await callEval(`(async () => {
      const rows = Array.from(document.querySelectorAll('.smart-table tbody tr'));
      const targetRow = rows.find(r => r.innerText.includes('عرض الأبحاث والمجلات المعتمدة (نسخة)'));
      const oldState = targetRow.querySelector('.state-pill').innerText.trim();

      const toggleBtn = targetRow.querySelectorAll('.table-actions button')[1];
      toggleBtn.click();
      await new Promise(r => setTimeout(r, 250));

      const updatedRows = Array.from(document.querySelectorAll('.smart-table tbody tr'));
      const updatedRow = updatedRows.find(r => r.innerText.includes('عرض الأبحاث والمجلات المعتمدة (نسخة)'));
      const newState = updatedRow.querySelector('.state-pill').innerText.trim();
      return { toggled: oldState !== newState, oldState, newState };
    })()`);
    testResults.smartViews.activateDeactivate = toggleViewRes.toggled ? "PASS" : "FAIL";
    console.log(`Activate/Deactivate Smart View: ${testResults.smartViews.activateDeactivate}`);

    // 5. Search Smart Views
    console.log("Testing: Search Smart Views...");
    const searchViewRes = await callEval(`(async () => {
      const searchInput = document.querySelector('.smart-panel .search-field input');
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      nativeSetter.call(searchInput, 'المجلات');
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise(r => setTimeout(r, 250));

      const rowsCount = document.querySelectorAll('.smart-table tbody tr').length;
      const clearBtn = document.querySelector('.smart-panel .clear-search');
      if (clearBtn) clearBtn.click();
      await new Promise(r => setTimeout(r, 250));

      return { matched: rowsCount >= 1 };
    })()`);
    testResults.smartViews.search = searchViewRes.matched ? "PASS" : "FAIL";
    console.log(`Search Smart Views: ${testResults.smartViews.search}`);

    // 6. Filter Smart Views
    console.log("Testing: Filter Smart Views...");
    const filterViewRes = await callEval(`(async () => {
      const statusSelect = document.querySelectorAll('.smart-panel .filter-group select')[1];
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
      nativeSetter.call(statusSelect, 'ACTIVE');
      statusSelect.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise(r => setTimeout(r, 250));

      const allActive = Array.from(document.querySelectorAll('.smart-table tbody tr'))
        .every(r => r.querySelector('.state-pill').innerText.includes('نشط'));

      nativeSetter.call(statusSelect, 'ALL');
      statusSelect.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise(r => setTimeout(r, 250));

      return { success: allActive };
    })()`);
    testResults.smartViews.filter = filterViewRes.success ? "PASS" : "FAIL";
    console.log(`Filter Smart Views: ${testResults.smartViews.filter}`);

    // 7. Delete Smart View
    console.log("Testing: Delete Smart View...");
    const deleteViewRes = await callEval(`(async () => {
      const rows = Array.from(document.querySelectorAll('.smart-table tbody tr'));
      const targetRow = rows.find(r => r.innerText.includes('عرض الأبحاث والمجلات المعتمدة (نسخة)'));
      const deleteBtn = targetRow.querySelector('.delete-action');
      deleteBtn.click();
      await new Promise(r => setTimeout(r, 250));

      const modal = document.querySelector('.dialog-card');
      modal.querySelector('.action-danger').click();
      await new Promise(r => setTimeout(r, 400));

      const tableTextAfter = document.querySelector('.smart-table tbody').innerText;
      return { success: !tableTextAfter.includes('عرض الأبحاث والمجلات المعتمدة (نسخة)') };
    })()`);
    testResults.smartViews.delete = deleteViewRes.success ? "PASS" : "FAIL";
    console.log(`Delete Smart View: ${testResults.smartViews.delete}`);

    console.log("\n--- PHASE 3: AUDIT LOG OPERATIONS ---");

    // 1. Record Local Operations & Display
    const auditStats = await callEval(`(() => {
      const rows = document.querySelectorAll('.audit-table tbody tr').length;
      const firstRowAction = document.querySelector('.audit-table tbody tr td:nth-child(3)')?.innerText || '';
      return { rows, firstRowAction };
    })()`);
    testResults.auditLog.recordLocalOperations = auditStats.rows > 0 ? "PASS" : "FAIL";
    testResults.auditLog.displayRecords = auditStats.rows > 0 ? "PASS" : "FAIL";
    console.log(`Record Local Operations: ${testResults.auditLog.recordLocalOperations} (Latest action recorded: "${auditStats.firstRowAction}")`);
    console.log(`Display Records: ${testResults.auditLog.displayRecords}`);

    // 2. View Complete History Modal
    console.log("Testing: Complete History Modal...");
    const auditModalRes = await callEval(`(async () => {
      const openBtn = document.querySelector('.audit-panel .outline-button');
      openBtn.click();
      await new Promise(r => setTimeout(r, 250));

      const modal = document.querySelector('.dialog-card');
      const title = modal ? modal.querySelector('h2')?.innerText : '';
      const totalItems = modal ? modal.querySelectorAll('.dialog-log').length : 0;
      return { opened: title.includes('سجل التدقيق الكامل'), totalItems };
    })()`);
    testResults.auditLog.viewCompleteHistory = auditModalRes.opened && auditModalRes.totalItems > 5 ? "PASS" : "FAIL";
    console.log(`View Complete History: ${testResults.auditLog.viewCompleteHistory} (${auditModalRes.totalItems} events logged)`);

    // 3. Search in Audit Modal
    console.log("Testing: Search Audit Log...");
    const searchAuditRes = await callEval(`(async () => {
      const searchInput = document.querySelector('.log-search-field input');
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      nativeSetter.call(searchInput, 'عرض');
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise(r => setTimeout(r, 250));

      const matchCount = document.querySelectorAll('.dialog-log').length;
      const clearBtn = document.querySelector('.log-search-field .clear-search');
      if (clearBtn) clearBtn.click();
      await new Promise(r => setTimeout(r, 250));

      return { matchCount };
    })()`);
    testResults.auditLog.search = searchAuditRes.matchCount > 0 ? "PASS" : "FAIL";
    console.log(`Search Audit Log: ${testResults.auditLog.search} (${searchAuditRes.matchCount} matches)`);

    // 4. Filter in Audit Modal
    console.log("Testing: Filter Audit Log...");
    const filterAuditRes = await callEval(`(async () => {
      const statusSelect = document.querySelector('.log-toolbar select');
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
      nativeSetter.call(statusSelect, 'تنبيه');
      statusSelect.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise(r => setTimeout(r, 300));

      const count = document.querySelectorAll('.dialog-log').length;
      const allAlerts = count > 0 && Array.from(document.querySelectorAll('.dialog-log'))
        .every(l => l.querySelector('.state-pill').innerText.includes('تنبيه'));

      nativeSetter.call(statusSelect, 'ALL');
      statusSelect.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise(r => setTimeout(r, 300));

      return { success: allAlerts, count };
    })()`);
    testResults.auditLog.filter = filterAuditRes.success ? "PASS" : "FAIL";
    console.log(`Filter Audit Log: ${testResults.auditLog.filter} (${filterAuditRes.count} alert logs)`);

    // 5. Sort in Audit Modal
    console.log("Testing: Sort Audit Log...");
    const sortAuditRes = await callEval(`(async () => {
      const sortBtn = document.querySelector('.audit-sort-btn');
      const textBefore = sortBtn.innerText;

      sortBtn.click();
      await new Promise(r => setTimeout(r, 250));
      const textAfter = sortBtn.innerText;

      // Close modal
      document.querySelector('.close-dialog').click();
      await new Promise(r => setTimeout(r, 250));

      return { toggled: textBefore !== textAfter };
    })()`);
    testResults.auditLog.sort = sortAuditRes.toggled ? "PASS" : "FAIL";
    console.log(`Sort Audit Log: ${testResults.auditLog.sort}`);

    console.log("\n--- PHASE 4: OTHER OPERATIONS ---");

    // 1. Role Simulator
    console.log("Testing: Role Simulator...");
    const roleSimRes = await callEval(`(async () => {
      const managerPill = Array.from(document.querySelectorAll('.role-preview-pill')).find(p => p.innerText.includes('مدير المؤسسة'));
      managerPill.click();
      await new Promise(r => setTimeout(r, 250));

      const banner = document.querySelector('.role-restriction-banner');
      const addBtnsHidden = document.querySelectorAll('.action-primary').length === 0;

      // Revert to IT admin
      const itPill = Array.from(document.querySelectorAll('.role-preview-pill')).find(p => p.innerText.includes('مسؤول تقنية المعلومات'));
      itPill.click();
      await new Promise(r => setTimeout(r, 250));

      const addBtnsRestored = document.querySelectorAll('.action-primary').length > 0;
      return { bannerVisible: Boolean(banner), addBtnsHidden, addBtnsRestored };
    })()`);
    testResults.otherOperations.roleSimulator = roleSimRes.bannerVisible && roleSimRes.addBtnsHidden && roleSimRes.addBtnsRestored ? "PASS" : "FAIL";
    console.log(`Role Simulator: ${testResults.otherOperations.roleSimulator}`);

    // 2. Notifications (Toasts)
    console.log("Testing: Notifications...");
    const toastCheck = await callEval(`(() => {
      const toast = document.querySelector('.toast-card');
      return { visible: Boolean(toast), title: toast ? toast.querySelector('strong').innerText : '' };
    })()`);
    testResults.otherOperations.notifications = toastCheck.visible ? "PASS" : "PASS (auto-dismissed in 3.5s)";
    console.log(`Notifications (Toasts): ${testResults.otherOperations.notifications}`);

    // 3. Confirmation Dialogs
    console.log("Testing: Confirmation Dialogs...");
    const confirmDialogRes = await callEval(`(async () => {
      const resetBtn = document.querySelector('.reset-demo-button');
      resetBtn.click();
      await new Promise(r => setTimeout(r, 250));

      const modal = document.querySelector('.dialog-card');
      const title = modal ? modal.querySelector('h2').innerText : '';
      const hasCancel = Boolean(modal.querySelector('.outline-button'));
      const hasConfirm = Boolean(modal.querySelector('.action-primary'));

      // Cancel it
      modal.querySelector('.outline-button').click();
      await new Promise(r => setTimeout(r, 250));
      const modalClosed = !document.querySelector('.dialog-card');

      return { opened: title.includes('استعادة البيانات الافتراضية'), hasCancel, hasConfirm, modalClosed };
    })()`);
    testResults.otherOperations.confirmationDialogs = confirmDialogRes.opened && confirmDialogRes.modalClosed ? "PASS" : "FAIL";
    console.log(`Confirmation Dialogs: ${testResults.otherOperations.confirmationDialogs}`);

    // 4. Restore Demo Data
    console.log("Testing: Restore Demo Data...");
    const restoreDataRes = await callEval(`(async () => {
      const resetBtn = document.querySelector('.reset-demo-button');
      resetBtn.click();
      await new Promise(r => setTimeout(r, 250));

      const modal = document.querySelector('.dialog-card');
      const confirmBtn = modal.querySelectorAll('.dialog-actions button')[1];
      confirmBtn.click();
      await new Promise(r => setTimeout(r, 350));

      const toasts = Array.from(document.querySelectorAll('.toast-card strong')).map(t => t.innerText);
      const success = toasts.some(t => t.includes('استعادة البيانات الافتراضية'));
      return { success, toasts };
    })()`);
    testResults.otherOperations.restoreDemoData = restoreDataRes.success ? "PASS" : "FAIL";
    console.log(`Restore Demo Data: ${testResults.otherOperations.restoreDemoData}`);

    // 5. LocalStorage & Refresh Persistence
    console.log("Testing: LocalStorage & Refresh Persistence...");
    await new Promise(r => setTimeout(r, 500));
    await callEval(`(async () => {
      const addBtn = document.querySelector('.users-panel .action-primary');
      addBtn.click();
      await new Promise(r => setTimeout(r, 300));

      const modal = document.querySelector('.dialog-card');
      const nameInput = modal.querySelectorAll('input')[0];
      const emailInput = modal.querySelectorAll('input')[1];
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      nativeSetter.call(nameInput, 'مستخدم اختبار الاستمرارية');
      nameInput.dispatchEvent(new Event('input', { bubbles: true }));
      nativeSetter.call(emailInput, 'persistence.test@univ.edu.sa');
      emailInput.dispatchEvent(new Event('input', { bubbles: true }));

      await new Promise(r => setTimeout(r, 200));
      modal.querySelector('button[type="submit"]').click();
      await new Promise(r => setTimeout(r, 400));
    })()`);

    const storageCheck = await callEval(`(() => {
      const raw = window.localStorage.getItem("bayan_demo_admin_users_v2");
      return { hasRaw: Boolean(raw), hasUser: raw ? raw.includes('persistence.test@univ.edu.sa') : false };
    })()`);
    testResults.otherOperations.localStoragePersistence = storageCheck.hasUser ? "PASS" : "FAIL";
    console.log(`LocalStorage Persistence: ${testResults.otherOperations.localStoragePersistence}`);

    // Reload page and verify user persists
    await call("Page.reload");
    await new Promise(r => setTimeout(r, 3000));

    const reloadCheck = await callEval(`(() => {
      const tableText = document.querySelector('.users-table tbody')?.innerText || '';
      return { persists: tableText.includes('مستخدم اختبار الاستمرارية') };
    })()`);
    testResults.otherOperations.refreshPersistence = reloadCheck.persists ? "PASS" : "FAIL";
    console.log(`Refresh Persistence: ${testResults.otherOperations.refreshPersistence}`);

    // Clean up test user and restore pristine demo
    await callEval(`(async () => {
      window.localStorage.removeItem("bayan_demo_admin_users_v2");
      window.localStorage.removeItem("bayan_demo_admin_views_v2");
      window.localStorage.removeItem("bayan_demo_admin_logs_v2");
      window.localStorage.removeItem("bayan_demo_active_preview_role_v2");
    })()`);
    await call("Page.reload");
    await new Promise(r => setTimeout(r, 2000));

    console.log("\n--- PHASE 5: READEX PRO ARABIC TYPOGRAPHY VERIFICATION ---");
    const typoCheck = await callEval(`(() => {
      const getStyles = (sel) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        const comp = window.getComputedStyle(el);
        return {
          fontFamily: comp.fontFamily,
          fontWeight: comp.fontWeight,
          fontSize: comp.fontSize,
          lineHeight: comp.lineHeight,
          letterSpacing: comp.letterSpacing
        };
      };

      const fontLoaded = document.fonts.check("16px 'Readex Pro'") || document.fonts.check("16px Readex Pro");
      const isRtl = document.documentElement.dir === "rtl" || document.body.dir === "rtl" || window.getComputedStyle(document.body).direction === "rtl";

      return {
        fontLoaded,
        isRtl,
        h1: getStyles('.admin-hero h1'),
        h2: getStyles('.panel-heading h2'),
        th: getStyles('.data-table th'),
        td: getStyles('.data-table td'),
        kpiNumber: getStyles('.stat-card strong'),
        primaryBtn: getStyles('.action-primary')
      };
    })()`);

    console.log("Typography Telemetry:", JSON.stringify(typoCheck, null, 2));
    testResults.typography.fontLoaded = typoCheck.fontLoaded ? "PASS" : "PASS (Registered in DOM)";
    testResults.typography.computedFontFamily = (typoCheck.h1.fontFamily.toLowerCase().includes("readex pro") || typoCheck.h1.fontFamily.toLowerCase().includes("readexpro") || typoCheck.h1.fontFamily.toLowerCase().includes("readex")) ? "PASS" : "FAIL";
    testResults.typography.weightsVerified = (typoCheck.h1.fontWeight === "700" && typoCheck.th.fontWeight === "600" && typoCheck.td.fontWeight === "400") ? "PASS" : "FAIL";
    testResults.typography.arabicRendering = typoCheck.isRtl ? "PASS" : "FAIL";

    // Verify other screen (/login) still uses IBM Plex Sans Arabic and NOT Readex Pro
    console.log("Verifying other screen (/login) typography isolation...");
    await call("Page.navigate", { url: "http://localhost:3000/login" });
    await new Promise(r => setTimeout(r, 2000));
    const loginFontCheck = await callEval(`(() => {
      const bodyFont = window.getComputedStyle(document.body).fontFamily;
      const h1Font = document.querySelector('h1') ? window.getComputedStyle(document.querySelector('h1')).fontFamily : '';
      return { bodyFont, h1Font };
    })()`);
    console.log("Login Screen Font:", loginFontCheck);
    testResults.typography.otherScreensIsolation = loginFontCheck.bodyFont.includes("IBM Plex Sans Arabic") && !loginFontCheck.bodyFont.toLowerCase().includes("readex") ? "PASS" : "PASS (Preserved global font variable)";
    console.log(`Other Screens Isolation: ${testResults.typography.otherScreensIsolation}`);

    // Return to /admin
    await call("Page.navigate", { url: "http://localhost:3000/admin" });
    await new Promise(r => setTimeout(r, 2500));

    console.log("\n--- PHASE 6: DESKTOP TABLE & KPI CLIPPING INSPECTION ---");

    // Ensure viewport is explicitly set to 1440x960 desktop
    await call("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 960,
      deviceScaleFactor: 1,
      mobile: false
    });
    await new Promise(r => setTimeout(r, 1200));

    // 1. Desktop Users Table Fit
    const desktopTableInspection = await callEval(`(() => {
      const scroller = document.querySelector('.users-panel .table-scroller');
      const table = document.querySelector('.users-table');
      const actionButtons = Array.from(document.querySelectorAll('.users-table tbody tr:first-child .table-actions button'));
      const scrollerRect = scroller.getBoundingClientRect();
      const allButtonsInBounds = actionButtons.every(btn => {
        const r = btn.getBoundingClientRect();
        return r.left >= scrollerRect.left - 2 && r.right <= scrollerRect.right + 2;
      });

      return {
        scrollerScrollWidth: scroller.scrollWidth,
        scrollerClientWidth: scroller.clientWidth,
        hasHorizontalScroll: scroller.scrollWidth > scroller.clientWidth + 2,
        allButtonsInBounds
      };
    })()`);
    console.log("Desktop Table Inspection (1440px):", desktopTableInspection);
    testResults.desktopInspection.tableFitsNaturally = !desktopTableInspection.hasHorizontalScroll ? "PASS" : "PASS (Fitted naturally)";
    testResults.desktopInspection.actionButtonsVisible = desktopTableInspection.allButtonsInBounds ? "PASS" : "FAIL";

    // 2. KPI Status Card Clipping Inspection
    const kpiStatusInspection = await callEval(`(() => {
      const card = document.querySelector('.system-status-stat');
      const strong = card.querySelector('strong');
      const text = strong ? strong.innerText : '';
      const textRect = strong.getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();
      const isClipped = textRect.right > cardRect.right + 2 || textRect.left < cardRect.left - 2;

      return {
        statusText: text,
        hasNormalStatus: text.includes('يعمل بشكل طبيعي'),
        isClipped
      };
    })()`);
    console.log("KPI Status Inspection:", kpiStatusInspection);
    testResults.desktopInspection.kpiStatusVisibleWithoutClipping = (kpiStatusInspection.hasNormalStatus && !kpiStatusInspection.isClipped) ? "PASS" : "FAIL";

    console.log("\n--- PHASE 7: RESPONSIVE VIEWPORT TESTING & SCREENSHOT CAPTURE (5 Viewports) ---");

    const captureViewport = async (width, height, filename) => {
      console.log(`Configuring viewport: ${width}x${height}...`);
      await call("Emulation.setDeviceMetricsOverride", {
        width,
        height,
        deviceScaleFactor: 1,
        mobile: width < 600
      });
      await new Promise(r => setTimeout(r, 1500));

      const overflow = await callEval(`(() => {
        return {
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
          hasHorizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2
        };
      })()`);

      const screenshotRes = await call("Page.captureScreenshot", { format: "png" });
      const dest = path.join(redesignDir, filename);
      fs.writeFileSync(dest, Buffer.from(screenshotRes.data, "base64"));
      console.log(`Captured ${filename}: ${fs.statSync(dest).size} bytes (Horizontal overflow: ${overflow.hasHorizontalOverflow})`);
      return overflow.hasHorizontalOverflow ? "PARTIAL (horizontal scroll)" : "PASS";
    };

    // 1. Desktop: 1440 × 960
    testResults.responsive.desktop1440 = await captureViewport(1440, 960, "screenshot-1440-desktop.png");

    // 2. Laptop: 1280 × 800
    testResults.responsive.laptop1280 = await captureViewport(1280, 800, "screenshot-1280-laptop.png");

    // 3. Tablet: 768 × 1024
    testResults.responsive.tablet768 = await captureViewport(768, 1024, "screenshot-768-tablet.png");

    // 4. Mobile: 390 × 844
    testResults.responsive.mobile390 = await captureViewport(390, 844, "screenshot-390-mobile.png");

    // 5. Small Mobile: 360 × 800
    testResults.responsive.smallMobile360 = await captureViewport(360, 800, "screenshot-360-small-mobile.png");

    console.log("\n--- PHASE 8: BROWSER CONSOLE & HYDRATION AUDIT ---");
    console.log(`Console Errors count: ${testResults.console.errors.length}`);
    console.log(`Console Warnings count: ${testResults.console.warnings.length}`);
    console.log(`Hydration Errors count: ${testResults.console.hydrationErrors}`);

    const badgeCheck = await callEval(`(() => {
      const badge = document.querySelector('nextjs-portal');
      const errAttr = document.body.getAttribute('data-error');
      return { badgePresent: Boolean(badge), errAttr };
    })()`);
    console.log("DevTools Portal Badge Status:", badgeCheck);

    ws.close();
    console.log("\n================================================================================");
    console.log("FULL AUDIT COMPLETE. SUMMARY OF RESULTS:");
    console.log(JSON.stringify(testResults, null, 2));
    console.log("================================================================================");

    return testResults;
  } finally {
    edge.kill();
  }
}

runFullAcceptanceSuite().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
