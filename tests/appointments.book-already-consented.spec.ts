import { test, expect } from './fixtures';

test.describe('Appointments — book (already consented)', () => {
  test('RGPD checkbox is not shown when patient already signed', async ({ page, authedPatientWithRgpd }) => {
    // authedPatientWithRgpd resets DB + seeds prof + seeds patient (signed RGPD) + signs in
    await page.goto('/patient/dashboard');
    await expect(page).toHaveURL('/patient/dashboard', { timeout: 10_000 });
    await expect(page.getByText('Reservar una Cita')).toBeVisible({ timeout: 8_000 });

    const consultationSelect = page.getByRole('combobox').nth(1);
    await expect(consultationSelect).toBeEnabled({ timeout: 8_000 });
    await consultationSelect.click();
    await page.getByRole('option', { name: /Sesión estándar/ }).click();

    // Click first slot
    const slotButtons = page.locator('button').filter({ hasText: /^\d{2}:\d{2}$/ });
    await expect(slotButtons.first()).toBeVisible({ timeout: 10_000 });
    await slotButtons.first().click();

    await expect(page.getByRole('heading', { name: 'Confirmar cita' })).toBeVisible({ timeout: 5_000 });

    // RGPD checkbox should NOT be present
    await expect(
      page.getByText(/política de privacidad y protección de datos/i),
    ).not.toBeVisible();

    // Submit button should be enabled directly
    const submitBtn = page.getByRole('button', { name: 'Confirmar cita' });
    await expect(submitBtn).toBeEnabled();
  });

  test('already-consented patient can book without RGPD step', async ({ page, authedPatientWithRgpd }) => {
    await page.goto('/patient/dashboard');
    await expect(page.getByText('Reservar una Cita')).toBeVisible({ timeout: 8_000 });

    const consultationSelect = page.getByRole('combobox').nth(1);
    await expect(consultationSelect).toBeEnabled({ timeout: 8_000 });
    await consultationSelect.click();
    await page.getByRole('option', { name: /Sesión estándar/ }).click();

    // Click first available slot
    const slotButtons = page.locator('button').filter({ hasText: /^\d{2}:\d{2}$/ });
    await expect(slotButtons.first()).toBeVisible({ timeout: 10_000 });
    await slotButtons.first().click();

    await expect(page.getByRole('heading', { name: 'Confirmar cita' })).toBeVisible({ timeout: 5_000 });

    // Fill in NIE
    await page.getByLabel('DNI/NIE').fill('12345678Z');

    // Submit directly (no RGPD step needed)
    const submitBtn = page.getByRole('button', { name: 'Confirmar cita' });
    await submitBtn.click();

    // Should reach confirmation state
    await expect(page.getByText('¡Cita confirmada!')).toBeVisible({ timeout: 10_000 });
  });
});
