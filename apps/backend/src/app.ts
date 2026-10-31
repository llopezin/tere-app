import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { onError, notFound } from 'stoker/middlewares';
import createApp from './lib/create-app.js';
import configureOpenAPI from './lib/configure-open-api.js';
import { auth } from './lib/auth.js';
import { env } from './config/env.js';

import patientApi from './routes/patient/patient.index.js';
import professionalApi from './routes/professional/professional.index.js';
import publicApi from './routes/public/public.index.js';

const app = createApp();

// Global middleware
app.use('*', cors({
  origin: [env.CLIENT_APP_URL, env.PROFESSIONAL_APP_URL],
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
}));
app.use('*', logger());

app.onError(onError);

// Auto-generated OpenAPI spec + Scalar docs
configureOpenAPI(app);

// Better Auth handler — handles /api/auth/*
app.on(['POST', 'GET'], '/api/auth/*', (c) => {
  return auth.handler(c.req.raw);
});

// BFFs: one router per frontend, each with its own role + origin guard
app.route('/api/v1/patient', patientApi);
app.route('/api/v1/professional', professionalApi);
// Public: health + Google OAuth callback (its URL is registered in Google Cloud Console)
app.route('/api/v1', publicApi);

app.notFound(notFound);

export type { PatientAppType } from './routes/patient/patient.index.js';
export type { ProfessionalAppType } from './routes/professional/professional.index.js';

export default app;
