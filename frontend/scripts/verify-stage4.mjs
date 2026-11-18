/** Offline structural smoke test. Run: npm run check:stage4 */
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const expected=[
  "app/page.tsx","app/admin/page.tsx","app/globals.css",
  "styles/bayan-tokens.css","components/ui/ui.css",
  "components/bayan/types.ts","components/bayan/index.ts","components/bayan/bayan.css",
  "components/bayan/ChatComposer.tsx","components/bayan/MessageBubble.tsx",
  "components/bayan/SQLViewer.tsx","components/bayan/CitationCard.tsx",
  "components/bayan/ReportExporter.tsx","components/bayan/SmartViewManager.tsx",
  "components/bayan/AgentTraceViewer.tsx",
  "app/design-system/bayan-components/page.tsx",
  "app/design-system/bayan-components/playground.tsx",
  "app/design-system/bayan-components/showcase.css",
  "design-references/chat-reference.png","design-references/admin-reference.png"
];
for(const relative of expected)assert.ok(fs.existsSync(path.join(root,relative)),`الملف مفقود: ${relative}`);
const exportsText=fs.readFileSync(path.join(root,"components/bayan/index.ts"),"utf8");
for(const symbol of ["ChatComposer","MessageBubble","SQLViewer","CitationCard","ReportExporter","SmartViewManager","AgentTraceViewer"])assert.match(exportsText,new RegExp(`export \\{ ${symbol} \\}`),`تصدير مفقود: ${symbol}`);
const page=fs.readFileSync(path.join(root,"app/design-system/bayan-components/page.tsx"),"utf8");
assert.match(page,/BayanDomainPlayground/);assert.match(page,/bayan.css/);
const chat=fs.readFileSync(path.join(root,"components/ChatView.tsx"),"utf8");
assert.ok(chat.includes("ChatLayout"),"الواجهة الأصلية للمحادثة غير موجودة");
console.log(`✓ تحقق هيكلي ناجح: ${expected.length} ملفًا + 7 صادرات + مسار المعاينة`);
console.log("تنبيه: الاختبار الهيكلي لا يغني عن npm run lint وnpm run build واختبار المتصفح.");
