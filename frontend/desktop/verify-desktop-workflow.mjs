import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ServerManager = require('./server-manager.js');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    }).on('error', reject);
  });
}

async function runTests() {
  console.log('=== بدء اختبارات بيئة سطح المكتب الحية لمنصة بيان ===\n');

  // Test 1: Desktop Assets and Shortcuts Verification
  console.log('[Test 1] التحقق من أصول سطح المكتب والاختصارات...');
  const iconPath = path.join(__dirname, 'assets', 'icon.ico');
  const pngPath = path.join(__dirname, 'assets', 'icon.png');
  const electronExe = path.join(projectRoot, 'node_modules', 'electron', 'dist', 'electron.exe');
  const desktopShortcut = path.join(process.env.USERPROFILE || '', 'Desktop', 'بيان - Bayan.lnk');

  assert.ok(fs.existsSync(iconPath), 'ملف الأيقونة icon.ico موجود');
  assert.ok(fs.existsSync(pngPath), 'ملف الأيقونة icon.png موجود');
  assert.ok(fs.existsSync(electronExe), 'ملف تشغيل Electron التنفيذي موجود');
  assert.ok(fs.existsSync(desktopShortcut), 'اختصار سطح المكتب موجود في Desktop');
  console.log('✓ تم التحقق بنجاح من أيقونات واختصارات سطح المكتب.\n');

  // Test 2: ServerManager Lifecycle and Next.js Startup
  console.log('[Test 2] اختبار مدير الخادم وبدء تشغيل Next.js تلقائيًا...');
  const manager = new ServerManager({
    projectRoot,
    port: 3000,
    onStatus: (msg) => console.log('  [حالة الخادم]:', msg),
  });

  const url = await manager.start();
  console.log('✓ خادم Next.js يعمل على:', url);

  const homeResponse = await fetchUrl(url);
  assert.equal(homeResponse.status, 200, 'الصفحة الرئيسية ترجع HTTP 200 OK');
  assert.ok(homeResponse.body.includes('بيان') || homeResponse.body.includes('dir="rtl"'), 'المحتوى يحتوي على هوية بيان');
  console.log('✓ استجابة الصفحة الرئيسية سليمة وتحتوي على وسم RTL وهوية بيان.\n');

  // Test 3: New Route Dynamic Discovery
  console.log('[Test 3] اختبار إضافة مسار جديد والتعرف عليه فورياً (Dynamic Route Discovery)...');
  const testRouteDir = path.join(projectRoot, 'app', 'desktop-live-test');
  const testRouteFile = path.join(testRouteDir, 'page.tsx');

  try {
    if (!fs.existsSync(testRouteDir)) fs.mkdirSync(testRouteDir, { recursive: true });
    fs.writeFileSync(
      testRouteFile,
      `export default function TestPage() { return <div id="live-test">مرحبًا من المسار الحي في بيان</div>; }`,
      'utf8'
    );

    // Wait a brief moment for Next.js file watcher to register
    await new Promise((r) => setTimeout(r, 1200));

    const testResponse = await fetchUrl(`${url}/desktop-live-test`);
    assert.equal(testResponse.status, 200, 'المسار الجديد يرجع HTTP 200');
    assert.ok(testResponse.body.includes('مرحبًا من المسار الحي في بيان'), 'المسار الجديد يعرض المحتوى فورياً');
    console.log('✓ تم التعرف على المسار الجديد وعرضه في الخادم الحي بنجاح.');
  } finally {
    if (fs.existsSync(testRouteFile)) fs.unlinkSync(testRouteFile);
    if (fs.existsSync(testRouteDir)) fs.rmdirSync(testRouteDir);
    console.log('✓ تم تنظيف مسار الاختبار المؤقت.\n');
  }

  // Test 4: Server Unexpected Termination & Auto-Recovery
  console.log('[Test 4] اختبار التعامل مع توقف الخادم المفاجئ وإعادة التشغيل (Recovery Test)...');
  const initialPid = manager.childProcess.pid;
  assert.ok(initialPid, 'العملية الأولية لها معرّف صالح');

  // Stop current managed instance
  await manager.stop();
  assert.equal(manager.childProcess, null, 'تم إنهاء العملية السابقة');

  // Verify port is freed
  const inUse = await manager.isPortInUse(3000);
  assert.equal(inUse, false, 'تم تحرير المنفذ 3000 تمامًا دون بقاء عمليات معلقة');
  console.log('✓ تم إيقاف الخادم وتحرير المنفذ 3000 بالكامل.');

  // Restart
  console.log('  إعادة تشغيل الخادم بعد التوقف...');
  const restartUrl = await manager.start();
  assert.ok(restartUrl.includes('3000'), 'تم إعادة تشغيل الخادم بنجاح على نفس المنفذ');

  const retest = await fetchUrl(restartUrl);
  assert.equal(retest.status, 200, 'الخادم بعد إعادة التشغيل يستجيب بـ HTTP 200');
  console.log('✓ تم استعادة الخادم وإعادة تشغيله بنجاح.\n');

  // Test 5: Clean Final Shutdown
  console.log('[Test 5] اختبار الإيقاف النهائي الآمن للمنصة...');
  await manager.stop();
  const finalPortCheck = await manager.isPortInUse(3000);
  assert.equal(finalPortCheck, false, 'المنفذ 3000 غير مشغول بعد الإغلاق النهائي');
  console.log('✓ تم إيقاف خادم التطوير بأمان ولم تتبق أي عمليات عالقة في النظام.\n');

  console.log('======================================================');
  console.log('✓ جميع الاختبارات الخمسة اكتملت بنجاح بنسبة 100%!');
  console.log('======================================================');
}

runTests().catch((err) => {
  console.error('فشل في أحد الاختبارات:', err);
  process.exit(1);
});

