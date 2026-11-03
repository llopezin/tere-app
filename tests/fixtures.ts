import { test as base, expect, type APIRequestContext, type Page } from '@playwright/test';

export const BACKEND_URL = 'http://localhost:3000';
const TEST_API = `${BACKEND_URL}/api/v1/test`;
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

async function seed(request: APIRequestContext, path: string, data: object) {
  const res = await request.post(`${TEST_API}${path}`, { data });
  await expect(res).toBeOK();
  return res.json();
}

const daysFromNow = (days: number) => new Date(Date.now() + days * DAY_MS).toISOString();

export const test = base.extend<Fixtures>({
  // Runs before every test: the backend must be started with NODE_ENV=test, otherwise this is a 404
  resetDb: [
    async ({ request }, use) => {
      await expect(await request.post(`${TEST_API}/reset`)).toBeOK();
      await use();
    },
    { auto: true },
  ],

  signRgpd: [false, { option: true }],

  professional: async ({ request }, use) => {
    await use(await seed(request, '/seed/professional', PROFESSIONAL));
  },

  patient: async ({ request, signRgpd }, use) => {
    const { patientId } = await seed(request, '/seed/patient', { ...PATIENT, signRgpd });
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

  appointments: async ({ request, professional, authedPatient }, use) => {
    const appointment = (startAt: string, status: string) => seed(request, '/seed/appointment', {
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
