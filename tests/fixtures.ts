import { test as base, expect, type BrowserContext } from '@playwright/test';

const BACKEND_URL = 'http://localhost:3000';
const API_BASE = `${BACKEND_URL}/api/v1`;

// ── Seed data types ─────────────────────────────────────────────────────────

export interface ProfessionalSeed {
  userId: string;
  professionalId: string;
  appointmentTypeId: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface PatientSeed {
  userId: string;
  patientId: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
}

export interface AppointmentSeed {
  id: string;
  professionalId: string;
  patientId: string;
  appointmentTypeId: string;
  startAt: string;
  endAt: string;
  status: string;
  price: string;
}

export interface AuthedPatientFixture {
  patient: PatientSeed;
  professional: ProfessionalSeed;
}

// Sign in against the browser context — cookies land in the context's cookie
// jar automatically (context.request shares storage state with the context),
// so page.goto() and page.request.* both see the session.
async function signInIntoContext(
  context: BrowserContext,
  email: string,
  password: string,
): Promise<void> {
  const response = await context.request.post(`${BACKEND_URL}/api/auth/sign-in/email`, {
    data: { email, password },
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok()) {
    const body = await response.text();
    throw new Error(`Sign-in failed for ${email}: ${response.status()} ${body}`);
  }
}

// ── Fixture definitions ──────────────────────────────────────────────────────

type Fixtures = {
  resetDb: void;
  seedProfessional: ProfessionalSeed;
  seedPatient: PatientSeed;
  authedPatient: AuthedPatientFixture;
  authedPatientWithRgpd: AuthedPatientFixture;
  seedAppointmentsForPatient: {
    future: AppointmentSeed;
    past: AppointmentSeed;
    patient: PatientSeed;
    professional: ProfessionalSeed;
  };
  seedBookableProfessional: ProfessionalSeed;
};

export const test = base.extend<Fixtures>({
  // Reset DB before each test that uses this fixture
  resetDb: [
    async ({ request }, use) => {
      const res = await request.post(`${API_BASE}/test/reset`);
      if (!res.ok() && res.status() !== 204) {
        throw new Error(`DB reset failed: ${res.status()}`);
      }
      await use();
    },
    { auto: false },
  ],

  seedProfessional: [
    async ({ resetDb: _reset, request }, use) => {
      const data = {
        email: 'prof@test.com',
        password: 'password123',
        firstName: 'Ana',
        lastName: 'García',
      };
      const res = await request.post(`${API_BASE}/test/seed/professional`, {
        data,
      });
      if (!res.ok()) {
        const body = await res.text();
        throw new Error(`seedProfessional failed: ${res.status()} ${body}`);
      }
      const json = await res.json();
      await use({ ...json, ...data } as ProfessionalSeed);
    },
    { auto: false },
  ],

  seedPatient: [
    async ({ resetDb: _reset, request }, use) => {
      const data = {
        email: 'patient@test.com',
        password: 'password123',
        firstName: 'Carlos',
        lastName: 'López',
        phone: '+34 600 000 001',
      };
      const res = await request.post(`${API_BASE}/test/seed/patient`, {
        data,
      });
      if (!res.ok()) {
        const body = await res.text();
        throw new Error(`seedPatient failed: ${res.status()} ${body}`);
      }
      const json = await res.json();
      await use({ ...json, ...data } as PatientSeed);
    },
    { auto: false },
  ],

  authedPatient: [
    async ({ resetDb: _reset, request, context }, use) => {
      // Seed professional first (needed for dashboard loader)
      const profData = {
        email: 'prof@test.com',
        password: 'password123',
        firstName: 'Ana',
        lastName: 'García',
      };
      const profRes = await request.post(`${API_BASE}/test/seed/professional`, { data: profData });
      if (!profRes.ok()) throw new Error(`seedProfessional failed: ${profRes.status()}`);
      const profJson = await profRes.json();
      const professional: ProfessionalSeed = { ...profJson, ...profData };

      // Seed patient
      const patData = {
        email: 'patient@test.com',
        password: 'password123',
        firstName: 'Carlos',
        lastName: 'López',
        phone: '+34 600 000 001',
        signRgpd: false,
      };
      const patRes = await request.post(`${API_BASE}/test/seed/patient`, { data: patData });
      if (!patRes.ok()) throw new Error(`seedPatient failed: ${patRes.status()}`);
      const patJson = await patRes.json();
      const patient: PatientSeed = { ...patJson, ...patData };

      await signInIntoContext(context, patient.email, patient.password);

      await use({ patient, professional });
    },
    { auto: false },
  ],

  authedPatientWithRgpd: [
    async ({ resetDb: _reset, request, context }, use) => {
      // Seed professional first
      const profData = {
        email: 'prof@test.com',
        password: 'password123',
        firstName: 'Ana',
        lastName: 'García',
      };
      const profRes = await request.post(`${API_BASE}/test/seed/professional`, { data: profData });
      if (!profRes.ok()) throw new Error(`seedProfessional failed: ${profRes.status()}`);
      const profJson = await profRes.json();
      const professional: ProfessionalSeed = { ...profJson, ...profData };

      // Seed patient with RGPD signed
      const patData = {
        email: 'patient@test.com',
        password: 'password123',
        firstName: 'Carlos',
        lastName: 'López',
        phone: '+34 600 000 001',
        signRgpd: true,
      };
      const patRes = await request.post(`${API_BASE}/test/seed/patient`, { data: patData });
      if (!patRes.ok()) throw new Error(`seedPatient failed: ${patRes.status()}`);
      const patJson = await patRes.json();
      const patient: PatientSeed = { ...patJson, ...patData };

      await signInIntoContext(context, patient.email, patient.password);

      await use({ patient, professional });
    },
    { auto: false },
  ],

  seedAppointmentsForPatient: [
    async ({ resetDb: _reset, request, context }, use) => {
      // Seed professional
      const profData = {
        email: 'prof@test.com',
        password: 'password123',
        firstName: 'Ana',
        lastName: 'García',
      };
      const profRes = await request.post(`${API_BASE}/test/seed/professional`, { data: profData });
      if (!profRes.ok()) throw new Error(`seedProfessional failed: ${profRes.status()}`);
      const profJson = await profRes.json();
      const professional: ProfessionalSeed = { ...profJson, ...profData };

      // Seed patient with RGPD already signed
      const patData = {
        email: 'patient@test.com',
        password: 'password123',
        firstName: 'Carlos',
        lastName: 'López',
        phone: '+34 600 000 001',
        signRgpd: true,
      };
      const patRes = await request.post(`${API_BASE}/test/seed/patient`, { data: patData });
      if (!patRes.ok()) throw new Error(`seedPatient failed: ${patRes.status()}`);
      const patJson = await patRes.json();
      const patient: PatientSeed = { ...patJson, ...patData };

      // Seed a future appointment (1 week from now)
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      // Ensure it's on a weekday (Mon-Fri) at 10:00
      while (futureDate.getDay() === 0 || futureDate.getDay() === 6) {
        futureDate.setDate(futureDate.getDate() + 1);
      }
      futureDate.setHours(10, 0, 0, 0);

      const futureRes = await request.post(`${API_BASE}/test/seed/appointment`, {
        data: {
          patientEmail: patient.email,
          professionalEmail: professional.email,
          appointmentTypeId: professional.appointmentTypeId,
          startAt: futureDate.toISOString(),
          status: 'scheduled',
        },
      });
      if (!futureRes.ok()) throw new Error(`seedFutureAppointment failed: ${futureRes.status()}`);
      const future: AppointmentSeed = await futureRes.json();

      // Seed a past appointment (1 week ago)
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 7);
      while (pastDate.getDay() === 0 || pastDate.getDay() === 6) {
        pastDate.setDate(pastDate.getDate() - 1);
      }
      pastDate.setHours(10, 0, 0, 0);

      const pastRes = await request.post(`${API_BASE}/test/seed/appointment`, {
        data: {
          patientEmail: patient.email,
          professionalEmail: professional.email,
          appointmentTypeId: professional.appointmentTypeId,
          startAt: pastDate.toISOString(),
          status: 'completed',
        },
      });
      if (!pastRes.ok()) throw new Error(`seedPastAppointment failed: ${pastRes.status()}`);
      const past: AppointmentSeed = await pastRes.json();

      await signInIntoContext(context, patient.email, patient.password);

      await use({ future, past, patient, professional });
    },
    { auto: false },
  ],

  seedBookableProfessional: [
    async ({ resetDb: _reset, request }, use) => {
      const data = {
        email: 'prof@test.com',
        password: 'password123',
        firstName: 'Ana',
        lastName: 'García',
      };
      const res = await request.post(`${API_BASE}/test/seed/professional`, { data });
      if (!res.ok()) {
        const body = await res.text();
        throw new Error(`seedBookableProfessional failed: ${res.status()} ${body}`);
      }
      const json = await res.json();
      await use({ ...json, ...data } as ProfessionalSeed);
    },
    { auto: false },
  ],
});

export { expect };
