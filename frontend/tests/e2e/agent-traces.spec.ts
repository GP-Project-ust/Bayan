import {test,expect} from '@playwright/test';

test.describe('Screen 30 Agent Traces - demonstration',()=>{
 test('filters by agent and opens safe step details',async({page})=>{
  await page.goto('/admin/agent-traces');
  await expect(page.getByRole('heading',{name:'تتبّع تنفيذ الوكلاء'})).toBeVisible();
  await page.getByLabel('تصفية الوكيل').selectOption('RAG');
  await expect(page.getByText('TRACE-DEMO-0007')).toBeVisible();
  await page.getByRole('button',{name:'عرض تفاصيل التتبع TRACE-DEMO-0007'}).click();
  await expect(page.getByTestId('agent-trace-detail')).toBeVisible();
  await expect(page.getByText('سجلات تشغيل اصطناعية',{exact:false}).first()).toBeVisible();
 });
 test('blocks a non-authorized role',async({page})=>{
  await page.goto('/admin/agent-traces');
  await page.locator('#agent-traces-role-picker').selectOption('employee');
  await expect(page.getByTestId('agent-traces-forbidden')).toBeVisible();
  await expect(page.getByText('TRACE-DEMO-0007')).not.toBeVisible();
 });
 test('renders in small viewport without full page horizontal scroll',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('/admin/agent-traces');
  await expect(page.getByTestId('agent-traces-screen')).toBeVisible();
  const hasOverflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+3);
  expect(hasOverflow).toBe(false);
 });
});
