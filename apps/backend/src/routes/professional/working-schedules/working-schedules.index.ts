import { createRouter } from '../../lib/create-app.js';
import * as routes from './working-schedules.routes.js';
import * as handlers from './working-schedules.handlers.js';

const router = createRouter()
  .openapi(routes.list, handlers.list)
  .openapi(routes.bulkReplace, handlers.bulkReplace);

export default router;
