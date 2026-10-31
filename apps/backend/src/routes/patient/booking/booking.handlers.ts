import { and, eq } from 'drizzle-orm';
import * as HttpStatusCodes from 'stoker/http-status-codes';
import type { AppRouteHandler } from '../../../lib/types.js';
import type { ListProfessionalsRoute, ListAppointmentTypesRoute, GetAvailabilityRoute } from './booking.routes.js';
import { db } from '../../../db/index.js';
import { professionals } from '../../../db/schema/professionals.js';
import { appointmentTypes } from '../../../db/schema/appointment-types.js';
import * as availabilityService from '../../../services/availability.service.js';
import { assertAppointmentTypeOf, assertProfessionalExists } from '../../../services/ownership.service.js';

export const listProfessionals: AppRouteHandler<ListProfessionalsRoute> = async (c) => {
  const data = await db.select({
    id: professionals.id,
    firstName: professionals.firstName,
    lastName: professionals.lastName,
    businessName: professionals.businessName,
  }).from(professionals).orderBy(professionals.lastName, professionals.firstName);
  return c.json({ data }, HttpStatusCodes.OK);
};

export const listAppointmentTypes: AppRouteHandler<ListAppointmentTypesRoute> = async (c) => {
  const { professionalId } = c.req.valid('param');
  await assertProfessionalExists(professionalId);
  const data = await db.select().from(appointmentTypes)
    .where(and(eq(appointmentTypes.professionalId, professionalId), eq(appointmentTypes.isActive, true)));
  return c.json({ data }, HttpStatusCodes.OK);
};

export const getAvailability: AppRouteHandler<GetAvailabilityRoute> = async (c) => {
  const { professional_id: professionalId, appointment_type_id: appointmentTypeId, from, to } = c.req.valid('query');

  // The appointment type must be an active one of that professional (it drives duration and price)
  await assertAppointmentTypeOf(professionalId, appointmentTypeId, { activeOnly: true });

  const slots = await availabilityService.generateAvailableSlots(professionalId, appointmentTypeId, new Date(from), new Date(to));
  return c.json({ slots }, HttpStatusCodes.OK);
};
