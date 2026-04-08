import { createRouter } from '../../lib/create-app.js';
import * as routes from './availability.routes.js';
import * as handlers from './availability.handlers.js';

const router = createRouter();
router.openapi(routes.getAvailability, handlers.getAvailability);

export default router;
