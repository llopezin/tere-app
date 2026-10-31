import { createRoute, z } from '@hono/zod-openapi';
import { selectPaymentSchema, insertPaymentSchema } from '../../db/schema/payments.js';
import { paginationSchema, idParamsSchema } from '../../lib/schemas.js';
import * as HttpStatusCodes from 'stoker/http-status-codes';
import { jsonContent, jsonContentRequired } from 'stoker/openapi/helpers';
import { createMessageObjectSchema } from 'stoker/openapi/schemas';
import { authMiddleware, requireRole } from '../../middleware/auth.js';
import { defineMiddleware } from '../../lib/create-app.js';

const tags = ['Payments'];

// GET /
export const list = createRoute({
  method: 'get',
  path: '/payments',
  middleware: defineMiddleware(authMiddleware, requireRole('professional')),
  tags,
  summary: 'List payments',
  request: {
    query: paginationSchema.extend({
      from: z.string().optional(),
      to: z.string().optional(),
      patient_id: z.string().uuid().optional(),
      payment_method: z.string().optional(),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({ data: z.array(selectPaymentSchema), page: z.number(), per_page: z.number() }),
      'Paginated list of payments',
    ),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(createMessageObjectSchema('Unauthorized'), 'Unauthorized'),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(createMessageObjectSchema('Insufficient permissions'), 'Insufficient permissions'),
  },
});

// POST /
export const create = createRoute({
  method: 'post',
  path: '/payments',
  middleware: defineMiddleware(authMiddleware, requireRole('professional')),
  tags,
  summary: 'Create a payment',
  request: {
    body: jsonContentRequired(insertPaymentSchema, 'Payment to create'),
  },
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(selectPaymentSchema, 'The created payment'),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(createMessageObjectSchema('Unauthorized'), 'Unauthorized'),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(createMessageObjectSchema('Insufficient permissions'), 'Insufficient permissions'),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(createMessageObjectSchema('Validation error'), 'Validation error'),
  },
});

// GET /:id
export const getOne = createRoute({
  method: 'get',
  path: '/payments/{id}',
  middleware: defineMiddleware(authMiddleware, requireRole('professional')),
  tags,
  summary: 'Get a payment by ID',
  request: {
    params: idParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(selectPaymentSchema, 'The payment'),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(createMessageObjectSchema('Payment not found'), 'Payment not found'),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(createMessageObjectSchema('Unauthorized'), 'Unauthorized'),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(createMessageObjectSchema('Insufficient permissions'), 'Insufficient permissions'),
  },
});

export type ListRoute = typeof list;
export type CreateRoute = typeof create;
export type GetOneRoute = typeof getOne;
