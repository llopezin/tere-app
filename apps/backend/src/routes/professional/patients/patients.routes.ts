import { createRoute, z } from '@hono/zod-openapi';
import * as HttpStatusCodes from 'stoker/http-status-codes';
import { jsonContent, jsonContentRequired } from 'stoker/openapi/helpers';
import { selectPatientForProfessionalSchema, insertPatientSchema, updatePatientSchema } from '../../../db/schema/patients.js';
import { selectAppointmentSchema } from '../../../db/schema/appointments.js';
import { selectBonoSchema } from '../../../db/schema/bonos.js';
import { selectPaymentSchema } from '../../../db/schema/payments.js';
import { selectPatientBillingDataSchema, upsertBillingDataSchema } from '../../../db/schema/patient-billing-data.js';
import { selectRgpdConsentSchema, submitConsentSchema } from '../../../db/schema/rgpd-consents.js';
import { selectPatientConsentSchema, assignConsentSchema } from '../../../db/schema/patient-consents.js';
import { selectConsentDocumentSchema } from '../../../db/schema/consent-documents.js';
import { paginationSchema, idParamsSchema } from '../../../lib/schemas.js';

const tags = ['Professional / Patients'];

export const list = createRoute({
  method: 'get',
  path: '/patients',
  tags,
  summary: 'List patients with optional search',
  request: {
    query: paginationSchema.extend({
      search: z.string().optional(),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        data: z.array(selectPatientForProfessionalSchema),
        page: z.number(),
        per_page: z.number(),
      }),
      'List of patients',
    ),
  },
});
export type ListRoute = typeof list;

export const create = createRoute({
  method: 'post',
  path: '/patients',
  tags,
  summary: 'Create a new patient',
  request: {
    body: jsonContentRequired(insertPatientSchema, 'Patient data'),
  },
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(selectPatientForProfessionalSchema, 'Created patient'),
  },
});
export type CreateRoute = typeof create;

export const getOne = createRoute({
  method: 'get',
  path: '/patients/{id}',
  tags,
  summary: 'Get a patient by ID',
  request: {
    params: idParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(selectPatientForProfessionalSchema, 'Patient details'),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(z.object({ error: z.string() }), 'Patient not found'),
  },
});
export type GetOneRoute = typeof getOne;

export const update = createRoute({
  method: 'put',
  path: '/patients/{id}',
  tags,
  summary: 'Update a patient',
  request: {
    params: idParamsSchema,
    body: jsonContentRequired(updatePatientSchema, 'Fields to update'),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(selectPatientForProfessionalSchema, 'Updated patient'),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(z.object({ error: z.string() }), 'Patient not found'),
  },
});
export type UpdateRoute = typeof update;

export const getAppointments = createRoute({
  method: 'get',
  path: '/patients/{id}/appointments',
  tags,
  summary: "Get a patient's appointments",
  request: {
    params: idParamsSchema,
    query: paginationSchema.extend({
      status: z.enum(['scheduled', 'completed', 'cancelled', 'no_show']).optional(),
      from: z.string().optional(),
      to: z.string().optional(),
    }),
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
    [HttpStatusCodes.NOT_FOUND]: jsonContent(z.object({ error: z.string() }), 'Patient not found'),
  },
});
export type GetAppointmentsRoute = typeof getAppointments;

export const getBonos = createRoute({
  method: 'get',
  path: '/patients/{id}/bonos',
  tags,
  summary: "Get a patient's bonos",
  request: {
    params: idParamsSchema,
    query: z.object({
      status: z.enum(['active', 'exhausted']).optional(),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({ data: z.array(selectBonoSchema) }),
      'List of bonos',
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(z.object({ error: z.string() }), 'Patient not found'),
  },
});
export type GetBonosRoute = typeof getBonos;

export const getPayments = createRoute({
  method: 'get',
  path: '/patients/{id}/payments',
  tags,
  summary: "Get a patient's payments",
  request: {
    params: idParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({ data: z.array(selectPaymentSchema) }),
      'List of payments',
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(z.object({ error: z.string() }), 'Patient not found'),
  },
});
export type GetPaymentsRoute = typeof getPayments;

export const getBillingData = createRoute({
  method: 'get',
  path: '/patients/{id}/billing-data',
  tags,
  summary: "Get a patient's billing data",
  request: {
    params: idParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.union([selectPatientBillingDataSchema, z.null()]),
      'Billing data or null',
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(z.object({ error: z.string() }), 'Patient not found'),
  },
});
export type GetBillingDataRoute = typeof getBillingData;

export const upsertBillingData = createRoute({
  method: 'put',
  path: '/patients/{id}/billing-data',
  tags,
  summary: "Create or update a patient's billing data",
  request: {
    params: idParamsSchema,
    body: jsonContentRequired(upsertBillingDataSchema, 'Billing data'),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(selectPatientBillingDataSchema, 'Updated billing data'),
    [HttpStatusCodes.CREATED]: jsonContent(selectPatientBillingDataSchema, 'Created billing data'),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(z.object({ error: z.string() }), 'Patient not found'),
  },
});
export type UpsertBillingDataRoute = typeof upsertBillingData;

export const getRgpdConsent = createRoute({
  method: 'get',
  path: '/patients/{id}/rgpd-consent',
  tags,
  summary: "Get a patient's RGPD consent status",
  request: {
    params: idParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.union([selectRgpdConsentSchema, z.object({ signed: z.literal(false) })]),
      'Consent data',
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(z.object({ error: z.string() }), 'Patient not found'),
  },
});
export type GetRgpdConsentRoute = typeof getRgpdConsent;

export const submitRgpdConsent = createRoute({
  method: 'post',
  path: '/patients/{id}/rgpd-consent',
  tags,
  summary: 'Submit RGPD consent signature for a patient',
  request: {
    params: idParamsSchema,
    body: jsonContentRequired(submitConsentSchema, 'Consent signature data'),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(selectRgpdConsentSchema, 'Updated consent'),
    [HttpStatusCodes.CREATED]: jsonContent(selectRgpdConsentSchema, 'Created consent'),
  },
});
export type SubmitRgpdConsentRoute = typeof submitRgpdConsent;

export const getContactLink = createRoute({
  method: 'get',
  path: '/patients/{id}/contact-link',
  tags,
  summary: 'Get the contact link for a patient',
  request: {
    params: idParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({ method: z.string(), link: z.string() }),
      'Contact link',
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(z.object({ error: z.string() }), 'Patient not found'),
  },
});
export type GetContactLinkRoute = typeof getContactLink;

export const assignConsent = createRoute({
  method: 'post',
  path: '/patients/{id}/consents',
  tags,
  summary: 'Assign a consent document to a patient',
  request: {
    params: idParamsSchema,
    body: jsonContentRequired(assignConsentSchema, 'Consent document to assign'),
  },
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(selectPatientConsentSchema, 'Created patient consent'),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(z.object({ error: z.string() }), 'Patient or document not found'),
    [HttpStatusCodes.CONFLICT]: jsonContent(z.object({ error: z.string() }), 'Document already assigned'),
  },
});
export type AssignConsentRoute = typeof assignConsent;

export const getConsents = createRoute({
  method: 'get',
  path: '/patients/{id}/consents',
  tags,
  summary: "List a patient's assigned consent documents with status",
  request: {
    params: idParamsSchema,
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
      'List of patient consents',
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(z.object({ error: z.string() }), 'Patient not found'),
  },
});
export type GetConsentsRoute = typeof getConsents;
