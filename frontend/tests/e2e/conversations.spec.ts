import {test,expect} from '@playwright/test';

test.describe('Bayan conversation archive — browser acceptance tests',()=>{
 test.beforeEach(async ({page})=>{
   await page.goto('/conversations');
   await expect(page.getByRole('heading',{name:'سجل المحادثات السابقة'})).toBeVisible();
 });
 test('search Arabic titles, filter, and reset',async ({page})=>{
   await expect(page.getByTestId('conversation-row')).toHaveCount(12);
   await page.getByRole('searchbox',{name:'البحث في المحادثات'}).fill('الهندسة');
   await expect(page.getByTestId('conversation-row')).toHaveCount(1);
   await page.getByRole('searchbox',{name:'البحث في المحادثات'}).fill('لا توجد محادثة مطابقة قطعاً');
   await expect(page.getByText('لا توجد محادثات مطابقة')).toBeVisible();
   await page.getByRole('button',{name:'إزالة التصفية'}).click();
   await expect(page.getByTestId('conversation-row')).toHaveCount(12);
 });
 test('star a conversation and filter favorites',async ({page})=>{
   await page.getByRole('button',{name:'إضافة إلى المفضلة: عدد طلاب كلية الهندسة'}).click();
   await page.locator('.bayan-conv-filters button').filter({hasText:'المفضلة'}).click();
   await expect(page.getByTestId('conversation-row')).toHaveCount(1);
 });
 test('rename the sample and delete only after confirmation',async ({page})=>{
   await page.getByRole('button',{name:'إعادة تسمية عدد طلاب كلية الهندسة'}).click();
   await page.getByLabel('عنوان المحادثة').fill('عنوان محادثة تجريبية');
   await page.getByRole('button',{name:'حفظ العنوان'}).click();
   await expect(page.getByRole('button',{name:'عنوان محادثة تجريبية'})).toBeVisible();
   await page.getByRole('button',{name:'حذف عنوان محادثة تجريبية'}).click();
   await expect(page.getByRole('heading',{name:'تأكيد حذف المحادثة'})).toBeVisible();
   await page.getByRole('button',{name:'حذف من المعاينة'}).click();
   await expect(page.getByTestId('conversation-row')).toHaveCount(11);
 });
 test('open conversation with citations and add demo follow-up',async ({page})=>{
   await page.getByRole('button',{name:'لائحة الغياب والحرمان',exact:true}).click();
   await expect(page.getByRole('dialog')).toBeVisible();
   await expect(page.getByText('دليل شؤون الطلاب — مثال توضيحي')).toBeVisible();
   await page.getByLabel('إضافة سؤال متابعة تجريبي').fill('سؤال متابعة تجريبي');
   await page.getByRole('button',{name:'إضافة سؤال'}).click();
   await expect(page.getByText('سؤال متابعة تجريبي',{exact:true})).toBeVisible();
 });
 test('sidebar history opens the matching detail drawer',async ({page})=>{
   await page.locator('.history-entry').first().click();
   await expect(page.getByRole('dialog')).toBeVisible();
   await expect(page.getByText('استعلام عن العدد الإجمالي للطلاب المسجلين في كلية الهندسة.')).toBeVisible();
 });
 test('SQL visibility follows the preview role and sources remain labeled as demonstration',async ({page})=>{
   await page.getByRole('button',{name:'عدد طلاب كلية الهندسة',exact:true}).click();
   await expect(page.getByText('عرض SQL مخفي عن هذا الدور في المعاينة.')).toBeVisible();
   await page.getByRole('button',{name:'إغلاق الدرج'}).click();
   await page.getByLabel('الدور التجريبي').selectOption('it_admin');
   await page.getByRole('button',{name:'عدد طلاب كلية الهندسة',exact:true}).click();
   await expect(page.getByText('SELECT college_name, COUNT(*) AS total_students', {exact:false})).toBeVisible();
 });
 test('mobile does not create horizontal page overflow',async ({page})=>{
   await page.setViewportSize({width:390,height:844});
   await page.reload();
   await expect(page.getByRole('heading',{name:'سجل المحادثات السابقة'})).toBeVisible();
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+2);
   expect(overflow).toBe(false);
 });
});
