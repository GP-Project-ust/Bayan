import {test,expect} from '@playwright/test';

test.describe('Screen 33 — Smart Onboarding demo only',()=>{
 test('six stage wizard guides user and never presents real provisioning',async({page})=>{
  await page.goto('/platform/onboarding');
  await expect(page.getByTestId('onboarding-screen')).toBeVisible();
  await expect(page.getByRole('heading',{name:'معالج التهيئة الذكية للمؤسسات'})).toBeVisible();
  await page.getByRole('button',{name:'التالي'}).click();
  await expect(page.getByRole('heading',{name:'المصادر'})).toBeVisible();
  await page.getByRole('button',{name:'التالي'}).click();
  await expect(page.getByRole('heading',{name:'تحليل المخطط'})).toBeVisible();
  await page.getByRole('button',{name:'تشغيل محاكاة تحليل المخطط'}).click();
  await page.getByRole('button',{name:'التالي'}).click();
  await expect(page.getByRole('heading',{name:'العروض الذكية'})).toBeVisible();
  await page.getByText('إحصاء أعداد الطلاب').click();
  await page.getByRole('button',{name:'التالي'}).click();
  await page.getByRole('button',{name:'بدء محاكاة الفهرسة'}).click();
  await page.getByRole('button',{name:'التالي'}).click();
  await expect(page.getByRole('heading',{name:'المراجعة'})).toBeVisible();
  await page.getByRole('checkbox').check();
  await page.getByRole('button',{name:'تأكيد إكمال المحاكاة'}).click();
  await page.getByRole('button',{name:'تأكيد المحاكاة فقط'}).click();
  await expect(page.getByTestId('onboarding-completed')).toBeVisible();
  await expect(page.getByText('لم تُنشأ مؤسسة ولا مخطط أو عرض ذكي')).toBeVisible();
 });
 test('only platform admin sees the wizard',async({page})=>{
  await page.goto('/platform/onboarding');await page.locator('#onboarding-role-picker').selectOption('employee');
  await expect(page.getByTestId('onboarding-forbidden')).toBeVisible();
  await expect(page.getByRole('heading',{name:'المؤسسة'})).toHaveCount(0);
 });
 test('draft is restored and reset stays local',async({page})=>{
  await page.goto('/platform/onboarding');
  await page.getByRole('button',{name:'حفظ مسودة'}).click();
  await page.reload();
  await expect(page.getByText('استُعيدت مسودة تدريبية محفوظة')).toBeVisible();
  await page.getByRole('button',{name:'إعادة البدء'}).click();
  await page.getByRole('button',{name:'مسح المسودة التجريبية'}).click();
  await expect(page.getByRole('heading',{name:'المؤسسة'})).toBeVisible();
 });
 test('mobile wizard does not overflow window',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('/platform/onboarding');
  await expect(page.getByTestId('onboarding-screen')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBeTruthy();
 });
});
