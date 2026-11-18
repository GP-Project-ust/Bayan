import { test, expect } from '@playwright/test';

test.describe('Bayan screens catalog', () => {
  test('renders the catalog and its total count', async ({ page }) => {
    await page.goto('/screens');
    await expect(page.getByRole('heading', { name: 'خريطة واجهات بيان' })).toBeVisible();
    await expect(page.getByText('إجمالي الشاشات')).toBeVisible();
    await expect(page.getByText('42', { exact: true }).first()).toBeVisible();
  });

  test('search filters screens by their title or route', async ({ page }) => {
    await page.goto('/screens');
    const search = page.getByRole('textbox', { name: 'البحث في الشاشات' });
    await search.fill('غير مصرح بالوصول');
    await expect(page.getByRole('heading', { name: 'غير مصرح بالوصول' })).toBeVisible();
    await expect(page.getByText('/forbidden')).toBeVisible();
  });

  test('group filter can be opened and empty results can be reset', async ({ page }) => {
    await page.goto('/screens');
    await page.getByRole('button', { name: /التصفية/ }).click();
    await expect(page.getByLabel('القسم')).toBeVisible();
    await page.getByRole('textbox', { name: 'البحث في الشاشات' }).fill('no-screen-with-this-name');
    await expect(page.getByText('لا توجد شاشات مطابقة')).toBeVisible();
    await page.getByRole('button', { name: 'عرض جميع الشاشات' }).click();
    await expect(page.getByText('42', { exact: true }).first()).toBeVisible();
  });
});
