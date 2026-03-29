import { Hono } from 'hono';
import { db } from '../db/index.js';
import { appointments } from '../db/schema/appointments.js';
import { appointmentTypes } from '../db/schema/appointment-types.js';
import { rgpdConsents } from '../db/schema/rgpd-consents.js';
import { bonos } from '../db/schema/bonos.js';
import { bonoTransactions } from '../db/schema/bono-transactions.js';
import { blockedTimes } from '../db/schema/blocked-times.js';
import { eq, and, ne, sql } from 'drizzle-orm';
import { authMiddleware, requireRole, getProfileId } from '../middleware/auth.js';
import { createAppointmentSchema, batchAppointmentSchema, recurringAppointmentSchema, updateAppointmentSchema, paginationSchema } from '../lib/validators.js';
import { AppError } from '../middleware/error-handler.js';
import { randomUUID } from 'crypto';

const appointmentRoutes = new Hono();

appointmentRoutes.use('*', authMiddleware);

// Helper: verify RGPD consent
async function verifyRgpdConsent(patientId: string) {
  const [consent] = await db.select().from(rgpdConsents)
    .where(and(eq(rgpdConsents.patientId, patientId), eq(rgpdConsents.signed, true)));
  if (!consent) {
    throw new AppError(403, 'Patient must sign RGPD consent before booking');
  }
}

// Helper: check overlap with appointments and blocked times
async function checkOverlap(professionalId: string, startAt: Date, endAt: Date, excludeId?: string) {
  const conditions = [
    eq(appointments.professionalId, professionalId),
    ne(appointments.status, 'cancelled'),
    sql`${appointments.startAt} < ${endAt.toISOString()}`,
    sql`${appointments.endAt} > ${startAt.toISOString()}`,
  ];
  if (excludeId) {
    conditions.push(ne(appointments.id, excludeId));
  }

  const overlapping = await db.select({ id: appointments.id }).from(appointments)
    .where(and(...conditions)).limit(1);
  if (overlapping.length > 0) {
    throw new AppError(409, 'Time slot overlaps with an existing appointment');
  }

  const overlappingBlocked = await db.select({ id: blockedTimes.id }).from(blockedTimes)
    .where(and(
      eq(blockedTimes.professionalId, professionalId),
      sql`${blockedTimes.startAt} < ${endAt.toISOString()}`,
      sql`${blockedTimes.endAt} > ${startAt.toISOString()}`
    )).limit(1);
  if (overlappingBlocked.length > 0) {
    throw new AppError(409, 'Time slot overlaps with a blocked time');
  }
}

