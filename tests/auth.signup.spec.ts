import { test, expect, PATIENT } from './fixtures';
import type { Page } from '@playwright/test';

async function signUp(page: Page, email: string) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Crear Cuenta Nueva' }).click();
  await page.getByLabel('Nombre').fill('María');
  await page.getByLabel('Apellidos').fill('Martínez');
  await page.getByLabel('Correo Electrónico').fill(email);
  await page.getByLabel('Teléfono').fill('+34 600 000 002');
  await page.getByLabel('Contraseña', { exact: true }).fill('otherpassword');
  await page.getByRole('button', { name: 'Crear Cuenta', exact: true }).click();
}

test.describe('Auth — sign up', () => {
  // The name comes from the patient BFF (/patient/me), so this also proves the account got a patient profile
  test('new patient lands on the dashboard with their profile', async ({ page }) => {
    await signUp(page, 'maria@test.com');

    await expect(page).toHaveURL('/dashboard');
    await expect(page.getByText('María Martínez')).toBeVisible();
  });

  test('an email that is already registered shows an error', async ({ page, patient: _ }) => {
    await signUp(page, PATIENT.email);

    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page).toHaveURL('/');
  });
});
