import { test, expect } from './fixtures';

test.describe('Auth — sign up', () => {
  test('patient can sign up and lands on dashboard', async ({ page, resetDb, seedProfessional }) => {
    await page.goto('/patient/welcome');

    // Open signup modal
    await page.getByRole('button', { name: 'Crear Cuenta Nueva' }).click();

    // Fill in the form
    await page.getByLabel('Nombre').fill('María');
    await page.getByLabel('Apellidos').fill('Martínez');
    await page.getByLabel('Correo Electrónico').fill('maria@test.com');
    await page.getByLabel('Teléfono').fill('+34 600 000 002');
    await page.getByLabel('Contraseña', { exact: true }).fill('password123');

    // Submit
    await page.getByRole('button', { name: 'Crear Cuenta' }).click();

    // Should redirect to dashboard
    await expect(page).toHaveURL('/patient/dashboard', { timeout: 10_000 });

    // PatientTopBar should show full name
    await expect(page.getByText('María Martínez')).toBeVisible({ timeout: 8_000 });
  });

  test('user row has role=patient after signup (via API verification)', async ({ page, resetDb, seedProfessional }) => {
    await page.goto('/patient/welcome');

    await page.getByRole('button', { name: 'Crear Cuenta Nueva' }).click();
    await page.getByLabel('Nombre').fill('Pedro');
    await page.getByLabel('Apellidos').fill('Sánchez');
    await page.getByLabel('Correo Electrónico').fill('pedro@test.com');
    await page.getByLabel('Teléfono').fill('+34 600 000 003');
    await page.getByLabel('Contraseña', { exact: true }).fill('password123');
    await page.getByRole('button', { name: 'Crear Cuenta' }).click();

    await expect(page).toHaveURL('/patient/dashboard', { timeout: 10_000 });

    const profileRes = await page.request.get('http://localhost:3000/api/v1/patient/me');
    expect(profileRes.ok()).toBe(true);
  });
});
