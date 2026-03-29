import { Hono } from 'hono';
import { db } from '../db/index.js';
import { professionals } from '../db/schema/professionals.js';
import { eq } from 'drizzle-orm';
import { authMiddleware, requireRole, getProfileId } from '../middleware/auth.js';
import { AppError } from '../middleware/error-handler.js';

const gcalRoutes = new Hono();

gcalRoutes.use('*', authMiddleware, requireRole('professional'));

// POST /integrations/google-calendar/connect — stub OAuth flow
gcalRoutes.post('/connect', async (c) => {
  const user = c.get('user');

  // Stub: In production, this would initiate OAuth2 flow with Google
  // and store the calendar ID + tokens
  return c.json({
    message: 'Google Calendar OAuth flow initiated (stub)',
    redirect_url: 'https://accounts.google.com/o/oauth2/v2/auth?...',
  });
});

// DELETE /integrations/google-calendar/disconnect
gcalRoutes.delete('/disconnect', async (c) => {
  const profileId = getProfileId(c);

  await db.update(professionals)
    .set({ googleCalendarId: null, updatedAt: new Date() })
    .where(eq(professionals.id, profileId));

  return c.json({ message: 'Google Calendar disconnected' });
});

// POST /integrations/google-calendar/sync
gcalRoutes.post('/sync', async (c) => {
  const profileId = getProfileId(c);

  const [prof] = await db.select().from(professionals)
    .where(eq(professionals.id, profileId));
  if (!prof?.googleCalendarId) {
    throw new AppError(400, 'Google Calendar is not connected');
  }

  // Stub: In production, sync all upcoming appointments to Google Calendar
  return c.json({
    message: 'Calendar sync initiated (stub)',
    synced_count: 0,
  });
});

export default gcalRoutes;
