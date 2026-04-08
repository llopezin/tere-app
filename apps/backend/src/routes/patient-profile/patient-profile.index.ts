import { createRouter } from '../../lib/create-app.js';
import * as routes from './patient-profile.routes.js';
import * as handlers from './patient-profile.handlers.js';

const router = createRouter();
router.openapi(routes.getMe, handlers.getMe);
router.openapi(routes.updateMe, handlers.updateMe);
router.openapi(routes.getMyAppointments, handlers.getMyAppointments);
router.openapi(routes.getMyBillingData, handlers.getMyBillingData);
router.openapi(routes.upsertMyBillingData, handlers.upsertMyBillingData);
router.openapi(routes.getMyConsents, handlers.getMyConsents);
router.openapi(routes.getMyConsent, handlers.getMyConsent);
router.openapi(routes.signMyConsent, handlers.signMyConsent);

export default router;
