import type { ErrorHandler } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { onError as stokerOnError } from 'stoker/middlewares';

/**
 * Stable, machine-readable error codes the clients can map to UI messages
 * (instead of matching the English `message`).
 */
export type ApiErrorCode =
  | 'BOOKING_IN_PAST'
  | 'BOOKING_OUTSIDE_WINDOW'
  | 'RGPD_CONSENT_REQUIRED'
  | 'SLOT_UNAVAILABLE';

export class AppError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: ApiErrorCode,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/** Adds `code` to the JSON body for coded AppErrors; everything else is handled by stoker. */
export const onError: ErrorHandler = (err, c) => {
  if (err instanceof AppError && err.code) {
    return c.json({ message: err.message, code: err.code }, err.status as ContentfulStatusCode);
  }
  return stokerOnError(err, c);
};
