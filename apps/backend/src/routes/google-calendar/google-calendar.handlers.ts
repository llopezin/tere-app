import type { AppRouteHandler } from '../../lib/types.js';
import type { ConnectRoute, DisconnectRoute, SyncRoute } from './google-calendar.routes.js';
import { db } from '../../db/index.js';
import { professionals } from '../../db/schema/professionals.js';
import { eq } from 'drizzle-orm';
import { getProfileId } from '../../middleware/auth.js';
import { AppError } from '../../middleware/error-handler.js';
import * as HttpStatusCodes from 'stoker/http-status-codes';

export const connect: AppRouteHandler<ConnectRoute> = async (c) => {
  return c.json({
    message: 'Google Calendar OAuth flow initiated (stub)',
    redirect_url: 'https://accounts.google.com/o/oauth2/v2/auth?...',
  }, HttpStatusCodes.OK);
};

export const disconnect: AppRouteHandler<DisconnectRoute> = async (c) => {
  const profileId = getProfileId(c);

  await db.update(professionals)
    .set({ googleCalendarId: null, updatedAt: new Date() })
    .where(eq(professionals.id, profileId));

  return c.json({ message: 'Google Calendar disconnected' }, HttpStatusCodes.OK);
};

export const sync: AppRouteHandler<SyncRoute> = async (c) => {
  const profileId = getProfileId(c);

  const [prof] = await db.select().from(professionals)
    .where(eq(professionals.id, profileId));
  if (!prof?.googleCalendarId) {
    throw new AppError(400, 'Google Calendar is not connected');
  }

  return c.json({
    message: 'Calendar sync initiated (stub)',
    synced_count: 0,
  }, HttpStatusCodes.OK);
};
