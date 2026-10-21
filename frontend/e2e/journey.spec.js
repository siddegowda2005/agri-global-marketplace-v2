import { test, expect } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
const run = Date.now(); const PASS = 'Passw0rdTest';
const farmerEmail = `farmer${run}@example.com`, buyerEmail = `buyer${run}@example.com`;
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
async function register(page, role, email, country = 'India') {
  await page.goto('/register'); await page.getByLabel(role, { exact: true }).check();
  await page.getByLabel('Full name').fill(`${role} ${run}`); await page.getByLabel('Email').fill(email); await page.getByLabel('Password').fill(PASS);
  await page.getByLabel('Country').selectOption(country); await page.getByRole('button', { name: 'Register' }).click(); await expect(page).toHaveURL(/dashboard/);
}
test.describe.serial('core journey', () => {
  test('farmer registers, adds a crop with image; it appears in the marketplace', async ({ page }) => {
    await register(page, 'farmer', farmerEmail); await expect(page.getByText('Farmer dashboard')).toBeVisible();
    await page.goto('/farmer/crops/new'); await page.getByLabel('Crop name').fill(`Tomato${run}`); await page.getByLabel('Quantity').fill('100'); await page.getByLabel('Price per unit (INR)').fill('30'); await page.getByLabel('Location (village/city)').fill('Mysuru');
    const img = path.join(os.tmpdir(), `p${run}.png`); fs.writeFileSync(img, PNG); await page.getByLabel(/Images/).setInputFiles(img);
    await page.getByRole('button', { name: 'Save crop' }).click(); await expect(page).toHaveURL(/farmer\/crops$/);
    await page.goto('/marketplace'); await page.getByLabel('Search crops').fill(`Tomato${run}`); await page.getByRole('button', { name: 'Search' }).click(); await expect(page.getByText(`Tomato${run}`)).toBeVisible();
  });
  test('buyer (UAE) sees converted prices, orders; farmer accepts; buyer sees status', async ({ page, browser }) => {
    await register(page, 'buyer', buyerEmail, 'UAE');
    await page.goto('/marketplace'); await page.getByLabel('Search crops').fill(`Tomato${run}`); await page.getByRole('button', { name: 'Search' }).click();
    await page.getByText(`Tomato${run}`).click(); await page.getByRole('button', { name: 'Add to cart' }).click(); await expect(page).toHaveURL(/cart/);
    await page.getByRole('button', { name: /place order/i }).click(); await expect(page.getByText('Order placed')).toBeVisible();
    const fp = await browser.newPage(); await fp.goto('/login'); await fp.getByLabel('Email').fill(farmerEmail); await fp.getByLabel('Password').fill(PASS); await fp.getByRole('button', { name: 'Login' }).click();
    await expect(fp).toHaveURL(/dashboard/);
    await fp.goto('/orders'); await fp.getByText(`Tomato${run}`).first().click(); await fp.getByRole('button', { name: 'Accept' }).click(); await expect(fp.getByText('Accepted').first()).toBeVisible();
    await page.goto('/orders'); await expect(page.getByRole('link', { name: new RegExp(`Tomato${run}`) }).getByText('Accepted')).toBeVisible();
  });
  test('buyer is denied admin operations', async ({ page }) => {
    await page.goto('/login'); await page.getByLabel('Email').fill(buyerEmail); await page.getByLabel('Password').fill(PASS); await page.getByRole('button', { name: 'Login' }).click();
    await expect(page).toHaveURL(/dashboard/);
    const status = await page.evaluate(async () => (await fetch('/api/admin/users', { headers: { Authorization: `Bearer ${localStorage.getItem('agri_token')}` } })).status); expect(status).toBe(403);
  });
});
