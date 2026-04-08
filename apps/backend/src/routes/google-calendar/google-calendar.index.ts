import { createRouter } from '../../lib/create-app.js';
import * as routes from './google-calendar.routes.js';
import * as handlers from './google-calendar.handlers.js';

const router = createRouter();
router.openapi(routes.connect, handlers.connect);
router.openapi(routes.disconnect, handlers.disconnect);
router.openapi(routes.sync, handlers.sync);

export default router;
