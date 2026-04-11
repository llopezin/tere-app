import { createRouter } from '../../lib/create-app.js';
import * as routes from './appointments.routes.js';
import * as handlers from './appointments.handlers.js';

const router = createRouter()
  .openapi(routes.list, handlers.list)
  .openapi(routes.create, handlers.create)
  .openapi(routes.batch, handlers.batch)
  .openapi(routes.recurring, handlers.recurring)
  .openapi(routes.getOne, handlers.getOne)
  .openapi(routes.update, handlers.update)
  .openapi(routes.cancel, handlers.cancel)
  .openapi(routes.complete, handlers.complete)
  .openapi(routes.noShow, handlers.noShow);

export default router;
