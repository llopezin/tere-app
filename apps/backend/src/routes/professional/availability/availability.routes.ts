import { createRoute, z } from '@hono/zod-openapi';
import * as HttpStatusCodes from 'stoker/http-status-codes';
import { jsonContent } from 'stoker/openapi/helpers';
import { createMessageObjectSchema } from 'stoker/openapi/schemas';
import { availabilityRangeSchema, refineAvailabilityRange } from '../../../lib/schemas.js';

export const getAvailability = createRoute({
  method: 'get',
  path: '/availability',
  tags: ['Professional / Availability'],
  summary: 'Compute available slots in the authenticated professional\'s agenda',
  request: {
    query: availabilityRangeSchema
      .extend({ appointment_type_id: z.string().uuid() })
      .superRefine(refineAvailabilityRange),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        slots: z.array(z.object({
          start_at: z.string(),
          end_at: z.string(),
        })),
      }),
      'Available appointment slots',
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(createMessageObjectSchema('Validation error'), 'Invalid date range'),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(createMessageObjectSchema('Appointment type not found'), 'Appointment type not found'),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(createMessageObjectSchema('Unauthorized'), 'Unauthorized'),
  },
});

export type GetAvailabilityRoute = typeof getAvailability;
