import { Hono } from 'hono';
import { db } from '../db/index.js';
import { blockedTimes } from '../db/schema/blocked-times.js';
import { eq, and, sql } from 'drizzle-orm';
import { authMiddleware, requireRole, getProfileId } from '../middleware/auth.js';
import { createBlockedTimeSchema } from '../lib/validators.js';
import { AppError } from '../middleware/error-handler.js';

const blockedTimeRoutes = new Hono();

blockedTimeRoutes.use('*', authMiddleware, requireRole('professional'));

// GET /blocked-times
blockedTimeRoutes.get('/', async (c) => {
  const profileId = getProfileId(c);
  const from = c.req.query('from');
  const to = c.req.query('to');

  const conditions = [eq(blockedTimes.professionalId, profileId)];
  if (from) conditions.push(sql`${blockedTimes.endAt} >= ${from}`);
  if (to) conditions.push(sql`${blockedTimes.startAt} <= ${to}`);

  const results = await db.select().from(blockedTimes)
    .where(and(...conditions))
    .orderBy(blockedTimes.startAt);
  return c.json({ data: results });
});

// POST /blocked-times
blockedTimeRoutes.post('/', async (c) => {
  const profileId = getProfileId(c);
  const body = createBlockedTimeSchema.parse(await c.req.json());

  const [created] = await db.insert(blockedTimes).values({
    professionalId: profileId,
    startAt: new Date(body.startAt),
    endAt: new Date(body.endAt),
  }).returning();

  return c.json(created, 201);
});

// DELETE /blocked-times/:id
blockedTimeRoutes.delete('/:id', async (c) => {
  const profileId = getProfileId(c);
  const { id } = c.req.param();

  const [deleted] = await db.delete(blockedTimes)
    .where(and(eq(blockedTimes.id, id), eq(blockedTimes.professionalId, profileId)))
    .returning();

  if (!deleted) throw new AppError(404, 'Blocked time not found');
  return c.json({ message: 'Blocked time removed' });
});

export default blockedTimeRoutes;
