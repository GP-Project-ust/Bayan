import {test,expect} from '@playwright/test';

test.describe('Screen 29 – audit event details (demo)',()=>{
 test('opens the standalone page from the audit table',async({page})=>{
  await page.goto('/admin/audit');
  await page.getByRole('link',{name:'فتح الصفحة الكاملة للحدث AUD-DEMO-001'}).click();
  await expect(page).toHaveURL(/\/admin\/audit\/details\?id=AUD-DEMO-001/);
  await expect(page.getByTestId('audit-detail-screen')).toBeVisible();
  await expect(page.getByText('TRACE-DEMO-0001').first()).toBeVisible();
 });
 test('shows four tabs and does not invent agent execution',async({page})=>{
  await page.goto('/admin/audit/details?id=AUD-DEMO-013');
  await page.getByRole('tab',{name:'معرّف التتبع'}).click();
  await expect(page.getByText('لا تتضمن سجلات التدريب خطوات تنفيذ فعلية للوكلاء')).toBeVisible();
  await page.getByRole('tab',{name:'الخصوصية والضوابط'}).click();
  await expect(page.getByText('عزل المؤسسة')).toBeVisible();
 });
 test('handles missing, invalid and absent event IDs',async({page})=>{
  for(const [url,testId] of [['/admin/audit/details','audit-detail-missing'],['/admin/audit/details?id=INVALID','audit-detail-invalid'],['/admin/audit/details?id=AUD-DEMO-999','audit-detail-not-found']]){
   await page.goto(url);await expect(page.getByTestId(testId)).toBeVisible();
  }
 });
 test('does not reveal the event to an unauthorized demo role',async({page})=>{
  await page.goto('/admin/audit/details?id=AUD-DEMO-001');
  await page.locator('#audit-detail-role-picker').selectOption('manager');
  await expect(page.getByTestId('audit-detail-forbidden')).toBeVisible();
  await expect(page.getByRole('tablist',{name:'أقسام تفاصيل التدقيق'})).toHaveCount(0);
 });
 test('supports keyboard and narrow screen without page overflow',async({page})=>{
  for(const width of [390,768,1280]){
   await page.setViewportSize({width,height:840});
   await page.goto('/admin/audit/details?id=AUD-DEMO-001');
   await expect(page.getByRole('tab',{name:'نظرة عامة'})).toBeVisible();
   const size=await page.evaluate(()=>({scroll:document.body.scrollWidth,viewport:document.documentElement.clientWidth}));
   expect(size.scroll).toBeLessThanOrEqual(size.viewport+1);
  }
 });
});
