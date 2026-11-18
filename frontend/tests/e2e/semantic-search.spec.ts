import {test,expect} from "@playwright/test";

test.describe("Bayan screen 09 — semantic search mock",()=>{
 test.beforeEach(async ({page})=>{
  await page.goto("/semantic-search");
  await expect(page.getByTestId("semantic-search-screen")).toBeVisible();
 });
 test("renders initial academic mock search and keeps demo label explicit",async({page})=>{
  await expect(page.getByRole("heading",{name:"البحث الدلالي في المستندات"})).toBeVisible();
  await expect(page.getByText(/لا يتصل بـQdrant/)).toBeVisible();
  await expect(page.getByTestId("semantic-result").first()).toBeVisible();
  await expect(page.getByText(/صلة توضيحية/).first()).toBeVisible();
 });
 test("search for registration and filter by category",async({page})=>{
  await page.getByLabel("عبارة البحث").fill("التسجيل الأكاديمي");
  await page.getByRole("button",{name:"بحث في المستندات"}).click();
  await expect(page.getByRole("heading",{name:/نتائج البحث/})).toBeVisible();
  await expect(page.getByTestId("semantic-result").first()).toBeVisible();
  await page.getByRole("radio",{name:"الأدلة"}).check();
  await expect(page.getByTestId("semantic-result").first()).toContainText("الأدلة");
 });
 test("provides accessible validation and empty results",async({page})=>{
  await page.getByLabel("عبارة البحث").fill("أ");
  await page.getByRole("button",{name:"بحث في المستندات"}).click();
  await expect(page.getByText("اكتب ثلاثة أحرف على الأقل.")).toBeVisible();
  await page.getByLabel("عبارة البحث").fill("أحجار المريخ الزرقاء البعيدة");
  await page.getByRole("button",{name:"بحث في المستندات"}).click();
  await expect(page.getByText("لا توجد مقاطع تجريبية مطابقة")).toBeVisible();
 });
 test("shows cited page and fictional warning in drawer",async({page})=>{
  await page.getByRole("button",{name:"معاينة المصدر"}).first().click();
  await expect(page.getByRole("dialog",{name:"معاينة المصدر"})).toBeVisible();
  await expect(page.getByTestId("semantic-source-preview")).toContainText("الصفحة");
  await expect(page.getByText(/هذا النص مختلق/)).toBeVisible();
  await page.getByRole("button",{name:"إغلاق الدرج"}).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
 });
 test("preview role without documents permission is forbidden",async({page})=>{
  await page.getByLabel("الدور التجريبي").selectOption("platform_admin");
  await expect(page.getByText(/صلاحية البحث في الوثائق غير متاحة/)).toBeVisible();
  await expect(page.getByTestId("semantic-result")).toHaveCount(0);
 });
 test("mobile viewport fits without horizontal overflow",async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.reload();
  await expect(page.getByRole("heading",{name:"البحث الدلالي في المستندات"})).toBeVisible();
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+2);
  expect(overflow).toBe(false);
 });
});
