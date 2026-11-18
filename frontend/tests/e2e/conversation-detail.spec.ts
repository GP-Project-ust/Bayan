import {test,expect} from '@playwright/test';

test.describe('Bayan conversation detail screen — browser acceptance',()=>{
 test.beforeEach(async ({page})=>{await page.goto('/conversations/chat-101');await expect(page.getByTestId('conversation-detail-screen')).toBeVisible();});
 test('loads messages and allows sample follow-up without backend call',async ({page})=>{
  await expect(page.getByRole('heading',{name:'عدد طلاب كلية الهندسة'})).toBeVisible();
  await expect(page.getByTestId('detail-message-list').locator('article')).toHaveCount(2);
  await page.getByLabel('أضف سؤال متابعة تجريبيًا').fill('هل هناك مزيد من التفاصيل؟');
  await page.getByRole('button',{name:'إرسال تجريبي'}).click();
  await expect(page.getByTestId('detail-message-list').locator('article')).toHaveCount(4);
  await expect(page.getByText('هل هناك مزيد من التفاصيل؟')).toBeVisible();
 });
 test('switches tabs and only reveals SQL for privileged preview role',async ({page})=>{
  await page.getByRole('tab',{name:/التنفيذ التقني/}).click();
  await expect(page.getByText('عرض تفاصيل SQL متاح للمستخدمين المصرّح لهم فقط.')).toBeVisible();
  await page.getByLabel('الدور التجريبي').selectOption('it_admin');
  await expect(page.getByText('SELECT college_name, COUNT(*) AS total_students',{exact:false})).toBeVisible();
  await expect(page.getByText('تتبع تنفيذ الوكلاء')).toBeVisible();
 });
 test('displays source page in drawer with explicit demo disclaimer',async ({page})=>{
  await page.goto('/conversations/chat-102');
  await page.getByRole('tab',{name:/المصادر/}).click();
  await expect(page.getByText('دليل شؤون الطلاب — مثال توضيحي')).toBeVisible();
  await page.getByRole('button',{name:/عرض مصدر دليل شؤون الطلاب/}).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByText(/لا يتوفر ملف PDF فعلي/)).toBeVisible();
 });
 test('opens full page from archive',async ({page})=>{
  await page.goto('/conversations');
  await page.getByRole('link',{name:'فتح الصفحة الكاملة للمحادثة عدد طلاب كلية الهندسة'}).click();
  await expect(page).toHaveURL(/\/conversations\/chat-101$/);
 });
 test('handles unknown and locally deleted conversation',async ({page})=>{
  await page.goto('/conversations/chat-999');
  await expect(page.getByText('المحادثة غير موجودة')).toBeVisible();
  await page.goto('/conversations/chat-101');
  await page.getByRole('button',{name:'حذف من المعاينة'}).click();
  await page.getByRole('button',{name:'تأكيد الحذف'}).click();
  await expect(page).toHaveURL(/\/conversations$/);
  await page.goto('/conversations/chat-101');
  await expect(page.getByText('هذه المحادثة محذوفة من المعاينة')).toBeVisible();
 });
 test('narrow viewport is usable without document horizontal scrolling',async ({page})=>{
  await page.setViewportSize({width:390,height:844});await page.reload();
  await expect(page.getByRole('heading',{name:'تفاصيل المحادثة'})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+2)).toBe(false);
 });
});
