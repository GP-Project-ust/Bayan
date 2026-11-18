import {expect,test} from "@playwright/test";

// Requires a running Next.js dev server. This preview is NOT real authentication.
test("تعرض صفحة تسجيل الدخول بهوية بيان والحقول الأساسية",async({page})=>{
  await page.goto("/login");
  await expect(page.getByRole("heading",{name:/مرحبًا بعودتك/})).toBeVisible();
  await expect(page.getByRole("textbox",{name:/البريد الإلكتروني/})).toBeVisible();
  await expect(page.locator("#bayan-login-password")).toBeVisible();
  await expect(page.getByText("وضع العرض التجريبي")).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("dir","rtl");
});

test("يوضح الأخطاء عند تقديم نموذج فارغ",async({page})=>{
  await page.goto("/login");
  await page.getByRole("button",{name:/تسجيل الدخول/}).click();
  await expect(page.getByText("يرجى إدخال البريد الإلكتروني.")).toBeVisible();
  await expect(page.getByText("يرجى إدخال كلمة المرور.")).toBeVisible();
});

test("زر إظهار كلمة المرور يعمل ويعكس النص",async({page})=>{
  await page.goto("/login");
  const password=page.locator("#bayan-login-password");
  await expect(password).toHaveAttribute("type","password");
  await page.getByRole("button",{name:"إظهار كلمة المرور"}).click();
  await expect(password).toHaveAttribute("type","text");
  await page.getByRole("button",{name:"إخفاء كلمة المرور"}).click();
  await expect(password).toHaveAttribute("type","password");
});

test("التجربة المحلية تعرض خطأ واضحًا عند بيانات غير صحيحة",async({page})=>{
  await page.goto("/login");
  await page.locator("#bayan-login-email").fill("wrong@example.com");
  await page.locator("#bayan-login-password").fill("Incorrect123!");
  await page.getByRole("button",{name:/تسجيل الدخول/}).click();
  await expect(page.getByRole("alert")).toContainText("بيانات الدخول التجريبية غير صحيحة");
});

test("التجربة المحلية تحول إلى الإدارة دون تخزين كلمة المرور",async({page})=>{
  await page.goto("/login");
  await page.getByRole("button",{name:/تعبئة بيانات التجربة/}).click();
  await page.getByRole("button",{name:/تسجيل الدخول/}).click();
  await expect(page).toHaveURL(/\/admin$/);
  const content=await page.evaluate(()=>({session:sessionStorage.getItem("bayan-preview-session-v1"), remembered:localStorage.getItem("bayan-login-remembered-email-v1")}));
  expect(content.session).toContain('"mode":"preview-only"');
  expect(content.session).not.toContain("BayanDemo123!");
  expect(content.remembered).toBeNull();
});

test("الهاتف لا يحتاج إلى تمرير أفقي على صفحة الدخول",async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto("/login");
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
