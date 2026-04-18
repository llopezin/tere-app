import { test, expect } from './fixtures';

test.describe('Appointments — list', () => {
  test('upcoming tab shows 1 scheduled appointment', async ({ page, seedAppointmentsForPatient }) => {
    await page.goto('/patient/dashboard');
    await expect(page).toHaveURL('/patient/dashboard', { timeout: 10_000 });

    // Switch to the appointments tab (DashboardTabs nav)
    // Button contains both "Mis Citas" (desktop) and "Citas" (mobile); use partial text
    await page.locator('nav button').filter({ hasText: /Mis Citas|Citas/ }).first().click();

    // Wait for the appointment list to render
    await expect(page.getByRole('heading', { name: 'Mis Citas' })).toBeVisible({ timeout: 8_000 });

    // Default sub-tab should be "Próximas Citas"
    await expect(page.getByText(/Próximas Citas/)).toBeVisible();

    // Should show the future appointment with "Programada" status
    await expect(page.getByText('Programada')).toBeVisible({ timeout: 8_000 });

    // Counter should show (1)
    await expect(page.getByText('(1)')).toBeVisible();
  });

  test('history tab shows 1 completed appointment', async ({ page, seedAppointmentsForPatient }) => {
    await page.goto('/patient/dashboard');
    await expect(page).toHaveURL('/patient/dashboard', { timeout: 10_000 });

    // Switch to the appointments tab
    // Navigate to the appointments tab
    await page.getByRole('button', { name: /^Mis Citas$|^Citas$/i }).first().click();
    await expect(page.getByRole('heading', { name: 'Mis Citas' })).toBeVisible({ timeout: 8_000 });

    // Switch to history sub-tab
    await page.getByRole('button', { name: /Historial/i }).click();

    // Should show the past appointment with "Completada" status
    await expect(page.getByText('Completada')).toBeVisible({ timeout: 8_000 });

    // History appointment should have "Factura" and "Editar Datos" buttons
    await expect(page.getByRole('button', { name: 'Factura' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Editar Datos' })).toBeVisible();
  });

  test('upcoming and history counters both show (1)', async ({ page, seedAppointmentsForPatient }) => {
    await page.goto('/patient/dashboard');
    await expect(page).toHaveURL('/patient/dashboard', { timeout: 10_000 });

    // Navigate to the appointments tab
    // Navigate to the appointments tab
    await page.getByRole('button', { name: /^Mis Citas$|^Citas$/i }).first().click();
    await expect(page.getByRole('heading', { name: 'Mis Citas' })).toBeVisible({ timeout: 8_000 });

    // Both tabs should show (1) counter
    const counters = page.getByText('(1)');
    await expect(counters).toHaveCount(2, { timeout: 8_000 });
  });
});
