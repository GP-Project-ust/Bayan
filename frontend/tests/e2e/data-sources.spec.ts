import {expect,test} from '@playwright/test';
test.describe('الشاشة 22 — مصادر البيانات',()=>{
 test('تظهر القائمة والبيانات التجريبية ويعمل البحث',async({page})=>{
  await page.goto('/admin/data-sources');
  await expect(page.getByRole('heading',{name:'إدارة مصادر البيانات'})).toBeVisible();
  await expect(page.getByText('قاعدة البيانات الأكاديمية',{exact:true})).toBeVisible();
  await page.getByRole('textbox',{name:'البحث في مصادر البيانات'}).fill('شؤون الطلاب');
  await expect(page.getByText('نظام شؤون الطلاب',{exact:true})).toBeVisible();
  await expect(page.getByText('قاعدة البيانات الأكاديمية',{exact:true})).toHaveCount(0);
 });
 test('تفاصيل المصدر تعرض معلومات مموهة فقط',async({page})=>{
  await page.goto('/admin/data-sources');
  await page.getByRole('button',{name:'تفاصيل المصدر قاعدة البيانات الأكاديمية'}).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByText('db-academic.example.invalid:5432')).toBeVisible();
  await expect(page.getByText('لا تُعرض بيانات اعتماد',{exact:false})).toBeVisible();
 });
 test('اختبار الاتصال يظهر أنه محاكاة ولا يُرسل شبكة',async({page})=>{
  await page.goto('/admin/data-sources');
  await page.getByRole('button',{name:'محاكاة اختبار اتصال قاعدة البيانات الأكاديمية'}).click();
  await expect(page.getByRole('dialog')).toContainText('لم يُرسل أي طلب');
 });
 test('الدور غير المخول يرى منع الوصول',async({page})=>{
  await page.goto('/admin/data-sources');
  await page.getByLabel('الدور التجريبي').selectOption('platform_admin');
  await expect(page.getByTestId('data-sources-forbidden')).toBeVisible();
 });
});
