import { test, expect } from '@playwright/test';
import { loginAsDemo } from './helpers';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page);
  });

  test('dashboard shows summary cards with demo data', async ({ page }) => {
    await expect(page.getByText('Total Expenses')).toBeVisible();
    await expect(page.getByText('Total Income')).toBeVisible();
    await expect(page.getByText('Total Budget')).toBeVisible();
    await expect(page.getByText('Net Savings')).toBeVisible();
  });

  test('dashboard shows expense chart', async ({ page }) => {
    // ApexCharts renders an SVG canvas
    await expect(page.locator('.apexcharts-canvas')).toBeVisible({ timeout: 10000 });
  });

  test('dashboard shows budget vs actual section', async ({ page }) => {
    await expect(page.getByText('Budget vs Actual')).toBeVisible({ timeout: 5000 });
  });

  test('period selector changes displayed data', async ({ page }) => {
    // Select a month with no data (January 2020) to verify the UI updates
    const yearSelect = page.locator('select').last();
    await yearSelect.selectOption('2020');

    // Wait for data to reload — summary should show zero/empty state
    await page.waitForTimeout(1000);

    // The budget vs actual section should show empty state
    await expect(page.getByText(/no budgets set/i)).toBeVisible({ timeout: 5000 });
  });
});
