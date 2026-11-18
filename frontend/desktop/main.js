const fs = require('fs');
const path = require('path');
const electron = require('electron');

const bootLog = path.join(__dirname, 'logs', 'electron-boot.log');
function logBoot(msg) {
  try {
    fs.appendFileSync(bootLog, `[${new Date().toISOString()}] ${msg}\n`, 'utf8');
  } catch (_) {}
}

logBoot(`Boot initiated. typeof electron: ${typeof electron}. ELECTRON_RUN_AS_NODE: ${process.env.ELECTRON_RUN_AS_NODE}`);

// Trampoline: if invoked in an environment with ELECTRON_RUN_AS_NODE=1 (e.g. IDE terminals),
// require('electron') returns the path to the executable instead of the Electron API.
// In that case, re-spawn cleanly without ELECTRON_RUN_AS_NODE so Electron GUI starts.
if (typeof electron === 'string') {
  logBoot('Detected Node runner mode. Re-spawning clean Electron GUI process...');
  const { spawn } = require('child_process');
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  
  const scriptArg = path.resolve(__dirname, 'main.js');
  const child = spawn(electron, [scriptArg], {
    cwd: path.resolve(__dirname, '..'),
    env,
    detached: true,
    stdio: 'ignore',
    windowsHide: false,
  });
  child.unref();
  logBoot(`Spawned clean child PID: ${child.pid}. Exiting trampoline.`);
  process.exit(0);
}

const { app, BrowserWindow, Menu, shell, ipcMain, dialog } = electron;
const ServerManager = require('./server-manager');
logBoot('Electron APIs loaded successfully. app name: ' + app.getName());

process.on('uncaughtException', (err) => {
  logBoot('UNCAUGHT EXCEPTION: ' + (err ? (err.stack || err.message) : 'unknown'));
});

process.on('unhandledRejection', (reason) => {
  logBoot('UNHANDLED REJECTION: ' + (reason ? (reason.stack || reason) : 'unknown'));
});

// Application identity
app.setName('bayan-desktop');
app.setAppUserModelId('com.bayan.desktop');

// Ensure clean valid userData directory on Windows
try {
  const safeUserData = path.join(app.getPath('appData'), 'bayan-desktop');
  app.setPath('userData', safeUserData);
  logBoot('User data path set to: ' + safeUserData);
} catch (e) {
  logBoot('Could not set userData path: ' + e.message);
}

// Enforce single instance
logBoot('Requesting single instance lock...');
const gotLock = app.requestSingleInstanceLock();
logBoot('Single instance lock result: ' + gotLock);
if (!gotLock) {
  logBoot('Another instance is holding lock. Quitting.');
  app.quit();
  process.exit(0);
}

let mainWindow = null;
let serverManager = null;
let isQuitting = false;

const assetsDir = path.join(__dirname, 'assets');
const iconPath = process.platform === 'win32'
  ? path.join(assetsDir, 'icon.ico')
  : path.join(assetsDir, 'icon.png');

function createArabicMenu(serverUrl) {
  const isDev = process.env.NODE_ENV !== 'production';
  const template = [
    {
      label: 'ملف',
      submenu: [
        {
          label: 'إعادة تحميل الواجهة',
          accelerator: 'CmdOrCtrl+R',
          click: () => mainWindow && mainWindow.reload(),
        },
        {
          label: 'تحديث قسري',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: () => mainWindow && mainWindow.webContents.reloadIgnoringCache(),
        },
        { type: 'separator' },
        {
          label: 'خروج',
          accelerator: 'Alt+F4',
          click: () => app.quit(),
        },
      ],
    },
    {
      label: 'عرض',
      submenu: [
        { label: 'تكبير', accelerator: 'CmdOrCtrl+Plus', role: 'zoomIn' },
        { label: 'تصغير', accelerator: 'CmdOrCtrl+-', role: 'zoomOut' },
        { label: 'الحجم الافتراضي', accelerator: 'CmdOrCtrl+0', role: 'resetZoom' },
        { type: 'separator' },
        { label: 'ملء الشاشة', accelerator: 'F11', role: 'togglefullscreen' },
        { type: 'separator' },
        {
          label: 'أدوات المطور (DevTools)',
          accelerator: 'CmdOrCtrl+Shift+I',
          click: () => mainWindow && mainWindow.webContents.toggleDevTools(),
        },
      ],
    },
    {
      label: 'خادم التطوير',
      submenu: [
        {
          label: 'إعادة تشغيل خادم Next.js',
          click: async () => {
            if (serverManager) {
              sendToWindow('desktop:status', 'جارٍ إعادة تشغيل خادم التطوير...');
              mainWindow.loadFile(path.join(__dirname, 'splash.html'));
              try {
                await serverManager.stop();
                const url = await serverManager.start();
                mainWindow.loadURL(url);
              } catch (e) {
                showServerError(e.message, serverManager.getRecentLogs());
              }
            }
          },
        },
        {
          label: 'فتح ملف سجلات الخادم',
          click: () => {
            const logFile = serverManager ? serverManager.logFile : path.join(__dirname, 'logs', 'bayan-dev-server.log');
            if (fs.existsSync(logFile)) {
              shell.openPath(logFile);
            }
          },
        },
        {
          label: 'نسخ عنوان الخادم المحلي',
          click: () => {
            const { clipboard } = require('electron');
            clipboard.writeText(serverManager ? serverManager.getUrl() : 'http://127.0.0.1:3000');
          },
        },
      ],
    },
    {
      label: 'مساعدة',
      submenu: [
        {
          label: 'دليل الشاشات (42 شاشة)',
          click: () => {
            if (mainWindow && serverManager) {
              mainWindow.loadURL(`${serverManager.getUrl()}/screens`);
            }
          },
        },
        { type: 'separator' },
        {
          label: 'حول بيان',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'حول بيان | Bayan Desktop',
              message: 'بيان — مساعد مؤسسي عربي ذكي',
              detail: 'تطبيق سطحي للتطوير المباشر مرتبط بالشفرة المصدرية الحية.\nإصدار سطح المكتب: 1.0.0 (Local Live-Development)\nبيئة التشغيل: Electron + Next.js 15 Fast Refresh',
              buttons: ['حسناً'],
              icon: fs.existsSync(iconPath) ? iconPath : undefined,
            });
          },
        },
      ],
    },
  ];

  return Menu.buildFromTemplate(template);
}

