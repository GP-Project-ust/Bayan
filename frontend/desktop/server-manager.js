const http = require('http');
const net = require('net');
const path = require('path');
const fs = require('fs');
const { spawn, execSync } = require('child_process');

class ServerManager {
  constructor(options = {}) {
    this.projectRoot = options.projectRoot || path.resolve(__dirname, '..');
    this.logsDir = path.join(__dirname, 'logs');
    this.logFile = path.join(this.logsDir, 'bayan-dev-server.log');
    this.host = '127.0.0.1';
    this.defaultPort = options.port || 3000;
    this.activePort = this.defaultPort;
    this.childProcess = null;
    this.isManaged = false;
    this.recentLogs = [];
    this.maxLogLines = 100;
    this.onStatus = options.onStatus || (() => {});
    this.onError = options.onError || (() => {});
    this.onReady = options.onReady || (() => {});
    this.onExit = options.onExit || (() => {});

    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
  }

  log(message) {
    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] ${message}`;
    this.recentLogs.push(line);
    if (this.recentLogs.length > this.maxLogLines) {
      this.recentLogs.shift();
    }
    try {
      fs.appendFileSync(this.logFile, line + '\n', 'utf8');
    } catch (_) {}
  }

  getRecentLogs() {
    return this.recentLogs.join('\n');
  }

  /**
   * Check if a port is in use on 127.0.0.1
   */
  async isPortInUse(port) {
    return new Promise((resolve) => {
      const tester = net.createServer()
        .once('error', (err) => {
          if (err.code === 'EADDRINUSE') {
            resolve(true);
          } else {
            resolve(false);
          }
        })
        .once('listening', () => {
          tester.close(() => resolve(false));
        })
        .listen(port, this.host);
    });
  }

  /**
   * Test if an HTTP server on 127.0.0.1:port is responding and is Next.js / Bayan
   */
  async probeServer(port) {
    return new Promise((resolve) => {
      const req = http.get(
        {
          host: this.host,
          port,
          path: '/',
          timeout: 2000,
        },
        (res) => {
          res.resume();
          // Any HTTP status indicates a running web server
          resolve({ ready: true, status: res.statusCode });
        }
      );
      req.on('timeout', () => {
        req.destroy();
        resolve({ ready: false, error: 'TIMEOUT' });
      });
      req.on('error', (err) => {
        resolve({ ready: false, error: err.code });
      });
    });
  }

  /**
   * Find a free port starting from desired port
   */
  async findAvailablePort(startPort = 3000) {
    let port = startPort;
    while (port < startPort + 50) {
      const inUse = await this.isPortInUse(port);
      if (!inUse) return port;
      port++;
    }
    throw new Error('لم يتم العثور على منفذ شبكي متاح لتشغيل الخادم.');
  }

  /**
   * Start or attach to the Next.js development server
   */
  async start() {
    this.log(`جاري التحقق من المنفذ ${this.defaultPort}...`);
    this.onStatus('جاري التحقق من حالة المنفذ المحلي...');

    // 1. Check if port is already running our server
    const probe = await this.probeServer(this.defaultPort);
    if (probe.ready) {
      this.log(`الخادم يعمل بالفعل على المنفذ ${this.defaultPort}. جاري الاتصال به.`);
      this.activePort = this.defaultPort;
      this.isManaged = false;
      this.onStatus('تم العثور على خادم بيان قيد التشغيل بالفعل.');
      this.onReady(`http://${this.host}:${this.activePort}`);
      return `http://${this.host}:${this.activePort}`;
    }

    // 2. If port is in use by something else, find an available port
    const inUse = await this.isPortInUse(this.defaultPort);
    if (inUse) {
      this.log(`المنفذ ${this.defaultPort} مشغول بخدمة أخرى غير مستجيبة. جاري اختيار منفذ بديل.`);
      this.activePort = await this.findAvailablePort(this.defaultPort + 1);
    } else {
      this.activePort = this.defaultPort;
    }

    this.log(`تحديد المنفذ ${this.activePort} لتشغيل خادم Next.js المحلي.`);
    this.onStatus(`جارٍ تشغيل خادم Next.js على 127.0.0.1:${this.activePort}...`);

    // 3. Locate next binary and node executable
    const nextCliPath = path.join(this.projectRoot, 'node_modules', 'next', 'dist', 'bin', 'next');
    if (!fs.existsSync(nextCliPath)) {
      const err = new Error(`تعذر العثور على حزمة Next.js في: ${nextCliPath}`);
      this.log(err.message);
      this.onError(err.message, 'تأكد من وجود مجلد node_modules وملف next');
      throw err;
    }

    // Always prefer standard node executable for running Next.js development server
    let nodeExec = 'node';
    let env = {
      ...process.env,
      PORT: String(this.activePort),
      HOSTNAME: this.host,
      NODE_ENV: 'development',
    };

    // Clean up any Electron environment variables that interfere with Node/Next.js
    delete env.ELECTRON_RUN_AS_NODE;

    const args = [
      nextCliPath,
      'dev',
      '--hostname', this.host,
      '--port', String(this.activePort),
    ];

    this.log(`تشغيل الأمر: ${nodeExec} ${args.join(' ')}`);

    const child = spawn(nodeExec, args, {
      cwd: this.projectRoot,
      env,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    this.childProcess = child;
    this.isManaged = true;
    const pid = child.pid;
    this.log(`تم بدء خادم التطوير بمعرّف العملية (PID): ${pid}`);

    child.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      this.log(`[Next.js stdout] ${text.trim()}`);
    });

    child.stderr.on('data', (chunk) => {
      const text = chunk.toString();
      this.log(`[Next.js stderr] ${text.trim()}`);
    });

    child.on('exit', (code, signal) => {
      this.log(`توقف خادم Next.js مع الرمز ${code} والإشارة ${signal}`);
      if (this.childProcess === child) {
        const wasManaged = this.isManaged;
        this.childProcess = null;
        this.isManaged = false;
        this.onExit(code, signal, wasManaged);
      }
    });

    child.on('error', (err) => {
      this.log(`خطأ في عملية خادم Next.js: ${err.message}`);
      if (this.childProcess === child) {
        this.onError(`خطأ في تشغيل الخادم: ${err.message}`, this.getRecentLogs());
      }
    });

    // 4. Poll readiness
    return this.waitForServerReady(`http://${this.host}:${this.activePort}`);
  }

  /**
   * Poll the server until ready or timeout
   */
  async waitForServerReady(targetUrl, timeoutMs = 60000) {
    const startTime = Date.now();
    this.log(`بدء فحص جاهزية الخادم على ${targetUrl}...`);

    while (Date.now() - startTime < timeoutMs) {
      if (!this.childProcess && this.isManaged) {
        throw new Error('توقفت عملية الخادم بشكل مفاجئ قبل اكتمال التهيئة.');
      }

      const probe = await this.probeServer(this.activePort);
      if (probe.ready) {
        this.log(`الخادم جاهز ويعمل بنجاح على ${targetUrl} (استغرق ${Math.round((Date.now() - startTime) / 1000)} ثانية).`);
        this.onReady(targetUrl);
        return targetUrl;
      }

      const elapsed = Math.round((Date.now() - startTime) / 1000);
      this.onStatus(`جارٍ تهيئة وحدات Next.js السريعة... (${elapsed} ثانية)`);
      await new Promise((r) => setTimeout(r, 400));
    }

    const err = new Error(`انتهت مهلة انتظار جاهزية الخادم (${timeoutMs / 1000} ثانية).`);
    this.log(err.message);
    this.onError(err.message, this.getRecentLogs());
    throw err;
  }

  /**
   * Graceful stop with complete process tree termination on Windows
   */
  async stop() {
    const child = this.childProcess;
    if (!child && !this.isManaged) {
      return;
    }

    const pid = child ? child.pid : null;
    this.isManaged = false;
    this.childProcess = null;

    if (pid) {
      this.log(`إنهاء خادم Next.js التابع لمعرّف العملية (PID): ${pid}`);
      try {
        if (process.platform === 'win32') {
          execSync(`taskkill /pid ${pid} /T /F`, { stdio: 'ignore' });
        } else {
          process.kill(-pid, 'SIGKILL');
        }
      } catch (_) {
        try {
          child.kill('SIGTERM');
        } catch (__) {}
      }
    }

    // Wait up to 5 seconds for TCP socket to be released by Windows network stack
    for (let i = 0; i < 25; i++) {
      const inUse = await this.isPortInUse(this.activePort);
      if (!inUse) break;
      await new Promise((r) => setTimeout(r, 200));
    }

    this.log('تم إيقاف خادم التطوير بنجاح.');
  }

  getUrl() {
    return `http://${this.host}:${this.activePort}`;
  }
}

module.exports = ServerManager;
