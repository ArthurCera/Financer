import { test, expect } from '@playwright/test';
import { loginAsDemo } from './helpers';

test.describe('Chat Widget', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page);
  });

  test('chat toggle button is visible on dashboard', async ({ page }) => {
    // The chat widget has a fixed floating button (indigo circle, bottom-right)
    const chatToggle = page.locator('button.fixed.bottom-6.right-6');
    await expect(chatToggle).toBeVisible({ timeout: 5000 });
  });

  test('clicking chat toggle opens the chat panel with input', async ({ page }) => {
    // Click the floating chat button
    const chatToggle = page.locator('button.fixed.bottom-6.right-6');
    await chatToggle.click();

    // Chat panel should appear with the "Financial Assistant" header and message input
    await expect(page.getByText('Financial Assistant')).toBeVisible({ timeout: 3000 });
    await expect(page.getByPlaceholder('Type a message...')).toBeVisible();
  });
});
