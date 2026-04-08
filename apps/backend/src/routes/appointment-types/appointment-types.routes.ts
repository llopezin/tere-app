import { createRoute, z } from '@hono/zod-openapi';
import {
  selectAppointmentTypeSchema,
  insertAppointmentTypeSchema,
  updateAppointmentTypeSchema,
} from '../../db/schema/appointment-types.js';
import { idParamsSchema } from '../../lib/schemas.js';
import * as HttpStatusCodes from 'stoker/http-status-codes';
import { jsonContent, jsonContentRequired } from 'stoker/openapi/helpers';
import { createMessageObjectSchema } from 'stoker/openapi/schemas';
import { authMiddleware, requireRole } from '../../middleware/auth.js';
import { defineMiddleware } from '../../lib/create-app.js';

const tags = ['Appointment Types'];

export const list = createRoute({
  method: 'get',
  path: '/',
  middleware: defineMiddleware(authMiddleware),
  tags,
  summary: 'List appointment types',
  request: {
    query: z.object({
      professional_id: z.string().uuid().optional(),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({ data: z.array(selectAppointmentTypeSchema) }),
      'List of appointment types',
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(createMessageObjectSchema('Missing professional_id'), 'Missing professional_id'),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(createMessageObjectSchema('Unauthorized'), 'Unauthorized'),
  },
});

export const create = createRoute({
  method: 'post',
  path: '/',
  middleware: defineMiddleware(authMiddleware, requireRole('professional')),
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
  path: '/{id}',
  middleware: defineMiddleware(authMiddleware, requireRole('professional')),
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
  path: '/{id}',
  middleware: defineMiddleware(authMiddleware, requireRole('professional')),
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
