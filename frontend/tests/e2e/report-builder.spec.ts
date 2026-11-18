import {test,expect} from "@playwright/test";

test.describe("Bayan Screen 14 — Smart Report Builder",()=>{
 test.beforeEach(async({page})=>{await page.goto("/reports/new");await expect(page.getByTestId("report-builder-screen")).toBeVisible();});
 test("initial wizard displays four stages and blocks incomplete input",async({page})=>{
  await expect(page.getByRole("heading",{name:"إنشاء تقرير ذكي"})).toBeVisible();
  await expect(page.getByTestId("builder-steps").locator("button")).toHaveCount(4);
  await page.getByRole("button",{name:"التالي"}).click();
  await expect(page.getByText("أدخل عنوانًا بين 8 و100 حرف.")).toBeVisible();
 });
 test("example report runs through wizard and confirms local-only simulation",async({page})=>{
  await page.getByRole("button",{name:"تعبئة مثال تجريبي"}).click();
  await expect(page.locator("#brb-title")).toHaveValue(/توزيع الطلاب/);
  await page.getByRole("button",{name:"التالي"}).click();
  await expect(page.getByTestId("builder-step-2")).toBeVisible();
  await page.getByRole("button",{name:"التالي"}).click();
  await expect(page.getByTestId("builder-step-3")).toBeVisible();
  await page.getByRole("button",{name:"التالي"}).click();
  await expect(page.getByTestId("builder-step-4")).toBeVisible();
  await page.getByRole("button",{name:"تأكيد الإنشاء التجريبي"}).click();
  await expect(page.getByRole("dialog",{name:"تأكيد الإنشاء التجريبي"})).toBeVisible();
  await page.getByRole("dialog").getByRole("button",{name:"تأكيد المحاكاة"}).click();
  await expect(page.getByTestId("report-builder-complete")).toContainText("لم يُنشأ");
 });
 test("source deselection removes metric from configuration",async({page})=>{
  await page.getByRole("button",{name:"تعبئة مثال تجريبي"}).click();
  await page.getByRole("button",{name:"التالي"}).click();
  await page.getByRole("checkbox",{name:"مصدر: بيانات الطلاب"}).uncheck();
  await expect(page.getByRole("checkbox",{name:"مؤشر: إجمالي الطلاب"})).toHaveCount(0);
  await page.getByRole("button",{name:"التالي"}).click();
  await expect(page.getByText("اختر مصدر بيانات واحدًا على الأقل.")).toBeVisible();
 });
 test("download a fictional JSON configuration without backend access",async({page})=>{
  await page.getByRole("button",{name:"تعبئة مثال تجريبي"}).click();
  for(let i=0;i<3;i++)await page.getByRole("button",{name:"التالي"}).click();
  const download=page.waitForEvent("download");
  await page.getByRole("button",{name:"تنزيل ملف إعدادات JSON"}).click();
  await expect((await download).suggestedFilename()).toBe("bayan-demo-report-configuration.json");
 });
 test("employee cannot create and platform admin cannot inspect form",async({page})=>{
  await page.getByLabel("الدور التجريبي").selectOption("employee");
  await expect(page.getByTestId("builder-forbidden")).toBeVisible();
  await expect(page.getByTestId("builder-step-1")).toHaveCount(0);
  await page.getByLabel("الدور التجريبي").selectOption("platform_admin");
  await expect(page.getByTestId("builder-forbidden")).toBeVisible();
 });
 test("mobile wizard does not overflow page horizontally",async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.reload();
  await expect(page.getByRole("heading",{name:"إنشاء تقرير ذكي"})).toBeVisible();
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+2);
  expect(overflow).toBe(false);
 });
});
