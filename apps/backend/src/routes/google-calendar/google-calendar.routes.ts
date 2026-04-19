import { createRoute, z } from '@hono/zod-openapi';
import * as HttpStatusCodes from 'stoker/http-status-codes';
import { jsonContent } from 'stoker/openapi/helpers';
import { createMessageObjectSchema } from 'stoker/openapi/schemas';
import { authMiddleware, requireRole } from '../../middleware/auth.js';
import { defineMiddleware } from '../../lib/create-app.js';

const BASE = '/integrations/google';

const statusSchema = z.object({
  connected: z.boolean(),
  email: z.string().nullable(),
  status: z.enum(['active', 'revoked']).nullable(),
  lastError: z.string().nullable(),
  lastSyncedAt: z.string().nullable(),
});

const authUrlSchema = z.object({
  authUrl: z.string().url(),
});

const messageSchema = z.object({
  message: z.string(),
});

export const status = createRoute({
  method: 'get',
  path: `${BASE}/status`,
  middleware: defineMiddleware(authMiddleware, requireRole('professional')),
  tags: ['Google Calendar'],
  summary: 'Get current Google Calendar integration status',
  responses: {
    [HttpStatusCodes.OK]: jsonContent(statusSchema, 'Integration status'),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(createMessageObjectSchema('Unauthorized'), 'Unauthorized'),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(createMessageObjectSchema('Forbidden'), 'Insufficient permissions'),
    [HttpStatusCodes.SERVICE_UNAVAILABLE]: jsonContent(messageSchema, 'Integration not configured'),
  },
});

export const connect = createRoute({
  method: 'post',
  path: `${BASE}/connect`,
  middleware: defineMiddleware(authMiddleware, requireRole('professional')),
  tags: ['Google Calendar'],
  summary: 'Start Google Calendar OAuth flow — returns an authUrl',
  responses: {
    [HttpStatusCodes.OK]: jsonContent(authUrlSchema, 'OAuth authorization URL'),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(createMessageObjectSchema('Unauthorized'), 'Unauthorized'),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(createMessageObjectSchema('Forbidden'), 'Insufficient permissions'),
    [HttpStatusCodes.SERVICE_UNAVAILABLE]: jsonContent(messageSchema, 'Integration not configured'),
  },
});

export const callback = createRoute({
  method: 'get',
  path: `${BASE}/callback`,
  tags: ['Google Calendar'],
  summary: 'OAuth callback — exchanges code, persists tokens, redirects to frontend',
  request: {
    query: z.object({
      code: z.string().optional(),
      state: z.string().optional(),
      error: z.string().optional(),
    }),
  },
  responses: {
    [HttpStatusCodes.MOVED_TEMPORARILY]: {
      description: 'Redirect to frontend integrations page',
    },
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(messageSchema, 'Invalid or missing parameters'),
    [HttpStatusCodes.SERVICE_UNAVAILABLE]: jsonContent(messageSchema, 'Integration not configured'),
  },
});

export const disconnect = createRoute({
  method: 'post',
  path: `${BASE}/disconnect`,
  middleware: defineMiddleware(authMiddleware, requireRole('professional')),
  tags: ['Google Calendar'],
  summary: 'Revoke tokens and remove the integration row',
  responses: {
    [HttpStatusCodes.OK]: jsonContent(messageSchema, 'Integration disconnected'),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(createMessageObjectSchema('Unauthorized'), 'Unauthorized'),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(createMessageObjectSchema('Forbidden'), 'Insufficient permissions'),
    [HttpStatusCodes.SERVICE_UNAVAILABLE]: jsonContent(messageSchema, 'Integration not configured'),
  },
});

export type StatusRoute = typeof status;
export type ConnectRoute = typeof connect;
export type CallbackRoute = typeof callback;
export type DisconnectRoute = typeof disconnect;
