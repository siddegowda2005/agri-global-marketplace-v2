import { test, expect } from '@playwright/test';
test('mobile navigation opens and routes', async ({ page }) => {
  await page.goto('/'); await page.getByRole('button', { name: 'Menu' }).click(); await page.getByRole('navigation', { name: 'Mobile' }).getByRole('link', { name: 'Marketplace' }).click();
  await expect(page).toHaveURL(/marketplace/); await expect(page.getByRole('heading', { name: 'Marketplace' })).toBeVisible();
});
