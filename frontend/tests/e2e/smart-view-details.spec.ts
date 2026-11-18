import {test,expect} from '@playwright/test';

test.describe('الشاشة 27 — تفاصيل العرض الذكي',()=>{
 test.beforeEach(async({page})=>{await page.goto('/admin/smart-views/details?id=SV-DEMO-01');await expect(page.getByTestId('smart-view-details-screen')).toBeVisible();});
 test('details are linked to original demo view, with safe JSON preview',async({page})=>{
  await expect(page.getByRole('heading',{name:'عرض إحصاء التسجيل'})).toBeVisible();
  await page.getByRole('tab',{name:'الحقول والتعريف'}).click();
  await expect(page.getByText('JSON وصفي آمن')).toBeVisible();
  await expect(page.getByText('"noExecution": true')).toBeVisible();
 });
 test('test is simulated; classification mismatch never generates student data',async({page})=>{
  await page.getByRole('button',{name:'تشغيل فحص تجريبي'}).click();
  await expect(page.getByText('تحتاج البيانات الوصفية إلى مراجعة التصنيف قبل الاستخدام.')).toBeVisible();
  await expect(page.getByText('لا تتوفر صفوف اصطناعية آمنة لهذا التعريف')).toBeVisible();
 });
 test('invalid or absent IDs cannot display view data',async({page})=>{
  await page.goto('/admin/smart-views/details?id=SV-DEMO-99');
  await expect(page.getByTestId('smart-view-details-missing')).toBeVisible();
  await page.goto('/admin/smart-views/details?id=SV-DRAFT-../../bad');
  await expect(page.getByText('رابط العرض غير صالح')).toBeVisible();
 });
 test('role selector hides details for unauthorized accounts',async({page})=>{
  await page.locator('#bsv27-role-picker').selectOption('employee');
  await expect(page.getByTestId('smart-view-details-forbidden')).toBeVisible();
  await expect(page.getByText('عرض إحصاء التسجيل')).toHaveCount(0);
 });
 test('listing opens dedicated details route',async({page})=>{
  await page.goto('/admin/smart-views');
  await page.getByRole('link',{name:/فتح التفاصيل الكاملة للعرض عرض إحصاء التسجيل/}).click();
  await expect(page).toHaveURL(/\/admin\/smart-views\/details\?id=SV-DEMO-01/);
  await expect(page.getByRole('heading',{name:'عرض إحصاء التسجيل'})).toBeVisible();
 });
 test('responsive phone and desktop avoid page-level horizontal overflow',async({page})=>{
  for(const width of [390,768,1280]){
   await page.setViewportSize({width,height:900});
   const result=await page.evaluate(()=>({body:document.body.scrollWidth,viewport:document.documentElement.clientWidth}));
   expect(result.body).toBeLessThanOrEqual(result.viewport+1);
  }
 });
});
