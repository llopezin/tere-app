import { ApiError } from "@/lib/api-error";

const MAX_RETRIES = 3;
const RETRYABLE_STATUSES = new Set([408, 429]);

// Only transient failures are retried: network errors, timeouts, rate limits and 5xx.
// 4xx (auth, validation, not found) fail immediately.
export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  if (failureCount >= MAX_RETRIES) return false;
  if (!(error instanceof ApiError)) return true;
  return error.status >= 500 || RETRYABLE_STATUSES.has(error.status);
}
