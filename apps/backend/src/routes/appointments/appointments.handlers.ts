import type { AppRouteHandler } from '../../lib/types.js';
import type {
  ListRoute,
  CreateRoute,
  BatchRoute,
  RecurringRoute,
  GetOneRoute,
  UpdateRoute,
  CancelRoute,
  CompleteRoute,
  NoShowRoute,
} from './appointments.routes.js';
import { db } from '../../db/index.js';
import { appointments } from '../../db/schema/appointments.js';
import { appointmentTypes } from '../../db/schema/appointment-types.js';
import { eq, and, sql } from 'drizzle-orm';
import { getProfileId } from '../../middleware/auth.js';
import { AppError } from '../../middleware/error-handler.js';
import * as HttpStatusCodes from 'stoker/http-status-codes';
import * as appointmentService from '../../services/appointment.service.js';
import * as gcalSync from '../../services/google-calendar/sync.js';

// --- Handlers ---

export const list: AppRouteHandler<ListRoute> = async (c) => {
  const profileId = getProfileId(c);
  const { page, per_page, from, to, status, patient_id: patientId } = c.req.valid('query');
  const conditions = [eq(appointments.professionalId, profileId)];
  if (from) conditions.push(sql`${appointments.startAt} >= ${from}`);
  if (to) conditions.push(sql`${appointments.startAt} <= ${to}`);
  if (status) conditions.push(eq(appointments.status, status as any));
  if (patientId) conditions.push(eq(appointments.patientId, patientId));
  const results = await db.select().from(appointments)
    .where(and(...conditions))
    .orderBy(appointments.startAt)
    .limit(per_page)
    .offset((page - 1) * per_page);
  return c.json({ data: results, page, per_page }, HttpStatusCodes.OK);
};

