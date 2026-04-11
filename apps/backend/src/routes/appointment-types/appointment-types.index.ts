import { createRouter } from '../../lib/create-app.js';
import * as routes from './appointment-types.routes.js';
import * as handlers from './appointment-types.handlers.js';

const router = createRouter()
  .openapi(routes.list, handlers.list)
  .openapi(routes.create, handlers.create)
  .openapi(routes.update, handlers.update)
  .openapi(routes.remove, handlers.remove);

export default router;
