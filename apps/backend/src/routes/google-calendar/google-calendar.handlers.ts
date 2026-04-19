import crypto from 'node:crypto';
import { eq } from 'drizzle-orm';
import { setCookie, getCookie, deleteCookie } from 'hono/cookie';
import * as HttpStatusCodes from 'stoker/http-status-codes';
import type { AppRouteHandler } from '../../lib/types.js';
import type {
  StatusRoute,
  ConnectRoute,
  CallbackRoute,
  DisconnectRoute,
} from './google-calendar.routes.js';
import { db } from '../../db/index.js';
import { googleCalendarIntegrations } from '../../db/schema/google-calendar-integrations.js';
import { getProfileId } from '../../middleware/auth.js';
import { env } from '../../config/env.js';
import { createOAuthClient } from '../../services/google-calendar/oauth-client.js';

const STATE_COOKIE = 'gcal_oauth_state';
const STATE_TTL_SECONDS = 600;
const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'openid',
  'email',
];

function isConfigured(): boolean {
  return Boolean(env.GCAL_SYNC_ENABLED && env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_REDIRECT_URI);
}

function signState(profileId: string, nonce: string, issuedAt: number): string {
  const payload = `${profileId}.${nonce}.${issuedAt}`;
  const mac = crypto.createHmac('sha256', env.BETTER_AUTH_SECRET).update(payload).digest('base64url');
  return `${payload}.${mac}`;
}

function verifyState(state: string): { profileId: string; nonce: string; issuedAt: number } | null {
  const parts = state.split('.');
  if (parts.length !== 4) return null;
  const [profileId, nonce, issuedAtStr, mac] = parts;
  const expected = crypto
    .createHmac('sha256', env.BETTER_AUTH_SECRET)
    .update(`${profileId}.${nonce}.${issuedAtStr}`)
    .digest('base64url');
  const macBuf = Buffer.from(mac);
  const expectedBuf = Buffer.from(expected);
  if (macBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(macBuf, expectedBuf)) return null;
  const issuedAt = Number.parseInt(issuedAtStr, 10);
  if (!Number.isFinite(issuedAt)) return null;
  if (Date.now() / 1000 - issuedAt > STATE_TTL_SECONDS) return null;
  return { profileId, nonce, issuedAt };
}

export const status: AppRouteHandler<StatusRoute> = async (c) => {
  if (!isConfigured()) {
    return c.json({ message: 'Google Calendar integration not configured' }, HttpStatusCodes.SERVICE_UNAVAILABLE);
  }
  const profileId = getProfileId(c);
  const [row] = await db
    .select()
    .from(googleCalendarIntegrations)
    .where(eq(googleCalendarIntegrations.professionalId, profileId));

  if (!row) {
    return c.json(
      { connected: false, email: null, status: null, lastError: null, lastSyncedAt: null },
      HttpStatusCodes.OK,
    );
  }

  return c.json(
    {
      connected: row.status === 'active',
      email: row.googleEmail,
      status: row.status,
      lastError: row.lastError,
      lastSyncedAt: row.lastSyncedAt ? row.lastSyncedAt.toISOString() : null,
    },
    HttpStatusCodes.OK,
  );
};

export const connect: AppRouteHandler<ConnectRoute> = async (c) => {
  if (!isConfigured()) {
    return c.json({ message: 'Google Calendar integration not configured' }, HttpStatusCodes.SERVICE_UNAVAILABLE);
  }
  const profileId = getProfileId(c);
  const nonce = crypto.randomBytes(16).toString('base64url');
  const issuedAt = Math.floor(Date.now() / 1000);
  const state = signState(profileId, nonce, issuedAt);

  setCookie(c, STATE_COOKIE, state, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'Lax',
    path: '/',
    maxAge: STATE_TTL_SECONDS,
  });

  const client = createOAuthClient();
  const authUrl = client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
    state,
  });

  return c.json({ authUrl }, HttpStatusCodes.OK);
};

export const callback: AppRouteHandler<CallbackRoute> = async (c) => {
  if (!isConfigured()) {
    return c.json({ message: 'Google Calendar integration not configured' }, HttpStatusCodes.SERVICE_UNAVAILABLE);
  }
  const { code, state, error } = c.req.valid('query');
  const cookie = getCookie(c, STATE_COOKIE);
  deleteCookie(c, STATE_COOKIE, { path: '/' });

  const redirect = (params: Record<string, string>) => {
    const url = new URL('/ajustes/integraciones', env.FRONTEND_URL);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    return c.redirect(url.toString(), HttpStatusCodes.MOVED_TEMPORARILY);
  };

  if (error) return redirect({ gcal: 'error', reason: error });
  if (!code || !state || !cookie || state !== cookie) {
    return redirect({ gcal: 'error', reason: 'invalid_state' });
  }

  const verified = verifyState(state);
  if (!verified) return redirect({ gcal: 'error', reason: 'invalid_state' });

  try {
    const client = createOAuthClient();
    const { tokens } = await client.getToken(code);
    if (!tokens.access_token || !tokens.refresh_token) {
      return redirect({ gcal: 'error', reason: 'missing_tokens' });
    }

    let googleSub = '';
    let googleEmail = '';
    if (tokens.id_token) {
      const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: env.GOOGLE_CLIENT_ID });
      const payload = ticket.getPayload();
      googleSub = payload?.sub ?? '';
      googleEmail = payload?.email ?? '';
    }

    const expiresAt = tokens.expiry_date ? new Date(tokens.expiry_date) : new Date(Date.now() + 3600 * 1000);

    await db
      .insert(googleCalendarIntegrations)
      .values({
        professionalId: verified.profileId,
        googleSub,
        googleEmail,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        accessTokenExpiresAt: expiresAt,
        scope: tokens.scope ?? SCOPES.join(' '),
        status: 'active',
        lastError: null,
        lastErrorAt: null,
      })
      .onConflictDoUpdate({
        target: googleCalendarIntegrations.professionalId,
        set: {
          googleSub,
          googleEmail,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          accessTokenExpiresAt: expiresAt,
          scope: tokens.scope ?? SCOPES.join(' '),
          status: 'active',
          lastError: null,
          lastErrorAt: null,
          updatedAt: new Date(),
        },
      });

    return redirect({ gcal: 'connected' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown';
    console.error('[gcal-oauth] callback failed:', message);
    return redirect({ gcal: 'error', reason: 'exchange_failed' });
  }
};

export const disconnect: AppRouteHandler<DisconnectRoute> = async (c) => {
  if (!isConfigured()) {
    return c.json({ message: 'Google Calendar integration not configured' }, HttpStatusCodes.SERVICE_UNAVAILABLE);
  }
  const profileId = getProfileId(c);

  const [row] = await db
    .select()
    .from(googleCalendarIntegrations)
    .where(eq(googleCalendarIntegrations.professionalId, profileId));

  if (row) {
    try {
      await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(row.refreshToken)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
    } catch {
      // best-effort
    }
    await db.delete(googleCalendarIntegrations).where(eq(googleCalendarIntegrations.id, row.id));
  }

  return c.json({ message: 'Google Calendar disconnected' }, HttpStatusCodes.OK);
};
