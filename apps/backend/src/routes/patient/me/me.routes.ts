import { createRoute, z } from '@hono/zod-openapi';
import * as HttpStatusCodes from 'stoker/http-status-codes';
import { jsonContent, jsonContentRequired } from 'stoker/openapi/helpers';
import { selectOwnPatientSchema, updateOwnPatientSchema } from '../../../db/schema/patients.js';
import { selectPatientBillingDataSchema, upsertBillingDataSchema } from '../../../db/schema/patient-billing-data.js';
import { selectPatientConsentSchema, signConsentSchema } from '../../../db/schema/patient-consents.js';
import { selectConsentDocumentSchema } from '../../../db/schema/consent-documents.js';
import { selectRgpdConsentSchema } from '../../../db/schema/rgpd-consents.js';

const tags = ['Patient / Me'];

export const getMe = createRoute({
  method: 'get',
  path: '/me',
  tags,
  summary: 'Get the authenticated patient profile',
  responses: {
    [HttpStatusCodes.OK]: jsonContent(selectOwnPatientSchema, 'The patient profile'),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(z.object({ error: z.string() }), 'Patient profile not found'),
  },
});
export type GetMeRoute = typeof getMe;

export const updateMe = createRoute({
  method: 'put',
  path: '/me',
  tags,
  summary: 'Update the authenticated patient profile',
  request: {
    body: jsonContentRequired(updateOwnPatientSchema, 'Patient profile fields to update'),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(selectOwnPatientSchema, 'The updated patient profile'),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(z.object({ error: z.string() }), 'Patient profile not found'),
  },
});
export type UpdateMeRoute = typeof updateMe;

export const getMyBillingData = createRoute({
  method: 'get',
  path: '/me/billing-data',
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
  path: '/consents',
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
  path: '/consents/{consentId}',
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
  path: '/consents/{consentId}/sign',
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

export const getMyRgpdConsent = createRoute({
  method: 'get',
  path: '/me/rgpd-consent',
  tags,
  summary: "Get the authenticated patient's RGPD consent status",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({ signed: z.boolean() }),
      'RGPD consent status',
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(z.object({ message: z.string() }), 'Patient profile not found'),
  },
});
export type GetMyRgpdConsentRoute = typeof getMyRgpdConsent;

export const acceptMyRgpdConsent = createRoute({
  method: 'post',
  path: '/me/rgpd-consent',
  tags,
  summary: 'Accept RGPD consent (patient self-service)',
  responses: {
    [HttpStatusCodes.OK]: jsonContent(selectRgpdConsentSchema, 'RGPD consent record'),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(z.object({ message: z.string() }), 'Patient profile not found'),
  },
});
export type AcceptMyRgpdConsentRoute = typeof acceptMyRgpdConsent;
