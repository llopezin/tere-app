import { createRouter } from '../../lib/create-app.js';
import * as routes from './invoices.routes.js';
import * as handlers from './invoices.handlers.js';

const router = createRouter();
router.openapi(routes.list, handlers.list);
router.openapi(routes.create, handlers.create);
router.openapi(routes.getOne, handlers.getOne);
router.openapi(routes.getPdf, handlers.getPdf);

export default router;
