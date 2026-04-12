import { OpenAPIHono } from '@hono/zod-openapi';
import { defaultHook } from 'stoker/openapi';
import type { MiddlewareHandler } from 'hono';
import type { AppBindings } from './types.js';

export function createRouter() {
  return new OpenAPIHono<AppBindings>({ strict: false, defaultHook });
}

export function defineMiddleware<T extends MiddlewareHandler[]>(...handlers: T): T {
  return handlers;
}

export default function createApp() {
  const app = createRouter();
  return app;
}
