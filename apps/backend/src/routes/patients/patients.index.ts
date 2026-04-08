import { createRouter } from '../../lib/create-app.js';
import * as routes from './patients.routes.js';
import * as handlers from './patients.handlers.js';

const router = createRouter();
router.openapi(routes.list, handlers.list);
router.openapi(routes.create, handlers.create);
router.openapi(routes.getOne, handlers.getOne);
router.openapi(routes.update, handlers.update);
router.openapi(routes.getAppointments, handlers.getAppointments);
router.openapi(routes.getBonos, handlers.getBonos);
router.openapi(routes.getPayments, handlers.getPayments);
router.openapi(routes.getBillingData, handlers.getBillingData);
router.openapi(routes.upsertBillingData, handlers.upsertBillingData);
router.openapi(routes.getRgpdConsent, handlers.getRgpdConsent);
router.openapi(routes.submitRgpdConsent, handlers.submitRgpdConsent);
router.openapi(routes.getContactLink, handlers.getContactLink);
router.openapi(routes.assignConsent, handlers.assignConsent);
router.openapi(routes.getConsents, handlers.getConsents);

export default router;
