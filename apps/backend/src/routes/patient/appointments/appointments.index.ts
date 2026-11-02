import { createRouter } from '../../../lib/create-app.js';
import * as routes from './appointments.routes.js';
import * as handlers from './appointments.handlers.js';

const router = createRouter()
  .openapi(routes.list, handlers.list)
  .openapi(routes.create, handlers.create)
  .openapi(routes.getOne, handlers.getOne)
  .openapi(routes.cancel, handlers.cancel);

export default router;
