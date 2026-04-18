import { test, expect } from './fixtures';

test.describe('Auth — route guards', () => {
  test('unauthenticated user is redirected from /patient/dashboard to /patient/welcome', async ({ page, resetDb }) => {
    await page.goto('/patient/dashboard');
    await expect(page).toHaveURL('/patient/welcome', { timeout: 8_000 });
  });

  test('authenticated user is redirected from /patient/welcome to /patient/dashboard', async ({ page, authedPatient }) => {
    await page.goto('/patient/welcome');
    await expect(page).toHaveURL('/patient/dashboard', { timeout: 8_000 });
  });
});
