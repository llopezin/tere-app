import { createRouter } from '../../lib/create-app.js';
import * as routes from './reports.routes.js';
import * as handlers from './reports.handlers.js';

const router = createRouter()
  .openapi(routes.revenueMonthly, handlers.revenueMonthly)
  .openapi(routes.revenueQuarterly, handlers.revenueQuarterly)
  .openapi(routes.revenueByMethod, handlers.revenueByMethod);

export default router;
