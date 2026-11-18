import {test,expect} from '@playwright/test';

test.describe('Screen 31 - agent trace details (synthetic demo)',()=>{
 test('opens full details from screen 30',async({page})=>{
  await page.goto('/admin/agent-traces');
  await page.getByRole('link',{name:'فتح الصفحة الكاملة للتتبع TRACE-DEMO-0007'}).click();
  await expect(page).toHaveURL(/\/admin\/agent-traces\/details\?id=TRACE-DEMO-0007/);
  await expect(page.getByTestId('agent-trace-detail-screen')).toBeVisible();
  await expect(page.getByText('TRACE-DEMO-0007').first()).toBeVisible();
 });
 test('tabs, expand/collapse timeline and correlated audit reference',async({page})=>{
  await page.goto('/admin/agent-traces/details?id=TRACE-DEMO-0007');
  await page.getByRole('tab',{name:'الخط الزمني'}).click();
  await page.getByRole('button',{name:'توسيع الكل'}).click();
  await expect(page.getByText('تحديد مسار البحث في المستندات؛ دون تسجيل نص السؤال.')).toBeVisible();
  await page.getByRole('tab',{name:'نتيجة التنفيذ'}).click();
  await expect(page.getByRole('link',{name:'فتح تفاصيل حدث التدقيق'})).toHaveAttribute('href','/admin/audit/details?id=AUD-DEMO-007');
 });
 test('bad IDs and missing fixture get safe states',async({page})=>{
  for(const [path,id] of [
   ['/admin/agent-traces/details','agent-trace-details-missing'],
   ['/admin/agent-traces/details?id=BAD','agent-trace-details-invalid'],
   ['/admin/agent-traces/details?id=TRACE-DEMO-9999','agent-trace-details-not-found']]){
    await page.goto(path);await expect(page.getByTestId(id)).toBeVisible();
   }
 });
 test('unauthorized demo roles do not see trace details',async({page})=>{
  await page.goto('/admin/agent-traces/details?id=TRACE-DEMO-0007');
  await page.locator('#agent-trace-details-role-picker').selectOption('employee');
  await expect(page.getByTestId('agent-trace-details-forbidden')).toBeVisible();
  await expect(page.getByRole('tablist',{name:'أقسام تفاصيل تتبع الوكلاء'})).toHaveCount(0);
 });
 test('running trace does not fabricate elapsed time or live processing',async({page})=>{
  await page.goto('/admin/agent-traces/details?id=TRACE-DEMO-0105');
  await page.getByRole('tab',{name:'نتيجة التنفيذ'}).click();
  await expect(page.getByText('لا توجد عملية حية ولا متابعة تلقائية للتحديث.')).toBeVisible();
 });
 test('responsive viewports do not overflow entire page',async({page})=>{
  for(const width of [390,768,1280]){
   await page.setViewportSize({width,height:850});await page.goto('/admin/agent-traces/details?id=TRACE-DEMO-0007');
   await expect(page.getByRole('tab',{name:'نظرة عامة'})).toBeVisible();
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+3);
   expect(overflow).toBe(false);
  }
 });
});
