import { createRoute, z } from '@hono/zod-openapi';
import * as HttpStatusCodes from 'stoker/http-status-codes';
import { jsonContent, jsonContentRequired } from 'stoker/openapi/helpers';
import { createMessageObjectSchema } from 'stoker/openapi/schemas';
import { authMiddleware, requireRole } from '../../middleware/auth.js';
import { defineMiddleware } from '../../lib/create-app.js';
import {
  selectConsentDocumentSchema,
  insertConsentDocumentSchema,
  updateConsentDocumentSchema,
} from '../../db/schema/consent-documents.js';
import { idParamsSchema } from '../../lib/schemas.js';

const tags = ['Consent Documents'];
const professionalMiddleware = defineMiddleware(authMiddleware, requireRole('professional'));

export const list = createRoute({
  method: 'get',
  path: '/',
  middleware: professionalMiddleware,
  tags,
  summary: 'List own consent document templates',
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({ data: z.array(selectConsentDocumentSchema) }),
      'List of consent documents',
    ),
  },
});
export type ListRoute = typeof list;

export const create = createRoute({
  method: 'post',
  path: '/',
  middleware: professionalMiddleware,
  tags,
  summary: 'Create a consent document template',
  request: {
    body: jsonContentRequired(insertConsentDocumentSchema, 'Consent document data'),
  },
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(selectConsentDocumentSchema, 'Created consent document'),
  },
});
export type CreateRoute = typeof create;

export const getOne = createRoute({
  method: 'get',
  path: '/{id}',
  middleware: professionalMiddleware,
  tags,
  summary: 'Get a consent document by ID',
  request: {
    params: idParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(selectConsentDocumentSchema, 'Consent document details'),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(createMessageObjectSchema('Not found'), 'Not found'),
  },
});
export type GetOneRoute = typeof getOne;

export const update = createRoute({
  method: 'put',
  path: '/{id}',
  middleware: professionalMiddleware,
  tags,
  summary: 'Update a consent document',
  request: {
    params: idParamsSchema,
    body: jsonContentRequired(updateConsentDocumentSchema, 'Fields to update'),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(selectConsentDocumentSchema, 'Updated consent document'),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(createMessageObjectSchema('Not found'), 'Not found'),
  },
});
export type UpdateRoute = typeof update;

export const remove = createRoute({
  method: 'delete',
  path: '/{id}',
  middleware: professionalMiddleware,
  tags,
  summary: 'Delete a consent document (fails if assigned to patients)',
  request: {
    params: idParamsSchema,
  },
  responses: {
    [HttpStatusCodes.NO_CONTENT]: { description: 'Deleted' },
    [HttpStatusCodes.NOT_FOUND]: jsonContent(createMessageObjectSchema('Not found'), 'Not found'),
    [HttpStatusCodes.CONFLICT]: jsonContent(
      createMessageObjectSchema('Cannot delete: document is assigned to patients'),
      'Document has assignments',
    ),
  },
});
export type RemoveRoute = typeof remove;
