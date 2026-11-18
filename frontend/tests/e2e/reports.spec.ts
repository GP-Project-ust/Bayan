import {test,expect} from "@playwright/test";
test.describe("Bayan screen 13 — Reports Center",()=>{
 test.beforeEach(async({page})=>{await page.goto("/reports");await expect(page.getByTestId("reports-center-screen")).toBeVisible();});
 test("shows all 12 clearly fictional reports",async({page})=>{
  await expect(page.getByRole("heading",{name:"مركز التقارير"})).toBeVisible();
  await expect(page.getByText(/جميع التقارير والأعداد والمصادر/)).toBeVisible();
  await expect(page.getByTestId("report-row")).toHaveCount(12);
 });
 test("search, status and month filter, reset",async({page})=>{
  await page.getByRole("searchbox",{name:"البحث في التقارير"}).fill("توزيع الطلاب");
  await expect(page.getByTestId("report-row")).toHaveCount(1);
  await page.getByRole("searchbox",{name:"البحث في التقارير"}).fill("");
  await page.getByLabel("حالة التقرير").selectOption("failed");await expect(page.getByTestId("report-row")).toHaveCount(1);
  await page.getByLabel("شهر الإنشاء").selectOption("2026-11");await expect(page.getByTestId("reports-empty")).toBeVisible();
  await page.getByRole("button",{name:"إظهار جميع التقارير"}).click();await expect(page.getByTestId("report-row")).toHaveCount(12);
 });
 test("opens report details and exports fictional CSV for manager",async({page})=>{
  await page.getByTestId("report-row").first().getByRole("button",{name:"التفاصيل"}).click();
  await expect(page.getByRole("dialog",{name:"تفاصيل التقرير"})).toBeVisible();
  await expect(page.getByTestId("report-details")).toContainText("جميع الأرقام افتراضية");
  const download=page.waitForEvent("download");await page.getByRole("dialog").getByRole("button",{name:"تصدير CSV تجريبي"}).click();
  await expect((await download).suggestedFilename()).toBe("bayan-demo-report-rep-101.csv");
 });
 test("employee has no export and no create; platform admin has no report contents",async({page})=>{
  await page.getByLabel("الدور التجريبي").selectOption("employee");
  await expect(page.getByTestId("reports-new-link")).toHaveCount(0);
  await expect(page.getByRole("button",{name:/تصدير CSV/})).toHaveCount(0);
  await page.getByLabel("الدور التجريبي").selectOption("platform_admin");
  await expect(page.getByText("لا تملك صلاحية عرض تقارير المؤسسة")).toBeVisible();
  await expect(page.getByTestId("report-row")).toHaveCount(0);
 });
 test("mobile page has no page-wide horizontal overflow",async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.reload();
  await expect(page.getByRole("heading",{name:"مركز التقارير"})).toBeVisible();
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+2);
  expect(overflow).toBe(false);
 });
});
