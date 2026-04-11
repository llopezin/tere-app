import { createRoute, z } from '@hono/zod-openapi';
import * as HttpStatusCodes from 'stoker/http-status-codes';
import { jsonContent } from 'stoker/openapi/helpers';
import { createMessageObjectSchema } from 'stoker/openapi/schemas';
import { authMiddleware, requireRole } from '../../middleware/auth.js';
import { defineMiddleware } from '../../lib/create-app.js';

export const connect = createRoute({
  method: 'post',
  path: '/integrations/google-calendar/connect',
  middleware: defineMiddleware(authMiddleware, requireRole('professional')),
  tags: ['Google Calendar'],
  summary: 'Initiate Google Calendar OAuth flow (stub)',
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        message: z.string(),
        redirect_url: z.string(),
      }),
      'OAuth flow initiated',
    ),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(createMessageObjectSchema('Unauthorized'), 'Unauthorized'),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(createMessageObjectSchema('Insufficient permissions'), 'Insufficient permissions'),
  },
});

export const disconnect = createRoute({
  method: 'delete',
  path: '/integrations/google-calendar/disconnect',
  middleware: defineMiddleware(authMiddleware, requireRole('professional')),
  tags: ['Google Calendar'],
  summary: 'Disconnect Google Calendar integration',
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({ message: z.string() }),
      'Google Calendar disconnected',
    ),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(createMessageObjectSchema('Unauthorized'), 'Unauthorized'),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(createMessageObjectSchema('Insufficient permissions'), 'Insufficient permissions'),
  },
});

export const sync = createRoute({
  method: 'post',
  path: '/integrations/google-calendar/sync',
  middleware: defineMiddleware(authMiddleware, requireRole('professional')),
  tags: ['Google Calendar'],
  summary: 'Sync appointments to Google Calendar (stub)',
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        message: z.string(),
        synced_count: z.number(),
      }),
      'Calendar sync result',
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(createMessageObjectSchema('Google Calendar not connected'), 'Google Calendar not connected'),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(createMessageObjectSchema('Unauthorized'), 'Unauthorized'),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(createMessageObjectSchema('Insufficient permissions'), 'Insufficient permissions'),
  },
});

export type ConnectRoute = typeof connect;
export type DisconnectRoute = typeof disconnect;
export type SyncRoute = typeof sync;
