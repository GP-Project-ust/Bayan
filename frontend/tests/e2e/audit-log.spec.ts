import {test,expect} from '@playwright/test';

test.describe('الشاشة 28 — سجل التدقيق',()=>{
 test.beforeEach(async({page})=>{await page.goto('/admin/audit');await expect(page.getByTestId('audit-log-screen')).toBeVisible();});
 test('shows educational audit trail and four metrics',async({page})=>{
  await expect(page.getByRole('heading',{name:'سجل التدقيق'})).toBeVisible();
  await expect(page.getByText(/نماذج تدقيق تدريبية ثابتة/)).toBeVisible();
  await expect(page.getByRole('table')).toBeVisible();
 });
 test('filters by outcome and clears filters',async({page})=>{
  await page.getByLabel('تصفية النتيجة').selectOption('denied');
  await expect(page.getByText('محاولة الوصول إلى مصدر محظور')).toBeVisible();
  await expect(page.getByText('حفظ مسودة عرض ذكي')).toHaveCount(0);
  await page.getByRole('button',{name:'مسح المرشحات'}).click();
  await expect(page.getByText('حفظ مسودة عرض ذكي')).toBeVisible();
 });
 test('search matches trace ID and opens event detail drawer',async({page})=>{
  await page.getByRole('searchbox',{name:'البحث في سجل التدقيق'}).fill('TRACE-DEMO-0013');
  await expect(page.getByRole('row')).toHaveCount(2);
  await page.getByRole('button',{name:'عرض تفاصيل الحدث AUD-DEMO-013'}).click();
  await expect(page.getByRole('dialog',{name:'تفاصيل حدث التدقيق'})).toBeVisible();
  await expect(page.getByText('رفض رؤية تفاصيل SQL')).toBeVisible();
  await page.getByRole('button',{name:'إغلاق الدرج'}).click();
 });
 test('download CSV only for filtered training events',async({page})=>{
  await page.getByLabel('تصفية النتيجة').selectOption('failed');
  const download=page.waitForEvent('download');
  await page.getByRole('button',{name:'تصدير CSV تجريبي'}).click();
  expect((await download).suggestedFilename()).toBe('bayan-demo-audit-filtered.csv');
  await page.getByRole('searchbox',{name:'البحث في سجل التدقيق'}).fill('لا يوجد اطلاقا');
  await expect(page.getByRole('button',{name:'تصدير CSV تجريبي'})).toBeDisabled();
 });
 test('unauthorized role cannot read events or export them',async({page})=>{
  await page.locator('#audit-role-picker').selectOption('manager');
  await expect(page.getByTestId('audit-forbidden')).toBeVisible();
  await expect(page.getByRole('table')).toHaveCount(0);
  await expect(page.getByRole('button',{name:'تصدير CSV تجريبي'})).toHaveCount(0);
 });
 test('responsive widths avoid page-level horizontal overflow',async({page})=>{
  for(const width of [390,768,1280]){
   await page.setViewportSize({width,height:850});
   const metric=await page.evaluate(()=>({scroll:document.body.scrollWidth,view:document.documentElement.clientWidth}));
   expect(metric.scroll).toBeLessThanOrEqual(metric.view+1);
  }
 });
});
