import { createRouter } from '../../lib/create-app.js';
import * as routes from './blocked-times.routes.js';
import * as handlers from './blocked-times.handlers.js';

const router = createRouter()
  .openapi(routes.list, handlers.list)
  .openapi(routes.create, handlers.create)
  .openapi(routes.remove, handlers.remove);

export default router;
