import { test, expect, openAppointmentsTab, BACKEND_URL } from './fixtures';

test.describe('Appointments — cancel', () => {
  test('a patient cancels an upcoming appointment and it moves to history', async ({ page, appointments: _ }) => {
    await openAppointmentsTab(page);
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await page.getByRole('dialog', { name: '¿Cancelar la cita?' }).getByRole('button', { name: 'Cancelar cita' }).click();

    await expect(page.getByRole('button', { name: 'Próximas Citas (0)' })).toBeVisible();
    await page.getByRole('button', { name: 'Historial (2)' }).click();
    await expect(page.getByText('Cancelada')).toBeVisible();
  });

  test('a past appointment cannot be cancelled', async ({ page, appointments }) => {
    const res = await page.request.patch(`${BACKEND_URL}/api/v1/patient/appointments/${appointments.past.id}/cancel`);
    expect(res.status()).toBe(400);
  });
});