// Helper: deduct bono session
async function deductBonoSession(tx: any, bonoId: string, appointmentId: string) {
  const [bono] = await tx.select().from(bonos).where(eq(bonos.id, bonoId));
  if (!bono) throw new AppError(404, 'Bono not found');
  if (bono.status === 'exhausted') throw new AppError(400, 'Bono is exhausted');
  if (bono.sessionsUsed >= bono.totalSessions) throw new AppError(400, 'Bono has no remaining sessions');

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

// Helper: create single appointment in transaction
async function createSingleAppointment(
  tx: any,
  professionalId: string,
  data: {
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

// GET /appointments
appointmentRoutes.get('/', requireRole('professional'), async (c) => {
  const profileId = getProfileId(c);
  const { page, per_page } = paginationSchema.parse(c.req.query());
  const from = c.req.query('from');
  const to = c.req.query('to');
  const status = c.req.query('status');
  const patientId = c.req.query('patient_id');

  const conditions = [eq(appointments.professionalId, profileId)];
  if (from) conditions.push(sql`${appointments.startAt} >= ${from}`);
  if (to) conditions.push(sql`${appointments.startAt} <= ${to}`);
  if (status) conditions.push(eq(appointments.status, status as any));
  if (patientId) conditions.push(eq(appointments.patientId, patientId));

  const results = await db.select().from(appointments)
    .where(and(...conditions))
    .orderBy(appointments.startAt)
    .limit(per_page).offset((page - 1) * per_page);

  return c.json({ data: results, page, per_page });
});

// POST /appointments — single
appointmentRoutes.post('/', async (c) => {
  const user = c.get('user');
  const profileId = getProfileId(c);
  const body = createAppointmentSchema.parse(await c.req.json());

  const professionalId = user.role === 'professional' ? profileId : undefined;

  // Get appointment type
  const [apptType] = await db.select().from(appointmentTypes)
    .where(eq(appointmentTypes.id, body.appointmentTypeId));
  if (!apptType) throw new AppError(404, 'Appointment type not found');

  const profId = professionalId || apptType.professionalId;
  const startAt = new Date(body.startAt);
  const endAt = new Date(startAt.getTime() + apptType.durationMinutes * 60 * 1000);

  await verifyRgpdConsent(body.patientId);
  await checkOverlap(profId, startAt, endAt);

  const result = await db.transaction(async (tx) => {
    return createSingleAppointment(tx, profId, {
      patientId: body.patientId,
      appointmentTypeId: body.appointmentTypeId,
      startAt,
      endAt,
      price: apptType.price,
      notes: body.notes,
      bonoId: body.bonoId,
      useBonoSession: body.useBonoSession ?? true,
    });
  });

  return c.json(result, 201);
});

// POST /appointments/batch
appointmentRoutes.post('/batch', requireRole('professional'), async (c) => {
  const profileId = getProfileId(c);
  const body = batchAppointmentSchema.parse(await c.req.json());

  const [apptType] = await db.select().from(appointmentTypes)
    .where(eq(appointmentTypes.id, body.appointmentTypeId));
  if (!apptType) throw new AppError(404, 'Appointment type not found');

  await verifyRgpdConsent(body.patientId);

  const durationMs = apptType.durationMinutes * 60 * 1000;

  // Pre-validate all slots
  for (const slot of body.slots) {
    const startAt = new Date(slot.startAt);
    const endAt = new Date(startAt.getTime() + durationMs);
    await checkOverlap(profileId, startAt, endAt);
  }

  const results = await db.transaction(async (tx) => {
    const created = [];
    for (const slot of body.slots) {
      const startAt = new Date(slot.startAt);
      const endAt = new Date(startAt.getTime() + durationMs);
      const appt = await createSingleAppointment(tx, profileId, {
        patientId: body.patientId,
        appointmentTypeId: body.appointmentTypeId,
        startAt,
        endAt,
        price: apptType.price,
        notes: undefined,
        bonoId: body.bonoId,
        useBonoSession: body.useBonoSession ?? true,
      });
      created.push(appt);
    }
    return created;
  });

  return c.json({ data: results }, 201);
});

// POST /appointments/recurring
appointmentRoutes.post('/recurring', requireRole('professional'), async (c) => {
  const profileId = getProfileId(c);
  const body = recurringAppointmentSchema.parse(await c.req.json());

  const [apptType] = await db.select().from(appointmentTypes)
    .where(eq(appointmentTypes.id, body.appointmentTypeId));
  if (!apptType) throw new AppError(404, 'Appointment type not found');

  await verifyRgpdConsent(body.patientId);

  const durationMs = apptType.durationMinutes * 60 * 1000;
  const recurrenceGroupId = randomUUID();

  // Generate dates
  const dates: Date[] = [];
  const startDate = new Date(body.startAt);
  for (let i = 0; i < body.recurrenceRule.count; i++) {
    const date = new Date(startDate);
    if (body.recurrenceRule.frequency === 'weekly') {
      date.setDate(date.getDate() + i * 7 * body.recurrenceRule.interval);
    }
    dates.push(date);
  }

  // Pre-validate all slots
  for (const date of dates) {
    const endAt = new Date(date.getTime() + durationMs);
    await checkOverlap(profileId, date, endAt);
  }

  const results = await db.transaction(async (tx) => {
    const created = [];
    for (const date of dates) {
      const endAt = new Date(date.getTime() + durationMs);
      const appt = await createSingleAppointment(tx, profileId, {
        patientId: body.patientId,
        appointmentTypeId: body.appointmentTypeId,
        startAt: date,
        endAt,
        price: apptType.price,
        bonoId: body.bonoId,
        useBonoSession: body.useBonoSession ?? true,
        recurrenceGroupId,
      });
      created.push(appt);
    }
    return created;
  });

  return c.json({ data: results, recurrence_group_id: recurrenceGroupId }, 201);
});

// GET /appointments/:id
appointmentRoutes.get('/:id', async (c) => {
  const user = c.get('user');
  const profileId = getProfileId(c);
  const { id } = c.req.param();

  const conditions = [eq(appointments.id, id)];
  if (user.role === 'professional') {
    conditions.push(eq(appointments.professionalId, profileId));
  } else {
    conditions.push(eq(appointments.patientId, profileId));
  }

  const [appt] = await db.select().from(appointments).where(and(...conditions));
  if (!appt) throw new AppError(404, 'Appointment not found');
  return c.json(appt);
});

// PUT /appointments/:id
appointmentRoutes.put('/:id', requireRole('professional'), async (c) => {
  const profileId = getProfileId(c);
  const { id } = c.req.param();
  const body = updateAppointmentSchema.parse(await c.req.json());

  const [existing] = await db.select().from(appointments)
    .where(and(eq(appointments.id, id), eq(appointments.professionalId, profileId)));
  if (!existing) throw new AppError(404, 'Appointment not found');

  const updateData: Record<string, any> = { updatedAt: new Date() };

  if (body.startAt) {
    const apptTypeId = body.appointmentTypeId || existing.appointmentTypeId;
    const [apptType] = await db.select().from(appointmentTypes).where(eq(appointmentTypes.id, apptTypeId));
    if (!apptType) throw new AppError(404, 'Appointment type not found');

    const startAt = new Date(body.startAt);
    const endAt = new Date(startAt.getTime() + apptType.durationMinutes * 60 * 1000);
    await checkOverlap(profileId, startAt, endAt, id);
    updateData.startAt = startAt;
    updateData.endAt = endAt;
  }

  if (body.appointmentTypeId) updateData.appointmentTypeId = body.appointmentTypeId;
  if (body.notes !== undefined) updateData.notes = body.notes;
  if (body.price !== undefined) updateData.price = body.price.toFixed(2);

  const [updated] = await db.update(appointments)
    .set(updateData)
    .where(eq(appointments.id, id))
    .returning();

  return c.json(updated);
});

// PATCH /appointments/:id/cancel
appointmentRoutes.patch('/:id/cancel', async (c) => {
  const user = c.get('user');
  const profileId = getProfileId(c);
  const { id } = c.req.param();

  const conditions = [eq(appointments.id, id)];
  if (user.role === 'professional') {
    conditions.push(eq(appointments.professionalId, profileId));
  } else {
    conditions.push(eq(appointments.patientId, profileId));
  }

  const [appt] = await db.select().from(appointments).where(and(...conditions));
  if (!appt) throw new AppError(404, 'Appointment not found');

  if (new Date(appt.startAt) <= new Date()) {
    throw new AppError(400, 'Cannot cancel an appointment that has already started or passed');
  }

  const result = await db.transaction(async (tx) => {
    const [updated] = await tx.update(appointments)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(eq(appointments.id, id))
      .returning();

    // Refund bono session if applicable
    if (appt.bonoId && appt.useBonoSession) {
      const [bono] = await tx.select().from(bonos).where(eq(bonos.id, appt.bonoId));
      if (bono && bono.sessionsUsed > 0) {
        await tx.update(bonos).set({
          sessionsUsed: bono.sessionsUsed - 1,
          status: 'active',
          updatedAt: new Date(),
        }).where(eq(bonos.id, appt.bonoId));

        await tx.insert(bonoTransactions).values({
          bonoId: appt.bonoId,
          appointmentId: id,
          type: 'refund',
        });
      }
    }

    return updated;
  });

  return c.json(result);
});

// PATCH /appointments/:id/complete
appointmentRoutes.patch('/:id/complete', requireRole('professional'), async (c) => {
  const profileId = getProfileId(c);
  const { id } = c.req.param();

  const [updated] = await db.update(appointments)
    .set({ status: 'completed', updatedAt: new Date() })
    .where(and(eq(appointments.id, id), eq(appointments.professionalId, profileId)))
    .returning();

  if (!updated) throw new AppError(404, 'Appointment not found');
  return c.json(updated);
});

// PATCH /appointments/:id/no-show
appointmentRoutes.patch('/:id/no-show', requireRole('professional'), async (c) => {
  const profileId = getProfileId(c);
  const { id } = c.req.param();

  const [updated] = await db.update(appointments)
    .set({ status: 'no_show', updatedAt: new Date() })
    .where(and(eq(appointments.id, id), eq(appointments.professionalId, profileId)))
    .returning();

  if (!updated) throw new AppError(404, 'Appointment not found');
  return c.json(updated);
});

export default appointmentRoutes;
