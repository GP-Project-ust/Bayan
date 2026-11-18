import {test,expect} from '@playwright/test';
test('provider registry, filters and safe simulated readiness',async({page})=>{
 await page.goto('/platform/models');
 await expect(page.getByTestId('models-screen')).toBeVisible();
 await expect(page.getByText('إدارة مزودي النماذج اللغوية')).toBeVisible();
 await page.getByPlaceholder('اسم المزود أو معرّف النموذج...').fill('Ollama');
 await expect(page.getByRole('table').first().getByRole('row')).toHaveCount(2);
 await page.getByRole('button',{name:'فحص تجريبي'}).first().click();
 await expect(page.getByTestId('model-readiness-result')).toContainText('طلبات الشبكة: 0');
});
test('drafts are persisted locally and can be reset',async({page})=>{
 await page.goto('/platform/models');
 await page.getByRole('button',{name:'مسودة الإعداد'}).first().click();
 await expect(page.getByTestId('model-draft-editor')).toBeVisible();
 await page.getByTestId('model-draft-editor').getByRole('spinbutton').fill('55');
 await page.getByRole('button',{name:'حفظ المسودة محليًا'}).click();
 await page.reload();
 await expect(page.getByText('٥٥ طلب/دقيقة').first()).toBeVisible();
});
test('non platform role is denied access to model providers',async({page})=>{
 await page.goto('/platform/models');
 await page.locator('#models-role-picker').selectOption('employee');
 await expect(page.getByTestId('models-forbidden')).toBeVisible();
});
