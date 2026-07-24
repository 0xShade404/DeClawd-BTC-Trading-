import { test, expect } from '@playwright/test';

test.describe('Landing page', () => {
  test('renders the hero heading and a Google sign-in link', async ({ page }) => {
    await page.goto('/');

    await expect(
      page.getByRole('heading', { level: 1, name: /Let AI trade Bitcoin prediction markets/i }),
    ).toBeVisible();

    const googleLink = page.getByRole('link', { name: /Sign in with Google/i }).first();
    await expect(googleLink).toBeVisible();
    await expect(googleLink).toHaveAttribute('href', /\/api\/v1\/auth\/google$/);
  });

  test('shows the non-custodial messaging', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/non-custodial/i).first()).toBeVisible();
  });
});
