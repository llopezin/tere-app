import { createRouter } from '../../lib/create-app.js';
import * as routes from './bonos.routes.js';
import * as handlers from './bonos.handlers.js';

const router = createRouter();
router.openapi(routes.list, handlers.list);
router.openapi(routes.create, handlers.create);
router.openapi(routes.getOne, handlers.getOne);
router.openapi(routes.listTransactions, handlers.listTransactions);
router.openapi(routes.deduct, handlers.deduct);

export default router;
