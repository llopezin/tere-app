import { createRoute, z } from '@hono/zod-openapi';
import { selectInvoiceSchema, insertInvoiceSchema } from '../../db/schema/invoices.js';
import { paginationSchema, idParamsSchema } from '../../lib/schemas.js';
import * as HttpStatusCodes from 'stoker/http-status-codes';
import { jsonContent, jsonContentRequired } from 'stoker/openapi/helpers';
import { createMessageObjectSchema } from 'stoker/openapi/schemas';
import { authMiddleware } from '../../middleware/auth.js';

const tags = ['Invoices'];

// GET /
export const list = createRoute({
  method: 'get',
  path: '/',
  middleware: [authMiddleware],
  tags,
  summary: 'List invoices',
  request: {
    query: paginationSchema.extend({
      patient_id: z.string().uuid().optional(),
      from: z.string().optional(),
      to: z.string().optional(),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({ data: z.array(selectInvoiceSchema), page: z.number(), per_page: z.number() }),
      'Paginated list of invoices',
    ),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(createMessageObjectSchema('Unauthorized'), 'Unauthorized'),
  },
});

// POST /
export const create = createRoute({
  method: 'post',
  path: '/',
  middleware: [authMiddleware],
  tags,
  summary: 'Create an invoice',
  request: {
    body: jsonContentRequired(insertInvoiceSchema, 'Invoice to create'),
  },
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(selectInvoiceSchema, 'The created invoice'),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(createMessageObjectSchema('Appointment not found'), 'Appointment not found'),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(createMessageObjectSchema('Not authorized'), 'Not authorized'),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(createMessageObjectSchema('Unauthorized'), 'Unauthorized'),
  },
});

// GET /:id
export const getOne = createRoute({
  method: 'get',
  path: '/{id}',
  middleware: [authMiddleware],
  tags,
  summary: 'Get an invoice by ID',
  request: {
    params: idParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(selectInvoiceSchema, 'The invoice'),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(createMessageObjectSchema('Invoice not found'), 'Invoice not found'),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(createMessageObjectSchema('Unauthorized'), 'Unauthorized'),
  },
});

// GET /:id/pdf
export const getPdf = createRoute({
  method: 'get',
  path: '/{id}/pdf',
  middleware: [authMiddleware],
  tags,
  summary: 'Get invoice PDF or HTML preview',
  request: {
    params: idParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: { description: 'HTML invoice or redirect to PDF URL' },
    [HttpStatusCodes.NOT_FOUND]: jsonContent(createMessageObjectSchema('Invoice not found'), 'Invoice not found'),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(createMessageObjectSchema('Unauthorized'), 'Unauthorized'),
  },
});

export type ListRoute = typeof list;
export type CreateRoute = typeof create;
export type GetOneRoute = typeof getOne;
export type GetPdfRoute = typeof getPdf;
