import { createRoute, z } from '@hono/zod-openapi';
import * as HttpStatusCodes from 'stoker/http-status-codes';
import { jsonContent, jsonContentRequired } from 'stoker/openapi/helpers';
import { createMessageObjectSchema } from 'stoker/openapi/schemas';
import { selectWorkingScheduleSchema, bulkScheduleSchema } from '../../db/schema/working-schedules.js';
import { authMiddleware, requireRole } from '../../middleware/auth.js';
import { defineMiddleware } from '../../lib/create-app.js';

export const list = createRoute({
  method: 'get',
  path: '/working-schedules',
  middleware: defineMiddleware(authMiddleware, requireRole('professional')),
  tags: ['Working Schedules'],
  summary: 'List working schedules for the authenticated professional',
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({ data: z.array(selectWorkingScheduleSchema) }),
      'List of working schedules',
    ),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(createMessageObjectSchema('Unauthorized'), 'Unauthorized'),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(createMessageObjectSchema('Insufficient permissions'), 'Insufficient permissions'),
  },
});

export const bulkReplace = createRoute({
  method: 'put',
  path: '/working-schedules',
  middleware: defineMiddleware(authMiddleware, requireRole('professional')),
  tags: ['Working Schedules'],
  summary: 'Bulk replace working schedules for the authenticated professional',
  request: {
    body: jsonContentRequired(bulkScheduleSchema, 'Schedule slots to set'),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({ data: z.array(selectWorkingScheduleSchema) }),
      'The replaced working schedules',
    ),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(createMessageObjectSchema('Unauthorized'), 'Unauthorized'),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(createMessageObjectSchema('Insufficient permissions'), 'Insufficient permissions'),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(createMessageObjectSchema('Validation error'), 'Validation error'),
  },
});

export type ListRoute = typeof list;
export type BulkReplaceRoute = typeof bulkReplace;
