import { expect, test } from "@playwright/test";

// Must be run against the local Next.js app in preview/development mode.
test("استعادة كلمة المرور تعرض حقلاً وحيدًا وتستخدم اتجاه RTL", async ({ page }) => {
  await page.goto("/forgot-password");
  await expect(page.getByRole("heading", { name: "نسيت كلمة المرور؟" })).toBeVisible();
  await expect(page.locator("#bayan-recovery-email")).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("button", { name: /متابعة طلب الاستعادة/ })).toBeVisible();
  await expect(page.getByText(/وضع معاينة:/)).toBeVisible();
});

test("يرفض البريد الفارغ وغير الصحيح ويركز الحقل", async ({ page }) => {
  await page.goto("/forgot-password");
  await page.getByRole("button", { name: /متابعة طلب الاستعادة/ }).click();
  await expect(page.getByText("يرجى إدخال البريد الإلكتروني.")).toBeVisible();
  await expect(page.locator("#bayan-recovery-email")).toBeFocused();
  await page.locator("#bayan-recovery-email").fill("not-an-email");
  await page.getByRole("button", { name: /متابعة طلب الاستعادة/ }).click();
  await expect(page.getByText("يرجى إدخال بريد إلكتروني صحيح.")).toBeVisible();
});

test("يظهر نجاح تجريبي صريح دون إرسال طلب API", async ({ page }) => {
  const calls: string[] = [];
  page.on("request", request => { if (request.url().includes("/api/")) calls.push(request.url()); });
  await page.goto("/forgot-password");
  await page.locator("#bayan-recovery-email").fill("student@example.edu");
  await page.getByRole("button", { name: /متابعة طلب الاستعادة/ }).click();
  await expect(page.getByRole("heading", { name: "تم تسجيل الطلب التجريبي" })).toBeVisible();
  await expect(page.getByText(/لم نرسل أي رسالة/)).toBeVisible();
  expect(calls).toHaveLength(0);
  const stored = await page.evaluate(() => ({
    local: localStorage.getItem("bayan-recovery-email"),
    session: sessionStorage.getItem("bayan-recovery-email"),
  }));
  expect(stored).toEqual({ local: null, session: null });
});

test("يسمح بإدخال بريد آخر بعد حالة النجاح", async ({ page }) => {
  await page.goto("/forgot-password");
  await page.locator("#bayan-recovery-email").fill("employee@example.edu");
  await page.getByRole("button", { name: /متابعة طلب الاستعادة/ }).click();
  await expect(page.getByRole("heading", { name: "تم تسجيل الطلب التجريبي" })).toBeVisible();
  await page.getByRole("button", { name: "إدخال بريد آخر" }).click();
  await expect(page.locator("#bayan-recovery-email")).toHaveValue("");
  await expect(page.locator("#bayan-recovery-email")).toBeFocused();
});

test("رابط العودة من الاستعادة إلى تسجيل الدخول", async ({ page }) => {
  await page.goto("/forgot-password");
  await page.getByRole("link", { name: /العودة لتسجيل الدخول/ }).first().click();
  await expect(page).toHaveURL(/\/login$/);
});

test("رابط نسيت كلمة المرور من تسجيل الدخول يعمل", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("link", { name: /نسيت كلمة المرور/ }).click();
  await expect(page).toHaveURL(/\/forgot-password$/);
});

test("صفحة الاستعادة لا تسبب تمريرًا أفقيًا على الهاتف", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/forgot-password");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
