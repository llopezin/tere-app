import { createRouter } from '../../lib/create-app.js';
import * as routes from './patient-dashboard.routes.js';
import * as handlers from './patient-dashboard.handlers.js';

const router = createRouter()
  .openapi(routes.listProfessionals, handlers.listProfessionals);

export default router;
