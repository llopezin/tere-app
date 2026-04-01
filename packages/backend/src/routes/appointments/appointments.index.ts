import { createRouter } from '../../lib/create-app.js';
import * as routes from './appointments.routes.js';
import * as handlers from './appointments.handlers.js';

const router = createRouter();
router.openapi(routes.list, handlers.list);
router.openapi(routes.create, handlers.create);
router.openapi(routes.batch, handlers.batch);
router.openapi(routes.recurring, handlers.recurring);
router.openapi(routes.getOne, handlers.getOne);
router.openapi(routes.update, handlers.update);
router.openapi(routes.cancel, handlers.cancel);
router.openapi(routes.complete, handlers.complete);
router.openapi(routes.noShow, handlers.noShow);

export default router;
