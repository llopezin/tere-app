import { createRouter } from '../../../lib/create-app.js';
import * as routes from './integrations.routes.js';
import * as handlers from './integrations.handlers.js';

const router = createRouter()
  .openapi(routes.status, handlers.status)
  .openapi(routes.connect, handlers.connect)
  .openapi(routes.disconnect, handlers.disconnect);

export default router;

/**
 * Google redirects the browser here without our frontend Origin and before any app context,
 * so it is mounted outside the professional BFF (see routes/public). Its URL is registered in
 * Google Cloud Console and must not change: /api/v1/integrations/google-calendar/callback.
 */
export const callbackRouter = createRouter().openapi(routes.callback, handlers.callback);
