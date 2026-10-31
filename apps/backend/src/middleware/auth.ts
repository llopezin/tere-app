import type { Context, Next } from 'hono';
import { auth, type Session } from '../lib/auth.js';
import { AppError } from './error-handler.js';
import { normalizeOrigin } from './origin.js';

type AuthUser = Session['user'];
type AuthSession = Session['session'];

declare module 'hono' {
  interface ContextVariableMap {
    user: AuthUser;
    session: AuthSession;
  }
}

export async function authMiddleware(c: Context, next: Next) {
  const result = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!result) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  c.set('user', result.user);
  c.set('session', result.session);
  await next();
}

export function requireRole(...roles: Array<'professional' | 'patient'>) {
  return async (c: Context, next: Next) => {
    const user = c.get('user');
    if (!user || !roles.includes(user.role as 'professional' | 'patient')) {
      return c.json({ error: 'Insufficient permissions' }, 403);
    }
    await next();
  };
}

/**
 * Restricts a BFF to the frontend it serves.
 * Browsers always send `Origin` on cross-origin requests, so a request coming from another app is rejected.
 * Requests without `Origin` (same-origin GETs, server-to-server, curl) pass: this is defense in depth,
 * the role guard is what actually enforces access.
 */
export function requireOrigin(...allowed: Array<string | undefined>) {
  // An unset origin (e.g. PROFESSIONAL_APP_URL missing in production) allows no browser origin at all
  const allowedOrigins = new Set(allowed.filter((o): o is string => !!o).map(normalizeOrigin));
  return async (c: Context, next: Next) => {
    const origin = c.req.header('origin');
    if (origin && !allowedOrigins.has(normalizeOrigin(origin))) {
      return c.json({ error: 'Origin not allowed' }, 403);
    }
    await next();
  };
}

/** Extracts profileId from the authenticated user, throws 403 if not set */
export function getProfileId(c: Context): string {
  const user = c.get('user');
  if (!user?.profileId) {
    throw new AppError(403, 'Profile not configured. Complete signup first.');
  }
  return user.profileId;
}
