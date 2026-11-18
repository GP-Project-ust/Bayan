import {expect,test} from '@playwright/test';

test.describe('Screen 34 — Onboarding History (demo)',()=>{
 test.beforeEach(async({page})=>{await page.goto('/platform/onboarding/history');});
 test('shows platform summary and synthetic run list',async({page})=>{
  await expect(page.getByTestId('onboarding-history-screen')).toBeVisible();
  await expect(page.getByRole('heading',{name:'سجل عمليات التهيئة'})).toBeVisible();
  await expect(page.getByText('ONB-DEMO-0001')).toBeVisible();
  await expect(page.getByText('محاكاة محلية بالكامل')).toHaveCount(0);
 });
 test('Arabic search and outcome filters',async({page})=>{
  await page.getByRole('searchbox',{name:'بحث سجل التهيئة'}).fill('الأفق');
  await expect(page.getByText('ONB-DEMO-0001')).toBeVisible();
  await expect(page.getByText('ONB-DEMO-0008')).toHaveCount(0);
  await page.getByRole('button',{name:'مسح المرشحات'}).click();
  await page.getByLabel('حالة العملية').selectOption('failed');
  await expect(page.getByText('ONB-DEMO-0006')).toBeVisible();
 });
 test('details drawer has six stages and no internal reasoning',async({page})=>{
  await page.getByRole('searchbox',{name:'بحث سجل التهيئة'}).fill('ONB-DEMO-0006');
  await page.getByRole('button',{name:'فتح تفاصيل ONB-DEMO-0006'}).click();
  const drawer=page.getByTestId('onboarding-run-detail');await expect(drawer).toBeVisible();
  await expect(drawer.locator('.boh-stage')).toHaveCount(6);
  await expect(drawer.getByText('سبب توضيحي للتوقف')).toBeVisible();
 });
 test('retry prepares draft but does not execute remote workflow',async({page})=>{
  await page.getByRole('searchbox',{name:'بحث سجل التهيئة'}).fill('ONB-DEMO-0006');
  await page.getByRole('button',{name:'فتح تفاصيل ONB-DEMO-0006'}).click();
  await page.getByRole('button',{name:'تجهيز مسودة إعادة المحاولة'}).click();
  await page.getByRole('button',{name:'حفظ مسودة جديدة'}).click();
  await expect(page.getByRole('link',{name:/فتح معالج التهيئة/})).toBeVisible();
  const draft=await page.evaluate(()=>localStorage.getItem('bayan-onboarding-draft-demo-v1'));
  expect(draft).not.toBeNull();expect(JSON.parse(draft!)?.analysisDone).toBe(false);
 });
 test('forbidden role cannot see platform history records',async({page})=>{
  await page.locator('#onboarding-history-role-picker').selectOption('employee');
  await expect(page.getByTestId('onboarding-history-forbidden')).toBeVisible();
  await expect(page.getByText('ONB-DEMO-0001')).toHaveCount(0);
 });
});
