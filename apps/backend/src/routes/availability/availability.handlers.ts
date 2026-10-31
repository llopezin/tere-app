import type { AppRouteHandler } from '../../lib/types.js';
import type { GetAvailabilityRoute } from './availability.routes.js';
import { AppError } from '../../middleware/error-handler.js';
import * as HttpStatusCodes from 'stoker/http-status-codes';
import * as availabilityService from '../../services/availability.service.js';
import { getBookingWindowEnd } from '../../lib/booking-window.js';

export const getAvailability: AppRouteHandler<GetAvailabilityRoute> = async (c) => {
  const { professional_id: professionalId, appointment_type_id: appointmentTypeId, from, to } = c.req.valid('query');
  
  const fromDate = new Date(from);
  let toDate = new Date(to);

  // Patients can only see slots inside the booking window; professionals are not limited.
  const isPatient = c.get('user').role === 'patient';
  const windowEnd = isPatient ? getBookingWindowEnd() : null;
  const bookingWindowEnd = windowEnd?.toISOString() ?? null;

  if (windowEnd) {
    if (fromDate > windowEnd) {
      return c.json({ slots: [], booking_window_end: bookingWindowEnd }, HttpStatusCodes.OK);
    }
    if (toDate > windowEnd) toDate = windowEnd;
  }

  try {
    let slots = await availabilityService.generateAvailableSlots(professionalId, appointmentTypeId, fromDate, toDate);
    // The service extends `to` to the end of the day in server time, so filter precisely.
    if (windowEnd) {
      slots = slots.filter((s) => new Date(s.start_at) <= windowEnd);
    }
    return c.json({ slots, booking_window_end: bookingWindowEnd }, HttpStatusCodes.OK);
  } catch (error) {
    if (error instanceof Error && error.message === 'Appointment type not found') {
      throw new AppError(404, error.message);
    }
    throw error;
  }
};
