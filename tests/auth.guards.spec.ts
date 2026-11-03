import { test, expect } from './fixtures';

test.describe('Auth — route guards', () => {
  test('unauthenticated user is redirected from /dashboard to /', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/');
  });

  test('authenticated user is redirected from / to /dashboard', async ({ page, authedPatient: _ }) => {
    await page.goto('/');
    await expect(page).toHaveURL('/dashboard');
  });
});
