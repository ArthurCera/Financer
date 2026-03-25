import { test, expect } from '@playwright/test';
import { loginAsDemo } from './helpers';

test.describe('Categories Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page);
    await page.getByRole('link', { name: 'Categories' }).click();
    await expect(page).toHaveURL(/.*categories/);
  });

  test('categories page loads with default categories', async ({ page }) => {
    await expect(page.getByText('Categories').first()).toBeVisible();
    // Default seeded categories should be visible
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 5000 });
    // At least one "Default" badge should exist
    await expect(page.getByText('Default').first()).toBeVisible();
  });

  test('create custom category via form', async ({ page }) => {
    await page.getByRole('button', { name: 'Add Category' }).click();

    // Fill the category form
    await page.fill('input[placeholder="e.g. Subscriptions"]', 'E2E Test Category');
    await page.click('button[type="submit"]');

    // Should see the new category in the table
    await expect(page.getByText('E2E Test Category')).toBeVisible({ timeout: 5000 });
    // Should be marked as "Custom"
    await expect(page.getByText('Custom').first()).toBeVisible();
  });

  test('edit custom category', async ({ page }) => {
    // Create a category first
    await page.getByRole('button', { name: 'Add Category' }).click();
    await page.fill('input[placeholder="e.g. Subscriptions"]', 'Category To Edit');
    await page.click('button[type="submit"]');
    await expect(page.getByText('Category To Edit')).toBeVisible({ timeout: 5000 });

    // Click Edit on the custom category row
    const row = page.locator('tr', { hasText: 'Category To Edit' });
    await row.getByRole('button', { name: 'Edit' }).click();

    // Update the name
    const nameInput = page.locator('input[placeholder="e.g. Subscriptions"]');
    await nameInput.clear();
    await nameInput.fill('Edited Category');
    await page.click('button[type="submit"]');

    await expect(page.getByText('Edited Category')).toBeVisible({ timeout: 5000 });
  });

  test('delete custom category', async ({ page }) => {
    // Create a category to delete
    await page.getByRole('button', { name: 'Add Category' }).click();
    await page.fill('input[placeholder="e.g. Subscriptions"]', 'Category To Delete');
    await page.click('button[type="submit"]');
    await expect(page.getByText('Category To Delete')).toBeVisible({ timeout: 5000 });

    // Accept the confirm dialog
    page.on('dialog', (dialog) => dialog.accept());

    // Click Delete
    const row = page.locator('tr', { hasText: 'Category To Delete' });
    await row.getByRole('button', { name: 'Delete' }).click();

    // Should no longer be visible
    await expect(page.getByText('Category To Delete')).not.toBeVisible({ timeout: 5000 });
  });

  test('default categories cannot be edited or deleted', async ({ page }) => {
    // Default category rows should NOT have Edit/Delete buttons
    const defaultRow = page.locator('tr', { hasText: 'Default' }).first();
    await expect(defaultRow.getByRole('button', { name: 'Edit' })).not.toBeVisible();
    await expect(defaultRow.getByRole('button', { name: 'Delete' })).not.toBeVisible();
  });
});
