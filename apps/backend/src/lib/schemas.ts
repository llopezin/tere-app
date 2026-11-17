import { z } from 'zod';

/** Treats an empty string (unset env var, empty query param) as unset. */
export const emptyAsUndefined = (value: unknown) => (value === '' ? undefined : value);

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(20),
});

export const dateRangeSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});

export const idParamsSchema = z.object({
  id: z.string().uuid(),
});
