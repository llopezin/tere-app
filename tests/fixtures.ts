import { test as base, expect, type Page } from '@playwright/test';
import { e2eEnv } from './e2e-env';
import { resetDb, seedAppointment, seedPatient, seedProfessional } from './seed';

export const BACKEND_URL = e2eEnv.BETTER_AUTH_URL;
const DAY_MS = 24 * 60 * 60 * 1000;

export const PROFESSIONAL = { email: 'prof@test.com', password: 'password123', firstName: 'Ana', lastName: 'García' };
export const PATIENT = {
  email: 'patient@test.com',
  password: 'password123',
  firstName: 'Carlos',
  lastName: 'López',
  phone: '+34 600 000 001',
};

interface Professional { professionalId: string; appointmentTypeId: string }
type Patient = typeof PATIENT & { patientId: string };
interface Appointments { future: { id: string }; past: { id: string } }

interface Fixtures {
  resetDb: void;
  /** Option: seed the patient with RGPD already signed (`test.use({ signRgpd: true })`). */
  signRgpd: boolean;
  professional: Professional;
  patient: Patient;
  /** Signed-in patient of a clinic with one bookable professional. */
  authedPatient: Patient;
  /** One upcoming (scheduled) and one past (completed) appointment of the authed patient. */
  appointments: Appointments;
}

const daysFromNow = (days: number) => new Date(Date.now() + days * DAY_MS);

export const test = base.extend<Fixtures>({
  // Runs before every test
  resetDb: [
    async ({}, use) => {
      await resetDb();
      await use();
    },
    { auto: true },
  ],

  signRgpd: [false, { option: true }],

  professional: async ({}, use) => {
    await use(await seedProfessional(PROFESSIONAL));
  },

  patient: async ({ signRgpd }, use) => {
    const { patientId } = await seedPatient({ ...PATIENT, signRgpd });
    await use({ ...PATIENT, patientId });
  },

  // context.request shares the browser cookie jar, so the page is signed in too
  authedPatient: async ({ context, professional: _professional, patient }, use) => {
    const res = await context.request.post(`${BACKEND_URL}/api/auth/sign-in/email`, {
      data: { email: patient.email, password: patient.password },
    });
    await expect(res).toBeOK();
    await use(patient);
  },

  appointments: async ({ professional, authedPatient }, use) => {
    const appointment = (startAt: Date, status: 'scheduled' | 'completed') => seedAppointment({
      patientId: authedPatient.patientId,
      appointmentTypeId: professional.appointmentTypeId,
      startAt,
      status,
    });
    await use({
      future: await appointment(daysFromNow(7), 'scheduled'),
      past: await appointment(daysFromNow(-7), 'completed'),
    });
  },
});

/** Picks the seeded consultation type and the first slot still bookable. */
export async function openBookingModal(page: Page) {
  await page.goto('/dashboard');
  await pickFirstSlot(page);
}

/** Same as `openBookingModal`, from the booking tab already open (keeps the app's state). */
export async function pickFirstSlot(page: Page) {
  await page.getByRole('combobox', { name: /Consultas de/ }).click();
  await page.getByRole('option', { name: /Sesión estándar/ }).click();
  // Earlier slots of the current week are rendered but disabled
  await page.getByRole('button', { name: /^\d{2}:\d{2}$/, disabled: false }).first().click();
  await expect(page.getByRole('heading', { name: 'Confirmar cita' })).toBeVisible();
}

export async function openAppointmentsTab(page: Page) {
  await page.goto('/dashboard');
  await page.getByRole('button', { name: 'Mis Citas' }).click();
}

export { expect };
