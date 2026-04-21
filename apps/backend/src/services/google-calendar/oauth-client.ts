import { OAuth2Client } from 'google-auth-library';
import { db } from '../../db/index.js';
import { googleCalendarIntegrations, type GoogleCalendarIntegration } from '../../db/schema/google-calendar-integrations.js';
import { eq } from 'drizzle-orm';
import { env } from '../../config/env.js';

export class InvalidGrantError extends Error {
  constructor() {
    super('Google OAuth token revoked (invalid_grant)');
    this.name = 'InvalidGrantError';
  }
}

/** Returns an authenticated OAuth2Client for the given integration, refreshing the access token if needed. */
export async function getOAuthClient(integration: GoogleCalendarIntegration): Promise<OAuth2Client> {
  const client = new OAuth2Client(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_REDIRECT_URI,
  );

  client.setCredentials({
    access_token: integration.accessToken,
    refresh_token: integration.refreshToken,
    expiry_date: integration.accessTokenExpiresAt.getTime(),
  });

  // Lazy refresh: if token expires within 60 seconds, refresh now
  const expiresAt = integration.accessTokenExpiresAt.getTime();
  const needsRefresh = expiresAt < Date.now() + 60_000;

  if (needsRefresh) {
    try {
      const { credentials } = await client.refreshAccessToken();
      const newExpiry = credentials.expiry_date
        ? new Date(credentials.expiry_date)
        : new Date(Date.now() + 3600 * 1000);

      await db.update(googleCalendarIntegrations)
        .set({
          accessToken: credentials.access_token ?? integration.accessToken,
          accessTokenExpiresAt: newExpiry,
          updatedAt: new Date(),
        })
        .where(eq(googleCalendarIntegrations.id, integration.id));

      client.setCredentials(credentials);
    } catch (err: any) {
      const isInvalidGrant =
        err?.message?.includes('invalid_grant') ||
        err?.response?.data?.error === 'invalid_grant';

      if (isInvalidGrant) {
        await db.update(googleCalendarIntegrations)
          .set({ status: 'revoked', updatedAt: new Date() })
          .where(eq(googleCalendarIntegrations.id, integration.id));
        throw new InvalidGrantError();
      }
      throw err;
    }
  }

  return client;
}

/** Creates a new OAuth2Client for initiating the OAuth flow (no credentials set). */
export function createOAuthClient(): OAuth2Client {
  return new OAuth2Client(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_REDIRECT_URI,
  );
}
