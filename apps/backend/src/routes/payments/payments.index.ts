import { createRouter } from '../../lib/create-app.js';
import * as routes from './payments.routes.js';
import * as handlers from './payments.handlers.js';

const router = createRouter();
router.openapi(routes.list, handlers.list);
router.openapi(routes.create, handlers.create);
router.openapi(routes.getOne, handlers.getOne);

export default router;
