import { createRouter } from '../../lib/create-app.js';
import * as routes from './blocked-times.routes.js';
import * as handlers from './blocked-times.handlers.js';

const router = createRouter();
router.openapi(routes.list, handlers.list);
router.openapi(routes.create, handlers.create);
router.openapi(routes.remove, handlers.remove);

export default router;
