import { test, expect, pickFirstSlot } from './fixtures';

test.use({ signRgpd: true });

test('shows a loader, never the stale list, until the just-booked appointment arrives', async ({ page, authedPatient: _ }) => {
  await page.goto('/dashboard');
  await page.getByRole('button', { name: 'Mis Citas' }).click();
  await expect(page.getByRole('button', { name: 'Próximas Citas (0)' })).toBeVisible();

  await page.getByRole('button', { name: 'Reservar Cita' }).click();
  await pickFirstSlot(page);
  await page.getByLabel('DNI/NIE').fill('12345678Z');
  await page.getByRole('button', { name: 'Confirmar cita' }).click();
  // The footer button (the X icon is also labelled "Cerrar")
  await page.getByRole('dialog', { name: '¡Cita confirmada!' }).getByText('Cerrar', { exact: true }).click();

  // Hold the list request so what is shown while it loads can be checked
  let releaseList!: () => void;
  const listHeld = new Promise<void>((resolve) => { releaseList = resolve; });
  await page.route(/\/api\/v1\/patient\/appointments\?/, async (route) => {
    await listHeld;
    await route.continue();
  });

  await page.getByRole('button', { name: 'Mis Citas' }).click();
  await expect(page.getByRole('status', { name: 'Cargando citas' })).toBeVisible();
  await expect(page.getByText('No tienes citas programadas')).toHaveCount(0);

  releaseList();
  await expect(page.getByRole('button', { name: 'Próximas Citas (1)' })).toBeVisible();
  await expect(page.getByText('Programada')).toBeVisible();
});