export const create: AppRouteHandler<CreateRoute> = async (c) => {
  const user = c.get('user');
  const profileId = getProfileId(c);
  const body = c.req.valid('json');
  const professionalId = user.role === 'professional' ? profileId : undefined;

  const [apptType] = await db.select().from(appointmentTypes).where(eq(appointmentTypes.id, body.appointmentTypeId));
  if (!apptType) throw new AppError(404, 'Appointment type not found');

  const profId = professionalId || apptType.professionalId;
  const startAt = new Date(body.startAt);
  const endAt = new Date(startAt.getTime() + apptType.durationMinutes * 60 * 1000);

  await appointmentService.verifyRgpdConsent(body.patientId);
  await appointmentService.checkOverlap(profId, startAt, endAt);

  const result = await db.transaction(async (tx) => {
    return appointmentService.createSingleAppointment(tx, profId, {
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

  void gcalSync.push({ appointmentId: result.id, op: 'create' });

  return c.json(result, HttpStatusCodes.CREATED);
};

export const batch: AppRouteHandler<BatchRoute> = async (c) => {
  const profileId = getProfileId(c);
  const body = c.req.valid('json');

  const [apptType] = await db.select().from(appointmentTypes).where(eq(appointmentTypes.id, body.appointmentTypeId));
  if (!apptType) throw new AppError(404, 'Appointment type not found');

  await appointmentService.verifyRgpdConsent(body.patientId);

  const durationMs = apptType.durationMinutes * 60 * 1000;

  // Check all slots for overlaps
  for (const slot of body.slots) {
    const s = new Date(slot.startAt);
    const e = new Date(s.getTime() + durationMs);
    await appointmentService.checkOverlap(profileId, s, e);
  }

  const slots = body.slots.map((slot) => {
    const startAt = new Date(slot.startAt);
    return {
      startAt,
      endAt: new Date(startAt.getTime() + durationMs),
    };
  });

  const results = await appointmentService.createBatchAppointments(profileId, slots, {
    patientId: body.patientId,
    appointmentTypeId: body.appointmentTypeId,
    price: apptType.price,
    bonoId: body.bonoId,
    useBonoSession: body.useBonoSession ?? true,
  });

  for (const appt of results) {
    void gcalSync.push({ appointmentId: appt.id, op: 'create' });
  }

  return c.json({ data: results }, HttpStatusCodes.CREATED);
};

export const recurring: AppRouteHandler<RecurringRoute> = async (c) => {
  const profileId = getProfileId(c);
  const body = c.req.valid('json');

  const [apptType] = await db.select().from(appointmentTypes).where(eq(appointmentTypes.id, body.appointmentTypeId));
  if (!apptType) throw new AppError(404, 'Appointment type not found');

  await appointmentService.verifyRgpdConsent(body.patientId);

  const durationMs = apptType.durationMinutes * 60 * 1000;
  const startDate = new Date(body.startAt);

  // Generate dates to check for overlaps (must match service logic for all frequencies)
  const dates: Date[] = [];
  for (let i = 0; i < body.recurrenceRule.count; i++) {
    const date = new Date(startDate);
    switch (body.recurrenceRule.frequency) {
      case 'daily':
        date.setDate(date.getDate() + i);
        break;
      case 'weekly':
        date.setDate(date.getDate() + i * 7);
        break;
      case 'biweekly':
        date.setDate(date.getDate() + i * 14);
        break;
      case 'monthly':
        date.setMonth(date.getMonth() + i);
        break;
    }
    dates.push(date);
  }

  // Check all dates for overlaps
  for (const date of dates) {
    const e = new Date(date.getTime() + durationMs);
    await appointmentService.checkOverlap(profileId, date, e);
  }

  const result = await appointmentService.createRecurringAppointments(
    profileId,
    startDate,
    body.recurrenceRule.frequency,
    body.recurrenceRule.count,
    durationMs,
    {
      patientId: body.patientId,
      appointmentTypeId: body.appointmentTypeId,
      price: apptType.price,
      bonoId: body.bonoId,
      useBonoSession: body.useBonoSession ?? true,
    }
  );

  for (const appt of result.appointments) {
    void gcalSync.push({ appointmentId: appt.id, op: 'create' });
  }

  return c.json({ data: result.appointments, recurrence_group_id: result.recurrenceGroupId }, HttpStatusCodes.CREATED);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c) => {
  const user = c.get('user');
  const profileId = getProfileId(c);
  const { id } = c.req.valid('param');
  const conditions = [eq(appointments.id, id)];
  if (user.role === 'professional') conditions.push(eq(appointments.professionalId, profileId));
  else conditions.push(eq(appointments.patientId, profileId));
  const [appt] = await db.select().from(appointments).where(and(...conditions));
  if (!appt) throw new AppError(404, 'Appointment not found');
  return c.json(appt, HttpStatusCodes.OK);
};

export const update: AppRouteHandler<UpdateRoute> = async (c) => {
  const profileId = getProfileId(c);
  const { id } = c.req.valid('param');
  const body = c.req.valid('json');

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
    await appointmentService.checkOverlap(profileId, startAt, endAt, id);

    updateData.startAt = startAt;
    updateData.endAt = endAt;
  }
  if (body.appointmentTypeId) updateData.appointmentTypeId = body.appointmentTypeId;
  if (body.notes !== undefined) updateData.notes = body.notes;
  if (body.price !== undefined) updateData.price = body.price.toFixed(2);

  const [updated] = await db.update(appointments).set(updateData).where(eq(appointments.id, id)).returning();

  const needsGcalUpdate =
    body.startAt !== undefined ||
    body.appointmentTypeId !== undefined ||
    body.notes !== undefined;
  if (needsGcalUpdate) {
    void gcalSync.push({ appointmentId: id, op: 'update' });
  }

  return c.json(updated, HttpStatusCodes.OK);
};

export const cancel: AppRouteHandler<CancelRoute> = async (c) => {
  const user = c.get('user');
  const profileId = getProfileId(c);
  const { id } = c.req.valid('param');

  const conditions = [eq(appointments.id, id)];
  if (user.role === 'professional') conditions.push(eq(appointments.professionalId, profileId));
  else conditions.push(eq(appointments.patientId, profileId));

  const [appt] = await db.select().from(appointments).where(and(...conditions));
  if (!appt) throw new AppError(404, 'Appointment not found');

  const result = await appointmentService.cancelAppointment(id, appt);
  return c.json(result, HttpStatusCodes.OK);
};

export const complete: AppRouteHandler<CompleteRoute> = async (c) => {
  const profileId = getProfileId(c);
  const { id } = c.req.valid('param');
  const [updated] = await db.update(appointments)
    .set({ status: 'completed', updatedAt: new Date() })
    .where(and(eq(appointments.id, id), eq(appointments.professionalId, profileId)))
    .returning();
  if (!updated) throw new AppError(404, 'Appointment not found');
  return c.json(updated, HttpStatusCodes.OK);
};

export const noShow: AppRouteHandler<NoShowRoute> = async (c) => {
  const profileId = getProfileId(c);
  const { id } = c.req.valid('param');
  const [updated] = await db.update(appointments)
    .set({ status: 'no_show', updatedAt: new Date() })
    .where(and(eq(appointments.id, id), eq(appointments.professionalId, profileId)))
    .returning();
  if (!updated) throw new AppError(404, 'Appointment not found');
  return c.json(updated, HttpStatusCodes.OK);
};
