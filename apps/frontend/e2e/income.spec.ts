import { test, expect } from '@playwright/test';
import { loginAsDemo } from './helpers';

test.describe('Income Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page);
    await page.getByRole('link', { name: 'Income' }).click();
    await expect(page).toHaveURL(/.*income/);
  });

  test('income page loads with data', async ({ page }) => {
    await expect(page.getByText('Income').first()).toBeVisible();
    // Demo user has seeded income — table should have rows
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 5000 });
  });

  test('create income via form', async ({ page }) => {
    await page.getByRole('button', { name: 'Add Income' }).click();

    await page.getByLabel('Amount').fill('5000');
    await page.getByLabel('Source').fill('E2E Freelance');
    await page.getByLabel('Date').fill('2026-03-10');

    await page.getByRole('button', { name: 'Add Income' }).last().click();

    await expect(page.getByText('E2E Freelance')).toBeVisible({ timeout: 5000 });
  });

  test('delete income removes it from the table', async ({ page }) => {
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 5000 });
    const countBefore = await page.locator('table tbody tr').count();

    page.on('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'Delete' }).first().click();

    await expect(page.locator('table tbody tr')).toHaveCount(countBefore - 1, { timeout: 5000 });
  });
});
