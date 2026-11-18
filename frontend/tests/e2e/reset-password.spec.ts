import { expect, test } from "@playwright/test";

// These tests exercise a UI-only preview. No token verification or actual account update.
test("صفحة بدون رابط تظهر حالة رابط مطلوب", async ({ page }) => {
  await page.goto("/reset-password");
  await expect(page.getByRole("heading", { name: "يلزم رابط لإعادة التعيين" })).toBeVisible();
  await expect(page.getByRole("link", { name: /طلب استعادة جديد/ })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
});

test("لا يقبل رمز URL بوصفه رمزًا تم التحقق منه", async ({ page }) => {
  await page.goto("/reset-password?token=fake-token&preview=valid");
  await expect(page.getByRole("heading", { name: "التحقق الآمن غير متاح حاليًا" })).toBeVisible();
  await expect(page.locator("#bayan-reset-password")).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText("fake-token");
});

test("يعرض حالات انتهاء الرابط وعدم صلاحيته بشكل مستقل", async ({ page }) => {
  await page.goto("/reset-password?preview=expired");
  await expect(page.getByRole("heading", { name: "انتهت صلاحية رابط الاستعادة" }).first()).toBeVisible();
  await page.goto("/reset-password?preview=invalid");
  await expect(page.getByRole("heading", { name: "رابط الاستعادة غير صالح" }).first()).toBeVisible();
});

test("نموذج التجربة يرفض إدخالاً فارغًا ويضبط التركيز", async ({ page }) => {
  await page.goto("/reset-password?preview=valid");
  await expect(page.getByRole("heading", { name: "تعيين كلمة مرور جديدة" })).toBeVisible();
  await page.getByRole("button", { name: /حفظ كلمة المرور الجديدة/ }).click();
  await expect(page.getByText("يرجى إدخال كلمة المرور الجديدة.")).toBeVisible();
  await expect(page.locator("#bayan-reset-password")).toBeFocused();
});

test("يعرض مقياس القوة ويتحقق من الشروط والتطابق", async ({ page }) => {
  await page.goto("/reset-password?preview=valid");
  await page.locator("#bayan-reset-password").fill("abc");
  await expect(page.getByRole("meter", { name: "قوة كلمة المرور" })).toHaveAttribute("aria-valuenow", "1");
  await page.getByRole("button", { name: /حفظ كلمة المرور الجديدة/ }).click();
  await expect(page.getByText("كلمة المرور لا تستوفي شروط الأمان الموضحة أدناه.")).toBeVisible();
  await page.locator("#bayan-reset-password").fill("A_strongPassword123!");
  await expect(page.getByRole("meter")).toHaveAttribute("aria-valuenow", "4");
  await page.locator("#bayan-reset-confirm").fill("not-the-same-password");
  await page.getByRole("button", { name: /حفظ كلمة المرور الجديدة/ }).click();
  await expect(page.getByText("كلمتا المرور غير متطابقتين.")).toBeVisible();
  await expect(page.locator("#bayan-reset-confirm")).toBeFocused();
});

test("زر إظهار كلمة المرور يعمل على كل حقل بصورة مستقلة", async ({ page }) => {
  await page.goto("/reset-password?preview=valid");
  await page.getByRole("button", { name: "إظهار كلمة المرور الجديدة" }).click();
  await expect(page.locator("#bayan-reset-password")).toHaveAttribute("type", "text");
  await expect(page.locator("#bayan-reset-confirm")).toHaveAttribute("type", "password");
  await page.getByRole("button", { name: "إظهار تأكيد كلمة المرور" }).click();
  await expect(page.locator("#bayan-reset-confirm")).toHaveAttribute("type", "text");
});

test("نجاح محلي فقط دون استدعاءات API أو تخزين كلمات المرور", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", (r) => { if (r.url().includes("/api/")) requests.push(r.url()); });
  await page.goto("/reset-password?preview=valid");
  const password = "Abcdef-987654!";
  await page.locator("#bayan-reset-password").fill(password);
  await page.locator("#bayan-reset-confirm").fill(password);
  await page.getByRole("button", { name: /حفظ كلمة المرور الجديدة/ }).click();
  await expect(page.getByRole("heading", { name: "اكتملت محاكاة التعيين" })).toBeVisible();
  await expect(page.getByText(/لم تُرسل البيانات ولم تُغيَّر كلمة مرور حسابك/)).toBeVisible();
  expect(requests).toEqual([]);
  const stored = await page.evaluate(() => ({ local: JSON.stringify(localStorage), session: JSON.stringify(sessionStorage) }));
  expect(stored.local).not.toContain(password);
  expect(stored.session).not.toContain(password);
  await expect(page.locator("body")).not.toContainText(password);
});

test("الانتقال إلى استعادة الحساب يعمل", async ({ page }) => {
  await page.goto("/reset-password?preview=expired");
  await page.getByRole("link", { name: /طلب استعادة جديد/ }).click();
  await expect(page).toHaveURL(/\/forgot-password$/);
});

test("الواجهة بدون تمرير أفقي على الهاتف", async ({ page }) => {
  await page.setViewportSize({width:390,height:844});
  await page.goto("/reset-password?preview=valid");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test("التحول بين معاينات الحالات يمسح مدخلات النموذج", async ({ page }) => {
  await page.goto("/reset-password?preview=valid");
  await page.locator("#bayan-reset-password").fill("KeepNoPassword123!");
  await page.getByRole("link", { name: "رابط منتهي" }).click();
  await expect(page.getByRole("heading", { name: "انتهت صلاحية رابط الاستعادة" }).first()).toBeVisible();
  await page.getByRole("link", { name: "رابط صالح للتجربة" }).click();
  await expect(page.locator("#bayan-reset-password")).toHaveValue("");
});
