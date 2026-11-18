import { test, expect } from '@playwright/test';

test.describe('Forbidden access screen', () => {
  test('renders the 403 explanation and safe navigation options', async ({ page }) => {
    await page.goto('/forbidden');
    await expect(page.getByRole('heading', { name: 'عذرًا، ليست لديك صلاحية الوصول' })).toBeVisible();
    await expect(page.getByText('HTTP 403')).toBeVisible();
    await expect(page.getByRole('link', { name: 'الصفحة الرئيسية' })).toHaveAttribute('href', '/');
    await expect(page.getByRole('button', { name: 'العودة للصفحة السابقة' })).toBeVisible();
  });

  test('copy control is available without exposing protected content', async ({ page }) => {
    await page.goto('/forbidden');
    await expect(page.getByRole('button', { name: 'نسخ التفاصيل' })).toBeVisible();
    await expect(page.getByText('لم يتم عرض محتوى الصفحة أو بياناتها.')).toBeVisible();
  });
});
