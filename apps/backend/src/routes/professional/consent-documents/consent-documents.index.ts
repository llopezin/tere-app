import { createRouter } from '../../lib/create-app.js';
import * as routes from './consent-documents.routes.js';
import * as handlers from './consent-documents.handlers.js';

const router = createRouter()
  .openapi(routes.list, handlers.list)
  .openapi(routes.create, handlers.create)
  .openapi(routes.getOne, handlers.getOne)
  .openapi(routes.update, handlers.update)
  .openapi(routes.remove, handlers.remove);

export default router;
