import { type Page } from '@playwright/test';

export const DEMO_USER = { email: 'demo@financer.local', password: 'demo' };
export const ADMIN_USER = { email: 'root@financer.local', password: 'root' };

/** Log in via the login form. */
export async function loginAs(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard**');
}

/** Log in as the demo user. */
export async function loginAsDemo(page: Page) {
  return loginAs(page, DEMO_USER.email, DEMO_USER.password);
}

/** Log in as the admin user. */
export async function loginAsAdmin(page: Page) {
  return loginAs(page, ADMIN_USER.email, ADMIN_USER.password);
}
