import { testDb } from './setup.js';
import { professionals } from '../db/schema/professionals.js';
import { patients } from '../db/schema/patients.js';
import { appointmentTypes } from '../db/schema/appointment-types.js';
import { appointments } from '../db/schema/appointments.js';
import { rgpdConsents } from '../db/schema/rgpd-consents.js';
import { bonos } from '../db/schema/bonos.js';
import { blockedTimes } from '../db/schema/blocked-times.js';
import { workingSchedules } from '../db/schema/working-schedules.js';
import { professionalPatients } from '../db/schema/professional-patients.js';
import { user } from '../db/schema/auth-schema.js';
import { eq } from 'drizzle-orm';

export async function createProfessional(name?: string, data: Partial<typeof professionals.$inferInsert> = {}) {
  // Create auth user first
  const userId = crypto.randomUUID();
  const email = data.email || `prof-${userId}@test.com`;
  await testDb.insert(user).values({
    id: userId,
    name: name || 'Test Professional',
    email,
    role: 'professional',
  });
  
  const [prof] = await testDb.insert(professionals).values({
    authUserId: userId,
    firstName: name?.split(' ')[0] || 'Test',
    lastName: name?.split(' ')[1] || 'Professional',
    email,
    phone: '123456789',
    ...data,
  }).returning();
  return prof;
}

export async function createPatient(professionalId: string, data: Partial<typeof patients.$inferInsert> = {}) {
  // Create auth user first
  const userId = crypto.randomUUID();
  const email = data.email || `patient-${userId}@test.com`;
  await testDb.insert(user).values({
    id: userId,
    name: 'Test Patient',
    email,
    role: 'patient',
  });
  
  const [patient] = await testDb.insert(patients).values({
    authUserId: userId,
    firstName: 'Test',
    lastName: 'Patient',
    email,
    phone: '987654321',
    ...data,
  }).returning();
  
  await testDb.insert(professionalPatients).values({ professionalId, patientId: patient.id });

  // Auto-create RGPD consent
  await testDb.insert(rgpdConsents).values({
    patientId: patient.id,
    signed: false,
  });
  
  return patient;
}

export async function signRgpdConsent(patientId: string) {
  await testDb.update(rgpdConsents)
    .set({
      signed: true,
      signatureData: 'test-signature-data',
      signedAt: new Date(),
      ipAddress: '127.0.0.1',
    })
    .where(eq(rgpdConsents.patientId, patientId));
}

export async function createAppointmentType(name: string, durationMinutes: number, professionalId?: string, data: Partial<typeof appointmentTypes.$inferInsert> = {}) {
  // If no professionalId provided, create one
  let profId = professionalId;
  if (!profId) {
    const prof = await createProfessional();
    profId = prof.id;
  }
  
  const [apptType] = await testDb.insert(appointmentTypes).values({
    professionalId: profId,
    name,
    durationMinutes,
    price: '50.00',
    ...data,
  }).returning();
  return apptType;
}

export async function createAppointment(data: Partial<typeof appointments.$inferInsert> & {
  professionalId: string;
  patientId: string;
  appointmentTypeId: string;
  startAt: Date;
  endAt: Date;
}) {
  const [appointment] = await testDb.insert(appointments).values({
    price: '50.00',
    ...data,
  }).returning();
  return appointment;
}

export async function createBono(professionalId: string, patientId: string, appointmentTypeId: string, data: Partial<typeof bonos.$inferInsert> = {}) {
  const [bono] = await testDb.insert(bonos).values({
    professionalId,
    patientId,
    appointmentTypeId,
    name: 'Test Bono',
    price: '200.00',
    totalSessions: 5,
    ...data,
  }).returning();
  return bono;
}

export async function createBlockedTime(professionalId: string, startAt: Date, endAt: Date) {
  const [blocked] = await testDb.insert(blockedTimes).values({
    professionalId,
    startAt,
    endAt,
  }).returning();
  return blocked;
}

/** `dayOfWeek` is Monday = 0 … Sunday = 6; times are `HH:MM`. */
export async function createWorkingSchedule(professionalId: string, dayOfWeek: number, startTime: string, endTime: string) {
  const [schedule] = await testDb.insert(workingSchedules).values({
    professionalId,
    dayOfWeek,
    startTime,
    endTime,
  }).returning();
  return schedule;
}

/**
 * The standard test week: every day 09:00–18:00, server local time.
 * Book at 18:00 or later (or before 09:00) to be outside it.
 */
export async function createWorkingWeek(professionalId: string) {
  await testDb.insert(workingSchedules).values(
    Array.from({ length: 7 }, (_, dayOfWeek) => ({ professionalId, dayOfWeek, startTime: '09:00', endTime: '18:00' })),
  );
}
