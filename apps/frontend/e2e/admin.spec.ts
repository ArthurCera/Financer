import { test, expect } from '@playwright/test';
import { loginAsAdmin, loginAsDemo } from './helpers';

test.describe('Admin View', () => {
  test('admin can navigate to admin dashboard', async ({ page }) => {
    await loginAsAdmin(page);
    await page.getByRole('button', { name: 'Admin' }).click();
    await expect(page).toHaveURL(/.*admin/);
    await expect(page.getByText('Admin Dashboard')).toBeVisible();
  });

  test('admin dashboard shows stats cards', async ({ page }) => {
    await loginAsAdmin(page);
    await page.getByRole('button', { name: 'Admin' }).click();
    await page.waitForURL('**/admin**');

    await expect(page.getByText('TOTAL USERS')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('TOTAL EXPENSES')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('LLM CHAT MESSAGES')).toBeVisible({ timeout: 5000 });
  });

  test('admin dashboard shows users table with seeded users', async ({ page }) => {
    await loginAsAdmin(page);
    await page.getByRole('button', { name: 'Admin' }).click();
    await page.waitForURL('**/admin**');

    // Users table heading
    await expect(page.getByText('Users').first()).toBeVisible({ timeout: 5000 });
    // Should see at least admin and demo user emails
    await expect(page.getByText('root@financer.local')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('demo@financer.local')).toBeVisible({ timeout: 5000 });
  });

  test('admin can toggle back to client view', async ({ page }) => {
    await loginAsAdmin(page);
    await page.getByRole('button', { name: 'Admin' }).click();
    await page.waitForURL('**/admin**');

    // Switch back to client view
    await page.getByRole('button', { name: 'Client' }).click();
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('non-admin is redirected away from admin route', async ({ page }) => {
    await loginAsDemo(page);
    await page.goto('/admin');
    // Should redirect to dashboard
    await expect(page).toHaveURL(/.*dashboard/);
  });
});
