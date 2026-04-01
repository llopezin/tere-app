import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import createApp, { createRouter } from './lib/create-app.js';
import configureOpenAPI from './lib/configure-open-api.js';
import { env } from './config/env.js';
import { errorHandler } from './middleware/error-handler.js';
import { auth } from './lib/auth.js';

// Routes
import professionalRoutes from './routes/professionals/professionals.index.js';
import patientRoutes from './routes/patients/patients.index.js';
import patientProfile from './routes/patient-profile/patient-profile.index.js';
import appointmentTypeRoutes from './routes/appointment-types/appointment-types.index.js';
import scheduleRoutes from './routes/working-schedules/working-schedules.index.js';
import blockedTimeRoutes from './routes/blocked-times/blocked-times.index.js';
import availabilityRoutes from './routes/availability/availability.index.js';
import appointmentRoutes from './routes/appointments/appointments.index.js';
import bonoRoutes from './routes/bonos/bonos.index.js';
import paymentRoutes from './routes/payments/payments.index.js';
import reportRoutes from './routes/reports/reports.index.js';
import invoiceRoutes from './routes/invoices/invoices.index.js';
import gcalRoutes from './routes/google-calendar/google-calendar.index.js';

const app = createApp();

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

// Auto-generated OpenAPI spec + Scalar docs
configureOpenAPI(app);

// Better Auth handler — handles /api/auth/*
app.on(['POST', 'GET'], '/api/auth/*', (c) => {
  return auth.handler(c.req.raw);
});

// API v1 routes
const api = createRouter();

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
