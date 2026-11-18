import {test,expect} from "@playwright/test";

test.describe("Bayan screen 12 — document upload/indexing mock",()=>{
  test.beforeEach(async({page})=>{
    await page.goto("/sources/upload");
    await expect(page.getByTestId("document-upload-screen")).toBeVisible();
  });
  test("shows explicit no-backend notice and empty queue",async({page})=>{
    await expect(page.getByRole("heading",{name:"رفع المستندات وفهرستها"})).toBeVisible();
    await expect(page.getByText(/لا تُرسل أي ملفات إلى الخادم/).first()).toBeVisible();
    await expect(page.getByTestId("upload-empty")).toBeVisible();
  });
  test("adds sample documents and simulates progress without backend",async({page})=>{
    await page.getByRole("button",{name:"إضافة ملفين تجريبيين"}).click();
    await expect(page.getByTestId("upload-file-row")).toHaveCount(2);
    await page.getByRole("button",{name:"بدء محاكاة الرفع والفهرسة"}).click();
    await expect(page.getByText(/اكتملت محاكاة 2 من الملفات/)).toBeVisible({timeout:10000});
    await expect(page.getByText(/لم تُضف إلى المكتبة أو Qdrant/)).toBeVisible();
  });
  test("rejects unsafe file and supports removing the entry",async({page})=>{
    await page.getByTestId("upload-file-input").setInputFiles({name:"unsafe.exe",mimeType:"application/octet-stream",buffer:Buffer.from("test")});
    await expect(page.getByText(/النوع غير مدعوم/)).toBeVisible();
    await expect(page.getByTestId("upload-file-row")).toHaveCount(1);
    await page.getByRole("button",{name:"إزالة unsafe.exe"}).click();
    await expect(page.getByTestId("upload-empty")).toBeVisible();
  });
  test("requires owner metadata and avoids starting simulation with invalid data",async({page})=>{
    await page.getByRole("button",{name:"إضافة ملفين تجريبيين"}).click();
    await page.getByLabel(/الجهة المالكة/).fill("x");
    await page.getByRole("button",{name:"بدء محاكاة الرفع والفهرسة"}).click();
    await expect(page.getByRole("alert").filter({hasText:/الجهة المالكة/})).toBeVisible();
  });
  test("unauthorized employee and platform administrator cannot use upload actions",async({page})=>{
    await page.getByLabel("الدور التجريبي").selectOption("employee");
    await expect(page.getByTestId("upload-access-denied")).toBeVisible();
    await page.getByLabel("الدور التجريبي").selectOption("platform_admin");
    await expect(page.getByTestId("upload-access-denied")).toBeVisible();
    await page.getByLabel("الدور التجريبي").selectOption("it_admin");
    await expect(page.getByRole("button",{name:"اختيار الملفات"})).toBeVisible();
  });
  test("renders on mobile without page horizontal overflow",async({page})=>{
    await page.setViewportSize({width:390,height:844});await page.reload();
    await expect(page.getByRole("heading",{name:"رفع المستندات وفهرستها"})).toBeVisible();
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+2);
    expect(overflow).toBe(false);
  });
});
