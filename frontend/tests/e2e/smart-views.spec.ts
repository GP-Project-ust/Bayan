import {test,expect} from '@playwright/test';
test.describe('شاشة 25 — إدارة العروض الذكية (تجريبية)',()=>{
 test('loads the source-aligned illustrative list and detail drawer',async({page})=>{
  await page.goto('/admin/smart-views');
  await expect(page.getByTestId('smart-views-screen')).toBeVisible();
  await expect(page.getByText('عرض إحصاء التسجيل').first()).toBeVisible();
  await page.getByRole('button',{name:'تفاصيل العرض عرض إحصاء التسجيل'}).click();
  await expect(page.getByRole('dialog')).toContainText('registered_count');
  await expect(page.getByRole('dialog')).toContainText('ليس View منشورًا');
 });
 test('filters by Arabic and returns an empty state',async({page})=>{
  await page.goto('/admin/smart-views');
  await page.getByRole('textbox',{name:'البحث في العروض الذكية'}).fill('نص لا يوجد إطلاقا');
  await expect(page.getByText('لا توجد عروض مطابقة')).toBeVisible();
 });
 test('enforces role-based view access in the preview',async({page})=>{
  await page.goto('/admin/smart-views');
  await page.locator('#bsv-role-picker').selectOption('employee');
  await expect(page.getByTestId('smart-views-forbidden')).toBeVisible();
 });
 test('pauses the sample view without real query execution',async({page})=>{
  await page.goto('/admin/smart-views');
  await page.getByRole('button',{name:'تغيير الحالة التجريبية عرض إحصاء التسجيل'}).click();
  await page.getByRole('button',{name:'إيقاف محلي'}).click();
  await expect(page.getByText('موقوف محليًا').first()).toBeVisible();
 });
});
