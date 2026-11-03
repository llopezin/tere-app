import { describe, test, expect } from 'vitest';
import { Hono } from 'hono';
import { AppError, onError } from '../middleware/error-handler.js';

function appThrowing(err: Error) {
  const app = new Hono();
  app.get('/', () => {
    throw err;
  });
  app.onError(onError);
  return app;
}

describe('onError', () => {
  test('returns status, message and code for coded AppErrors', async () => {
    const res = await appThrowing(new AppError(400, 'Out of window', 'BOOKING_OUTSIDE_WINDOW')).request('/');
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ message: 'Out of window', code: 'BOOKING_OUTSIDE_WINDOW' });
  });

  test('keeps the default behaviour for AppErrors without code', async () => {
    const res = await appThrowing(new AppError(404, 'Not found')).request('/');
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.message).toBe('Not found');
    expect(body.code).toBeUndefined();
  });

  test('maps unknown errors to 500', async () => {
    const res = await appThrowing(new Error('boom')).request('/');
    expect(res.status).toBe(500);
  });
});
