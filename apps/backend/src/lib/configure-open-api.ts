import { apiReference } from '@scalar/hono-api-reference';
import type { AppOpenAPI } from './types.js';

export default function configureOpenAPI(app: AppOpenAPI) {
  app.doc('/api/v1/openapi.json', {
    openapi: '3.0.0',
    info: {
      version: '0.1.0',
      title: 'Fisio App API',
      description: 'Physiotherapy clinic management API',
    },
  });

  // Main API documentation
  app.get(
    '/api/v1/docs',
    apiReference({
      theme: 'kepler',
      pageTitle: 'Fisio App API Docs',
      url: '/api/v1/openapi.json',
    }),
  );

  // Better Auth API documentation
  app.get(
    '/api/auth/docs',
    apiReference({
      theme: 'kepler',
      pageTitle: 'Auth API Documentation',
      url: '/api/auth/open-api/generate-schema',
    }),
  );
}
