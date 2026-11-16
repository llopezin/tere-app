import { test, expect, openAppointmentsTab, BACKEND_URL } from './fixtures';

// Patients have no cancel button yet, so cancellation goes through the API with the page's session
const cancelUrl = (id: string) => `${BACKEND_URL}/api/v1/patient/appointments/${id}/cancel`;

test.describe('Appointments — cancel', () => {
  test('a cancelled appointment moves to history', async ({ page, appointments }) => {
    const res = await page.request.patch(cancelUrl(appointments.future.id));
    expect(res.status()).toBe(200);

    await openAppointmentsTab(page);
    await page.getByRole('button', { name: /Historial/ }).click();
    await expect(page.getByText('Cancelada')).toBeVisible();
  });

  test('a past appointment cannot be cancelled', async ({ page, appointments }) => {
    const res = await page.request.patch(cancelUrl(appointments.past.id));
    expect(res.status()).toBe(400);
  });
});
