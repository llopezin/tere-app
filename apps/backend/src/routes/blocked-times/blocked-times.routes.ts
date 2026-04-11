import { createRoute, z } from '@hono/zod-openapi';
import * as HttpStatusCodes from 'stoker/http-status-codes';
import { jsonContent, jsonContentRequired } from 'stoker/openapi/helpers';
import { createMessageObjectSchema } from 'stoker/openapi/schemas';
import { selectBlockedTimeSchema, insertBlockedTimeSchema } from '../../db/schema/blocked-times.js';
import { idParamsSchema } from '../../lib/schemas.js';
import { authMiddleware, requireRole } from '../../middleware/auth.js';
import { defineMiddleware } from '../../lib/create-app.js';

export const list = createRoute({
  method: 'get',
  path: '/blocked-times',
  middleware: defineMiddleware(authMiddleware, requireRole('professional')),
  tags: ['Blocked Times'],
  summary: 'List blocked times with optional date range filter',
  request: {
    query: z.object({
      from: z.string().optional(),
      to: z.string().optional(),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({ data: z.array(selectBlockedTimeSchema) }),
      'List of blocked times',
    ),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(createMessageObjectSchema('Unauthorized'), 'Unauthorized'),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(createMessageObjectSchema('Insufficient permissions'), 'Insufficient permissions'),
  },
});

export const create = createRoute({
  method: 'post',
  path: '/blocked-times',
  middleware: defineMiddleware(authMiddleware, requireRole('professional')),
  tags: ['Blocked Times'],
  summary: 'Create a blocked time',
  request: {
    body: jsonContentRequired(insertBlockedTimeSchema, 'Blocked time to create'),
  },
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(selectBlockedTimeSchema, 'The created blocked time'),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(createMessageObjectSchema('Unauthorized'), 'Unauthorized'),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(createMessageObjectSchema('Insufficient permissions'), 'Insufficient permissions'),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(createMessageObjectSchema('Validation error'), 'Validation error'),
  },
});

export const remove = createRoute({
  method: 'delete',
  path: '/blocked-times/{id}',
  middleware: defineMiddleware(authMiddleware, requireRole('professional')),
  tags: ['Blocked Times'],
  summary: 'Delete a blocked time',
  request: {
    params: idParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({ message: z.string() }),
      'Blocked time removed',
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(createMessageObjectSchema('Blocked time not found'), 'Blocked time not found'),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(createMessageObjectSchema('Unauthorized'), 'Unauthorized'),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(createMessageObjectSchema('Insufficient permissions'), 'Insufficient permissions'),
  },
});

export type ListRoute = typeof list;
export type CreateRoute = typeof create;
export type RemoveRoute = typeof remove;
