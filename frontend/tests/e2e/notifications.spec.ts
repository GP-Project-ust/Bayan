import { test, expect } from "@playwright/test";

// End-to-end checks need `npm install` + Chromium + the Next.js dev server.
test("الجرس ينقل إلى مركز الإشعارات مع المحافظة على RTL", async ({page})=>{
  await page.goto("/profile");
  await page.getByRole("link",{name:"فتح مركز الإشعارات"}).click();
  await expect(page).toHaveURL(/\/notifications$/);
  await expect(page.getByRole("heading",{name:"مركز الإشعارات"})).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("dir","rtl");
  await expect(page.getByText(/الإشعارات والأرقام والتواريخ أمثلة افتراضية/)).toBeVisible();
});

test("التبويبات والفئة والبحث يعرضون النتائج المطابقة",async({page})=>{
  await page.goto("/notifications");
  await expect(page.getByText("6 من 11 إشعار")).not.toBeVisible();
  await page.getByRole("button",{name:/غير المقروءة/}).click();
  await expect(page.getByText("6 من 11 إشعار")).toBeVisible();
  await page.getByRole("combobox",{name:"تصفية حسب الفئة"}).selectOption("reports");
  await expect(page.getByText("1 من 11 إشعار")).toBeVisible();
  await page.getByRole("searchbox",{name:"البحث في الإشعارات"}).fill("كلمة لا توجد في التنبيهات");
  await expect(page.getByRole("heading",{name:"لا توجد إشعارات مطابقة"})).toBeVisible();
  await page.getByRole("button",{name:"مسح عوامل التصفية"}).click();
  await expect(page.getByText("11 من 11 إشعار")).toBeVisible();
});

test("فتح التفاصيل يحوّل الإشعار لمقروء ثم يمكن إرجاعه",async({page})=>{
  await page.goto("/notifications");
  await page.getByRole("button",{name:"عرض تفاصيل: تقرير أداء الأقسام جاهز"}).click();
  await expect(page.getByRole("dialog",{name:"تقرير أداء الأقسام جاهز"})).toBeVisible();
  await expect(page.getByText("مصدر الإشعار")).toBeVisible();
  await expect(page.getByText("تفاصيل التنبيه")).toBeVisible();
  await page.getByRole("button",{name:"إعادة تمييز كغير مقروء"}).click();
  await page.getByRole("button",{name:"إغلاق الدرج"}).click();
  await expect(page.getByRole("button",{name:"تمييز تقرير أداء الأقسام جاهز كمقروء"})).toBeVisible();
});

test("تمييز الكل كمقروءة واستعادة المعاينة",async({page})=>{
  await page.goto("/notifications");
  await page.getByRole("button",{name:"تمييز الكل كمقروء"}).click();
  await expect(page.getByRole("button",{name:"تمييز الكل كمقروء"})).toBeDisabled();
  await page.getByRole("button",{name:/غير المقروءة/}).click();
  await expect(page.getByRole("heading",{name:"لا توجد إشعارات مطابقة"})).toBeVisible();
  await page.getByRole("button",{name:"استعادة التجربة"}).click();
  await expect(page.getByText("11 من 11 إشعار")).toBeVisible();
  await expect(page.getByRole("button",{name:"تمييز الكل كمقروء"})).toBeEnabled();
});

test("تظل الشاشة ضمن عرض الهاتف دون تمرير أفقي",async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto("/notifications");
  await expect(page.getByRole("heading",{name:"مركز الإشعارات"})).toBeVisible();
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1);
  expect(overflow).toBe(false);
});
