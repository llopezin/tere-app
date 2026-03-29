import { Hono } from 'hono';
import { db } from '../db/index.js';
import { workingSchedules } from '../db/schema/working-schedules.js';
import { eq } from 'drizzle-orm';
import { authMiddleware, requireRole, getProfileId } from '../middleware/auth.js';
import { bulkScheduleSchema } from '../lib/validators.js';

const scheduleRoutes = new Hono();

scheduleRoutes.use('*', authMiddleware, requireRole('professional'));

// GET /working-schedules
scheduleRoutes.get('/', async (c) => {
  const profileId = getProfileId(c);
  const results = await db.select().from(workingSchedules)
    .where(eq(workingSchedules.professionalId, profileId))
    .orderBy(workingSchedules.dayOfWeek, workingSchedules.startTime);
  return c.json({ data: results });
});

// PUT /working-schedules — bulk replace
scheduleRoutes.put('/', async (c) => {
  const profileId = getProfileId(c);
  const body = bulkScheduleSchema.parse(await c.req.json());

  const results = await db.transaction(async (tx) => {
    await tx.delete(workingSchedules)
      .where(eq(workingSchedules.professionalId, profileId));

    if (body.slots.length === 0) return [];

    return tx.insert(workingSchedules)
      .values(body.slots.map((slot) => ({
        professionalId: profileId,
        dayOfWeek: slot.dayOfWeek,
        startTime: slot.startTime,
        endTime: slot.endTime,
      })))
      .returning();
  });

  return c.json({ data: results });
});

export default scheduleRoutes;
