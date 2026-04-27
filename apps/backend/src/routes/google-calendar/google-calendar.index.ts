import { createRouter } from '../../lib/create-app.js';
import * as routes from './google-calendar.routes.js';
import * as handlers from './google-calendar.handlers.js';

const router = createRouter()
  .openapi(routes.status, handlers.status)
  .openapi(routes.connect, handlers.connect)
  .openapi(routes.callback, handlers.callback)
  .openapi(routes.disconnect, handlers.disconnect);

export default router;
