import { createRoute, z } from '@hono/zod-openapi';
import * as HttpStatusCodes from 'stoker/http-status-codes';
import { jsonContent } from 'stoker/openapi/helpers';
import { createMessageObjectSchema } from 'stoker/openapi/schemas';
import { selectAppointmentTypeSchema } from '../../../db/schema/appointment-types.js';

const tags = ['Patient / Booking'];

/** Only what the booking screen needs: no tax id, address, phone, email or auth ids. */
export const bookableProfessionalSchema = z.object({
  id: z.string().uuid(),
  firstName: z.string(),
  lastName: z.string(),
  businessName: z.string().nullable(),
});

const professionalParamsSchema = z.object({
  professionalId: z.string().uuid(),
});

export const listProfessionals = createRoute({
  method: 'get',
  path: '/professionals',
  tags,
  summary: 'List professionals a patient can book with',
  responses: {
    [HttpStatusCodes.OK]: jsonContent(z.object({ data: z.array(bookableProfessionalSchema) }), 'Bookable professionals'),
  },
});

export const listAppointmentTypes = createRoute({
  method: 'get',
  path: '/professionals/{professionalId}/appointment-types',
  tags,
  summary: "List a professional's active appointment types",
  request: {
    params: professionalParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(z.object({ data: z.array(selectAppointmentTypeSchema) }), 'Active appointment types'),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(createMessageObjectSchema('Professional not found'), 'Professional not found'),
  },
});

export const getAvailability = createRoute({
  method: 'get',
  path: '/availability',
  tags,
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
  },
});

export type ListProfessionalsRoute = typeof listProfessionals;
export type ListAppointmentTypesRoute = typeof listAppointmentTypes;
export type GetAvailabilityRoute = typeof getAvailability;
