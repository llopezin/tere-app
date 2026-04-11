import { createRoute, z } from '@hono/zod-openapi';
import * as HttpStatusCodes from 'stoker/http-status-codes';
import { jsonContent, jsonContentRequired } from 'stoker/openapi/helpers';
import { authMiddleware, requireRole } from '../../middleware/auth.js';
import { defineMiddleware } from '../../lib/create-app.js';
import { selectPatientSchema, updatePatientSchema } from '../../db/schema/patients.js';
import { selectAppointmentSchema } from '../../db/schema/appointments.js';
import { selectPatientBillingDataSchema, upsertBillingDataSchema } from '../../db/schema/patient-billing-data.js';
import { selectPatientConsentSchema, signConsentSchema } from '../../db/schema/patient-consents.js';
import { selectConsentDocumentSchema } from '../../db/schema/consent-documents.js';
import { paginationSchema } from '../../lib/schemas.js';

const tags = ['Patient Profile'];
const patientMiddleware = defineMiddleware(authMiddleware, requireRole('patient'));

export const getMe = createRoute({
  method: 'get',
  path: '/patient/me',
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
  path: '/patient/me',
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
  path: '/patient/me/appointments',
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
  path: '/patient/me/billing-data',
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
  path: '/patient/me/billing-data',
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

const consentIdParamsSchema = z.object({
  consentId: z.string().uuid(),
});

export const getMyConsents = createRoute({
  method: 'get',
  path: '/patient/me/consents',
  middleware: patientMiddleware,
  tags,
  summary: "List the authenticated patient's assigned consent documents",
  request: {
    query: z.object({
      status: z.enum(['pending', 'signed']).optional(),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        data: z.array(selectPatientConsentSchema.extend({
          document: selectConsentDocumentSchema.pick({ title: true, description: true }),
        })),
      }),
      'List of consents',
    ),
  },
});
export type GetMyConsentsRoute = typeof getMyConsents;

export const getMyConsent = createRoute({
  method: 'get',
  path: '/patient/me/consents/{consentId}',
  middleware: patientMiddleware,
  tags,
  summary: 'View a specific consent document with full content',
  request: {
    params: consentIdParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      selectPatientConsentSchema.extend({
        document: selectConsentDocumentSchema.pick({ title: true, description: true, content: true }),
      }),
      'Consent with document content',
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(z.object({ error: z.string() }), 'Consent not found'),
  },
});
export type GetMyConsentRoute = typeof getMyConsent;

export const signMyConsent = createRoute({
  method: 'post',
  path: '/patient/me/consents/{consentId}/sign',
  middleware: patientMiddleware,
  tags,
  summary: 'Sign a consent document',
  request: {
    params: consentIdParamsSchema,
    body: jsonContentRequired(signConsentSchema, 'Signature data'),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(selectPatientConsentSchema, 'Signed consent'),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(z.object({ error: z.string() }), 'Consent not found'),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(z.object({ error: z.string() }), 'Already signed'),
  },
});
export type SignMyConsentRoute = typeof signMyConsent;
