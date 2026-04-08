import { createRoute, z } from '@hono/zod-openapi';
import { selectBonoSchema, insertBonoSchema, deductBonoSchema } from '../../db/schema/bonos.js';
import { idParamsSchema } from '../../lib/schemas.js';
import * as HttpStatusCodes from 'stoker/http-status-codes';
import { jsonContent, jsonContentRequired } from 'stoker/openapi/helpers';
import { createMessageObjectSchema } from 'stoker/openapi/schemas';
import { authMiddleware, requireRole } from '../../middleware/auth.js';
import { defineMiddleware } from '../../lib/create-app.js';

const tags = ['Bonos'];

const bonoWithRemainingSchema = selectBonoSchema.extend({
  sessions_remaining: z.number(),
});

const bonoTransactionSchema = z.object({
  id: z.string().uuid(),
  bonoId: z.string().uuid(),
  appointmentId: z.string().uuid().nullable(),
  type: z.string(),
  createdAt: z.string(),
});

// GET /
export const list = createRoute({
  method: 'get',
  path: '/',
  middleware: defineMiddleware(authMiddleware, requireRole('professional')),
  tags,
  summary: 'List bonos',
  request: {
    query: z.object({
      patient_id: z.string().uuid().optional(),
      status: z.string().optional(),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({ data: z.array(selectBonoSchema) }),
      'List of bonos',
    ),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(createMessageObjectSchema('Unauthorized'), 'Unauthorized'),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(createMessageObjectSchema('Insufficient permissions'), 'Insufficient permissions'),
  },
});

// POST /
export const create = createRoute({
  method: 'post',
  path: '/',
  middleware: defineMiddleware(authMiddleware, requireRole('professional')),
  tags,
  summary: 'Create a bono',
  request: {
    body: jsonContentRequired(insertBonoSchema, 'Bono to create'),
  },
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(selectBonoSchema, 'The created bono'),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(createMessageObjectSchema('Unauthorized'), 'Unauthorized'),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(createMessageObjectSchema('Insufficient permissions'), 'Insufficient permissions'),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(createMessageObjectSchema('Validation error'), 'Validation error'),
  },
});

// GET /:id
export const getOne = createRoute({
  method: 'get',
  path: '/{id}',
  middleware: defineMiddleware(authMiddleware),
  tags,
  summary: 'Get a bono by ID',
  request: {
    params: idParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(bonoWithRemainingSchema, 'The bono with remaining sessions'),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(createMessageObjectSchema('Bono not found'), 'Bono not found'),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(createMessageObjectSchema('Unauthorized'), 'Unauthorized'),
  },
});

// GET /:id/transactions
export const listTransactions = createRoute({
  method: 'get',
  path: '/{id}/transactions',
  middleware: defineMiddleware(authMiddleware, requireRole('professional')),
  tags,
  summary: 'List bono transactions',
  request: {
    params: idParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({ data: z.array(bonoTransactionSchema) }),
      'List of bono transactions',
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(createMessageObjectSchema('Bono not found'), 'Bono not found'),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(createMessageObjectSchema('Unauthorized'), 'Unauthorized'),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(createMessageObjectSchema('Insufficient permissions'), 'Insufficient permissions'),
  },
});

// POST /:id/deduct
export const deduct = createRoute({
  method: 'post',
  path: '/{id}/deduct',
  middleware: defineMiddleware(authMiddleware, requireRole('professional')),
  tags,
  summary: 'Deduct a session from a bono',
  request: {
    params: idParamsSchema,
    body: jsonContentRequired(deductBonoSchema, 'Deduction data'),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(selectBonoSchema, 'The updated bono'),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(createMessageObjectSchema('Bono exhausted or no remaining sessions'), 'Bono exhausted or no remaining sessions'),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(createMessageObjectSchema('Bono not found'), 'Bono not found'),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(createMessageObjectSchema('Unauthorized'), 'Unauthorized'),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(createMessageObjectSchema('Insufficient permissions'), 'Insufficient permissions'),
  },
});

export type ListRoute = typeof list;
export type CreateRoute = typeof create;
export type GetOneRoute = typeof getOne;
export type ListTransactionsRoute = typeof listTransactions;
export type DeductRoute = typeof deduct;
