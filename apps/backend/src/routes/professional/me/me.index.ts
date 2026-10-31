import { createRouter } from '../../../lib/create-app.js';
import * as routes from './me.routes.js';
import * as handlers from './me.handlers.js';

const router = createRouter()
  .openapi(routes.getMe, handlers.getMe)
  .openapi(routes.updateMe, handlers.updateMe);

export default router;
