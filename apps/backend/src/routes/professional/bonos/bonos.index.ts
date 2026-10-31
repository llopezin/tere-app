import { createRouter } from '../../lib/create-app.js';
import * as routes from './bonos.routes.js';
import * as handlers from './bonos.handlers.js';

const router = createRouter()
  .openapi(routes.list, handlers.list)
  .openapi(routes.create, handlers.create)
  .openapi(routes.getOne, handlers.getOne)
  .openapi(routes.listTransactions, handlers.listTransactions)
  .openapi(routes.deduct, handlers.deduct);

export default router;
