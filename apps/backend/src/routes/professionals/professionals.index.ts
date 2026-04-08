import { createRouter } from '../../lib/create-app.js';
import * as routes from './professionals.routes.js';
import * as handlers from './professionals.handlers.js';

const router = createRouter();
router.openapi(routes.getMe, handlers.getMe);
router.openapi(routes.updateMe, handlers.updateMe);

export default router;
