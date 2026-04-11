import { createRoute, z } from '@hono/zod-openapi';
import * as HttpStatusCodes from 'stoker/http-status-codes';
import { jsonContent } from 'stoker/openapi/helpers';
import { createMessageObjectSchema } from 'stoker/openapi/schemas';
import { authMiddleware } from '../../middleware/auth.js';
import { defineMiddleware } from '../../lib/create-app.js';

export const getAvailability = createRoute({
  method: 'get',
  path: '/availability',
  middleware: defineMiddleware(authMiddleware),
  tags: ['Availability'],
  summary: 'Compute available appointment slots for a professional',
  request: {
    query: z.object({
      professional_id: z.string().uuid(),
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
