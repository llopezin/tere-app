import { createRouter } from '../../lib/create-app.js';
import * as routes from './appointment-types.routes.js';
import * as handlers from './appointment-types.handlers.js';

const router = createRouter();
router.openapi(routes.list, handlers.list);
router.openapi(routes.create, handlers.create);
router.openapi(routes.update, handlers.update);
router.openapi(routes.remove, handlers.remove);

export default router;
