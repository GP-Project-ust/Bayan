import {test,expect} from '@playwright/test';
test.describe('الشاشة 26 — إنشاء عرض ذكي تجريبي',()=>{
 test.beforeEach(async({page})=>{await page.goto('/admin/smart-views/new');await expect(page.getByTestId('create-smart-view-screen')).toBeVisible();});
 test('five-step local draft appears in Smart Views list, without publishing',async({page})=>{
  await page.getByRole('button',{name:'تعبئة مثال تدريبي'}).click();
  await page.getByRole('button',{name:'التالي'}).click(); // source metadata
  await page.getByRole('button',{name:'التالي'}).click(); // fields
  await page.getByRole('button',{name:'التالي'}).click(); // security
  await expect(page.getByText('SQL تصوري — غير منفذ')).toBeVisible();
  await page.getByRole('checkbox',{name:/أؤكد أن هذا تعريف تدريبي/}).check();
  await page.getByRole('button',{name:'التالي'}).click();
  await page.getByRole('button',{name:'حفظ مسودة محلية'}).click();
  await expect(page.getByRole('dialog')).toContainText('لا يُنشأ عرض PostgreSQL فعلي');
  await page.getByRole('button',{name:'حفظ المسودة محليًا'}).click();
  await expect(page.getByText('تم حفظ مسودة تجريبية محليًا')).toBeVisible();
  await page.getByRole('link',{name:'عرض المسودات في القائمة'}).click();
  await expect(page.getByText('ملخص الكليات التجريبي').first()).toBeVisible();
 });
 test('rejects attempting to proceed without a valid name and source',async({page})=>{
  await page.getByRole('button',{name:'التالي'}).click();
  await expect(page.getByText('اسم العرض يجب أن يتكون من 5 إلى 70 حرفًا دون رموز برمجية.')).toBeVisible();
 });
 test('rejects non IT admin preview access',async({page})=>{
  await page.locator('#bsv26-role').selectOption('employee');
  await expect(page.getByText('لا تملك صلاحية إنشاء عرض ذكي')).toBeVisible();
 });
 test('desktop and phone have no horizontal document overflow',async({page})=>{
  for(const width of [1280,390]){
   await page.setViewportSize({width,height:850});
   const scroll=await page.evaluate(()=>({body:document.body.scrollWidth,viewport:document.documentElement.clientWidth}));
   expect(scroll.body).toBeLessThanOrEqual(scroll.viewport+1);
  }
 });
});
