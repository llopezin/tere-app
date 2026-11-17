import { test, expect, openAppointmentsTab } from './fixtures';

test('lists upcoming and past appointments in their tabs', async ({ page, appointments: _ }) => {
  await openAppointmentsTab(page);

  await page.getByRole('tab', { name: 'Próximas Citas (1)' }).click();
  await expect(page.getByText('Programada')).toBeVisible();

  await page.getByRole('tab', { name: 'Historial (1)' }).click();
  await expect(page.getByText('Completada')).toBeVisible();
});
