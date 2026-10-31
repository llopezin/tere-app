import type { AppRouteHandler } from '../../lib/types.js';
import type {
  ResetRoute,
  SeedProfessionalRoute,
  SeedPatientRoute,
  SeedAppointmentRoute,
} from './test.routes.js';
import { db } from '../../db/index.js';
import { sql, eq } from 'drizzle-orm';
import { professionals } from '../../db/schema/professionals.js';
import { patients } from '../../db/schema/patients.js';
import { appointmentTypes } from '../../db/schema/appointment-types.js';
import { workingSchedules } from '../../db/schema/working-schedules.js';
import { rgpdConsents } from '../../db/schema/rgpd-consents.js';
import { appointments } from '../../db/schema/appointments.js';
import { auth } from '../../lib/auth.js';
import * as HttpStatusCodes from 'stoker/http-status-codes';

export const reset: AppRouteHandler<ResetRoute> = async (c) => {
  await db.execute(sql`TRUNCATE TABLE bono_transactions CASCADE`);
  await db.execute(sql`TRUNCATE TABLE appointments CASCADE`);
  await db.execute(sql`TRUNCATE TABLE invoices CASCADE`);
  await db.execute(sql`TRUNCATE TABLE payments CASCADE`);
  await db.execute(sql`TRUNCATE TABLE bonos CASCADE`);
  await db.execute(sql`TRUNCATE TABLE blocked_times CASCADE`);
  await db.execute(sql`TRUNCATE TABLE working_schedules CASCADE`);
  await db.execute(sql`TRUNCATE TABLE appointment_types CASCADE`);
  await db.execute(sql`TRUNCATE TABLE rgpd_consents CASCADE`);
  await db.execute(sql`TRUNCATE TABLE patient_billing_data CASCADE`);
  await db.execute(sql`TRUNCATE TABLE patients CASCADE`);
  await db.execute(sql`TRUNCATE TABLE professionals CASCADE`);
  await db.execute(sql`TRUNCATE TABLE account CASCADE`);
  await db.execute(sql`TRUNCATE TABLE session CASCADE`);
  await db.execute(sql`TRUNCATE TABLE verification CASCADE`);
  await db.execute(sql`TRUNCATE TABLE "user" CASCADE`);

  return c.body(null, HttpStatusCodes.NO_CONTENT);
};

export const seedProfessional: AppRouteHandler<SeedProfessionalRoute> = async (c) => {
  const { email, password, firstName, lastName } = c.req.valid('json');

  // Create the auth user via better-auth so databaseHooks.user.create.after fires
  const signUpResult = await auth.api.signUpEmail({
    body: {
      email,
      password,
      name: `${firstName} ${lastName}`.trim(),
      role: 'professional',
      firstName,
      lastName,
    },
    asResponse: false,
  });

  if (!signUpResult?.user) {
    throw new Error('Failed to create professional user');
  }

  const userId = signUpResult.user.id;

  // The hook should have already created the professional row. Fetch it.
  const [professional] = await db.select()
    .from(professionals)
    .where(eq(professionals.authUserId, userId));

  if (!professional) {
    throw new Error('Professional profile not created by hook');
  }

  // Create a default appointment type
  const [appointmentType] = await db.insert(appointmentTypes).values({
    professionalId: professional.id,
    name: 'Sesión estándar',
    durationMinutes: 45,
    price: '50.00',
  }).returning();

  // Create working schedules Mon–Fri 09:00–18:00
  // day_of_week: 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday
  await db.insert(workingSchedules).values([1, 2, 3, 4, 5].map((day) => ({
    professionalId: professional.id,
    dayOfWeek: day,
    startTime: '09:00',
    endTime: '18:00',
  })));

  return c.json(
    {
      userId,
      professionalId: professional.id,
      appointmentTypeId: appointmentType.id,
    },
    HttpStatusCodes.CREATED,
  );
};

export const seedPatient: AppRouteHandler<SeedPatientRoute> = async (c) => {
  const { email, password, firstName, lastName, phone, signRgpd } = c.req.valid('json');

  const signUpResult = await auth.api.signUpEmail({
    body: {
      email,
      password,
      name: `${firstName} ${lastName}`.trim(),
      role: 'patient',
      firstName,
      lastName,
      phone,
    },
    asResponse: false,
  });

  if (!signUpResult?.user) {
    throw new Error('Failed to create patient user');
  }

  const userId = signUpResult.user.id;

  const [patient] = await db.select()
    .from(patients)
    .where(eq(patients.authUserId, userId));

  if (!patient) {
    throw new Error('Patient profile not created by hook');
  }

  if (signRgpd) {
    // Mark RGPD consent as signed
    const [existing] = await db.select().from(rgpdConsents)
      .where(eq(rgpdConsents.patientId, patient.id));

    if (existing) {
      await db.update(rgpdConsents)
        .set({ signed: true, signatureData: 'test_seed', signedAt: new Date(), ipAddress: '127.0.0.1' })
        .where(eq(rgpdConsents.patientId, patient.id));
    } else {
      await db.insert(rgpdConsents).values({
        patientId: patient.id,
        signed: true,
        signatureData: 'test_seed',
        signedAt: new Date(),
        ipAddress: '127.0.0.1',
      });
    }
  }

  return c.json(
    { userId, patientId: patient.id },
    HttpStatusCodes.CREATED,
  );
};

export const seedAppointment: AppRouteHandler<SeedAppointmentRoute> = async (c) => {
  const { patientEmail, professionalEmail, appointmentTypeId, startAt, status } = c.req.valid('json');

  const [patient] = await db.select().from(patients).where(eq(patients.email, patientEmail));
  if (!patient) throw new Error(`Patient with email ${patientEmail} not found`);

  const [professional] = await db.select().from(professionals).where(eq(professionals.email, professionalEmail));
  if (!professional) throw new Error(`Professional with email ${professionalEmail} not found`);

  const [apptType] = await db.select().from(appointmentTypes).where(eq(appointmentTypes.id, appointmentTypeId));
  if (!apptType) throw new Error(`Appointment type ${appointmentTypeId} not found`);

  const startDate = new Date(startAt);
  const endDate = new Date(startDate.getTime() + apptType.durationMinutes * 60 * 1000);

  const [appointment] = await db.insert(appointments).values({
    professionalId: professional.id,
    patientId: patient.id,
    appointmentTypeId: apptType.id,
    startAt: startDate,
    endAt: endDate,
    status: status ?? 'scheduled',
    price: apptType.price,
  }).returning();

  return c.json(
    {
      id: appointment.id,
      professionalId: appointment.professionalId,
      patientId: appointment.patientId,
      appointmentTypeId: appointment.appointmentTypeId,
      startAt: appointment.startAt.toISOString(),
      endAt: appointment.endAt.toISOString(),
      status: appointment.status,
      price: appointment.price,
    },
    HttpStatusCodes.CREATED,
  );
};
