import { createRoute, z } from '@hono/zod-openapi';
import { selectProfessionalSchema, updateProfessionalSchema } from '../../db/schema/professionals.js';
import * as HttpStatusCodes from 'stoker/http-status-codes';
import { jsonContent, jsonContentRequired } from 'stoker/openapi/helpers';
import { createMessageObjectSchema } from 'stoker/openapi/schemas';
import { authMiddleware, requireRole } from '../../middleware/auth.js';
import { defineMiddleware } from '../../lib/create-app.js';

export const getMe = createRoute({
  method: 'get',
  path: '/professionals/me',
  middleware: defineMiddleware(authMiddleware, requireRole('professional')),
  tags: ['Professionals'],
  summary: "Get the authenticated professional's profile",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(selectProfessionalSchema, 'The professional profile'),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(createMessageObjectSchema('Professional profile not found'), 'Professional profile not found'),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(createMessageObjectSchema('Unauthorized'), 'Unauthorized'),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(createMessageObjectSchema('Insufficient permissions'), 'Insufficient permissions'),
  },
});

export const updateMe = createRoute({
  method: 'put',
  path: '/professionals/me',
  middleware: defineMiddleware(authMiddleware, requireRole('professional')),
  tags: ['Professionals'],
  summary: "Update the authenticated professional's profile",
  request: {
    body: jsonContentRequired(updateProfessionalSchema, 'Professional profile fields to update'),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(selectProfessionalSchema, 'The updated professional profile'),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(createMessageObjectSchema('Professional profile not found'), 'Professional profile not found'),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(createMessageObjectSchema('Unauthorized'), 'Unauthorized'),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(createMessageObjectSchema('Insufficient permissions'), 'Insufficient permissions'),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(createMessageObjectSchema('Validation error'), 'Validation error'),
  },
});

export const list = createRoute({
  method: 'get',
  path: '/professionals',
  middleware: defineMiddleware(authMiddleware),
  tags: ['Professionals'],
  summary: 'List all professionals',
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({ data: z.array(selectProfessionalSchema) }),
      'List of professionals',
    ),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(createMessageObjectSchema('Unauthorized'), 'Unauthorized'),
  },
});

export type ListRoute = typeof list;
export type GetMeRoute = typeof getMe;
export type UpdateMeRoute = typeof updateMe;
