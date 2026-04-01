import { createRouter } from '../../lib/create-app.js';
import * as routes from './reports.routes.js';
import * as handlers from './reports.handlers.js';

const router = createRouter();
router.openapi(routes.revenueMonthly, handlers.revenueMonthly);
router.openapi(routes.revenueQuarterly, handlers.revenueQuarterly);
router.openapi(routes.revenueByMethod, handlers.revenueByMethod);

export default router;
