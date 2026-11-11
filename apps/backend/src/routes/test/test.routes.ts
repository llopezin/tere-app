import { createRoute, z } from '@hono/zod-openapi';
import * as HttpStatusCodes from 'stoker/http-status-codes';
import { jsonContent, jsonContentRequired } from 'stoker/openapi/helpers';
import { appointments } from '../../db/schema/appointments.js';

const tags = ['Test'];

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
});

const idSchema = z.object({ id: z.string() });

export const reset = createRoute({
  method: 'post',
  path: '/reset',
  tags,
  summary: 'Empty every table of the test database',
  responses: {
    [HttpStatusCodes.NO_CONTENT]: { description: 'Database emptied' },
  },
});

export const seedProfessional = createRoute({
  method: 'post',
  path: '/seed/professional',
  tags,
  summary: 'Create a professional with one appointment type and a Mon–Fri 09:00–18:00 schedule',
  request: {
    body: jsonContentRequired(credentialsSchema, 'Professional to create'),
  },
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(
      z.object({ professionalId: z.string(), appointmentTypeId: z.string() }),
      'Created professional',
    ),
  },
});

export const seedPatient = createRoute({
  method: 'post',
  path: '/seed/patient',
  tags,
  summary: 'Create a patient through the public sign-up, optionally with RGPD signed',
  request: {
    body: jsonContentRequired(
      credentialsSchema.extend({ phone: z.string(), signRgpd: z.boolean().default(false) }),
      'Patient to create',
    ),
  },
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(z.object({ patientId: z.string() }), 'Created patient'),
  },
});

export const seedAppointment = createRoute({
  method: 'post',
  path: '/seed/appointment',
  tags,
  summary: 'Insert an appointment directly, skipping availability and RGPD checks',
  request: {
    body: jsonContentRequired(
      z.object({
        patientId: z.string().uuid(),
        appointmentTypeId: z.string().uuid(),
        startAt: z.string().datetime(),
        status: z.enum(appointments.status.enumValues).default('scheduled'),
      }),
      'Appointment to create',
    ),
  },
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(idSchema, 'Created appointment'),
  },
});

export type ResetRoute = typeof reset;
export type SeedProfessionalRoute = typeof seedProfessional;
export type SeedPatientRoute = typeof seedPatient;
export type SeedAppointmentRoute = typeof seedAppointment;
