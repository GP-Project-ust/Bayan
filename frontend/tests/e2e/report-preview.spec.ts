import {test,expect} from "@playwright/test";
test.describe("Bayan Screen 15 — Full Report Preview",()=>{
 test.beforeEach(async({page})=>{await page.goto("/reports/detail?report=rep-101");await expect(page.getByTestId("report-preview-screen")).toBeVisible();});
 test("shows two A4 pages with fictional report figures and titles",async({page})=>{
  await expect(page.getByRole("heading",{name:"معاينة التقرير وتصديره"})).toBeVisible();
  await expect(page.getByTestId("report-summary-page")).toContainText("توزيع الطلاب");
  await expect(page.getByTestId("report-details-page")).toContainText("الهندسة");
  await expect(page.getByTestId("report-summary-page")).toContainText("نموذج غير رسمي");
 });
 test("full preview navigates from the reports center",async({page})=>{
  await page.goto("/reports");
  await page.getByTestId("report-row").first().getByRole("link",{name:/معاينة كاملة/}).click();
  await expect(page).toHaveURL(/reports\/detail\?report=rep-101/);
 });
 test("preview tabs change displayed page, print still uses both pages",async({page})=>{
  await page.getByRole("button",{name:"الجدول",exact:true}).click();
  await expect(page.getByTestId("report-details-page")).toBeVisible();
  await expect(page.getByTestId("report-summary-page")).toBeHidden();
  await page.getByRole("button",{name:"الملخص",exact:true}).click();
  await expect(page.getByTestId("report-summary-page")).toBeVisible();
  await page.getByRole("button",{name:"كل الصفحات"}).click();
  await expect(page.getByTestId("report-summary-page")).toBeVisible();
  await expect(page.getByTestId("report-details-page")).toBeVisible();
 });
 test("exports a valid CSV and XLSX locally",async({page})=>{
  const csv=page.waitForEvent("download");await page.getByTestId("export-csv").click();
  expect((await csv).suggestedFilename()).toBe("bayan-demo-rep-101.csv");
  const excel=page.waitForEvent("download");await page.getByTestId("export-xlsx").click();
  expect((await excel).suggestedFilename()).toBe("bayan-demo-rep-101.xlsx");
 });
 test("PDF uses the native browser print flow without claiming generated server PDF",async({page})=>{
  await page.evaluate(()=>{(window as Window & {__printCalled?:boolean}).__printCalled=false;window.print=()=>{(window as Window & {__printCalled?:boolean}).__printCalled=true;};});
  await page.getByTestId("export-pdf").click();
  expect(await page.evaluate(()=>(window as Window & {__printCalled?:boolean}).__printCalled)).toBe(true);
 });
 test("incomplete report hides data and export options",async({page})=>{
  await page.getByLabel("اختيار التقرير").selectOption("rep-103");
  await expect(page.getByTestId("report-not-ready")).toBeVisible();
  await expect(page.getByTestId("export-xlsx")).toHaveCount(0);
 });
 test("unknown report id yields helpful not-found state",async({page})=>{
  await page.goto("/reports/detail?report=rep-999");
  await expect(page.getByTestId("report-not-found")).toBeVisible();
  await expect(page.getByTestId("export-pdf")).toHaveCount(0);
 });
 test("role permissions hide contents or disable export appropriately",async({page})=>{
  await page.getByLabel("الدور التجريبي").selectOption("employee");
  await expect(page.getByTestId("report-summary-page")).toBeVisible();
  await expect(page.getByTestId("export-xlsx")).toBeDisabled();
  await page.getByLabel("الدور التجريبي").selectOption("platform_admin");
  await expect(page.getByText(/ليس لديك صلاحية عرض تقارير المؤسسة/)).toBeVisible();
  await expect(page.getByTestId("report-summary-page")).toHaveCount(0);
 });
 test("mobile does not overflow the entire page; paper scroller is contained",async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.reload();
  await expect(page.getByRole("heading",{name:"معاينة التقرير وتصديره"})).toBeVisible();
  const measurements=await page.evaluate(()=>({html:document.documentElement.scrollWidth,screen:document.documentElement.clientWidth,stage:document.querySelector('.brp-document-stage')?.clientWidth}));
  expect(measurements.html).toBeLessThanOrEqual(measurements.screen+2);
  expect(measurements.stage).toBeGreaterThan(0);
 });
});
