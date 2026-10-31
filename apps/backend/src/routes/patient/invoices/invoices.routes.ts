import { createRoute, z } from '@hono/zod-openapi';
import { selectInvoiceSchema } from '../../../db/schema/invoices.js';
import { paginationSchema, idParamsSchema } from '../../../lib/schemas.js';
import * as HttpStatusCodes from 'stoker/http-status-codes';
import { jsonContent } from 'stoker/openapi/helpers';
import { createMessageObjectSchema } from 'stoker/openapi/schemas';

const tags = ['Patient / Invoices'];

// GET /
export const list = createRoute({
  method: 'get',
  path: '/invoices',
  tags,
  summary: 'List invoices',
  request: {
    query: paginationSchema.extend({
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
export const getOne = createRoute({
  method: 'get',
  path: '/invoices/{id}',
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
  path: '/invoices/{id}/pdf',
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
export type GetOneRoute = typeof getOne;
export type GetPdfRoute = typeof getPdf;
