import {test,expect} from "@playwright/test";

test.describe("Bayan screen 10 — document library mock",()=>{
 test.beforeEach(async({page})=>{await page.goto("/sources");await expect(page.getByTestId("document-library-screen")).toBeVisible();});
 test("renders documentary demo notice and document cards",async({page})=>{
  await expect(page.getByRole("heading",{name:"مكتبة المستندات واللوائح"})).toBeVisible();
  await expect(page.getByText(/لا توجد ملفات مرفوعة أو معالجة/)).toBeVisible();
  await expect(page.getByTestId("library-document")).toHaveCount(9);
 });
 test("search Arabic, filter category and switch to table layout",async({page})=>{
  await page.getByPlaceholder("ابحث في اسم المستند أو الجهة...").fill("اللائحة الأكاديمية");
  await expect(page.getByTestId("library-document")).toHaveCount(1);
  await page.getByPlaceholder("ابحث في اسم المستند أو الجهة...").fill("");
  await page.getByLabel("تصنيف المستند").selectOption("guides");
  await expect(page.getByTestId("library-document")).toHaveCount(3);
  await page.getByRole("button",{name:"العرض الجدولي"}).click();
  await expect(page.locator(".bdl-table")).toBeVisible();
 });
 test("shows empty result and reset filters",async({page})=>{
  await page.getByPlaceholder("ابحث في اسم المستند أو الجهة...").fill("مصطلحات كونية غير مدرجة");
  await expect(page.getByText("لا توجد مستندات مطابقة")).toBeVisible();
  await page.getByRole("button",{name:"إظهار جميع المستندات"}).click();
  await expect(page.getByTestId("library-document")).toHaveCount(9);
 });
 test("opens source preview with fictional snippet citation and page",async({page})=>{
  const doc=page.getByTestId("library-document").filter({hasText:"اللائحة الأكاديمية"});
  await doc.getByRole("button",{name:"عرض التفاصيل"}).click();
  await expect(page.getByRole("dialog",{name:"معلومات المستند ومعاينة المصدر"})).toBeVisible();
  await expect(page.getByTestId("library-document-preview")).toContainText("مقتطفات تدريبية متاحة");
  await expect(page.getByText(/غير صالحة للاقتباس/)).toBeVisible();
  await page.getByRole("button",{name:"إغلاق الدرج"}).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
 });
 test("admin can simulate indexing, platform admin cannot see tenant document list",async({page})=>{
  await page.getByLabel("الدور التجريبي").selectOption("it_admin");
  await page.getByRole("button",{name:"محاكاة إعادة فهرسة نموذج طلب الأرشفة — مثال تدريبي"}).click();
  await expect(page.getByText("اكتملت المحاكاة")).toBeVisible();
  await page.getByLabel("الدور التجريبي").selectOption("platform_admin");
  await expect(page.getByText("مكتبة المؤسسة غير متاحة لهذا الدور")).toBeVisible();
  await expect(page.getByTestId("library-document")).toHaveCount(0);
 });
 test("small screen does not introduce page horizontal overflow",async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.reload();
  await expect(page.getByRole("heading",{name:"مكتبة المستندات واللوائح"})).toBeVisible();
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+2);
  expect(overflow).toBe(false);
 });
});
