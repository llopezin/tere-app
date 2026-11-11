import { test, expect, openBookingModal, PATIENT, PROFESSIONAL } from './fixtures';

test.describe('Appointments — book', () => {
  test('first booking requires accepting RGPD', async ({ page, authedPatient: _ }) => {
    await openBookingModal(page);

    await expect(page.getByLabel('Nombre')).toHaveValue(PATIENT.firstName);
    await expect(page.getByLabel('Apellidos')).toHaveValue(PATIENT.lastName);

    const submit = page.getByRole('button', { name: 'Confirmar cita' });
    await expect(submit).toBeDisabled();
    await page.getByRole('checkbox').click();
    await page.getByLabel('DNI/NIE').fill('12345678Z');
    await submit.click();

    const confirmation = page.getByRole('dialog', { name: '¡Cita confirmada!' });
    await expect(confirmation.getByText('Sesión estándar')).toBeVisible();
    await expect(confirmation.getByText(`${PROFESSIONAL.firstName} ${PROFESSIONAL.lastName}`)).toBeVisible();
  });

  test.describe('with RGPD already signed', () => {
    test.use({ signRgpd: true });

    test('books without the RGPD step', async ({ page, authedPatient: _ }) => {
      await openBookingModal(page);

      await expect(page.getByRole('checkbox')).toHaveCount(0);
      await page.getByLabel('DNI/NIE').fill('12345678Z');
      await page.getByRole('button', { name: 'Confirmar cita' }).click();

      await expect(page.getByRole('dialog', { name: '¡Cita confirmada!' })).toBeVisible();
    });
  });
});
