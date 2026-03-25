import { test, expect } from '@playwright/test';
import { loginAsDemo, loginAsAdmin, DEMO_USER } from './helpers';

test.describe('Authentication', () => {
  test('login page loads with form fields', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByText('Welcome back')).toBeVisible();
    await expect(page.getByLabel(/email address/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('register page loads with form fields', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByText('Create an account')).toBeVisible();
    await expect(page.getByLabel(/full name/i)).toBeVisible();
    await expect(page.getByLabel(/email address/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /create account/i })).toBeVisible();
  });

  test('login with demo user redirects to dashboard', async ({ page }) => {
    await loginAsDemo(page);
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.getByText(/dashboard/i).first()).toBeVisible();
  });

  test('login with wrong password shows error', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', DEMO_USER.email);
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    // Error is shown in a red banner
    await expect(page.locator('.bg-red-50')).toBeVisible({ timeout: 5000 });
  });

  test('register new user and redirect to dashboard', async ({ page }) => {
    const email = `e2e-${Date.now()}@test.local`;
    await page.goto('/register');
    await page.getByLabel(/full name/i).fill('E2E Test User');
    await page.getByLabel(/email address/i).fill(email);
    await page.getByLabel(/password/i).fill('testpass123');
    await page.getByRole('button', { name: /create account/i }).click();
    await page.waitForURL('**/dashboard**', { timeout: 10000 });
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('unauthenticated user is redirected to login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/.*login/);
  });

  test('logout returns to login page', async ({ page }) => {
    await loginAsDemo(page);
    await page.getByText('Sign out').click();
    await expect(page).toHaveURL(/.*login/);
  });

  test('admin login shows admin/client toggle', async ({ page }) => {
    await loginAsAdmin(page);
    await expect(page).toHaveURL(/.*dashboard/);
    // Admin sees the Client/Admin segmented control
    await expect(page.getByRole('button', { name: 'Admin' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Client' })).toBeVisible();
  });

  test('demo user does not see admin toggle', async ({ page }) => {
    await loginAsDemo(page);
    await expect(page.getByRole('button', { name: 'Admin' })).not.toBeVisible();
  });
});
