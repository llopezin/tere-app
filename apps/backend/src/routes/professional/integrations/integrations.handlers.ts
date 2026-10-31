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

/**
 * Constants for OAuth state management.
 * STATE_TTL_SECONDS: How long the state is valid (10 minutes).
 * SCOPES: Permissions requested from Google.
 */
const STATE_COOKIE = 'gcal_oauth_state';
const STATE_TTL_SECONDS = 600;
const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'openid', // OpenID Connect: Required to get an id_token for user identification (sub)
  'email',  // Required to get the user's email address from the id_token
];

/**
 * Validates that all required environment variables for Google Calendar integration are present.
 */
function isConfigured(): boolean {
  return Boolean(env.GCAL_SYNC_ENABLED && env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_REDIRECT_URI);
}

/**
 * Signs the OAuth state parameter to prevent CSRF and ensure the callback is for the same user.
 * The state includes the profileId, a nonce, and the timestamp.
 * We use BETTER_AUTH_SECRET as the HMAC key for signing.
 */
function signState(profileId: string, nonce: string, issuedAt: number): string {
  const payload = `${profileId}.${nonce}.${issuedAt}`;
  const mac = crypto.createHmac('sha256', env.BETTER_AUTH_SECRET).update(payload).digest('base64url');
  return `${payload}.${mac}`;
}

/**
 * Verifies the signed OAuth state parameter.
 * 1. Checks the HMAC signature.
 * 2. Ensures the state has not expired.
 * 3. Returns the decoded payload if valid.
 */
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

  // Constant-time comparison to prevent timing attacks
  if (macBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(macBuf, expectedBuf)) return null;

  const issuedAt = Number.parseInt(issuedAtStr, 10);
  if (!Number.isFinite(issuedAt)) return null;

  // Check if state has expired
  if (Date.now() / 1000 - issuedAt > STATE_TTL_SECONDS) return null;

  return { profileId, nonce, issuedAt };
}

/**
 * GET /google-calendar/status
 * Returns the current integration status for the authenticated professional.
 */
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

/**
 * GET /google-calendar/connect
 * Initiates the Google OAuth flow by generating a signed state and redirecting the user.
 */
export const connect: AppRouteHandler<ConnectRoute> = async (c) => {
  if (!isConfigured()) {
    return c.json({ message: 'Google Calendar integration not configured' }, HttpStatusCodes.SERVICE_UNAVAILABLE);
  }
  const profileId = getProfileId(c);
  const nonce = crypto.randomBytes(16).toString('base64url');
  const issuedAt = Math.floor(Date.now() / 1000);
  const state = signState(profileId, nonce, issuedAt);

  // Store the state in a secure, httpOnly cookie to verify during callback
  setCookie(c, STATE_COOKIE, state, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'Lax',
    path: '/',
    maxAge: STATE_TTL_SECONDS,
  });

  const client = createOAuthClient();
  const authUrl = client.generateAuthUrl({
    access_type: 'offline', // Request a refresh token for background sync
    prompt: 'consent',     // Force consent screen to ensure refresh token is provided
    scope: SCOPES,
    state,
  });

  return c.json({ authUrl }, HttpStatusCodes.OK);
};

/**
 * GET /google-calendar/callback
 * Handles the redirect from Google OAuth.
 * 1. Verifies the state against the cookie.
 * 2. Exchanges the authorization code for tokens.
 * 3. Persists the integration details in the database.
 */
export const callback: AppRouteHandler<CallbackRoute> = async (c) => {
  if (!isConfigured()) {
    return c.json({ message: 'Google Calendar integration not configured' }, HttpStatusCodes.SERVICE_UNAVAILABLE);
  }
  const { code, state, error } = c.req.valid('query');
  const cookie = getCookie(c, STATE_COOKIE);

  // Clear the state cookie immediately after retrieval
  deleteCookie(c, STATE_COOKIE, { path: '/' });

  // Helper for redirecting back to the frontend with specific status parameters
  const redirect = (params: Record<string, string>) => {
    const url = new URL('/', env.FRONTEND_URL);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    return c.redirect(url.toString(), HttpStatusCodes.MOVED_TEMPORARILY);
  };

  if (error) return redirect({ gcal: 'error', reason: error });

  // Basic CSRF check: state from query must match state from cookie
  if (!code || !state || !cookie || state !== cookie) {
    return redirect({ gcal: 'error', reason: 'invalid_state' });
  }

  // Deep verification: check signature and expiration of the state
  const verified = verifyState(state);
  if (!verified) return redirect({ gcal: 'error', reason: 'invalid_state' });

  try {
    const client = createOAuthClient();

    // Exchange the code for tokens (access_token, refresh_token, id_token)
    const { tokens } = await client.getToken(code);
    if (!tokens.access_token || !tokens.refresh_token) {
      return redirect({ gcal: 'error', reason: 'missing_tokens' });
    }

    let googleSub = '';
    let googleEmail = '';

    // If an id_token is present, verify it to get the user's identity info
    if (tokens.id_token) {
      const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: env.GOOGLE_CLIENT_ID });
      const payload = ticket.getPayload();
      googleSub = payload?.sub ?? '';
      googleEmail = payload?.email ?? '';
    }

    // Default expiry to 1 hour if not provided by Google
    const expiresAt = tokens.expiry_date ? new Date(tokens.expiry_date) : new Date(Date.now() + 3600 * 1000);

    // Persist or update the integration record
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

/**
 * POST /google-calendar/disconnect
 * Disconnects the Google Calendar integration.
 * 1. Revokes the refresh token from Google (best-effort).
 * 2. Deletes the integration record from our database.
 */
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
      // Invalidate the refresh token on Google's side
      await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(row.refreshToken)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
    } catch {
      // We ignore errors here as we want to proceed with local disconnection regardless
    }

    // Remove the integration record
    await db.delete(googleCalendarIntegrations).where(eq(googleCalendarIntegrations.id, row.id));
  }

  return c.json({ message: 'Google Calendar disconnected' }, HttpStatusCodes.OK);
};
