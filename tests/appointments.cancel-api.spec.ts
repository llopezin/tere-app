/**
 * Cancel appointment — API-only tests.
 *
 * There is no patient-facing cancel button in AppointmentCard.tsx (confirmed by plan).
 * These tests exercise PATCH /api/v1/appointments/{id}/cancel directly using the
 * session cookies established by the seedAppointmentsForPatient fixture.
 */

import { test, expect } from './fixtures';

const BACKEND_URL = 'http://localhost:3000';

test.describe('Appointments — cancel (API-level)', () => {
  test('patient can cancel a future appointment', async ({ page, seedAppointmentsForPatient }) => {
    const { future } = seedAppointmentsForPatient;

    const res = await page.request.patch(
      `${BACKEND_URL}/api/v1/appointments/${future.id}/cancel`,
    );
    const body = await res.json().catch(() => null);

    expect(res.status()).toBe(200);
    expect(body?.status).toBe('cancelled');
  });

  test('cancelling a past appointment returns 400', async ({ page, seedAppointmentsForPatient }) => {
    const { past } = seedAppointmentsForPatient;

    const res = await page.request.patch(
      `${BACKEND_URL}/api/v1/appointments/${past.id}/cancel`,
    );

    expect(res.status()).toBe(400);
  });

  test('after cancellation, the appointment appears in history tab with Cancelada badge', async ({
    page,
    seedAppointmentsForPatient,
  }) => {
    const { future } = seedAppointmentsForPatient;

    await page.request.patch(
      `${BACKEND_URL}/api/v1/appointments/${future.id}/cancel`,
    );

    await page.goto('/patient/dashboard');
    await expect(page).toHaveURL('/patient/dashboard', { timeout: 10_000 });

    await page.locator('nav button').filter({ hasText: /Mis Citas|Citas/ }).first().click();
    await expect(page.getByRole('heading', { name: 'Mis Citas' })).toBeVisible({ timeout: 8_000 });

    await page.getByRole('button', { name: /Historial/i }).click();

    await expect(page.getByText('Cancelada')).toBeVisible({ timeout: 8_000 });
  });
});
