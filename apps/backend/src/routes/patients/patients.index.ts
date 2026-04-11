import { createRouter } from '../../lib/create-app.js';
import * as routes from './patients.routes.js';
import * as handlers from './patients.handlers.js';

const router = createRouter()
  .openapi(routes.list, handlers.list)
  .openapi(routes.create, handlers.create)
  .openapi(routes.getOne, handlers.getOne)
  .openapi(routes.update, handlers.update)
  .openapi(routes.getAppointments, handlers.getAppointments)
  .openapi(routes.getBonos, handlers.getBonos)
  .openapi(routes.getPayments, handlers.getPayments)
  .openapi(routes.getBillingData, handlers.getBillingData)
  .openapi(routes.upsertBillingData, handlers.upsertBillingData)
  .openapi(routes.getRgpdConsent, handlers.getRgpdConsent)
  .openapi(routes.submitRgpdConsent, handlers.submitRgpdConsent)
  .openapi(routes.getContactLink, handlers.getContactLink)
  .openapi(routes.assignConsent, handlers.assignConsent)
  .openapi(routes.getConsents, handlers.getConsents);

export default router;
