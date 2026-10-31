import { createRouter } from '../../../lib/create-app.js';
import * as routes from './bonos.routes.js';
import * as handlers from './bonos.handlers.js';

const router = createRouter().openapi(routes.getOne, handlers.getOne);

export default router;
