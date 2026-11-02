import { and, eq } from 'drizzle-orm';
import * as HttpStatusCodes from 'stoker/http-status-codes';
import type { AppRouteHandler } from '../../../lib/types.js';
import type { ListProfessionalsRoute, ListAppointmentTypesRoute, GetAvailabilityRoute } from './booking.routes.js';
import { db } from '../../../db/index.js';
import { professionals } from '../../../db/schema/professionals.js';
import { appointmentTypes } from '../../../db/schema/appointment-types.js';
import * as availabilityService from '../../../services/availability.service.js';
import { assertAppointmentTypeOf, assertProfessionalExists } from '../../../services/ownership.service.js';
import { getBookingWindowEnd, getClinicToday, toClinicDate } from '../../../lib/booking-window.js';

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

  await assertAppointmentTypeOf(professionalId, appointmentTypeId, { activeOnly: true });

  // Patients only see slots inside the booking window (today → windowEnd).
  // If the clipped range is empty the service returns no slots.
  const windowEnd = getBookingWindowEnd();
  const today = getClinicToday();
  const fromDate = new Date(from < today ? today : from);
  const toDate = new Date(to) > windowEnd ? windowEnd : new Date(to);

  const slots = await availabilityService.generateAvailableSlots(professionalId, appointmentTypeId, fromDate, toDate);
  return c.json({
    // The service extends `to` to the end of the day in server time, so filter precisely.
    slots: slots.filter((s) => new Date(s.start_at) <= windowEnd),
    booking_window_last_day: toClinicDate(windowEnd),
  }, HttpStatusCodes.OK);
};
