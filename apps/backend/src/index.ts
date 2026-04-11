import { serve } from '@hono/node-server';
import { env } from './config/env.js';
import app from './app.js';

console.log(`🏥 Fisio App API starting on port ${env.PORT}...`);
serve({
  fetch: app.fetch,
  port: env.PORT,
});
console.log(`✅ Server running at http://localhost:${env.PORT}`);
console.log(`📚 API Documentation:`);
console.log(`   - Main API: http://localhost:${env.PORT}/api/v1/docs`);
console.log(`   - Auth API: http://localhost:${env.PORT}/api/auth/docs`);

export type { AppType } from './app.js';
export default app;
