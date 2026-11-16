import type { AppRouteHandler } from '../../../lib/types.js';
import type {
  CalendarListRoute,
  CreateRoute,
  BatchRoute,
  RecurringRoute,
  GetOneRoute,
  UpdateRoute,
  CancelRoute,
  CompleteRoute,
  NoShowRoute,
} from './appointments.routes.js';
import { db } from '../../../db/index.js';
import { appointments } from '../../../db/schema/appointments.js';
import { patients } from '../../../db/schema/patients.js';
import { appointmentTypes } from '../../../db/schema/appointment-types.js';
import { eq, and, ne, lt, gt, sql } from 'drizzle-orm';
import { getProfileId } from '../../../middleware/auth.js';
import { AppError } from '../../../middleware/error-handler.js';
import * as HttpStatusCodes from 'stoker/http-status-codes';
import * as appointmentService from '../../../services/appointment.service.js';
import * as gcalSync from '../../../services/google-calendar/sync.js';
import {
  assertPatientOfProfessional,
  assertAppointmentTypeOf,
  assertBonoOf,
  assertAppointmentOf,
} from '../../../services/ownership.service.js';

/**
 * Validates every foreign id of a booking request against the authenticated professional.
 * Returns the appointment type so callers can compute duration and price.
 */
async function validateBookingRefs(
  professionalId: string,
  body: { patientId: string; appointmentTypeId: string; bonoId?: string | null },
) {
  await assertPatientOfProfessional(professionalId, body.patientId);
  const apptType = await assertAppointmentTypeOf(professionalId, body.appointmentTypeId);
  if (body.bonoId) {
    await assertBonoOf({ professionalId, patientId: body.patientId, appointmentTypeId: body.appointmentTypeId }, body.bonoId);
  }
  return apptType;
}

/** complete / no-show: only a scheduled appointment can change to a final status. */
async function setFinalStatus(professionalId: string, id: string, status: 'completed' | 'no_show') {
  const [updated] = await db.update(appointments)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(appointments.id, id), eq(appointments.professionalId, professionalId), eq(appointments.status, 'scheduled')))
    .returning();
  if (updated) return updated;

  await assertAppointmentOf({ professionalId }, id);
  throw new AppError(409, 'Only scheduled appointments can change status');
}

export const calendarList: AppRouteHandler<CalendarListRoute> = async (c) => {
  const profileId = getProfileId(c);
  const { from, to } = c.req.valid('query');
  const data = await db
    .select({
      id: appointments.id,
      startAt: appointments.startAt,
      endAt: appointments.endAt,
      // Cancelled rows are filtered out below
      status: sql<'scheduled' | 'completed' | 'no_show'>`${appointments.status}`,
      patientName: sql<string>`${patients.firstName} || ' ' || ${patients.lastName}`,
      appointmentTypeName: appointmentTypes.name,
    })
    .from(appointments)
    .innerJoin(patients, eq(appointments.patientId, patients.id))
    .innerJoin(appointmentTypes, eq(appointments.appointmentTypeId, appointmentTypes.id))
    .where(and(
      eq(appointments.professionalId, profileId),
      ne(appointments.status, 'cancelled'),
      lt(appointments.startAt, new Date(to)),
      gt(appointments.endAt, new Date(from)),
    ))
    .orderBy(appointments.startAt);
  return c.json({ data }, HttpStatusCodes.OK);
};

