import { and, eq } from 'drizzle-orm';
import * as HttpStatusCodes from 'stoker/http-status-codes';
import type { AppRouteHandler } from '../../../lib/types.js';
import type { ListRoute, CreateRoute, GetOneRoute, CancelRoute } from './appointments.routes.js';
import { db } from '../../../db/index.js';
import { appointments } from '../../../db/schema/appointments.js';
import { appointmentTypes } from '../../../db/schema/appointment-types.js';
import { getProfileId } from '../../../middleware/auth.js';
import { AppError } from '../../../middleware/error-handler.js';
import * as appointmentService from '../../../services/appointment.service.js';
import * as gcalSync from '../../../services/google-calendar/sync.js';
import { assertAppointmentOf, assertBonoOf, linkPatientToProfessional } from '../../../services/ownership.service.js';

export const list: AppRouteHandler<ListRoute> = async (c) => {
  const patientId = getProfileId(c);
  const { page, per_page } = c.req.valid('query');

  const results = await db.select().from(appointments)
    .where(eq(appointments.patientId, patientId))
    .orderBy(appointments.startAt)
    .limit(per_page).offset((page - 1) * per_page);

  return c.json({ data: results, page, per_page }, HttpStatusCodes.OK);
};

export const create: AppRouteHandler<CreateRoute> = async (c) => {
  const patientId = getProfileId(c);
  const body = c.req.valid('json');

  // The professional is the owner of the (active) appointment type
  const [apptType] = await db.select().from(appointmentTypes)
    .where(and(eq(appointmentTypes.id, body.appointmentTypeId), eq(appointmentTypes.isActive, true)));
  if (!apptType) throw new AppError(404, 'Appointment type not found');
  const professionalId = apptType.professionalId;

  // A bono can only be used by its patient, with the professional that issued it
  if (body.bonoId) {
    await assertBonoOf({ professionalId, patientId, appointmentTypeId: body.appointmentTypeId }, body.bonoId);
  }

  const startAt = new Date(body.startAt);
  const endAt = new Date(startAt.getTime() + apptType.durationMinutes * 60 * 1000);

  await appointmentService.verifyRgpdConsent(patientId);
  await appointmentService.checkOverlap(professionalId, startAt, endAt);

  const result = await db.transaction(async (tx) => {
    const appt = await appointmentService.createSingleAppointment(tx, professionalId, {
      patientId,
      appointmentTypeId: body.appointmentTypeId,
      startAt,
      endAt,
      price: apptType.price,
      notes: body.notes,
      bonoId: body.bonoId,
      useBonoSession: body.useBonoSession ?? true,
    });
    // Booking makes the patient one of this professional's patients
    await linkPatientToProfessional(professionalId, patientId, tx);
    return appt;
  });

  void gcalSync.push({ appointmentId: result.id, op: 'create' });

  return c.json(result, HttpStatusCodes.CREATED);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c) => {
  const patientId = getProfileId(c);
  const { id } = c.req.valid('param');
  const appt = await assertAppointmentOf({ patientId }, id);
  return c.json(appt, HttpStatusCodes.OK);
};

export const cancel: AppRouteHandler<CancelRoute> = async (c) => {
  const patientId = getProfileId(c);
  const { id } = c.req.valid('param');
  const appt = await assertAppointmentOf({ patientId }, id);
  const result = await appointmentService.cancelAppointment(id, appt);
  return c.json(result, HttpStatusCodes.OK);
};
