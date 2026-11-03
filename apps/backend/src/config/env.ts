import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

/** docker compose passes unset variables as empty strings: treat them as unset. */
const emptyAsUndefined = (value: unknown) => (value === '' ? undefined : value);

/** `https://app.example.com/` → `https://app.example.com`: the exact form browsers send in the `Origin` header. */
const toOrigin = (url: string) => new URL(url).origin;

/** Optional frontend URL, stored as an origin. An invalid URL stops the server at startup. */
const originSchema = z.preprocess(emptyAsUndefined, z.string().url().transform(toOrigin).optional());

const envSchema = z.object({
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid connection string'),
  BETTER_AUTH_SECRET: z.string().min(32, 'BETTER_AUTH_SECRET must be at least 32 characters'),
  BETTER_AUTH_URL: z.string().default('http://localhost:3000'),
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CLIENT_APP_URL: originSchema,
  PROFESSIONAL_APP_URL: originSchema,
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().optional(),
  GCAL_SYNC_ENABLED: z.coerce.boolean().default(false),
});

const parsed = envSchema.parse(process.env);

const isProduction = parsed.NODE_ENV === 'production';

// In production an unset PROFESSIONAL_APP_URL must not turn into a trusted localhost origin:
// professional-app is simply disabled (its BFF rejects browser requests) until it is configured.
const professionalAppUrl = parsed.PROFESSIONAL_APP_URL ?? (isProduction ? undefined : 'http://localhost:5174');
if (!professionalAppUrl) {
  console.warn('⚠️  PROFESSIONAL_APP_URL is not set: professional-app origin is not trusted and its BFF rejects browser requests.');
}

export const env = {
  ...parsed,
  CLIENT_APP_URL: parsed.CLIENT_APP_URL ?? 'http://localhost:5173',
  PROFESSIONAL_APP_URL: professionalAppUrl,
};

export const trustedFrontendOrigins = [env.CLIENT_APP_URL, env.PROFESSIONAL_APP_URL].filter(
  (origin): origin is string => !!origin,
);
