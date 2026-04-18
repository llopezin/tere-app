/**
 * Cancel appointment — API-only tests.
 *
 * There is no patient-facing cancel button in AppointmentCard.tsx (confirmed by plan).
 * These tests exercise PATCH /api/v1/appointments/{id}/cancel directly using the
 * session cookies established by the authedPatient / seedAppointmentsForPatient fixtures.
 */

import { test, expect } from './fixtures';

const BACKEND_URL = 'http://localhost:3000';

test.describe('Appointments — cancel (API-level)', () => {
  test('patient can cancel a future appointment', async ({ page, request, seedAppointmentsForPatient }) => {
    const { future } = seedAppointmentsForPatient;

    // Use page context cookies (set by fixture via context.addCookies)
    const cancelRes = await page.evaluate(
      async ({ url }: { url: string }) => {
        const res = await fetch(url, {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        });
        const json = await res.json().catch(() => null);
        return { status: res.status, body: json };
      },
      { url: `${BACKEND_URL}/api/v1/appointments/${future.id}/cancel` },
    );

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body?.status).toBe('cancelled');
  });

  test('cancelling a past appointment returns 400', async ({ page, request, seedAppointmentsForPatient }) => {
    const { past } = seedAppointmentsForPatient;

    const cancelRes = await page.evaluate(
      async ({ url }: { url: string }) => {
        const res = await fetch(url, {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        });
        return { status: res.status };
      },
      { url: `${BACKEND_URL}/api/v1/appointments/${past.id}/cancel` },
    );

    expect(cancelRes.status).toBe(400);
  });

  test('after cancellation, the appointment appears in history tab with Cancelada badge', async ({
    page,
    seedAppointmentsForPatient,
  }) => {
    const { future } = seedAppointmentsForPatient;

    // Cancel via API
    await page.evaluate(
      async ({ url }: { url: string }) => {
        await fetch(url, {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        });
      },
      { url: `${BACKEND_URL}/api/v1/appointments/${future.id}/cancel` },
    );

    // Navigate to dashboard appointments tab
    await page.goto('/patient/dashboard');
    await expect(page).toHaveURL('/patient/dashboard', { timeout: 10_000 });

    await page.locator('nav button').filter({ hasText: /Mis Citas|Citas/ }).first().click();
    await expect(page.getByRole('heading', { name: 'Mis Citas' })).toBeVisible({ timeout: 8_000 });

    // Switch to history tab — cancelled appointment should appear there
    await page.getByRole('button', { name: /Historial/i }).click();

    // Should see "Cancelada" badge
    await expect(page.getByText('Cancelada')).toBeVisible({ timeout: 8_000 });
  });
});
