import {test,expect} from '@playwright/test';
test.describe('Bayan screen 16 — Analytics Dashboard',()=>{
 test.beforeEach(async({page})=>{await page.goto('/analytics');await expect(page.getByTestId('analytics-screen')).toBeVisible();});
 test('displays clearly fictional October metrics consistent with the report',async({page})=>{
  await expect(page.getByRole('heading',{name:'لوحة التحليلات ومؤشرات الأداء'})).toBeVisible();
  await expect(page.getByText(/جميع الأرقام والمحاور/)).toBeVisible();
  await expect(page.getByTestId('analytics-kpis')).toContainText('٦٬٣٢٠');
  await expect(page.getByTestId('analytics-departments-table').locator('tbody tr')).toHaveCount(12);
 });
 test('faculty and department filters narrow metrics without adding multiple months',async({page})=>{
  await page.getByLabel('الكلية',{exact:true}).selectOption('engineering');
  await expect(page.getByTestId('analytics-kpis')).toContainText('١٬٢٥٠');
  await expect(page.getByTestId('analytics-departments-table').locator('tbody tr')).toHaveCount(2);
  await page.getByLabel('القسم الأكاديمي').selectOption('software');
  await expect(page.getByTestId('analytics-departments-table').locator('tbody tr')).toHaveCount(1);
  await page.getByRole('button',{name:'إعادة ضبط'}).click();
  await expect(page.getByTestId('analytics-departments-table').locator('tbody tr')).toHaveCount(12);
 });
 test('month and trend switches update chart and metrics',async({page})=>{
  await page.getByLabel('الشهر المرجعي').selectOption('2026-08');
  await expect(page.getByTestId('analytics-kpis')).toContainText('٥٬٨٥٠');
  await page.getByLabel('مؤشر الاتجاه').selectOption('attendance');
  await expect(page.getByTestId('analytics-trend-chart')).toHaveAttribute('data-testid','analytics-trend-chart');
 });
 test('department details open and close with accessible dialog',async({page})=>{
  await page.getByTestId('analytics-departments-table').locator('tbody tr').first().getByRole('button',{name:/تفاصيل/}).click();
  await expect(page.getByRole('dialog')).toContainText('بيانات مولدة');
  await page.getByRole('button',{name:'إغلاق الدرج'}).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
 });
 test('manager may export a demo CSV; non-managers are denied the dashboard',async({page})=>{
  const download=page.waitForEvent('download');await page.getByRole('button',{name:'تنزيل CSV تجريبي'}).click();
  await expect((await download).suggestedFilename()).toBe('bayan-demo-analytics-2026-10.csv');
  await page.getByLabel('الدور التجريبي').selectOption('employee');
  await expect(page.getByTestId('analytics-forbidden')).toBeVisible();
  await expect(page.getByTestId('analytics-departments-table')).toHaveCount(0);
 });
 test('mobile dashboard has a scrollable table, not full-page horizontal overflow',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.reload();
  await expect(page.getByRole('heading',{name:'لوحة التحليلات ومؤشرات الأداء'})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+3)).toBe(false);
 });
});
