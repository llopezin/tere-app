import { createRoute, z } from '@hono/zod-openapi';
import {
  selectAppointmentTypeSchema,
  insertAppointmentTypeSchema,
  updateAppointmentTypeSchema,
} from '../../../db/schema/appointment-types.js';
import { idParamsSchema } from '../../../lib/schemas.js';
import * as HttpStatusCodes from 'stoker/http-status-codes';
import { jsonContent, jsonContentRequired } from 'stoker/openapi/helpers';
import { createMessageObjectSchema } from 'stoker/openapi/schemas';

const tags = ['Professional / Appointment Types'];

export const list = createRoute({
  method: 'get',
  path: '/appointment-types',
  tags,
  summary: "List the authenticated professional's appointment types (including inactive)",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({ data: z.array(selectAppointmentTypeSchema) }),
      'List of appointment types',
    ),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(createMessageObjectSchema('Unauthorized'), 'Unauthorized'),
  },
});

export const create = createRoute({
  method: 'post',
  path: '/appointment-types',
  tags,
  summary: 'Create an appointment type',
  request: {
    body: jsonContentRequired(insertAppointmentTypeSchema, 'Appointment type to create'),
  },
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(selectAppointmentTypeSchema, 'The created appointment type'),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(createMessageObjectSchema('Unauthorized'), 'Unauthorized'),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(createMessageObjectSchema('Insufficient permissions'), 'Insufficient permissions'),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(createMessageObjectSchema('Validation error'), 'Validation error'),
  },
});

export const update = createRoute({
  method: 'put',
  path: '/appointment-types/{id}',
  tags,
  summary: 'Update an appointment type',
  request: {
    params: idParamsSchema,
    body: jsonContentRequired(updateAppointmentTypeSchema, 'Fields to update'),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(selectAppointmentTypeSchema, 'The updated appointment type'),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(createMessageObjectSchema('Appointment type not found'), 'Appointment type not found'),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(createMessageObjectSchema('Unauthorized'), 'Unauthorized'),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(createMessageObjectSchema('Insufficient permissions'), 'Insufficient permissions'),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(createMessageObjectSchema('Validation error'), 'Validation error'),
  },
});

export const remove = createRoute({
  method: 'delete',
  path: '/appointment-types/{id}',
  tags,
  summary: 'Deactivate an appointment type',
  request: {
    params: idParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({ message: z.string() }),
      'Appointment type deactivated',
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(createMessageObjectSchema('Appointment type not found'), 'Appointment type not found'),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(createMessageObjectSchema('Unauthorized'), 'Unauthorized'),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(createMessageObjectSchema('Insufficient permissions'), 'Insufficient permissions'),
  },
});

export type ListRoute = typeof list;
export type CreateRoute = typeof create;
export type UpdateRoute = typeof update;
export type RemoveRoute = typeof remove;
