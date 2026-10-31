import { createRoute, z } from '@hono/zod-openapi';
import * as HttpStatusCodes from 'stoker/http-status-codes';
import { jsonContent } from 'stoker/openapi/helpers';
import { createMessageObjectSchema } from 'stoker/openapi/schemas';

export const getAvailability = createRoute({
  method: 'get',
  path: '/availability',
  tags: ['Professional / Availability'],
  summary: 'Compute available slots in the authenticated professional\'s agenda',
  request: {
    query: z.object({
      appointment_type_id: z.string().uuid(),
      from: z.string(),
      to: z.string(),
    }),
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
    [HttpStatusCodes.NOT_FOUND]: jsonContent(createMessageObjectSchema('Appointment type not found'), 'Appointment type not found'),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(createMessageObjectSchema('Unauthorized'), 'Unauthorized'),
  },
});

export type GetAvailabilityRoute = typeof getAvailability;
