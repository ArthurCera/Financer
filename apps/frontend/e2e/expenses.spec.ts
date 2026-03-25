import { test, expect } from '@playwright/test';
import { loginAsDemo } from './helpers';

test.describe('Expenses Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page);
    await page.getByRole('link', { name: 'Expenses' }).click();
    await expect(page).toHaveURL(/.*expenses/);
  });

  test('expenses page loads with table', async ({ page }) => {
    await expect(page.getByText('Expenses').first()).toBeVisible();
    // Demo user has seeded expenses — table should have rows
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 5000 });
  });

  test('create expense via form', async ({ page }) => {
    await page.getByRole('button', { name: 'Add Expense' }).click();

    // Fill the expense form
    await page.getByLabel('Amount').fill('25.50');
    await page.getByLabel('Description').fill('E2E Test Expense');
    await page.getByLabel('Date').fill('2026-03-20');

    // Submit
    await page.getByRole('button', { name: 'Add Expense' }).last().click();

    // Should see the new expense in the table
    await expect(page.getByText('E2E Test Expense')).toBeVisible({ timeout: 5000 });
  });

  test('edit expense updates the record', async ({ page }) => {
    // Wait for table to load
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 5000 });

    // Click the first edit button
    await page.getByRole('button', { name: 'Edit' }).first().click();
    await page.getByLabel('Description').fill('Updated E2E Expense');
    await page.getByRole('button', { name: /update expense/i }).click();
    await expect(page.getByText('Updated E2E Expense')).toBeVisible({ timeout: 5000 });
  });

  test('delete expense removes it from the table', async ({ page }) => {
    // Wait for table to load and count rows
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 5000 });
    const countBefore = await page.locator('table tbody tr').count();

    // Click first delete button — confirm dialog uses window.confirm
    page.on('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'Delete' }).first().click();

    // Wait for row count to decrease
    await expect(page.locator('table tbody tr')).toHaveCount(countBefore - 1, { timeout: 5000 });
  });

  test('period filter shows different months', async ({ page }) => {
    // Change to January 2020 — should show empty or different data
    const yearSelect = page.locator('select').last();
    await yearSelect.selectOption('2020');

    // Table should be empty or show "no data" for this period
    await page.waitForTimeout(1000);
    const rows = await page.locator('table tbody tr').count();
    expect(rows).toBe(0);
  });
});
