import { z } from 'zod';

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(20),
});

export const dateRangeSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});

/** Max days per availability request (the client asks for one week at a time). */
export const MAX_AVAILABILITY_RANGE_DAYS = 31;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Required `from`/`to` dates (YYYY-MM-DD) for availability queries. */
export const availabilityRangeSchema = z.object({
  from: z.string().date(),
  to: z.string().date(),
});

/** Use with `.superRefine`: `from <= to` and at most MAX_AVAILABILITY_RANGE_DAYS days. */
export function refineAvailabilityRange(q: { from: string; to: string }, ctx: z.RefinementCtx) {
  if (q.from > q.to) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['to'], message: '`from` must be before or equal to `to`' });
  } else if ((Date.parse(q.to) - Date.parse(q.from)) / DAY_MS >= MAX_AVAILABILITY_RANGE_DAYS) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['to'], message: `Range cannot exceed ${MAX_AVAILABILITY_RANGE_DAYS} days` });
  }
}

export const idParamsSchema = z.object({
  id: z.string().uuid(),
});
