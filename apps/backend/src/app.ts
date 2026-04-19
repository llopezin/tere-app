import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { onError, notFound } from 'stoker/middlewares';
import createApp, { createRouter } from './lib/create-app.js';
import configureOpenAPI from './lib/configure-open-api.js';
import { auth } from './lib/auth.js';
import { env } from './config/env.js';

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
import consentDocumentRoutes from './routes/consent-documents/consent-documents.index.js';

const app = createApp();

// Global middleware
app.use('*', cors({
  origin: ['http://localhost:5173'],
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
}));
app.use('*', logger());

app.onError(onError);

// Health check
app.get('/api/v1/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Auto-generated OpenAPI spec + Scalar docs
configureOpenAPI(app);

// Better Auth handler — handles /api/auth/*
app.on(['POST', 'GET'], '/api/auth/*', (c) => {
  return auth.handler(c.req.raw);
});

// API v1 routes — mounted at root since each route module defines full paths
const routes = [
  professionalRoutes,
  patientRoutes,
  patientProfile,
  appointmentTypeRoutes,
  scheduleRoutes,
  blockedTimeRoutes,
  availabilityRoutes,
  appointmentRoutes,
  bonoRoutes,
  paymentRoutes,
  reportRoutes,
  invoiceRoutes,
  gcalRoutes,
  consentDocumentRoutes,
] as const;

const api = createRouter();
routes.forEach((route) => {
  api.route('/', route);
});

app.route('/api/v1', api);

// Test-only routes — gated by NODE_ENV !== 'production'
if (env.NODE_ENV !== 'production') {
  // Lazy import to avoid loading test code in production builds
  const { default: testRoutes } = await import('./routes/test/test.index.js');
  const testApi = createRouter();
  testApi.route('/', testRoutes);
  app.route('/api/v1', testApi);
}

app.notFound(notFound);

export type AppType = typeof routes[number];

export default app;
