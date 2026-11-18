import {test,expect} from '@playwright/test';

test('account details, role capabilities and activity fixtures are accessible',async({page})=>{
 await page.goto('/admin/users/details?id=USR-001');
 await expect(page.getByTestId('user-details-screen')).toBeVisible();
 await expect(page.getByTestId('user-identity')).toContainText('ناصر العتيبي');
 await page.getByRole('tab',{name:'الدور والصلاحيات'}).click();
 await expect(page.getByTestId('user-permissions')).toBeVisible();
 await page.getByRole('tab',{name:'النشاط التجريبي'}).click();
 await expect(page.getByTestId('user-activity')).toContainText('ليست سجلات Audit Log الفعلية');
});
test('query rejects a missing or invalid account without inventing user information',async({page})=>{
 await page.goto('/admin/users/details?id=USR-999');
 await expect(page.getByTestId('user-details-not-found')).toBeVisible();
 await page.goto('/admin/users/details?id=bad');
 await expect(page.getByTestId('user-details-not-found')).toContainText('معرّف المستخدم غير صالح');
});
test('editing details persists locally and updates the listing',async({page})=>{
 await page.goto('/admin/users/details?id=USR-002');
 await page.getByRole('button',{name:'تعديل المستخدم'}).click();
 await page.getByRole('dialog').getByLabel('الاسم الكامل').fill('سارة اسم تجريبي');
 await page.getByRole('dialog').getByRole('button',{name:'حفظ التعديل محليًا'}).click();
 await expect(page.getByTestId('user-identity')).toContainText('سارة اسم تجريبي');
 await page.goto('/admin/users');
 await expect(page.getByTestId('users-management-screen')).toContainText('سارة اسم تجريبي');
});
test('role guard hides details and disables privileged actions',async({page})=>{
 await page.goto('/admin/users/details?id=USR-001');
 await page.getByLabel('الدور التجريبي').selectOption('employee');
 await expect(page.getByTestId('user-details-forbidden')).toBeVisible();
 await expect(page.getByTestId('user-identity')).toHaveCount(0);
});
test('responsive detail page has no page-wide horizontal overflow',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/admin/users/details?id=USR-003');
 await expect(page.getByTestId('user-identity')).toBeVisible();
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+2);
 expect(overflow).toBeFalsy();
});
