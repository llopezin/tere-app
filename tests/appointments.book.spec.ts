import { test, expect } from './fixtures';

test.describe('Appointments — book (unsigned RGPD)', () => {
  test('patient can book an appointment (RGPD checkbox required)', async ({ page, authedPatient }) => {
    // authedPatient already resets DB + seeds prof + seeds patient (unsigned RGPD) + signs in
    await page.goto('/patient/dashboard');
    await expect(page).toHaveURL('/patient/dashboard', { timeout: 10_000 });

    // Should be on the "book" tab by default
    await expect(page.getByText('Reservar una Cita')).toBeVisible({ timeout: 8_000 });

    // Professional dropdown should be populated (auto-selected)
    // Select a consultation type
    // Wait for appointment types to load
    await expect(page.getByText('Sesión estándar')).toBeVisible({ timeout: 8_000 });
    // Click the consultation type select
    const consultationSelect = page.getByRole('combobox').nth(1);
    await consultationSelect.click();
    await page.getByText('Sesión estándar').click();

    // Wait for WeeklySchedule to render slots
    // The professional has Mon–Fri 09:00–18:00 so current week should have slots
    await expect(page.getByText(/Sin citas|[0-9]{2}:[0-9]{2}/)).toBeVisible({ timeout: 10_000 });

    // Click the first available time slot
    const slotButtons = page.locator('button').filter({ hasText: /^\d{2}:\d{2}$/ });
    const firstSlot = slotButtons.first();
    await expect(firstSlot).toBeVisible({ timeout: 10_000 });
    await firstSlot.click();

    // Booking confirmation modal should open
    await expect(page.getByText('Confirmar cita')).toBeVisible({ timeout: 5_000 });

    // Form should be pre-filled with patient data
    await expect(page.getByLabel('Nombre')).toHaveValue('Carlos');
    await expect(page.getByLabel('Apellidos')).toHaveValue('López');

    // RGPD checkbox should be visible (patient has not signed yet)
    const rgpdCheckbox = page.getByText(/política de privacidad y protección de datos/i);
    await expect(rgpdCheckbox).toBeVisible();

    // Submit button should be disabled without RGPD checkbox
    const submitBtn = page.getByRole('button', { name: 'Confirmar cita' });
    await expect(submitBtn).toBeDisabled();

    // Accept RGPD
    await page.getByRole('checkbox').click();
    await expect(submitBtn).toBeEnabled();

    // Fill in NIE (required in modal)
    await page.getByLabel('DNI/NIE').fill('12345678Z');

    // Submit the booking
    await submitBtn.click();

    // Wait for success state
    await expect(page.getByText('¡Cita confirmada!')).toBeVisible({ timeout: 10_000 });

    // Success card should show booking details
    await expect(page.getByText('Sesión estándar')).toBeVisible();
    await expect(page.getByText('Ana García')).toBeVisible();
  });

  test('submit is blocked when RGPD checkbox is unchecked', async ({ page, authedPatient }) => {
    await page.goto('/patient/dashboard');
    await expect(page.getByText('Reservar una Cita')).toBeVisible({ timeout: 8_000 });

    // Select consultation
    const consultationSelect = page.getByRole('combobox').nth(1);
    await consultationSelect.click();
    await page.getByText('Sesión estándar').click();

    // Wait for and click first slot
    const slotButtons = page.locator('button').filter({ hasText: /^\d{2}:\d{2}$/ });
    await expect(slotButtons.first()).toBeVisible({ timeout: 10_000 });
    await slotButtons.first().click();

    await expect(page.getByText('Confirmar cita')).toBeVisible({ timeout: 5_000 });

    // The confirm button should be disabled (RGPD not accepted)
    const submitBtn = page.getByRole('button', { name: 'Confirmar cita' });
    await expect(submitBtn).toBeDisabled();
  });
});
