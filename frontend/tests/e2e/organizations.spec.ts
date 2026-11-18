import {test,expect} from '@playwright/test';

test.describe('Screen 32 — Platform organizations preview',()=>{
 test('platform operator may filter, view metadata and navigate',async({page})=>{
  await page.goto('/platform/organizations');
  await expect(page.getByTestId('organizations-screen')).toBeVisible();
  await expect(page.getByRole('heading',{name:'إدارة المؤسسات المستفيدة'})).toBeVisible();
  await expect(page.locator('.borg-table tbody tr')).toHaveCount(6);
  await page.getByPlaceholder('الاسم أو الرمز أو المنطقة...').fill('جامعة');
  await expect(page.locator('.borg-table tbody tr')).toHaveCount(2);
  await page.getByRole('button',{name:/عرض تفاصيل جامعة الأفق/}).click();
  await expect(page.getByTestId('organization-details')).toBeVisible();
  await expect(page.getByText('لا تظهر بيانات الطلاب أو المستخدمين')).toBeVisible();
 });
 test('non-platform role sees forbidden state',async({page})=>{
  await page.goto('/platform/organizations');
  await page.locator('#organizations-role-picker').selectOption('employee');
  await expect(page.getByTestId('organizations-forbidden')).toBeVisible();
  await expect(page.locator('.borg-table')).toHaveCount(0);
 });
 test('status change is confirmed and persists only in local demo',async({page})=>{
  await page.goto('/platform/organizations');
  const row=page.locator('.borg-table tbody tr').filter({hasText:'جامعة الأفق التجريبية'});
  await row.getByRole('button',{name:'إيقاف تجريبي'}).click();
  await expect(page.getByRole('heading',{name:'تأكيد تغيير حالة المؤسسة'})).toBeVisible();
  await page.getByRole('button',{name:'تأكيد الإيقاف التجريبي'}).click();
  await expect(row.getByText('موقوفة')).toBeVisible();
  await page.reload();
  await expect(page.locator('.borg-table tbody tr').filter({hasText:'جامعة الأفق التجريبية'}).getByText('موقوفة')).toBeVisible();
 });
 test('mobile organizations page does not overflow horizontally',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('/platform/organizations');
  await expect(page.getByTestId('organizations-screen')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBeTruthy();
 });
});
