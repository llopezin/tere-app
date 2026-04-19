import { createRouter } from '../../lib/create-app.js';
import * as routes from './test.routes.js';
import * as handlers from './test.handlers.js';

const router = createRouter()
  .openapi(routes.reset, handlers.reset)
  .openapi(routes.seedProfessional, handlers.seedProfessional)
  .openapi(routes.seedPatient, handlers.seedPatient)
  .openapi(routes.seedAppointment, handlers.seedAppointment);

export default router;
