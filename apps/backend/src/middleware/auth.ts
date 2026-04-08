import type { Context, Next } from 'hono';
import { auth, type Session } from '../lib/auth.js';
import { AppError } from './error-handler.js';

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

/** Extracts profileId from the authenticated user, throws 403 if not set */
export function getProfileId(c: Context): string {
  const user = c.get('user');
  if (!user?.profileId) {
    throw new AppError(403, 'Profile not configured. Complete signup first.');
  }
  return user.profileId;
}