export const create: AppRouteHandler<CreateRoute> = async (c) => {
  const profileId = getProfileId(c);
  const body = c.req.valid('json');

  const apptType = await validateBookingRefs(profileId, body);
  const startAt = new Date(body.startAt);
  const endAt = new Date(startAt.getTime() + apptType.durationMinutes * 60 * 1000);

  await appointmentService.verifyRgpdConsent(body.patientId);
  await appointmentService.checkOverlap(profileId, startAt, endAt);

  const result = await db.transaction(async (tx) => {
    return appointmentService.createSingleAppointment(tx, profileId, {
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

  const apptType = await validateBookingRefs(profileId, body);

  await appointmentService.verifyRgpdConsent(body.patientId);

  const durationMs = apptType.durationMinutes * 60 * 1000;
  const slots = body.slots.map((slot) => {
    const startAt = new Date(slot.startAt);
    return { startAt, endAt: new Date(startAt.getTime() + durationMs) };
  });
  for (const slot of slots) {
    await appointmentService.checkOverlap(profileId, slot.startAt, slot.endAt);
  }

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

  const apptType = await validateBookingRefs(profileId, body);

  await appointmentService.verifyRgpdConsent(body.patientId);

  const durationMs = apptType.durationMinutes * 60 * 1000;
  const startDate = new Date(body.startAt);

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
  const profileId = getProfileId(c);
  const { id } = c.req.valid('param');
  const [row] = await db
    .select({
      id: appointments.id,
      startAt: appointments.startAt,
      endAt: appointments.endAt,
      status: appointments.status,
      price: appointments.price,
      notes: appointments.notes,
      appointmentType: { id: appointmentTypes.id, name: appointmentTypes.name },
      patient: {
        id: patients.id,
        firstName: patients.firstName,
        lastName: patients.lastName,
        email: patients.email,
        phone: patients.phone,
        contactMethod: patients.contactMethod,
      },
    })
    .from(appointments)
    .innerJoin(patients, eq(appointments.patientId, patients.id))
    .innerJoin(appointmentTypes, eq(appointments.appointmentTypeId, appointmentTypes.id))
    .where(and(eq(appointments.id, id), eq(appointments.professionalId, profileId)));
  if (!row) throw new AppError(404, 'Appointment not found');
  return c.json(row, HttpStatusCodes.OK);
};

export const update: AppRouteHandler<UpdateRoute> = async (c) => {
  const profileId = getProfileId(c);
  const { id } = c.req.valid('param');
  const body = c.req.valid('json');

  const existing = await assertAppointmentOf({ professionalId: profileId }, id);
  // Re-sending the current type is not a change: the booked price and duration stay
  const { appointmentTypeId } = body;
  const newType = appointmentTypeId && appointmentTypeId !== existing.appointmentTypeId
    ? await assertAppointmentTypeOf(profileId, appointmentTypeId)
    : undefined;

  const updateData: Partial<typeof appointments.$inferInsert> = { updatedAt: new Date() };

  // Moving the appointment or changing its type both change its time slot
  if (body.startAt || newType) {
    const startAt = body.startAt ? new Date(body.startAt) : existing.startAt;
    const durationMs = newType
      ? newType.durationMinutes * 60 * 1000
      : existing.endAt.getTime() - existing.startAt.getTime();
    const endAt = new Date(startAt.getTime() + durationMs);
    await appointmentService.checkOverlap(profileId, startAt, endAt, id);

    updateData.startAt = startAt;
    updateData.endAt = endAt;
  }
  if (newType) {
    updateData.appointmentTypeId = newType.id;
    // A new type brings its current price unless the professional sets one explicitly
    updateData.price = newType.price;
  }
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
  const profileId = getProfileId(c);
  const { id } = c.req.valid('param');
  const appt = await assertAppointmentOf({ professionalId: profileId }, id);
  const result = await appointmentService.cancelAppointment(id, appt);
  return c.json(result, HttpStatusCodes.OK);
};

export const complete: AppRouteHandler<CompleteRoute> = async (c) => {
  const profileId = getProfileId(c);
  const { id } = c.req.valid('param');
  return c.json(await setFinalStatus(profileId, id, 'completed'), HttpStatusCodes.OK);
};

export const noShow: AppRouteHandler<NoShowRoute> = async (c) => {
  const profileId = getProfileId(c);
  const { id } = c.req.valid('param');
  return c.json(await setFinalStatus(profileId, id, 'no_show'), HttpStatusCodes.OK);
};
