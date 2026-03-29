import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { apiReference } from '@scalar/hono-api-reference';
import { env } from './config/env.js';
import { errorHandler } from './middleware/error-handler.js';
import { auth } from './lib/auth.js';
import { openApiSpec } from './lib/openapi-spec.js';

// Routes
import professionalRoutes from './routes/professionals.js';
import patientRoutes from './routes/patients.js';
import patientProfile from './routes/patient-profile.js';
import appointmentTypeRoutes from './routes/appointment-types.js';
import scheduleRoutes from './routes/working-schedules.js';
import blockedTimeRoutes from './routes/blocked-times.js';
import availabilityRoutes from './routes/availability.js';
import appointmentRoutes from './routes/appointments.js';
import bonoRoutes from './routes/bonos.js';
import paymentRoutes from './routes/payments.js';
import reportRoutes from './routes/reports.js';
import invoiceRoutes from './routes/invoices.js';
import gcalRoutes from './routes/google-calendar.js';

const app = new Hono();

// Global middleware
app.use('*', cors({
  origin: ['http://localhost:5173'],
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
}));
app.use('*', logger());
app.use('*', errorHandler);

// Health check
app.get('/api/v1/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

// OpenAPI spec + Scalar docs
app.get('/api/v1/openapi.json', (c) => c.json(openApiSpec));
app.get(
  '/api/v1/docs',
  apiReference({
    theme: 'kepler',
    url: '/api/v1/openapi.json',
    pageTitle: 'Fisio App API Docs',
  }),
);

// Better Auth handler — handles /api/auth/*
app.on(['POST', 'GET'], '/api/auth/*', (c) => {
  return auth.handler(c.req.raw);
});

// API v1 routes
const api = new Hono();

api.route('/professionals', professionalRoutes);
api.route('/patients', patientRoutes);
api.route('/patient', patientProfile);
api.route('/appointment-types', appointmentTypeRoutes);
api.route('/working-schedules', scheduleRoutes);
api.route('/blocked-times', blockedTimeRoutes);
api.route('/availability', availabilityRoutes);
api.route('/appointments', appointmentRoutes);
api.route('/bonos', bonoRoutes);
api.route('/payments', paymentRoutes);
api.route('/reports', reportRoutes);
api.route('/invoices', invoiceRoutes);
api.route('/integrations/google-calendar', gcalRoutes);

app.route('/api/v1', api);

// 404 handler
app.notFound((c) => c.json({ error: 'Not found' }, 404));

console.log(`🏥 Fisio App API starting on port ${env.PORT}...`);
serve({
  fetch: app.fetch,
  port: env.PORT,
});
console.log(`✅ Server running at http://localhost:${env.PORT}`);

export default app;
