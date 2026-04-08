import { db } from '../db/index.js';
import { appointments } from '../db/schema/appointments.js';
import { rgpdConsents } from '../db/schema/rgpd-consents.js';
import { bonos } from '../db/schema/bonos.js';
import { bonoTransactions } from '../db/schema/bono-transactions.js';
import { blockedTimes } from '../db/schema/blocked-times.js';
import { eq, and, ne, sql } from 'drizzle-orm';
import { AppError } from '../middleware/error-handler.js';

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface CreateAppointmentData {
  patientId: string;
  appointmentTypeId: string;
  startAt: Date;
  endAt: Date;
  price: string;
  notes?: string;
  bonoId?: string | null;
  useBonoSession: boolean;
  recurrenceGroupId?: string;
}

/**
 * Verifies that a patient has signed RGPD consent
 * @throws {AppError} 403 if consent not signed
 */
export async function verifyRgpdConsent(patientId: string): Promise<void> {
  const [consent] = await db.select().from(rgpdConsents)
    .where(and(eq(rgpdConsents.patientId, patientId), eq(rgpdConsents.signed, true)));
  if (!consent) throw new AppError(403, 'Patient must sign RGPD consent before booking');
}

/**
 * Checks if a time slot overlaps with existing appointments or blocked times
 * @throws {AppError} 409 if overlap detected
 */
export async function checkOverlap(
  professionalId: string,
  startAt: Date,
  endAt: Date,
  excludeId?: string
): Promise<void> {
  const conditions = [
    eq(appointments.professionalId, professionalId),
    ne(appointments.status, 'cancelled'),
    sql`${appointments.startAt} < ${endAt.toISOString()}`,
    sql`${appointments.endAt} > ${startAt.toISOString()}`,
  ];
  if (excludeId) conditions.push(ne(appointments.id, excludeId));

  const overlapping = await db.select({ id: appointments.id })
    .from(appointments)
    .where(and(...conditions))
    .limit(1);
  if (overlapping.length > 0) {
    throw new AppError(409, 'Time slot overlaps with an existing appointment');
  }

  const overlappingBlocked = await db.select({ id: blockedTimes.id })
    .from(blockedTimes)
    .where(and(
      eq(blockedTimes.professionalId, professionalId),
      sql`${blockedTimes.startAt} < ${endAt.toISOString()}`,
      sql`${blockedTimes.endAt} > ${startAt.toISOString()}`,
    ))
    .limit(1);
  if (overlappingBlocked.length > 0) {
    throw new AppError(409, 'Time slot overlaps with a blocked time');
  }
}

/**
 * Deducts a session from a bono within a transaction
 * @throws {AppError} 404 if bono not found, 400 if bono exhausted
 */
export async function deductBonoSession(
  tx: Transaction,
  bonoId: string,
  appointmentId: string
): Promise<void> {
  const [bono] = await tx.select().from(bonos).where(eq(bonos.id, bonoId));
  if (!bono) throw new AppError(404, 'Bono not found');
  if (bono.status === 'exhausted') throw new AppError(400, 'Bono is exhausted');
  if (bono.sessionsUsed >= bono.totalSessions) {
    throw new AppError(400, 'Bono has no remaining sessions');
  }

  const newUsed = bono.sessionsUsed + 1;
  await tx.update(bonos).set({
    sessionsUsed: newUsed,
    status: newUsed >= bono.totalSessions ? 'exhausted' : 'active',
    updatedAt: new Date(),
  }).where(eq(bonos.id, bonoId));

  await tx.insert(bonoTransactions).values({
    bonoId,
    appointmentId,
    type: 'deduction',
  });
}

/**
 * Refunds a bono session when an appointment is cancelled
 */
export async function refundBonoSession(
  tx: Transaction,
  bonoId: string,
  appointmentId: string
): Promise<void> {
  const [bono] = await tx.select().from(bonos).where(eq(bonos.id, bonoId));
  if (bono && bono.sessionsUsed > 0) {
    await tx.update(bonos).set({
      sessionsUsed: bono.sessionsUsed - 1,
      status: 'active',
      updatedAt: new Date(),
    }).where(eq(bonos.id, bonoId));

    await tx.insert(bonoTransactions).values({
      bonoId,
      appointmentId,
      type: 'refund',
    });
  }
}

/**
 * Creates a single appointment within a transaction
 */
export async function createSingleAppointment(
  tx: Transaction,
  professionalId: string,
  data: CreateAppointmentData
) {
  const [appt] = await tx.insert(appointments).values({
    professionalId,
    patientId: data.patientId,
    appointmentTypeId: data.appointmentTypeId,
    startAt: data.startAt,
    endAt: data.endAt,
    price: data.price,
    notes: data.notes,
    bonoId: data.bonoId || null,
    useBonoSession: data.useBonoSession,
    recurrenceGroupId: data.recurrenceGroupId || null,
  }).returning();

  if (data.bonoId && data.useBonoSession) {
    await deductBonoSession(tx, data.bonoId, appt.id);
  }

  return appt;
}

/**
 * Creates multiple appointments in batch within a transaction
 */
export async function createBatchAppointments(
  professionalId: string,
  slots: { startAt: Date; endAt: Date }[],
  data: Omit<CreateAppointmentData, 'startAt' | 'endAt'>
): Promise<any[]> {
  return db.transaction(async (tx) => {
    const created = [];
    for (const slot of slots) {
      const appt = await createSingleAppointment(tx, professionalId, {
        ...data,
        startAt: slot.startAt,
        endAt: slot.endAt,
      });
      created.push(appt);
    }
    return created;
  });
}

/**
 * Creates recurring appointments within a transaction
 */
export async function createRecurringAppointments(
  professionalId: string,
  startDate: Date,
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly',
  count: number,
  durationMs: number,
  data: Omit<CreateAppointmentData, 'startAt' | 'endAt' | 'recurrenceGroupId'>
): Promise<{ appointments: any[]; recurrenceGroupId: string }> {
  const recurrenceGroupId = crypto.randomUUID();

  // Generate dates
  const dates: Date[] = [];
  for (let i = 0; i < count; i++) {
    const date = new Date(startDate);
    if (frequency === 'weekly') {
      date.setDate(date.getDate() + i * 7);
    } else if (frequency === 'daily') {
      date.setDate(date.getDate() + i);
    } else if (frequency === 'biweekly') {
      date.setDate(date.getDate() + i * 14);
    } else if (frequency === 'monthly') {
      date.setMonth(date.getMonth() + i);
    }
    dates.push(date);
  }

  const created = await db.transaction(async (tx) => {
    const results = [];
    for (const date of dates) {
      const endAt = new Date(date.getTime() + durationMs);
      const appt = await createSingleAppointment(tx, professionalId, {
        ...data,
        startAt: date,
        endAt,
        recurrenceGroupId,
      });
      results.push(appt);
    }
    return results;
  });

  return {
    appointments: created,
    recurrenceGroupId,
  };
}

/**
 * Cancels an appointment and refunds bono session if applicable
 */
export async function cancelAppointment(
  appointmentId: string,
  appointment: any
): Promise<any> {
  if (new Date(appointment.startAt) <= new Date()) {
    throw new AppError(400, 'Cannot cancel an appointment that has already started or passed');
  }

  return db.transaction(async (tx) => {
    const [updated] = await tx.update(appointments)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(eq(appointments.id, appointmentId))
      .returning();

    if (appointment.bonoId && appointment.useBonoSession) {
      await refundBonoSession(tx, appointment.bonoId, appointmentId);
    }

    return updated;
  });
}
