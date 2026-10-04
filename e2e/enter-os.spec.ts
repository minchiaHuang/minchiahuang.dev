// spec: e2e/FLOWS.md — F1 Enter the OS
// seed: e2e/seed.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Enter the OS', () => {
  test('a desktop visitor reaches the résumé in the monitor', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

    await page.goto('/');

    // The BIOS prints this once every asset has loaded; START only works after it.
    await expect(page.getByText('FINISHED LOADING RESOURCES')).toBeVisible({ timeout: 45_000 });
    // The popup fades in by opacity, which Playwright does not treat as hidden.
    await expect(page.locator('.bios-popup-container')).toHaveCSS('opacity', '1');
    await page.locator('.bios-start-button').click();

    const quickLinks = page.getByRole('navigation', { name: 'Quick links' });
    await quickLinks.getByRole('button', { name: 'Résumé' }).click();

    const os = page.frameLocator('#computer-screen');
    await expect(os.locator('.win-title-text', { hasText: 'Min-Chia (Tommy) Huang - Showcase' })).toBeVisible();
    await expect(os.locator('.sc-resume')).toBeVisible();

    expect(errors).toEqual([]);
  });
});
