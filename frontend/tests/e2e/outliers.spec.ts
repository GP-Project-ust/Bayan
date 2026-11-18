import {test,expect} from '@playwright/test';

test.describe('Bayan screen 17 — demo outlier review',()=>{
 test.beforeEach(async({page})=>{
  await page.goto('/analytics/outliers');
  await expect(page.getByTestId('outliers-screen')).toBeVisible();
 });
 test('shows fictional data notice, default 12 October cases and filters',async({page})=>{
  await expect(page.getByRole('heading',{name:'اكتشاف القيم الشاذة'})).toBeVisible();
  await expect(page.getByText(/خطوط الأساس والانحرافات محددة يدويًا/)).toBeVisible();
  await expect(page.getByTestId('outliers-table').locator('tbody tr')).toHaveCount(12);
  await page.getByLabel('كلية المراجعة').selectOption('engineering');
  await expect(page.getByTestId('outliers-table').locator('tbody tr')).toHaveCount(2);
  await page.getByLabel('قسم المراجعة').selectOption('software');
  await expect(page.getByTestId('outliers-table').locator('tbody tr')).toHaveCount(1);
 });
 test('case opens with transparent baseline comparison and local review control',async({page})=>{
  await page.getByRole('button',{name:'عرض تفاصيل OUT-101'}).click();
  await expect(page.getByTestId('outlier-details')).toContainText('خط الأساس');
  await page.getByLabel('تحديث حالة المراجعة').selectOption('reviewed');
  await expect(page.getByTestId('outlier-details')).toContainText('تمت المراجعة');
  await page.getByRole('button',{name:'إغلاق الدرج'}).click();
  await expect(page.getByTestId('outliers-table')).toContainText('تمت المراجعة');
 });
 test('empty state and reset, CSV download',async({page})=>{
  await page.getByLabel('البحث في القيم الشاذة').fill('لا وجود لهذا القسم إطلاقًا');
  await expect(page.getByTestId('outliers-empty')).toBeVisible();
  await page.getByRole('button',{name:'عرض الحالات الافتراضية'}).click();
  await expect(page.getByTestId('outliers-table').locator('tbody tr')).toHaveCount(12);
  const file=page.waitForEvent('download');await page.getByRole('button',{name:'تنزيل CSV تجريبي'}).click();
  await expect((await file).suggestedFilename()).toBe('bayan-demo-outliers.csv');
 });
 test('employee is denied dashboard and no table or export available',async({page})=>{
  await page.getByLabel('الدور التجريبي').selectOption('employee');
  await expect(page.getByTestId('outliers-forbidden')).toBeVisible();
  await expect(page.getByTestId('outliers-table')).toHaveCount(0);
 });
 test('mobile has no document-wide horizontal scroll',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.reload();
  await expect(page.getByRole('heading',{name:'اكتشاف القيم الشاذة'})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+3)).toBe(false);
 });
});