function sendToWindow(channel, data) {
  if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
    mainWindow.webContents.send(channel, data);
  }
}

function showServerError(message, details) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.loadFile(path.join(__dirname, 'error.html')).then(() => {
      sendToWindow('desktop:server-error', { message, details });
    });
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 1024,
    minHeight: 700,
    title: 'بيان | مساعد مؤسسي عربي ذكي',
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    show: false,
    backgroundColor: '#0A2342',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });

  Menu.setApplicationMenu(createArabicMenu());

  // Show window once ready to avoid white flash
  mainWindow.once('ready-to-show', () => {
    logBoot('Main window ready-to-show event fired. Showing window.');
    mainWindow.show();
  });

  // Security: Restrict navigation to local development server & local files only
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    const isLocalhost = parsedUrl.hostname === '127.0.0.1' || parsedUrl.hostname === 'localhost';
    const isLocalFile = parsedUrl.protocol === 'file:';

    if (!isLocalhost && !isLocalFile) {
      event.preventDefault();
      shell.openExternal(navigationUrl);
    }
  });

  // Security: Open external links in default OS browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    const parsedUrl = new URL(url);
    const isLocalhost = parsedUrl.hostname === '127.0.0.1' || parsedUrl.hostname === 'localhost';
    if (!isLocalhost) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Load splash screen initially
  mainWindow.loadFile(path.join(__dirname, 'splash.html'));

  // Initialize and start development server
  serverManager = new ServerManager({
    projectRoot: path.resolve(__dirname, '..'),
    port: 3000,
    onStatus: (msg) => {
      sendToWindow('desktop:status', msg);
    },
    onError: (msg, details) => {
      showServerError(msg, details);
    },
    onReady: (url) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        Menu.setApplicationMenu(createArabicMenu(url));
        mainWindow.loadURL(url);
      }
    },
    onExit: (code, signal, wasManaged) => {
      if (!isQuitting && wasManaged) {
        showServerError(
          `توقف خادم Next.js المحلي بشكل غير متوقع (الرمز: ${code || 'غير محدد'}).`,
          serverManager.getRecentLogs()
        );
      }
    },
  });

  serverManager.start().catch((err) => {
    showServerError(err.message, serverManager.getRecentLogs());
  });
}

// Second instance launched: bring existing window to front
app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

app.on('ready', () => {
  logBoot('app ready event fired. Calling createWindow()...');
  try {
    createWindow();
    logBoot('createWindow() completed.');
  } catch (err) {
    logBoot('Error in createWindow(): ' + (err ? err.stack : err));
  }
});

// Clean shutdown: terminate server process tree
app.on('before-quit', async (event) => {
  if (serverManager && serverManager.isManaged && !isQuitting) {
    event.preventDefault();
    isQuitting = true;
    try {
      await serverManager.stop();
    } catch (_) {}
    app.quit();
  }
});

app.on('window-all-closed', async () => {
  if (process.platform !== 'darwin') {
    if (serverManager && serverManager.isManaged) {
      try {
        await serverManager.stop();
      } catch (_) {}
    }
    app.quit();
  }
});

// IPC handlers
ipcMain.on('desktop:restart-server', async () => {
  if (mainWindow && serverManager) {
    mainWindow.loadFile(path.join(__dirname, 'splash.html'));
    sendToWindow('desktop:status', 'جارٍ إعادة تشغيل خادم التطوير...');
    try {
      await serverManager.stop();
      const url = await serverManager.start();
      mainWindow.loadURL(url);
    } catch (e) {
      showServerError(e.message, serverManager.getRecentLogs());
    }
  }
});

ipcMain.on('desktop:open-logs', () => {
  const logFile = serverManager ? serverManager.logFile : path.join(__dirname, 'logs', 'bayan-dev-server.log');
  if (fs.existsSync(logFile)) {
    shell.openPath(logFile);
  }
});

