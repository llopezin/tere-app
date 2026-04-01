import { createRoute, z } from '@hono/zod-openapi';
import type { MiddlewareHandler } from 'hono';
import * as HttpStatusCodes from 'stoker/http-status-codes';
import { jsonContent, jsonContentRequired } from 'stoker/openapi/helpers';
import { authMiddleware, requireRole } from '../../middleware/auth.js';
import { selectPatientSchema, updatePatientSchema } from '../../db/schema/patients.js';
import { selectAppointmentSchema } from '../../db/schema/appointments.js';
import { selectPatientBillingDataSchema, upsertBillingDataSchema } from '../../db/schema/patient-billing-data.js';
import { paginationSchema } from '../../lib/schemas.js';

const tags = ['Patient Profile'];
const patientMiddleware: [MiddlewareHandler, MiddlewareHandler] = [authMiddleware, requireRole('patient')];

export const getMe = createRoute({
  method: 'get',
  path: '/me',
  middleware: patientMiddleware,
  tags,
  summary: 'Get the authenticated patient profile',
  responses: {
    [HttpStatusCodes.OK]: jsonContent(selectPatientSchema, 'The patient profile'),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(z.object({ error: z.string() }), 'Patient profile not found'),
  },
});
export type GetMeRoute = typeof getMe;

export const updateMe = createRoute({
  method: 'put',
  path: '/me',
  middleware: patientMiddleware,
  tags,
  summary: 'Update the authenticated patient profile',
  request: {
    body: jsonContentRequired(updatePatientSchema, 'Patient profile fields to update'),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(selectPatientSchema, 'The updated patient profile'),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(z.object({ error: z.string() }), 'Patient profile not found'),
  },
});
export type UpdateMeRoute = typeof updateMe;

export const getMyAppointments = createRoute({
  method: 'get',
  path: '/me/appointments',
  middleware: patientMiddleware,
  tags,
  summary: "Get the authenticated patient's appointments",
  request: {
    query: paginationSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        data: z.array(selectAppointmentSchema),
        page: z.number(),
        per_page: z.number(),
      }),
      'List of appointments',
    ),
  },
});
export type GetMyAppointmentsRoute = typeof getMyAppointments;

export const getMyBillingData = createRoute({
  method: 'get',
  path: '/me/billing-data',
  middleware: patientMiddleware,
  tags,
  summary: "Get the authenticated patient's billing data",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.union([selectPatientBillingDataSchema, z.null()]),
      'Billing data or null',
    ),
  },
});
export type GetMyBillingDataRoute = typeof getMyBillingData;

export const upsertMyBillingData = createRoute({
  method: 'put',
  path: '/me/billing-data',
  middleware: patientMiddleware,
  tags,
  summary: "Create or update the authenticated patient's billing data",
  request: {
    body: jsonContentRequired(upsertBillingDataSchema, 'Billing data'),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(selectPatientBillingDataSchema, 'Updated billing data'),
    [HttpStatusCodes.CREATED]: jsonContent(selectPatientBillingDataSchema, 'Created billing data'),
  },
});
export type UpsertMyBillingDataRoute = typeof upsertMyBillingData;
