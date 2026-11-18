import {test,expect} from '@playwright/test';

test('roles overview, comparison, reviewer and platform separation',async({page})=>{
 await page.goto('/admin/roles');
 await expect(page.getByTestId('roles-permissions-screen')).toBeVisible();
 await expect(page.getByRole('heading',{name:'إدارة الأدوار والصلاحيات'})).toBeVisible();
 await expect(page.getByText('مصفوفة الصلاحيات')).toBeVisible();
 await page.getByRole('button',{name:'اختيار دور مدير المؤسسة'}).click();
 await expect(page.getByText('7 صلاحيات').first()).toBeVisible();
 await page.getByRole('button',{name:'تفاصيل الدور'}).first().click();
 await expect(page.getByRole('dialog')).toBeVisible();
 await page.getByRole('button',{name:'إغلاق الدرج'}).click();
 await page.getByLabel('البحث في الصلاحيات').fill('تقارير');
 await expect(page.getByText('إنشاء التقارير').first()).toBeVisible();
 await page.getByLabel('البحث في الصلاحيات').fill('غير موجود 123');
 await expect(page.getByText('لا توجد صلاحيات تطابق البحث.')).toBeVisible();
});

test('review draft is local and does not grant permissions',async({page})=>{
 await page.goto('/admin/roles');
 await page.getByRole('button',{name:'اقتراح مراجعة'}).click();
 await expect(page.getByRole('dialog')).toBeVisible();
 await page.getByLabel('سبب المراجعة').fill('توضيح طلب موافقة إدارة المؤسسة على صلاحية التصدير التجريبية.');
 await page.getByRole('button',{name:'حفظ مسودة المراجعة'}).click();
 await expect(page.getByText('حُفظ طلب مراجعة تجريبي')).toBeVisible();
 await expect(page.getByText('مسودة غير مطبقة')).toBeVisible();
});

test('employee actor sees access denied; platform admin cannot administer tenant roles',async({page})=>{
 await page.goto('/admin/roles');
 await page.getByLabel('الدور التجريبي').selectOption('platform_admin');
 await expect(page.getByTestId('roles-forbidden')).toBeVisible();
});
