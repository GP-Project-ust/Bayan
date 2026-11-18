import { test, expect } from '@playwright/test';

test.describe('Service unavailable screen', () => {
  test('renders 503 guidance and recovery actions', async ({ page }) => {
    await page.goto('/unavailable');
    await expect(page.getByRole('heading', { name: 'الخدمة غير متاحة حاليًا' })).toBeVisible();
    await expect(page.getByText('HTTP 503')).toBeVisible();
    await expect(page.getByRole('button', { name: 'إعادة المحاولة الآن' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'الصفحة الرئيسية' })).toHaveAttribute('href', '/');
  });

  test('retry enters a pending state without claiming service recovery', async ({ page }) => {
    await page.goto('/unavailable');
    await page.getByRole('button', { name: 'إعادة المحاولة الآن' }).click();
    await expect(page.getByRole('button', { name: 'جارٍ إعادة المحاولة...' })).toBeVisible();
    await expect(page.getByText('لم يتم تأكيد استعادة الاتصال')).toBeVisible();
  });
});
