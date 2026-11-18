import {expect,test} from '@playwright/test';

test.describe('الشاشة 24 — تفاصيل مصادر البيانات',()=>{
 test('فتح تفاصيل مصدر من القائمة وعرض التبويبات',async({page})=>{
  await page.goto('/admin/data-sources');
  await page.getByRole('link',{name:'فتح الصفحة الكاملة للمصدر قاعدة البيانات الأكاديمية'}).click();
  await expect(page).toHaveURL(/\/admin\/data-sources\/details\?id=SRC-001/);
  await expect(page.getByRole('heading',{name:'تفاصيل مصدر البيانات'})).toBeVisible();
  await page.getByRole('tab',{name:'الجداول والحقول'}).click();
  await page.getByRole('button',{name:'عرض الحقول'}).first().click();
  await expect(page.getByText('student_id',{exact:true}).first()).toBeVisible();
 });
 test('تفاصيل مصدر غير موجود أو غير صالح',async({page})=>{
  await page.goto('/admin/data-sources/details?id=SRC-999');
  await expect(page.getByTestId('source-details-not-found')).toBeVisible();
  await page.goto('/admin/data-sources/details?id=bad');
  await expect(page.getByTestId('source-details-invalid')).toBeVisible();
 });
 test('دور غير مخوّل يمنع صفحة التفاصيل',async({page})=>{
  await page.goto('/admin/data-sources/details?id=SRC-001');
  await page.getByLabel('الدور التجريبي').selectOption('platform_admin');
  await expect(page.getByTestId('source-details-forbidden')).toBeVisible();
 });
 test('مسودة مراجعة محلية لا تغيّر الصلاحيات',async({page})=>{
  await page.goto('/admin/data-sources/details?id=SRC-001');
  await page.getByRole('button',{name:'طلب مراجعة تجريبية'}).click();
  await page.getByLabel('سبب المراجعة').selectOption('schema');
  await page.getByRole('button',{name:'حفظ المسودة'}).click();
  await expect(page.getByText('مسودة محفوظة:',{exact:false})).toBeVisible();
  await page.reload();
  await expect(page.getByText('مسودة محفوظة:',{exact:false})).toBeVisible();
 });
 test('المصدر المحظور لا يكشف تفاصيل المخطط',async({page})=>{
  await page.goto('/admin/data-sources/details?id=SRC-007');
  await page.getByRole('tab',{name:'الجداول والحقول'}).click();
  await expect(page.getByText('المصدر مصنّف محظورًا',{exact:false})).toBeVisible();
  await expect(page.getByText('student_id',{exact:true})).toHaveCount(0);
 });
});
