import { test, expect } from './fixtures';

test.describe('Auth — sign in / sign out', () => {
  test('patient can sign in and reaches dashboard', async ({ page, resetDb, seedProfessional, seedPatient }) => {
    await page.goto('/patient/welcome');

    // Open login modal
    await page.getByRole('button', { name: 'Iniciar Sesión' }).click();

    await page.getByLabel('Correo Electrónico').fill(seedPatient.email);
    await page.getByLabel('Contraseña').fill(seedPatient.password);
    await page.getByRole('button', { name: 'Iniciar Sesión' }).click();

    // Should redirect to dashboard
    await expect(page).toHaveURL('/patient/dashboard', { timeout: 10_000 });
  });

  test('sign out navigates back to /patient/welcome', async ({ page, authedPatient }) => {
    await page.goto('/patient/dashboard');
    await expect(page).toHaveURL('/patient/dashboard', { timeout: 10_000 });

    // Click the logout button (desktop: "Salir", mobile: aria-label)
    const logoutButton = page.getByRole('button', { name: /Salir|Cerrar sesión/i }).first();
    await logoutButton.click();

    await expect(page).toHaveURL('/patient/welcome', { timeout: 8_000 });
  });

  test('navigating to /patient/dashboard after sign out bounces to welcome', async ({ page, authedPatient }) => {
    await page.goto('/patient/dashboard');
    await expect(page).toHaveURL('/patient/dashboard', { timeout: 10_000 });

    // Sign out
    await page.getByRole('button', { name: /Salir|Cerrar sesión/i }).first().click();
    await expect(page).toHaveURL('/patient/welcome', { timeout: 8_000 });

    // Try to access dashboard again — should bounce back
    await page.goto('/patient/dashboard');
    await expect(page).toHaveURL('/patient/welcome', { timeout: 8_000 });
  });

  test('invalid password shows error message', async ({ page, resetDb, seedProfessional, seedPatient }) => {
    await page.goto('/patient/welcome');
    await page.getByRole('button', { name: 'Iniciar Sesión' }).click();

    await page.getByLabel('Correo Electrónico').fill(seedPatient.email);
    await page.getByLabel('Contraseña').fill('wrongpassword');
    await page.getByRole('button', { name: 'Iniciar Sesión' }).click();

    await expect(page.getByText(/Error al iniciar sesión/i)).toBeVisible({ timeout: 5_000 });
  });
});
