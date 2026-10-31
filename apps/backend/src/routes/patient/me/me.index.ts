import { createRouter } from '../../lib/create-app.js';
import * as routes from './patient-profile.routes.js';
import * as handlers from './patient-profile.handlers.js';

const router = createRouter()
  .openapi(routes.getMe, handlers.getMe)
  .openapi(routes.updateMe, handlers.updateMe)
  .openapi(routes.getMyAppointments, handlers.getMyAppointments)
  .openapi(routes.getMyBillingData, handlers.getMyBillingData)
  .openapi(routes.upsertMyBillingData, handlers.upsertMyBillingData)
  .openapi(routes.getMyConsents, handlers.getMyConsents)
  .openapi(routes.getMyConsent, handlers.getMyConsent)
  .openapi(routes.signMyConsent, handlers.signMyConsent)
  .openapi(routes.getMyRgpdConsent, handlers.getMyRgpdConsent)
  .openapi(routes.acceptMyRgpdConsent, handlers.acceptMyRgpdConsent);

export default router;
