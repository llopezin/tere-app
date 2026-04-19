import { createRoute, z } from '@hono/zod-openapi';
import * as HttpStatusCodes from 'stoker/http-status-codes';
import { jsonContent, jsonContentRequired } from 'stoker/openapi/helpers';

const tags = ['Test'];

export const reset = createRoute({
  method: 'post',
  path: '/test/reset',
  tags,
  summary: 'Reset the test database (truncate all tables)',
  responses: {
    [HttpStatusCodes.NO_CONTENT]: {
      description: 'Database reset successfully',
    },
  },
});

export const seedProfessional = createRoute({
  method: 'post',
  path: '/test/seed/professional',
  tags,
  summary: 'Seed a professional user for testing',
  request: {
    body: jsonContentRequired(
      z.object({
        email: z.string().email(),
        password: z.string().min(8),
        firstName: z.string().min(1),
        lastName: z.string().min(1),
      }),
      'Professional seed data',
    ),
  },
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(
      z.object({
        userId: z.string(),
        professionalId: z.string(),
        appointmentTypeId: z.string(),
      }),
      'Created professional seed data',
    ),
  },
});

export const seedPatient = createRoute({
  method: 'post',
  path: '/test/seed/patient',
  tags,
  summary: 'Seed a patient user for testing',
  request: {
    body: jsonContentRequired(
      z.object({
        email: z.string().email(),
        password: z.string().min(8),
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        phone: z.string(),
        signRgpd: z.boolean().optional().default(false),
      }),
      'Patient seed data',
    ),
  },
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(
      z.object({
        userId: z.string(),
        patientId: z.string(),
      }),
      'Created patient seed data',
    ),
  },
});

export const seedAppointment = createRoute({
  method: 'post',
  path: '/test/seed/appointment',
  tags,
  summary: 'Seed an appointment for testing',
  request: {
    body: jsonContentRequired(
      z.object({
        patientEmail: z.string().email(),
        professionalEmail: z.string().email(),
        appointmentTypeId: z.string().uuid(),
        startAt: z.string().datetime(),
        status: z.enum(['scheduled', 'completed', 'cancelled', 'no_show']).optional().default('scheduled'),
      }),
      'Appointment seed data',
    ),
  },
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(
      z.object({
        id: z.string(),
        professionalId: z.string(),
        patientId: z.string(),
        appointmentTypeId: z.string(),
        startAt: z.string(),
        endAt: z.string(),
        status: z.string(),
        price: z.string(),
      }),
      'Created appointment',
    ),
  },
});

export type ResetRoute = typeof reset;
export type SeedProfessionalRoute = typeof seedProfessional;
export type SeedPatientRoute = typeof seedPatient;
export type SeedAppointmentRoute = typeof seedAppointment;
