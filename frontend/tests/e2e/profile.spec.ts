import { test, expect } from "@playwright/test";

// Interface-only tests; all identity/permissions/data are demonstration values.
test("تظهر الهوية المؤسسية وشارة المعاينة بالعربية", async ({page})=>{
  await page.goto("/profile");
  await expect(page.getByRole("heading", {name:"الملف الشخصي"})).toBeVisible();
  await expect(page.getByText("جامعة بيان التجريبية").first()).toBeVisible();
  await expect(page.getByText(/لا توجد جلسة مستخدم حقيقية/)).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("dir","rtl");
});

test("يتيح تعديل الحقول غير الإدارية والتحقق من صحتها", async ({page})=>{
  await page.goto("/profile");
  await page.getByRole("tab",{name:"البيانات الشخصية"}).click();
  await expect(page.getByText("البريد الإلكتروني المؤسسي").first()).toBeVisible();
  await page.locator("#bayan-profile-display-name").fill("أ");
  await page.getByRole("button",{name:"حفظ في المعاينة"}).click();
  await expect(page.getByText("يجب أن يكون الاسم المعروض بين حرفين و70 حرفًا.")).toBeVisible();
  await page.locator("#bayan-profile-display-name").fill("منى أحمد");
  await page.locator("#bayan-profile-phone").fill("abc");
  await page.getByRole("button",{name:"حفظ في المعاينة"}).click();
  await expect(page.getByText(/أدخل رقم هاتف صالحًا/)).toBeVisible();
  await page.locator("#bayan-profile-phone").fill("+967711234567");
  await page.getByRole("button",{name:"حفظ في المعاينة"}).click();
  await expect(page.getByText("تم حفظ التعديلات في المعاينة")).toBeVisible();
  await expect(page.getByRole("heading",{name:"منى أحمد"})).toBeVisible();
});

test("يطلب تأكيد تجاهل التعديلات غير المحفوظة",async ({page})=>{
  await page.goto("/profile");
  await page.getByRole("tab",{name:"البيانات الشخصية"}).click();
  await page.locator("#bayan-profile-display-name").fill("بيان للاختبار");
  await page.getByRole("tab",{name:"الدور والصلاحيات"}).click();
  await expect(page.getByRole("dialog",{name:"تجاهل التعديلات؟"})).toBeVisible();
  await page.getByRole("button",{name:"متابعة التحرير"}).click();
  await expect(page.locator("#bayan-profile-display-name")).toHaveValue("بيان للاختبار");
  await page.getByRole("tab",{name:"الدور والصلاحيات"}).click();
  await page.getByRole("button",{name:"تجاهل التعديلات"}).click();
  await expect(page.locator("#bayan-profile-role")).toBeVisible();
});

test("اختيار دور المعاينة لا يرسل API ولا يمنح صلاحيات فعلية",async ({page})=>{
  const apiRequests:string[]=[];
  page.on("request",r=>{if(r.url().includes("/api/")) apiRequests.push(r.url());});
  await page.goto("/profile");
  await page.getByRole("tab",{name:"الدور والصلاحيات"}).click();
  await page.locator("#bayan-profile-role").selectOption("it_admin");
  await expect(page.getByText("إدارة المستخدمين",{exact:true})).toBeVisible();
  await expect(page.getByText(/لا يغيّر ذلك صلاحية حساب حقيقي/)).toBeVisible();
  expect(apiRequests).toEqual([]);
});

test("شاشة الملف الشخصي متجاوبة على الهاتف ولا تمرر أفقيًا",async ({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto("/profile");
  await expect(page.getByRole("heading",{name:"الملف الشخصي"})).toBeVisible();
  const overscroll=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1);
  expect(overscroll).toBe(false);
});
