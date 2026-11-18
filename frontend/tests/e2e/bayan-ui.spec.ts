import { expect, test } from "@playwright/test";

// Real browser smoke checks. Requires npm install + npx playwright install chromium.
test("التطبيق عربي مع تخطيط RTL", async ({page}) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang","ar");
  await expect(page.locator("html")).toHaveAttribute("dir","rtl");
});

test("خريطة النظام تتضمن مدخل الشاشات", async ({page}) => {
  await page.goto("/screens");
  await expect(page.locator("body")).toContainText("بيان");
});

test("صفحة الجودة تعرض 72 اختبارًا دون نجاح افتراضي",async ({page}) => {
  await page.goto("/design-system/quality");
  await expect(page.getByRole("heading",{name:/دليل الجودة/})).toBeVisible();
  await expect(page.getByText("72",{exact:true})).toBeVisible();
  await expect(page.getByText("لم يُختبر",{exact:false}).first()).toBeVisible();
});

test("صفحة الجودة تحفظ نتيجة يدوية في المتصفح",async ({page})=>{
  await page.goto("/design-system/quality");
  await page.getByRole("textbox",{name:"اسم المختبر"}).fill("QA Test");
  await page.getByRole("combobox",{name:"نتيجة الاختبار اليدوي"}).selectOption("blocked");
  await page.waitForFunction(() => JSON.parse(localStorage.getItem("bayan-design-system-qa-stage7-v1") || "{}").results?.["UC-01"]?.status === "blocked");
  await page.reload();
  await expect(page.getByRole("textbox",{name:"اسم المختبر"})).toHaveValue("QA Test");
  await expect(page.getByRole("combobox",{name:"نتيجة الاختبار اليدوي"})).toHaveValue("blocked");
});

test("النوافذ المنبثقة تدعم إغلاق Escape",async({page})=>{
  await page.goto("/design-system/components");
  await page.getByRole("button",{name:"افتح نافذة التأكيد"}).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("عدم تجاوز العرض الأفقي في صفحة الجودة",async({page})=>{
  await page.goto("/design-system/quality");
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
