import { createRoute, z } from '@hono/zod-openapi';
import * as HttpStatusCodes from 'stoker/http-status-codes';
import { jsonContent } from 'stoker/openapi/helpers';
import { createMessageObjectSchema } from 'stoker/openapi/schemas';
import { authMiddleware, requireRole } from '../../middleware/auth.js';
import { defineMiddleware } from '../../lib/create-app.js';

const tags = ['Reports'];

const yearMonthQuerySchema = z.object({
  year: z.coerce.number().int(),
  month: z.coerce.number().int().min(1).max(12),
});

// GET /revenue/monthly
export const revenueMonthly = createRoute({
  method: 'get',
  path: '/reports/revenue/monthly',
  middleware: defineMiddleware(authMiddleware, requireRole('professional')),
  tags,
  summary: 'Monthly revenue report',
  request: {
    query: yearMonthQuerySchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        year: z.number(),
        month: z.number(),
        total: z.number(),
        payment_count: z.number(),
      }),
      'Monthly revenue summary',
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(createMessageObjectSchema('Invalid query params'), 'Invalid query params'),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(createMessageObjectSchema('Unauthorized'), 'Unauthorized'),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(createMessageObjectSchema('Insufficient permissions'), 'Insufficient permissions'),
  },
});

// GET /revenue/quarterly
export const revenueQuarterly = createRoute({
  method: 'get',
  path: '/reports/revenue/quarterly',
  middleware: defineMiddleware(authMiddleware, requireRole('professional')),
  tags,
  summary: 'Quarterly revenue report',
  request: {
    query: z.object({
      year: z.coerce.number().int(),
      quarter: z.coerce.number().int().min(1).max(4),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        year: z.number(),
        quarter: z.number(),
        total: z.number(),
        by_month: z.array(z.object({ month: z.number(), total: z.number() })),
      }),
      'Quarterly revenue breakdown by month',
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(createMessageObjectSchema('Invalid query params'), 'Invalid query params'),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(createMessageObjectSchema('Unauthorized'), 'Unauthorized'),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(createMessageObjectSchema('Insufficient permissions'), 'Insufficient permissions'),
  },
});

// GET /revenue/by-method
export const revenueByMethod = createRoute({
  method: 'get',
  path: '/reports/revenue/by-method',
  middleware: defineMiddleware(authMiddleware, requireRole('professional')),
  tags,
  summary: 'Revenue breakdown by payment method',
  request: {
    query: yearMonthQuerySchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        year: z.number(),
        month: z.number(),
        total: z.number(),
        by_method: z.array(z.object({
          method: z.string(),
          total: z.number(),
          count: z.number(),
          percentage: z.number(),
        })),
      }),
      'Revenue breakdown by payment method',
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(createMessageObjectSchema('Invalid query params'), 'Invalid query params'),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(createMessageObjectSchema('Unauthorized'), 'Unauthorized'),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(createMessageObjectSchema('Insufficient permissions'), 'Insufficient permissions'),
  },
});

export type RevenueMonthlyRoute = typeof revenueMonthly;
export type RevenueQuarterlyRoute = typeof revenueQuarterly;
export type RevenueByMethodRoute = typeof revenueByMethod;
