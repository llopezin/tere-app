import { createRouter } from '../../lib/create-app.js';
import * as routes from './invoices.routes.js';
import * as handlers from './invoices.handlers.js';

const router = createRouter()
  .openapi(routes.list, handlers.list)
  .openapi(routes.create, handlers.create)
  .openapi(routes.getOne, handlers.getOne)
  .openapi(routes.getPdf, handlers.getPdf);

export default router;
