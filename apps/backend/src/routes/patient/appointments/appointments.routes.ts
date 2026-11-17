import { createRoute, z } from '@hono/zod-openapi';
import * as HttpStatusCodes from 'stoker/http-status-codes';
import { jsonContent, jsonContentRequired } from 'stoker/openapi/helpers';
import { createMessageObjectSchema } from 'stoker/openapi/schemas';
import { selectAppointmentSchema, bookAppointmentSchema } from '../../../db/schema/appointments.js';
import { paginationSchema, idParamsSchema } from '../../../lib/schemas.js';

const tags = ['Patient / Appointments'];

/** What "Mis citas" renders: names resolved on the server, no ids to cross-reference. */
const patientAppointmentListItemSchema = selectAppointmentSchema
  .pick({ id: true, startAt: true, endAt: true, status: true, price: true })
  .extend({ professionalName: z.string(), appointmentTypeName: z.string() });

export const list = createRoute({
  method: 'get',
  path: '/appointments',
  tags,
  summary: "List the authenticated patient's appointments",
  request: {
    query: paginationSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({ data: z.array(patientAppointmentListItemSchema), page: z.number(), per_page: z.number() }),
      'Paginated list of appointments with professional and appointment type names',
    ),
  },
});

export const create = createRoute({
  method: 'post',
  path: '/appointments',
  tags,
  summary: 'Book an appointment for the authenticated patient',
  request: {
    body: jsonContentRequired(bookAppointmentSchema, 'Appointment to book'),
  },
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(selectAppointmentSchema, 'The created appointment'),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(createMessageObjectSchema('RGPD consent required'), 'RGPD consent required'),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(createMessageObjectSchema('Appointment type not found'), 'Appointment type not found'),
    [HttpStatusCodes.CONFLICT]: jsonContent(createMessageObjectSchema('Time slot overlaps'), 'Time slot overlaps'),
  },
});

export const getOne = createRoute({
  method: 'get',
  path: '/appointments/{id}',
  tags,
  summary: 'Get one of my appointments',
  request: {
    params: idParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(selectAppointmentSchema, 'The appointment'),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(createMessageObjectSchema('Appointment not found'), 'Appointment not found'),
  },
});

export const cancel = createRoute({
  method: 'patch',
  path: '/appointments/{id}/cancel',
  tags,
  summary: 'Cancel one of my appointments',
  request: {
    params: idParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(selectAppointmentSchema, 'The cancelled appointment'),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(createMessageObjectSchema('Cannot cancel past appointment'), 'Cannot cancel past appointment'),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(createMessageObjectSchema('Appointment not found'), 'Appointment not found'),
  },
});

export type ListRoute = typeof list;
export type CreateRoute = typeof create;
export type GetOneRoute = typeof getOne;
export type CancelRoute = typeof cancel;
