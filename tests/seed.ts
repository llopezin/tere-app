// Seeds the e2e database directly, through the backend's own db client and auth, so the server needs no test-only endpoints
import './backend-env';
import { db } from '../apps/backend/src/db/index';
import { auth } from '../apps/backend/src/lib/auth';
import { createProfessionalAccount, type CreateProfessionalAccountInput } from '../apps/backend/src/services/professional-account.service';
import { appointmentTypes } from '../apps/backend/src/db/schema/appointment-types';
import { workingSchedules } from '../apps/backend/src/db/schema/working-schedules';
import { rgpdConsents } from '../apps/backend/src/db/schema/rgpd-consents';
import { appointments } from '../apps/backend/src/db/schema/appointments';

// working_schedules.day_of_week: 0 = Monday … 6 = Sunday
const WEEKDAYS = [0, 1, 2, 3, 4];

// Every other table references "user" (directly or transitively), so CASCADE empties them all.
// SET LOCAL hides the one NOTICE per cascaded table that Postgres would print in the test output.
export async function resetDb() {
  await db.transaction(async (tx) => {
    await tx.execute('SET LOCAL client_min_messages = warning');
    await tx.execute('TRUNCATE TABLE "user", verification CASCADE');
  });
}

/** A professional with one appointment type, working Monday to Friday 09:00–18:00. */
export async function seedProfessional(input: CreateProfessionalAccountInput) {
  const { professional } = await createProfessionalAccount(input);

  const [appointmentType] = await db.insert(appointmentTypes).values({
    professionalId: professional.id,
    name: 'Sesión estándar',
    durationMinutes: 45,
    price: '50.00',
  }).returning();

  await db.insert(workingSchedules).values(WEEKDAYS.map((dayOfWeek) => ({
    professionalId: professional.id,
    dayOfWeek,
    startTime: '09:00',
    endTime: '18:00',
  })));

  return { professionalId: professional.id, appointmentTypeId: appointmentType.id };
}

interface PatientInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  signRgpd: boolean;
}

export async function seedPatient({ signRgpd, ...patient }: PatientInput) {
  // Same path as the public sign-up, so the patient profile is created by the auth hook
  const { user } = await auth.api.signUpEmail({
    body: { ...patient, name: `${patient.firstName} ${patient.lastName}` },
  });
  const profile = await db.query.patients.findFirst({ where: (p, { eq }) => eq(p.authUserId, user.id) });
  if (!profile) throw new Error('Patient profile was not created');
  const patientId = profile.id;

  if (signRgpd) {
    await db.insert(rgpdConsents).values({ patientId, signed: true, signatureData: 'test_seed', signedAt: new Date() });
  }

  return { patientId };
}

interface AppointmentInput {
  patientId: string;
  appointmentTypeId: string;
  startAt: Date;
  status: 'scheduled' | 'completed';
}

/** Inserted directly, so it can be in the past (the API rejects past bookings). */
export async function seedAppointment({ patientId, appointmentTypeId, startAt, status }: AppointmentInput) {
  const type = await db.query.appointmentTypes.findFirst({ where: (t, { eq }) => eq(t.id, appointmentTypeId) });
  if (!type) throw new Error(`Appointment type ${appointmentTypeId} not found`);

  const [appointment] = await db.insert(appointments).values({
    professionalId: type.professionalId,
    patientId,
    appointmentTypeId,
    startAt,
    endAt: new Date(startAt.getTime() + type.durationMinutes * 60_000),
    status,
    price: type.price,
  }).returning({ id: appointments.id });

  return appointment;
}
