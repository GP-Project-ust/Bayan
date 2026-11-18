import {test,expect} from "@playwright/test";

test.describe("Bayan screen 11 — document viewer demo",()=>{
 test("viewer deep links open the right document, page and highlighted snippet",async({page})=>{
  await page.goto("/sources/document?doc=doc-academic&page=12&snippet=rag-001");
  await expect(page.getByTestId("document-viewer-screen")).toBeVisible();
  await expect(page.getByRole("heading",{name:"عارض المستندات والمصادر"})).toBeVisible();
  await expect(page.getByText("الصفحة 12 من 38").first()).toBeVisible();
  await expect(page.getByTestId("viewer-paper")).toContainText("الفصل الرابع: المواظبة");
  await expect(page.getByText(/لا توجد ملفات PDF أصلية/)).toBeVisible();
 });
 test("page navigation and invalid page correction",async({page})=>{
  await page.goto("/sources/document?doc=doc-academic&page=12");
  await page.getByRole("button",{name:"التالية"}).click();
  await expect(page.getByTestId("viewer-page-placeholder")).toBeVisible();
  await page.getByLabel("الصفحة",{exact:true}).fill("999");
  await page.getByRole("button",{name:"انتقال"}).click();
  await expect(page.getByRole("alert")).toContainText("بين 1 و38");
  await page.getByLabel("الصفحة",{exact:true}).fill("5");
  await page.getByRole("button",{name:"انتقال"}).click();
  await expect(page.getByTestId("viewer-paper")).toContainText("الفصل الثاني: التسجيل");
 });
 test("library and search open same viewer with matching deep links",async({page})=>{
  await page.goto("/sources");
  const doc=page.getByTestId("library-document").filter({hasText:"اللائحة الأكاديمية"});
  await doc.getByRole("link",{name:"فتح العارض"}).click();
  await expect(page).toHaveURL(/\/sources\/document\?doc=doc-academic/);
  await page.goto("/semantic-search");
  const result=page.getByTestId("semantic-result").filter({hasText:"اللائحة الأكاديمية"}).first();
  await result.getByRole("link",{name:"عرض الصفحة"}).click();
  await expect(page).toHaveURL(/\/sources\/document\?doc=doc-academic/);
 });
 test("unknown document and platform role do not expose fictional snippets",async({page})=>{
  await page.goto("/sources/document?doc=doc-unknown");
  await expect(page.getByText("المستند غير موجود في بيانات العرض")).toBeVisible();
  await page.goto("/sources/document?doc=doc-academic&page=12");
  await page.getByLabel("الدور التجريبي").selectOption("platform_admin");
  await expect(page.getByText("ليس لديك إذن لاستعراض مستندات المؤسسة")).toBeVisible();
  await expect(page.getByTestId("viewer-paper")).toHaveCount(0);
 });
 test("non-indexed document never pretends to have PDF or a retrieved snippet",async({page})=>{
  await page.goto("/sources/document?doc=doc-policy-draft&page=1");
  await expect(page.getByTestId("viewer-page-placeholder")).toBeVisible();
  await expect(page.getByRole("button",{name:"نسخ الاستشهاد"})).toBeDisabled();
  await expect(page.getByRole("button",{name:/ملف PDF غير متاح/})).toBeDisabled();
 });
 test("responsive 390px does not cause document-level overflow",async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto("/sources/document?doc=doc-academic&page=12");
  await expect(page.getByTestId("viewer-paper")).toBeVisible();
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+2);
  expect(overflow).toBe(false);
 });
});
