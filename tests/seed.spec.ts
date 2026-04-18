import { test, expect } from './fixtures';

test.describe('Smoke — landing page', () => {
  test('landing page renders Fisio App heading and link to welcome', async ({ page, resetDb }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Fisio App' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Welcome page' })).toBeVisible();
  });

  test('/patient/welcome loads with auth card', async ({ page, resetDb, seedProfessional }) => {
    await page.goto('/patient/welcome');
    await expect(page).toHaveURL('/patient/welcome');
    await expect(page.getByText('Accede a tu cuenta')).toBeVisible();
  });
});
