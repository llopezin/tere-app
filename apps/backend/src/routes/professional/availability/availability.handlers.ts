import type { AppRouteHandler } from '../../lib/types.js';
import type { GetAvailabilityRoute } from './availability.routes.js';
import { AppError } from '../../middleware/error-handler.js';
import * as HttpStatusCodes from 'stoker/http-status-codes';
import * as availabilityService from '../../services/availability.service.js';

export const getAvailability: AppRouteHandler<GetAvailabilityRoute> = async (c) => {
  const { professional_id: professionalId, appointment_type_id: appointmentTypeId, from, to } = c.req.valid('query');
  
  const fromDate = new Date(from);
  const toDate = new Date(to);
  
  try {
    const slots = await availabilityService.generateAvailableSlots(professionalId, appointmentTypeId, fromDate, toDate);
    return c.json({ slots }, HttpStatusCodes.OK);
  } catch (error) {
    if (error instanceof Error && error.message === 'Appointment type not found') {
      throw new AppError(404, error.message);
    }
    throw error;
  }
};
