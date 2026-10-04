import { test } from '@playwright/test';

// Seed for the Playwright test agents: opens the site the way a visitor does.
test('seed', async ({ page }) => {
  await page.goto('/');
});
