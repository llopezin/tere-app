import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';

async function signIn(page: Page, email: string, password: string) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Iniciar Sesión' }).click();
  await page.getByLabel('Correo Electrónico').fill(email);
  await page.getByLabel('Contraseña', { exact: true }).fill(password);
  await page.getByRole('dialog').getByRole('button', { name: 'Iniciar Sesión' }).click();
}

test.describe('Auth — sign in / sign out', () => {
  test('patient signs in and reaches the dashboard', async ({ page, patient }) => {
    await signIn(page, patient.email, patient.password);
    await expect(page).toHaveURL('/dashboard');
  });

  test('wrong password shows an error', async ({ page, patient }) => {
    await signIn(page, patient.email, 'wrongpassword');
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page).toHaveURL('/');
  });

  test('sign out goes back to / and the dashboard stays guarded', async ({ page, authedPatient: _ }) => {
    await page.goto('/dashboard');
    await page.getByRole('button', { name: 'Salir' }).click();
    await expect(page).toHaveURL('/');

    await page.goto('/dashboard');
    await expect(page).toHaveURL('/');
  });
});
