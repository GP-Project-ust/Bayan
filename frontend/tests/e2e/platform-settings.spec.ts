import { test, expect } from '@playwright/test';

test.describe('Platform settings — screen 38', () => {
  test('renders platform settings and default groups', async ({ page }) => {
    await page.goto('/platform/settings');
    await expect(page.getByTestId('platform-settings-screen')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'إعدادات المنصة' }).first()).toBeVisible();
    await expect(page.getByRole('tab', { name: 'عام' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'الاستعلامات' })).toBeVisible();
  });

  test('validates SQL timeout and opens a change review before saving', async ({ page }) => {
    await page.goto('/platform/settings');
    await page.getByRole('tab', { name: 'الاستعلامات' }).click();
    const timeout = page.getByLabel('مهلة تنفيذ استعلام SQL');
    await timeout.fill('2');
    await expect(page.getByRole('alert')).toContainText('بين 5 و120');
    await timeout.fill('45');
    await page.getByRole('button', { name: 'مراجعة وحفظ التغييرات' }).click();
    await expect(page.getByTestId('settings-review-dialog')).toBeVisible();
    await expect(page.getByTestId('settings-review-dialog')).toContainText('45');
  });

  test('saves only to local browser storage and records a local history entry', async ({ page }) => {
    await page.goto('/platform/settings');
    await page.getByRole('tab', { name: 'النماذج والحدود' }).click();
    await page.getByLabel('حد الطلبات في الدقيقة').fill('90');
    await page.getByRole('button', { name: 'مراجعة وحفظ التغييرات' }).click();
    await page.getByRole('button', { name: 'تأكيد الحفظ المحلي' }).click();
    await expect(page.getByText('حُفظت النسخة التجريبية محليًا')).toBeVisible();
    await expect(page.getByTestId('settings-history')).toBeVisible();
  });

  test('role picker shows forbidden state for non-platform roles', async ({ page }) => {
    await page.goto('/platform/settings');
    await page.getByLabel('الدور التجريبي').selectOption('employee');
    await expect(page.getByTestId('platform-settings-forbidden')).toBeVisible();
  });
});
