import { createRouter } from '../../lib/create-app.js';
import * as routes from './working-schedules.routes.js';
import * as handlers from './working-schedules.handlers.js';

const router = createRouter();
router.openapi(routes.list, handlers.list);
router.openapi(routes.bulkReplace, handlers.bulkReplace);

export default router;
