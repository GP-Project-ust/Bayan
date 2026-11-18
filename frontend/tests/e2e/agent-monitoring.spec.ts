import {test,expect} from '@playwright/test';

test('agent dashboard shows the five project agents and synthetic notice',async({page})=>{
 await page.goto('/platform/agents');
 await expect(page.getByTestId('agent-monitoring-screen')).toBeVisible();
 await expect(page.getByText(/مؤشرات توضيحية مشتقة من سجلات تتبع اصطناعية/)).toBeVisible();
 for(const name of ['Supervisor','SQL','RAG','Analyst','Reporter']) await expect(page.getByText(name,{exact:true}).first()).toBeVisible();
});

test('agent cards open details and show aggregate counters only',async({page})=>{
 await page.goto('/platform/agents');
 await page.getByTestId('agent-card-RAG').click();
 await expect(page.getByTestId('agent-detail')).toBeVisible();
 await expect(page.getByTestId('agent-detail')).toContainText('وكيل الاسترجاع الدلالي');
 await expect(page.getByTestId('agent-detail')).toContainText('تفاصيل تتبعات المؤسسة غير متاحة لدور مسؤول المنصة');
});

test('Arabic search and state filters work',async({page})=>{
 await page.goto('/platform/agents');
 await page.getByPlaceholder('الاسم أو المهمة أو المسؤولية...').fill('الاسترجاع الدلالي');
 await expect(page.getByTestId('agent-card-RAG')).toBeVisible();
 await expect(page.getByTestId('agent-card-SQL')).toHaveCount(0);
 await page.getByRole('button',{name:'إعادة ضبط المرشحات'}).click();
 await page.getByLabel('تصفية حالة الوكيل').selectOption('attention');
 await expect(page.getByTestId('agent-card-RAG')).toBeVisible();
 await expect(page.getByTestId('agent-card-Analyst')).toBeVisible();
 await expect(page.getByTestId('agent-card-Supervisor')).toHaveCount(0);
});

test('CSV export downloads a synthetic aggregate only',async({page})=>{
 await page.goto('/platform/agents');
 const download=page.waitForEvent('download');
 await page.getByRole('button',{name:'تصدير CSV'}).click();
 const file=await download;
 expect(file.suggestedFilename()).toBe('bayan-agent-monitoring-demo.csv');
});

test('non-platform demo roles are denied',async({page})=>{
 await page.goto('/platform/agents');
 await page.locator('#agent-monitoring-role-picker').selectOption('it_admin');
 await expect(page.getByTestId('agent-monitoring-forbidden')).toBeVisible();
});

test('mobile layout keeps the page usable',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/platform/agents');
 await expect(page.getByTestId('agent-monitoring-screen')).toBeVisible();
 await expect(page.getByTestId('agent-card-Supervisor')).toBeVisible();
 await expect(page.locator('html')).toHaveAttribute('lang',/ar/);
});
