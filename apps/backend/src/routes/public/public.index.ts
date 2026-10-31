import { createRouter } from '../../lib/create-app.js';
import { callbackRouter as googleCalendarCallback } from '../professional/integrations/integrations.index.js';

/** Routes without session or Origin restrictions, mounted at /api/v1. */
const publicApi = createRouter()
  .get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }))
  .route('/', googleCalendarCallback);

export default publicApi;
