import { eq, sql } from 'drizzle-orm';
import * as HttpStatusCodes from 'stoker/http-status-codes';
import type { AppRouteHandler } from '../../lib/types.js';
import type { ResetRoute, SeedProfessionalRoute, SeedPatientRoute, SeedAppointmentRoute } from './test.routes.js';
import { db } from '../../db/index.js';
import { patients } from '../../db/schema/patients.js';
import { appointmentTypes } from '../../db/schema/appointment-types.js';
import { workingSchedules } from '../../db/schema/working-schedules.js';
import { rgpdConsents } from '../../db/schema/rgpd-consents.js';
import { appointments } from '../../db/schema/appointments.js';
import { auth } from '../../lib/auth.js';
import { createProfessionalAccount } from '../../services/professional-account.service.js';

const WEEKDAYS = [1, 2, 3, 4, 5];

// Every other table references "user" (directly or transitively), so CASCADE empties them all
export const reset: AppRouteHandler<ResetRoute> = async (c) => {
  await db.execute(sql`TRUNCATE TABLE "user", verification CASCADE`);
  return c.body(null, HttpStatusCodes.NO_CONTENT);
};

export const seedProfessional: AppRouteHandler<SeedProfessionalRoute> = async (c) => {
  const { professional } = await createProfessionalAccount(c.req.valid('json'));

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

  return c.json({ professionalId: professional.id, appointmentTypeId: appointmentType.id }, HttpStatusCodes.CREATED);
};

export const seedPatient: AppRouteHandler<SeedPatientRoute> = async (c) => {
  const { signRgpd, ...patient } = c.req.valid('json');

  // Same path as the public sign-up, so the patient profile is created by the auth hook
  const { user } = await auth.api.signUpEmail({
    body: { ...patient, name: `${patient.firstName} ${patient.lastName}` },
  });
  const [{ id: patientId }] = await db.select({ id: patients.id }).from(patients).where(eq(patients.authUserId, user.id));

  if (signRgpd) {
    await db.insert(rgpdConsents).values({ patientId, signed: true, signatureData: 'test_seed', signedAt: new Date() });
  }

  return c.json({ patientId }, HttpStatusCodes.CREATED);
};

export const seedAppointment: AppRouteHandler<SeedAppointmentRoute> = async (c) => {
  const { patientId, appointmentTypeId, startAt, status } = c.req.valid('json');

  const [type] = await db.select().from(appointmentTypes).where(eq(appointmentTypes.id, appointmentTypeId));
  const start = new Date(startAt);

  const [appointment] = await db.insert(appointments).values({
    professionalId: type.professionalId,
    patientId,
    appointmentTypeId,
    startAt: start,
    endAt: new Date(start.getTime() + type.durationMinutes * 60_000),
    status,
    price: type.price,
  }).returning({ id: appointments.id });

  return c.json(appointment, HttpStatusCodes.CREATED);
};
