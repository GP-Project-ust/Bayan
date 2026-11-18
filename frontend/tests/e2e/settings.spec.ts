import {test,expect} from "@playwright/test";

// These require npm install and a running Next.js webServer from Playwright config.
test("settings loads in Arabic RTL with four tabs",async({page})=>{
  await page.goto("/settings");
  await expect(page.getByRole("heading",{name:"الإعدادات والتفضيلات"})).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("dir","rtl");
  await expect(page.getByRole("tab")).toHaveCount(4);
  await expect(page.getByText(/الحفظ في التخزين المحلي/)).toBeVisible();
});

test("appearance edits, local save and reload",async({page})=>{
  await page.goto("/settings");
  await page.getByLabel("كثافة الواجهة").selectOption("compact");
  await page.getByLabel("حجم النص في المعاينة").selectOption("120");
  await expect(page.getByText("تغييرات غير محفوظة")).toBeVisible();
  await page.getByRole("button",{name:"حفظ التفضيلات"}).click();
  await page.reload();
  await expect(page.getByLabel("كثافة الواجهة")).toHaveValue("compact");
  await expect(page.getByLabel("حجم النص في المعاينة")).toHaveValue("120");
});

test("reset clears saved preferences after explicit confirmation",async({page})=>{
  await page.goto("/settings");
  await page.getByLabel("كثافة الواجهة").selectOption("compact");
  await page.getByRole("button",{name:"حفظ التفضيلات"}).click();
  await page.getByRole("button",{name:"استعادة الإعدادات الافتراضية"}).click();
  await expect(page.getByRole("dialog",{name:"استعادة الإعدادات الافتراضية؟"})).toBeVisible();
  await page.getByRole("button",{name:"استعادة الافتراضيات"}).click();
  await expect(page.getByLabel("كثافة الواجهة")).toHaveValue("comfortable");
});

test("SQL switch is disabled for employee, enabled for IT admin",async({page})=>{
  await page.goto("/settings");
  await page.getByRole("tab",{name:/الإعدادات المتقدمة/}).click();
  await expect(page.getByRole("switch",{name:"عرض استعلامات SQL"})).toBeDisabled();
  await page.getByLabel("الدور التجريبي").selectOption("it_admin");
  await expect(page.getByRole("switch",{name:"عرض استعلامات SQL"})).toBeEnabled();
  await page.getByRole("switch",{name:"عرض استعلامات SQL"}).check();
  await expect(page.getByText(/SELECT COUNT\(\*\)/)).toBeVisible();
  await page.getByLabel("الدور التجريبي").selectOption("employee");
  await expect(page.getByRole("switch",{name:"عرض استعلامات SQL"})).toBeDisabled();
});

test("settings responsive layout has no horizontal document overflow",async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto("/settings");
  await expect(page.getByRole("heading",{name:"الإعدادات والتفضيلات"})).toBeVisible();
  await expect(page.getByRole("tab")).toHaveCount(4);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1);
  expect(overflow).toBe(false);
});
