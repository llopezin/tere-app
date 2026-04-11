import { createRouter } from '../../lib/create-app.js';
import * as routes from './google-calendar.routes.js';
import * as handlers from './google-calendar.handlers.js';

const router = createRouter()
  .openapi(routes.connect, handlers.connect)
  .openapi(routes.disconnect, handlers.disconnect)
  .openapi(routes.sync, handlers.sync);

export default router;
