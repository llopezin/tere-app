import { createRouter } from '../../../lib/create-app.js';
import * as routes from './booking.routes.js';
import * as handlers from './booking.handlers.js';

const router = createRouter()
  .openapi(routes.listProfessionals, handlers.listProfessionals)
  .openapi(routes.listAppointmentTypes, handlers.listAppointmentTypes)
  .openapi(routes.getAvailability, handlers.getAvailability);

export default router;
