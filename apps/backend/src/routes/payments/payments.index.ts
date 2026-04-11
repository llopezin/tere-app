import { createRouter } from '../../lib/create-app.js';
import * as routes from './payments.routes.js';
import * as handlers from './payments.handlers.js';

const router = createRouter()
  .openapi(routes.list, handlers.list)
  .openapi(routes.create, handlers.create)
  .openapi(routes.getOne, handlers.getOne);

export default router;
