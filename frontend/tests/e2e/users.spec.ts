import {test,expect} from '@playwright/test';
test.describe('Screen 18 — local user management preview',()=>{
 test.beforeEach(async({page})=>{await page.goto('/admin/users');await expect(page.getByTestId('users-management-screen')).toBeVisible();});
 test('fictional users, 14 account summary, search and role filter',async({page})=>{
  await expect(page.getByRole('heading',{name:'إدارة المستخدمين والأدوار'})).toBeVisible();
  await expect(page.getByText('جميع الحسابات والأسماء والمؤسسة')).toBeVisible();
  await expect(page.getByTestId('users-table').locator('tbody tr')).toHaveCount(8);
  await page.getByLabel('البحث عن مستخدم').fill('القحطاني');
  await expect(page.getByTestId('users-table').locator('tbody tr')).toHaveCount(1);
  await page.getByLabel('البحث عن مستخدم').fill('');
  await page.getByLabel('تصفية حسب الدور').selectOption('it_admin');
  await expect(page.getByTestId('users-table').locator('tbody tr')).toHaveCount(2);
 });
 test('create user in demo and view its details',async({page})=>{
  await page.getByRole('button',{name:'إضافة مستخدم',exact:true}).click();
  await page.getByRole('dialog').getByPlaceholder('مثال: أ. أحمد محمد').fill('أحمد التجريبي');
  await page.getByRole('dialog').getByPlaceholder('employee@example.test').fill('new.user@example.test');
  await page.getByRole('dialog').getByRole('button',{name:'إضافة إلى النموذج'}).click();
  await expect(page.getByText('تمت الإضافة محليًا')).toBeVisible();
  await page.getByLabel('البحث عن مستخدم').fill('new.user@example.test');
  await expect(page.getByTestId('users-table')).toContainText('أحمد التجريبي');
  await page.getByRole('button',{name:'تفاصيل أحمد التجريبي'}).click();
  await expect(page.getByTestId('user-details')).toContainText('USR-015');
 });
 test('duplicate email blocked and no unauthorized user management',async({page})=>{
  await page.getByRole('button',{name:'إضافة مستخدم',exact:true}).click();
  await page.getByRole('dialog').getByPlaceholder('مثال: أ. أحمد محمد').fill('أحمد التجريبي');
  await page.getByRole('dialog').getByPlaceholder('employee@example.test').fill('sara@example.test');
  await page.getByRole('dialog').getByRole('button',{name:'إضافة إلى النموذج'}).click();
  await expect(page.getByRole('dialog')).toContainText('البريد الإلكتروني موجود');
  await page.getByRole('button',{name:'إغلاق النافذة'}).click();
  await page.getByLabel('الدور التجريبي').selectOption('employee');
  await expect(page.getByTestId('users-forbidden')).toBeVisible();
 });
 test('disabled user confirmation dialog and user details',async({page})=>{
  await page.getByLabel('البحث عن مستخدم').fill('سارة القحطاني');
  await page.getByRole('button',{name:'تعطيل أ. سارة القحطاني'}).click();
  await expect(page.getByRole('dialog')).toContainText('تأكيد تعطيل الحساب');
  await page.getByRole('button',{name:'تأكيد التعطيل'}).click();
  await expect(page.getByTestId('users-table')).toContainText('معطّل');
 });
 test('mobile UI avoids page-wide horizontal overflow',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.reload();
  await expect(page.getByRole('heading',{name:'إدارة المستخدمين والأدوار'})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+3)).toBe(false);
 });
});
