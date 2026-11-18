import {test,expect} from '@playwright/test';
test.describe('Bayan screen 19 — demo add user',()=>{
 test.beforeEach(async({page})=>{await page.goto('/admin/users/new');await expect(page.getByTestId('add-user-screen')).toBeVisible();});
 test('required fields and duplicate email are checked before the second step',async({page})=>{
  await page.getByRole('button',{name:'التالي'}).click();
  await expect(page.getByText('يجب إدخال اسم من 3 إلى 90 حرفًا.')).toBeVisible();
  await page.getByPlaceholder('مثال: أ. أحمد محمد').fill('سلمى التجريبية');
  await page.getByPlaceholder('employee@example.test').fill('sara@example.test');
  await page.getByRole('button',{name:'التالي'}).click();
  await expect(page.getByText('البريد الإلكتروني موجود في هذا النموذج.')).toBeVisible();
 });
 test('successful demo record appears in users list after page navigation',async({page})=>{
  await page.getByPlaceholder('مثال: أ. أحمد محمد').fill('سلمى التجريبية');
  await page.getByPlaceholder('employee@example.test').fill('salma.new@example.test');
  await page.getByRole('button',{name:'التالي'}).click();
  await expect(page.getByTestId('add-user-role-step')).toBeVisible();
  await page.locator('input[name="user-role"][value="manager"]').check();
  await page.getByRole('button',{name:'التالي'}).click();
  await expect(page.getByTestId('add-user-review-step')).toContainText('سلمى التجريبية');
  await page.getByRole('button',{name:'مراجعة وتأكيد الإضافة'}).click();
  await expect(page.getByRole('dialog')).toContainText('لن تُرسل أي رسالة');
  await page.getByRole('button',{name:'تأكيد الإضافة محليًا'}).click();
  await expect(page.getByTestId('add-user-success')).toContainText('USR-015');
  await page.getByRole('button',{name:'عرض قائمة المستخدمين'}).click();
  await page.getByLabel('البحث عن مستخدم').fill('salma.new@example.test');
  await expect(page.getByTestId('users-table')).toContainText('سلمى التجريبية');
 });
 test('role change removes authorization and mobile width has no overflow',async({page})=>{
  await page.getByLabel('الدور التجريبي').selectOption('employee');
  await expect(page.getByTestId('add-user-forbidden')).toBeVisible();
  await page.getByLabel('الدور التجريبي').selectOption('it_admin');
  await page.setViewportSize({width:390,height:844});
  await expect(page.getByTestId('add-user-account-step')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+3)).toBe(false);
 });
 test('cancel asks before abandoning modified fields',async({page})=>{
  await page.getByPlaceholder('مثال: أ. أحمد محمد').fill('بيانات غير محفوظة');
  await page.getByRole('button',{name:'العودة للمستخدمين'}).click();
  await expect(page.getByRole('dialog')).toContainText('تجاهل البيانات');
  await page.getByRole('button',{name:'متابعة التحرير'}).click();
  await expect(page.getByPlaceholder('مثال: أ. أحمد محمد')).toHaveValue('بيانات غير محفوظة');
 });
});
