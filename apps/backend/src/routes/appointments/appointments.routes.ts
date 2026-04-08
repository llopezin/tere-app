import { createRoute, z } from '@hono/zod-openapi';
import {
  selectAppointmentSchema,
  insertAppointmentSchema,
  updateAppointmentSchema,
  batchAppointmentSchema,
  recurringAppointmentSchema,
} from '../../db/schema/appointments.js';
import { paginationSchema, idParamsSchema } from '../../lib/schemas.js';
import * as HttpStatusCodes from 'stoker/http-status-codes';
import { jsonContent, jsonContentRequired } from 'stoker/openapi/helpers';
import { createMessageObjectSchema } from 'stoker/openapi/schemas';
import { authMiddleware, requireRole } from '../../middleware/auth.js';
import { defineMiddleware } from '../../lib/create-app.js';

const tags = ['Appointments'];

// GET /
export const list = createRoute({
  method: 'get',
  path: '/',
  middleware: defineMiddleware(authMiddleware, requireRole('professional')),
  tags,
  summary: 'List appointments',
  request: {
    query: paginationSchema.extend({
      from: z.string().optional(),
      to: z.string().optional(),
      status: z.string().optional(),
      patient_id: z.string().uuid().optional(),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({ data: z.array(selectAppointmentSchema), page: z.number(), per_page: z.number() }),
      'Paginated list of appointments',
    ),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(createMessageObjectSchema('Unauthorized'), 'Unauthorized'),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(createMessageObjectSchema('Insufficient permissions'), 'Insufficient permissions'),
  },
});

// POST /
export const create = createRoute({
  method: 'post',
  path: '/',
  middleware: defineMiddleware(authMiddleware),
  tags,
  summary: 'Create a single appointment',
  request: {
    body: jsonContentRequired(insertAppointmentSchema, 'Appointment to create'),
  },
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(selectAppointmentSchema, 'The created appointment'),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(createMessageObjectSchema('Unauthorized'), 'Unauthorized'),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(createMessageObjectSchema('RGPD consent required'), 'RGPD consent required'),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(createMessageObjectSchema('Appointment type not found'), 'Appointment type not found'),
    [HttpStatusCodes.CONFLICT]: jsonContent(createMessageObjectSchema('Time slot overlaps'), 'Time slot overlaps'),
  },
});

// POST /batch
export const batch = createRoute({
  method: 'post',
  path: '/batch',
  middleware: defineMiddleware(authMiddleware, requireRole('professional')),
  tags,
  summary: 'Create batch appointments',
  request: {
    body: jsonContentRequired(batchAppointmentSchema, 'Batch appointment data'),
  },
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(
      z.object({ data: z.array(selectAppointmentSchema) }),
      'The created appointments',
    ),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(createMessageObjectSchema('Unauthorized'), 'Unauthorized'),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(createMessageObjectSchema('RGPD consent or permissions'), 'RGPD consent or permissions'),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(createMessageObjectSchema('Appointment type not found'), 'Appointment type not found'),
    [HttpStatusCodes.CONFLICT]: jsonContent(createMessageObjectSchema('Time slot overlaps'), 'Time slot overlaps'),
  },
});

// POST /recurring
export const recurring = createRoute({
  method: 'post',
  path: '/recurring',
  middleware: defineMiddleware(authMiddleware, requireRole('professional')),
  tags,
  summary: 'Create recurring appointments',
  request: {
    body: jsonContentRequired(recurringAppointmentSchema, 'Recurring appointment data'),
  },
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(
      z.object({ data: z.array(selectAppointmentSchema), recurrence_group_id: z.string().uuid() }),
      'The created recurring appointments',
    ),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(createMessageObjectSchema('Unauthorized'), 'Unauthorized'),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(createMessageObjectSchema('RGPD consent or permissions'), 'RGPD consent or permissions'),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(createMessageObjectSchema('Appointment type not found'), 'Appointment type not found'),
    [HttpStatusCodes.CONFLICT]: jsonContent(createMessageObjectSchema('Time slot overlaps'), 'Time slot overlaps'),
  },
});

// GET /:id
export const getOne = createRoute({
  method: 'get',
  path: '/{id}',
  middleware: defineMiddleware(authMiddleware),
  tags,
  summary: 'Get an appointment by ID',
  request: {
    params: idParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(selectAppointmentSchema, 'The appointment'),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(createMessageObjectSchema('Appointment not found'), 'Appointment not found'),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(createMessageObjectSchema('Unauthorized'), 'Unauthorized'),
  },
});

// PUT /:id
export const update = createRoute({
  method: 'put',
  path: '/{id}',
  middleware: defineMiddleware(authMiddleware, requireRole('professional')),
  tags,
  summary: 'Update an appointment',
  request: {
    params: idParamsSchema,
    body: jsonContentRequired(updateAppointmentSchema, 'Fields to update'),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(selectAppointmentSchema, 'The updated appointment'),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(createMessageObjectSchema('Appointment not found'), 'Appointment not found'),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(createMessageObjectSchema('Unauthorized'), 'Unauthorized'),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(createMessageObjectSchema('Insufficient permissions'), 'Insufficient permissions'),
    [HttpStatusCodes.CONFLICT]: jsonContent(createMessageObjectSchema('Time slot overlaps'), 'Time slot overlaps'),
  },
});

// PATCH /:id/cancel
export const cancel = createRoute({
  method: 'patch',
  path: '/{id}/cancel',
  middleware: defineMiddleware(authMiddleware),
  tags,
  summary: 'Cancel an appointment',
  request: {
    params: idParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(selectAppointmentSchema, 'The cancelled appointment'),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(createMessageObjectSchema('Cannot cancel past appointment'), 'Cannot cancel past appointment'),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(createMessageObjectSchema('Appointment not found'), 'Appointment not found'),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(createMessageObjectSchema('Unauthorized'), 'Unauthorized'),
  },
});

// PATCH /:id/complete
export const complete = createRoute({
  method: 'patch',
  path: '/{id}/complete',
  middleware: defineMiddleware(authMiddleware, requireRole('professional')),
  tags,
  summary: 'Mark an appointment as completed',
  request: {
    params: idParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(selectAppointmentSchema, 'The completed appointment'),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(createMessageObjectSchema('Appointment not found'), 'Appointment not found'),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(createMessageObjectSchema('Unauthorized'), 'Unauthorized'),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(createMessageObjectSchema('Insufficient permissions'), 'Insufficient permissions'),
  },
});

// PATCH /:id/no-show
export const noShow = createRoute({
  method: 'patch',
  path: '/{id}/no-show',
  middleware: defineMiddleware(authMiddleware, requireRole('professional')),
  tags,
  summary: 'Mark an appointment as no-show',
  request: {
    params: idParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(selectAppointmentSchema, 'The no-show appointment'),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(createMessageObjectSchema('Appointment not found'), 'Appointment not found'),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(createMessageObjectSchema('Unauthorized'), 'Unauthorized'),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(createMessageObjectSchema('Insufficient permissions'), 'Insufficient permissions'),
  },
});

export type ListRoute = typeof list;
export type CreateRoute = typeof create;
export type BatchRoute = typeof batch;
export type RecurringRoute = typeof recurring;
export type GetOneRoute = typeof getOne;
export type UpdateRoute = typeof update;
export type CancelRoute = typeof cancel;
export type CompleteRoute = typeof complete;
export type NoShowRoute = typeof noShow;
