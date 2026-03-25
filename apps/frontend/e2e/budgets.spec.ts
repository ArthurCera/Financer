import { test, expect } from '@playwright/test';
import { loginAsDemo } from './helpers';

test.describe('Budgets Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page);
    await page.getByRole('link', { name: 'Budgets' }).click();
    await expect(page).toHaveURL(/.*budgets/);
  });

  test('budgets page loads with data', async ({ page }) => {
    await expect(page.getByText('Budgets').first()).toBeVisible();
    // Demo user has seeded budgets — table should have rows
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 5000 });
  });

  test('create budget via form', async ({ page }) => {
    await page.getByRole('button', { name: 'Set Budget' }).click();

    await page.getByLabel('Budget Amount').fill('1000');

    // Submit
    await page.getByRole('button', { name: 'Set Budget' }).last().click();

    // Budget should appear in the table
    await expect(page.getByText('1,000').first()).toBeVisible({ timeout: 5000 });
  });

  test('delete budget removes it from the table', async ({ page }) => {
    // Wait for table and count rows
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 5000 });
    const countBefore = await page.locator('table tbody tr').count();

    page.on('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'Delete' }).first().click();

    await expect(page.locator('table tbody tr')).toHaveCount(countBefore - 1, { timeout: 5000 });
  });
});
