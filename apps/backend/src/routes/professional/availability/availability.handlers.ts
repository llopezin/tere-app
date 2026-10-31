import type { AppRouteHandler } from '../../../lib/types.js';
import type { GetAvailabilityRoute } from './availability.routes.js';
import { getProfileId } from '../../../middleware/auth.js';
import * as HttpStatusCodes from 'stoker/http-status-codes';
import * as availabilityService from '../../../services/availability.service.js';
import { assertAppointmentTypeOf } from '../../../services/ownership.service.js';

export const getAvailability: AppRouteHandler<GetAvailabilityRoute> = async (c) => {
  const profileId = getProfileId(c);
  const { appointment_type_id: appointmentTypeId, from, to } = c.req.valid('query');

  await assertAppointmentTypeOf(profileId, appointmentTypeId);

  const slots = await availabilityService.generateAvailableSlots(profileId, appointmentTypeId, new Date(from), new Date(to));
  return c.json({ slots }, HttpStatusCodes.OK);
};
