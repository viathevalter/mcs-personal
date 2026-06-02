import { test, expect } from '@playwright/test';

test.describe('Smoke Test - Login Page', () => {
  test('should load the login page and show the branding title', async ({ page }) => {
    // Navigate to local dev server (default is http://localhost:3000)
    await page.goto('/');

    // Check if the logo/branding exists (Vite template or MasterCorp title)
    // We expect the word "MasterCorp" or "Bem-vindo" to be visible
    await expect(page.locator('text=MasterCorp').first()).toBeVisible();
    await expect(page.locator('text=Bem-vindo')).toBeVisible();
  });
});
