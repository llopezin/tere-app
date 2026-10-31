import { createRouter } from '../../lib/create-app.js';
import * as routes from './professionals.routes.js';
import * as handlers from './professionals.handlers.js';

const router = createRouter()
  .openapi(routes.list, handlers.list)
  .openapi(routes.getMe, handlers.getMe)
  .openapi(routes.updateMe, handlers.updateMe);

export default router;
