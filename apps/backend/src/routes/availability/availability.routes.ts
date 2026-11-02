import { createRoute, z } from '@hono/zod-openapi';
import * as HttpStatusCodes from 'stoker/http-status-codes';
import { jsonContent } from 'stoker/openapi/helpers';
import { createMessageObjectSchema } from 'stoker/openapi/schemas';
import { authMiddleware } from '../../middleware/auth.js';
import { defineMiddleware } from '../../lib/create-app.js';

/** Max days per availability request (the client asks for one week at a time). */
const MAX_RANGE_DAYS = 31;
const DAY_MS = 24 * 60 * 60 * 1000;

const availabilityQuerySchema = z
  .object({
    professional_id: z.string().uuid(),
    appointment_type_id: z.string().uuid(),
    from: z.string().date(),
    to: z.string().date(),
  })
  .refine((q) => q.from <= q.to, { message: '`from` must be before or equal to `to`', path: ['to'] })
  .refine((q) => (Date.parse(q.to) - Date.parse(q.from)) / DAY_MS < MAX_RANGE_DAYS, {
    message: `Range cannot exceed ${MAX_RANGE_DAYS} days`,
    path: ['to'],
  });

export const getAvailability = createRoute({
  method: 'get',
  path: '/availability',
  middleware: defineMiddleware(authMiddleware),
  tags: ['Availability'],
  summary: 'Compute available appointment slots for a professional',
  request: {
    query: availabilityQuerySchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        slots: z.array(z.object({
          start_at: z.string(),
          end_at: z.string(),
        })),
        booking_window_last_day: z.string().nullable().openapi({
          description:
            'Last bookable day for the caller (YYYY-MM-DD, clinic time). Null for professionals, who are not limited.',
        }),
      }),
      'Available appointment slots',
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(createMessageObjectSchema('Validation error'), 'Invalid date range'),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(createMessageObjectSchema('Appointment type not found'), 'Appointment type not found'),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(createMessageObjectSchema('Unauthorized'), 'Unauthorized'),
  },
});

export type GetAvailabilityRoute = typeof getAvailability;
